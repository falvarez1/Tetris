/**
 * Fixed Timestep Game Loop
 * Separates update (fixed rate) from render (variable rate)
 */

import { GameState, GameConfig, DEFAULT_GAME_CONFIG, calculateGravity } from '../types/gameState';
import { GameEvent } from '../types/events';
import {
  tryMove,
  isOnGround,
  calculateGhostY,
  getDropPositions,
  isPerfectClear,
  detectTSpin,
} from './Collision';
import { rotatePiece, RotationDirection } from './Rotation';
import {
  spawnNextPiece,
  lockActivePiece,
  processLineClears,
  updateGhostY,
  resetLockDelay,
  activateLockDelay,
  deactivateLockDelay,
  updateLockDelay,
  isLockDelayExpired,
  getDangerLevel,
} from './Board';
import {
  getClearType,
  isDifficultClear,
  calculateClearPoints,
  calculateHeatContribution,
  decayHeat,
  ClearEvent,
} from '../types/scoring';
import { ActivePiece } from '../types/tetromino';

/**
 * Game loop configuration
 */
export interface GameLoopConfig {
  fixedTimestep: number;    // ms per update (default: 16.67 = 60 updates/sec)
  maxAccumulator: number;   // Max accumulated time (prevents spiral of death)
  targetRenderFps: number;  // Target render FPS
}

export const DEFAULT_LOOP_CONFIG: GameLoopConfig = {
  fixedTimestep: 1000 / 60, // 60 updates per second
  maxAccumulator: 200,      // Max 200ms accumulated
  targetRenderFps: 60,
};

/**
 * Input actions for the current frame
 */
export interface InputActions {
  moveLeft: boolean;
  moveRight: boolean;
  softDrop: boolean;
  hardDrop: boolean;
  rotateCW: boolean;
  rotateCCW: boolean;
  rotate180: boolean;
  hold: boolean;
}

/**
 * Frame info for rendering
 */
export interface FrameInfo {
  deltaTime: number;
  interpolation: number;
  gameTime: number;
  fps: number;
}

/**
 * Update result
 */
export interface UpdateResult {
  state: GameState;
  events: GameEvent[];
}

/**
 * Process a single game update tick
 */
export function updateGame(
  state: GameState,
  deltaMs: number,
  actions: InputActions,
  config: GameConfig = DEFAULT_GAME_CONFIG
): UpdateResult {
  const events: GameEvent[] = [];

  // Don't update if not playing
  if (state.phase !== 'playing') {
    return { state, events };
  }

  let newState = { ...state };

  // Update timing
  newState = {
    ...newState,
    timing: {
      ...newState.timing,
      gameTime: newState.timing.gameTime + deltaMs,
    },
  };

  // Update heat decay
  const newHeat = decayHeat(newState.streak.heatLevel, deltaMs);
  if (newHeat !== newState.streak.heatLevel) {
    newState = {
      ...newState,
      streak: {
        ...newState.streak,
        heatLevel: newHeat,
        timeSinceLastClear: newState.streak.timeSinceLastClear + deltaMs,
      },
    };
  }

  // Process hold action
  if (actions.hold && newState.hold.available && newState.activePiece) {
    const result = processHold(newState, config);
    newState = result.state;
    events.push(...result.events);
  }

  // Process rotation
  if (newState.activePiece) {
    if (actions.rotateCW) {
      const result = processRotation(newState, 'cw');
      newState = result.state;
      events.push(...result.events);
    } else if (actions.rotateCCW) {
      const result = processRotation(newState, 'ccw');
      newState = result.state;
      events.push(...result.events);
    } else if (actions.rotate180) {
      const result = processRotation(newState, '180');
      newState = result.state;
      events.push(...result.events);
    }
  }

  // Process horizontal movement
  if (newState.activePiece) {
    if (actions.moveLeft) {
      const result = processMove(newState, -1, 0, config);
      newState = result.state;
      events.push(...result.events);
    } else if (actions.moveRight) {
      const result = processMove(newState, 1, 0, config);
      newState = result.state;
      events.push(...result.events);
    }
  }

  // Process hard drop
  if (actions.hardDrop && newState.activePiece) {
    const result = processHardDrop(newState, config);
    newState = result.state;
    events.push(...result.events);
  }
  // Process soft drop and gravity
  else if (newState.activePiece) {
    const result = processGravity(newState, deltaMs, actions.softDrop, config);
    newState = result.state;
    events.push(...result.events);
  }

  // Process lock delay
  if (newState.activePiece && isOnGround(newState.board, newState.activePiece)) {
    newState = {
      ...newState,
      activePiece: activateLockDelay(newState.activePiece),
    };

    // Update lock delay timer
    newState = {
      ...newState,
      activePiece: updateLockDelay(newState.activePiece!, deltaMs),
    };

    // Check if lock delay expired
    if (isLockDelayExpired(newState.activePiece!)) {
      const result = processLock(newState, config);
      newState = result.state;
      events.push(...result.events);
    }
  } else if (newState.activePiece) {
    // Piece is not on ground, deactivate lock delay
    newState = {
      ...newState,
      activePiece: deactivateLockDelay(newState.activePiece),
    };
  }

  // Spawn new piece if needed
  if (!newState.activePiece && newState.phase === 'playing') {
    const result = processSpawn(newState, config);
    newState = result.state;
    events.push(...result.events);
  }

  // Check danger zone
  const dangerLevel = getDangerLevel(newState.board);
  if (dangerLevel > 0) {
    events.push({
      type: 'danger-zone',
      active: true,
      intensity: dangerLevel,
    });
  }

  return { state: newState, events };
}

/**
 * Process hold piece action
 */
function processHold(
  state: GameState,
  config: GameConfig
): UpdateResult {
  const events: GameEvent[] = [];

  if (!state.activePiece || !state.hold.available) {
    return { state, events };
  }

  const currentType = state.activePiece.type;
  let newState = state;

  if (state.hold.piece) {
    // Swap with held piece
    const { piece: newPiece } = spawnNextPiece(state.board, {
      ...state.bag,
      current: [state.hold.piece, ...state.bag.current],
    }, config);

    if (newPiece) {
      // Actually use the held piece type
      const heldType = state.hold.piece;
      const spawnedPiece: ActivePiece = {
        ...newPiece,
        type: heldType,
        ghostY: calculateGhostY(state.board, { ...newPiece, type: heldType }),
      };

      newState = {
        ...newState,
        activePiece: spawnedPiece,
        hold: { piece: currentType, available: false },
        bag: state.bag, // Don't consume from bag when swapping
      };

      events.push({
        type: 'piece-hold',
        swapped: heldType,
        held: currentType,
      });
    }
  } else {
    // No held piece, hold current and spawn next
    const { piece: newPiece, newBag } = spawnNextPiece(state.board, state.bag, config);

    if (newPiece) {
      newState = {
        ...newState,
        activePiece: newPiece,
        hold: { piece: currentType, available: false },
        bag: newBag,
      };

      events.push({
        type: 'piece-hold',
        swapped: null,
        held: currentType,
      });
      events.push({
        type: 'piece-spawn',
        piece: newPiece.type,
      });
    }
  }

  return { state: newState, events };
}

/**
 * Process rotation action
 */
function processRotation(
  state: GameState,
  direction: RotationDirection
): UpdateResult {
  const events: GameEvent[] = [];

  if (!state.activePiece) {
    return { state, events };
  }

  const result = rotatePiece(state.board, state.activePiece, direction);

  if (result) {
    const newPiece = updateGhostY(state.board, result.piece);

    // Reset lock delay on successful rotation
    const finalPiece = isOnGround(state.board, newPiece)
      ? resetLockDelay(newPiece)
      : newPiece;

    events.push({
      type: 'piece-rotate',
      rotation: finalPiece.rotation,
      wasWallKick: result.wasWallKick,
      kickIndex: result.kickIndex,
    });

    return {
      state: { ...state, activePiece: finalPiece },
      events,
    };
  }

  return { state, events };
}

/**
 * Process movement action
 */
function processMove(
  state: GameState,
  dx: number,
  dy: number,
  config: GameConfig
): UpdateResult {
  const events: GameEvent[] = [];

  if (!state.activePiece) {
    return { state, events };
  }

  const moved = tryMove(state.board, state.activePiece, dx, dy);

  if (moved) {
    let newPiece = updateGhostY(state.board, moved);

    // Reset lock delay on successful move (if on ground)
    if (isOnGround(state.board, newPiece)) {
      newPiece = resetLockDelay(newPiece, config);
    }

    const direction = dx < 0 ? 'left' : dx > 0 ? 'right' : 'down';
    events.push({
      type: 'piece-move',
      direction,
      position: newPiece.position,
    });

    return {
      state: { ...state, activePiece: newPiece },
      events,
    };
  }

  return { state, events };
}

/**
 * Process gravity (automatic downward movement)
 */
function processGravity(
  state: GameState,
  deltaMs: number,
  softDrop: boolean,
  config: GameConfig
): UpdateResult {
  const events: GameEvent[] = [];

  if (!state.activePiece) {
    return { state, events };
  }

  // Calculate gravity speed
  const baseSpeed = state.timing.gravitySpeed;
  const speed = softDrop ? baseSpeed * config.softDropMultiplier : baseSpeed;
  const cellsPerMs = speed / 1000;

  // Accumulate gravity
  let accumulator = state.timing.gravityAccumulator + deltaMs * cellsPerMs;

  let newPiece = state.activePiece;
  let cellsDropped = 0;

  // Drop piece while we have accumulated cells
  while (accumulator >= 1) {
    const moved = tryMove(state.board, newPiece, 0, -1);
    if (moved) {
      newPiece = moved;
      accumulator -= 1;
      cellsDropped++;

      if (softDrop) {
        newPiece = { ...newPiece, softDropCells: newPiece.softDropCells + 1 };
      }
    } else {
      // Can't move down, clear accumulator
      accumulator = 0;
      break;
    }
  }

  // Update ghost Y
  newPiece = updateGhostY(state.board, newPiece);

  // Emit soft drop event
  if (softDrop && cellsDropped > 0) {
    events.push({
      type: 'soft-drop',
      cells: cellsDropped,
    });
  }

  return {
    state: {
      ...state,
      activePiece: newPiece,
      timing: {
        ...state.timing,
        gravityAccumulator: accumulator,
      },
    },
    events,
  };
}

/**
 * Process hard drop
 */
function processHardDrop(
  state: GameState,
  config: GameConfig
): UpdateResult {
  const events: GameEvent[] = [];

  if (!state.activePiece) {
    return { state, events };
  }

  const { dropDistance } = getDropPositions(state.board, state.activePiece);
  const startY = state.activePiece.position.y;

  // Create piece at drop position
  const droppedPiece: ActivePiece = {
    ...state.activePiece,
    position: {
      x: state.activePiece.position.x,
      y: state.activePiece.ghostY,
    },
    lockDelay: {
      ...state.activePiece.lockDelay,
      active: true,
      remaining: 0, // Immediate lock
    },
  };

  events.push({
    type: 'hard-drop',
    startY,
    endY: droppedPiece.position.y,
    cells: dropDistance,
  });

  // Immediately lock the piece
  const lockResult = processLock(
    { ...state, activePiece: droppedPiece },
    config
  );

  // Add hard drop points
  const hardDropPoints = dropDistance * config.softDropMultiplier * 2;
  const newScore = {
    ...lockResult.state.score,
    score: lockResult.state.score.score + hardDropPoints,
  };

  return {
    state: { ...lockResult.state, score: newScore },
    events: [...events, ...lockResult.events],
  };
}

/**
 * Process piece lock
 */
function processLock(
  state: GameState,
  config: GameConfig
): UpdateResult {
  const events: GameEvent[] = [];

  if (!state.activePiece) {
    return { state, events };
  }

  const piece = state.activePiece;

  // Lock piece onto board
  const { newBoard, lockedPositions } = lockActivePiece(state.board, piece);

  events.push({
    type: 'piece-lock',
    positions: lockedPositions,
    piece: piece.type,
  });

  // Process line clears
  const { newBoard: clearedBoard, clearedRows } = processLineClears(newBoard);

  let newState: GameState = {
    ...state,
    board: clearedBoard,
    activePiece: null,
    hold: { ...state.hold, available: true }, // Re-enable hold
  };

  if (clearedRows.length > 0) {
    // Detect T-Spin
    const tSpinResult = detectTSpin(
      state.board,
      piece,
      piece.lockDelay.moveResets > 0,
      0 // Would need to track kick index through rotation
    );

    const clearType = getClearType(clearedRows.length, tSpinResult.isTSpin, tSpinResult.isMini);
    const isDifficult = isDifficultClear(clearType);

    // Update combo
    const newComboCount = state.combo.comboCount + 1;
    const isBackToBack = isDifficult && state.combo.backToBackActive;
    const newBackToBack = isDifficult
      ? (isBackToBack ? state.combo.backToBack + 1 : 1)
      : 0;

    // Calculate points
    const points = calculateClearPoints(
      clearType,
      state.score.level,
      newComboCount,
      isBackToBack
    );

    // Check perfect clear
    const perfectClear = isPerfectClear(clearedBoard);
    const totalPoints = perfectClear
      ? points + 3000 * state.score.level
      : points;

    // Calculate heat
    const heatContribution = calculateHeatContribution(clearType, newComboCount, isBackToBack);
    const newHeat = Math.min(1, state.streak.heatLevel + heatContribution);

    // Create clear event
    const clearEvent: ClearEvent = {
      type: clearType,
      lines: clearedRows,
      timestamp: state.timing.gameTime,
      backToBack: isBackToBack,
      comboCount: newComboCount,
      points: totalPoints,
      heatContribution,
    };

    events.push({
      type: 'lines-clear',
      event: clearEvent,
    });

    if (newComboCount > 1) {
      events.push({
        type: 'combo',
        count: newComboCount,
      });
    }

    if (isBackToBack && newBackToBack > 1) {
      events.push({
        type: 'back-to-back',
        count: newBackToBack,
      });
    }

    if (perfectClear) {
      events.push({
        type: 'perfect-clear',
        points: 3000 * state.score.level,
      });
    }

    // Update lines and check level up
    const newLinesCleared = state.score.linesCleared + clearedRows.length;
    const newLinesAtLevel = state.score.linesAtLevel + clearedRows.length;
    let newLevel = state.score.level;
    let remainingLines = newLinesAtLevel;

    while (remainingLines >= config.linesPerLevel && newLevel < config.maxLevel) {
      remainingLines -= config.linesPerLevel;
      newLevel++;

      events.push({
        type: 'level-up',
        newLevel,
        previousLevel: newLevel - 1,
      });
    }

    // Update heat event
    if (newHeat !== state.streak.heatLevel) {
      events.push({
        type: 'heat-change',
        heat: newHeat,
        delta: heatContribution,
        previousHeat: state.streak.heatLevel,
      });
    }

    newState = {
      ...newState,
      score: {
        score: state.score.score + totalPoints,
        level: newLevel,
        linesCleared: newLinesCleared,
        linesAtLevel: remainingLines,
        linesToNextLevel: config.linesPerLevel - remainingLines,
      },
      combo: {
        comboCount: newComboCount,
        backToBack: newBackToBack,
        backToBackActive: isDifficult,
        perfectClears: perfectClear
          ? state.combo.perfectClears + 1
          : state.combo.perfectClears,
      },
      streak: {
        heatLevel: newHeat,
        peakHeat: Math.max(state.streak.peakHeat, newHeat),
        timeSinceLastClear: 0,
        recentClears: [...state.streak.recentClears, clearEvent].slice(-10),
      },
      timing: {
        ...state.timing,
        gravitySpeed: calculateGravity(newLevel),
        baseGravity: calculateGravity(newLevel),
      },
    };
  } else {
    // No lines cleared, reset combo
    newState = {
      ...newState,
      combo: {
        ...state.combo,
        comboCount: 0,
        backToBackActive: state.combo.backToBackActive, // Keep B2B active
      },
    };
  }

  return { state: newState, events };
}

/**
 * Process spawning a new piece
 */
function processSpawn(
  state: GameState,
  config: GameConfig
): UpdateResult {
  const events: GameEvent[] = [];

  const { piece, newBag } = spawnNextPiece(state.board, state.bag, config);

  if (!piece) {
    // Game over - block out
    events.push({
      type: 'game-over',
      finalScore: state.score.score,
      finalLevel: state.score.level,
      linesCleared: state.score.linesCleared,
    });

    return {
      state: { ...state, phase: 'gameOver' },
      events,
    };
  }

  events.push({
    type: 'piece-spawn',
    piece: piece.type,
  });

  return {
    state: {
      ...state,
      activePiece: piece,
      bag: newBag,
    },
    events,
  };
}

/**
 * Start a new game
 */
export function startGame(state: GameState, config: GameConfig): UpdateResult {
  const { piece, newBag } = spawnNextPiece(state.board, state.bag, config);
  const events: GameEvent[] = [];

  if (piece) {
    events.push({
      type: 'piece-spawn',
      piece: piece.type,
    });
  }

  return {
    state: {
      ...state,
      phase: 'playing',
      activePiece: piece,
      bag: newBag,
    },
    events,
  };
}
