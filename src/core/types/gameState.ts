/**
 * Unified Game State
 * Central state definition for the entire game
 */

import { BoardState, createBoard } from './board';
import { ActivePiece, PieceBag, TetrominoType, createPieceBag } from './tetromino';
import { ScoreState, ComboState, StreakState, createScoreState, createComboState, createStreakState } from './scoring';
import { GameEvent } from './events';

/**
 * Game phase / screen state
 */
export type GamePhase =
  | 'menu'       // Main menu
  | 'countdown'  // 3-2-1 countdown before game starts
  | 'playing'    // Active gameplay
  | 'clearing'   // Lines being cleared (animation pause)
  | 'paused'     // Game paused
  | 'gameOver'   // Game over screen
  | 'victory';   // Victory screen (for modes with win conditions)

/**
 * Input state for current frame
 */
export interface InputState {
  das: {
    direction: 'left' | 'right' | null;
    chargeTime: number;
    autoRepeatActive: boolean;
  };
  softDropHeld: boolean;
  hardDropTriggered: boolean;
  rotationQueue: ('cw' | 'ccw' | '180')[];
  holdTriggered: boolean;
}

/**
 * Timing state
 */
export interface TimingState {
  gameTime: number;        // Total game time (excluding pauses)
  lastUpdateTime: number;  // Last update timestamp
  gravityAccumulator: number; // Time accumulated for gravity
  gravitySpeed: number;    // Current cells per second
  baseGravity: number;     // Base gravity for current level
}

/**
 * Hold piece state
 */
export interface HoldState {
  piece: TetrominoType | null;
  available: boolean; // Can hold be used this piece?
}

/**
 * Game mode type
 */
export type GameModeType = 'classic' | 'marathon' | 'chaos' | 'zen';

/**
 * Mode-specific state for Classic+ mode
 */
export interface ClassicModeState {
  mode: 'classic';
  goal?: { type: 'score' | 'lines'; target: number };
}

/**
 * Mode-specific state for Marathon mode (endless)
 */
export interface MarathonModeState {
  mode: 'marathon';
  // Marathon is endless - no goal, just play until you lose
}

/**
 * Chaos event state
 */
export interface ChaosEventState {
  id: string;
  type: string;
  startTime: number;
  duration: number;
  intensity: number;
  data?: Record<string, unknown>;
}

/**
 * Mode-specific state for Chaos mode
 */
export interface ChaosModeState {
  mode: 'chaos';
  activeEvents: ChaosEventState[];
  nextEventIn: number;
  intensity: number;
}

/**
 * Mode-specific state for Zen mode
 */
export interface ZenModeState {
  mode: 'zen';
  autoRescueEnabled: boolean;
  sessionStats: {
    piecesPlaced: number;
    timeElapsed: number;
  };
}

/**
 * Union of all mode states
 */
export type ModeSpecificState = ClassicModeState | MarathonModeState | ChaosModeState | ZenModeState;

/**
 * Complete game state - the single source of truth
 */
export interface GameState {
  readonly phase: GamePhase;
  readonly board: BoardState;
  readonly activePiece: ActivePiece | null;
  readonly hold: HoldState;
  readonly bag: PieceBag;
  readonly score: ScoreState;
  readonly combo: ComboState;
  readonly streak: StreakState;
  readonly timing: TimingState;
  readonly input: InputState;
  readonly modeState: ModeSpecificState;
  readonly frameEvents: GameEvent[];
  readonly seed: number;
}

/**
 * Game configuration
 */
export interface GameConfig {
  boardWidth: number;
  boardHeight: number;
  previewCount: number;
  startLevel: number;
  linesPerLevel: number;
  maxLevel: number;
  lockDelay: number;
  lockDelayResets: number;
  das: number;
  arr: number;
  softDropMultiplier: number;
  holdEnabled: boolean;
  ghostEnabled: boolean;
}

/**
 * Default game configuration
 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  boardWidth: 10,
  boardHeight: 20,
  previewCount: 3,
  startLevel: 1,
  linesPerLevel: 10,
  maxLevel: 15,
  lockDelay: 500,
  lockDelayResets: 15,
  das: 170,
  arr: 50,
  softDropMultiplier: 20,
  holdEnabled: true,
  ghostEnabled: true,
};

/**
 * Create initial input state
 */
export function createInputState(): InputState {
  return {
    das: {
      direction: null,
      chargeTime: 0,
      autoRepeatActive: false,
    },
    softDropHeld: false,
    hardDropTriggered: false,
    rotationQueue: [],
    holdTriggered: false,
  };
}

/**
 * Create initial timing state
 */
export function createTimingState(startLevel: number): TimingState {
  const baseGravity = calculateGravity(startLevel);
  return {
    gameTime: 0,
    lastUpdateTime: 0,
    gravityAccumulator: 0,
    gravitySpeed: baseGravity,
    baseGravity,
  };
}

/**
 * Create initial hold state
 */
export function createHoldState(): HoldState {
  return {
    piece: null,
    available: true,
  };
}

/**
 * Create initial mode state based on mode type
 */
export function createModeState(mode: GameModeType): ModeSpecificState {
  switch (mode) {
    case 'classic':
      return { mode: 'classic' };
    case 'marathon':
      return { mode: 'marathon' };
    case 'chaos':
      return {
        mode: 'chaos',
        activeEvents: [],
        nextEventIn: 15000, // First event after 15 seconds
        intensity: 0.1,
      };
    case 'zen':
      return {
        mode: 'zen',
        autoRescueEnabled: true,
        sessionStats: {
          piecesPlaced: 0,
          timeElapsed: 0,
        },
      };
  }
}

/**
 * Calculate gravity (cells per second) for a level
 * Using guideline formula: (0.8 - ((level - 1) * 0.007))^(level - 1) seconds per cell
 */
export function calculateGravity(level: number): number {
  const clampedLevel = Math.min(level, 20);
  const secondsPerCell = Math.pow(0.8 - ((clampedLevel - 1) * 0.007), clampedLevel - 1);
  return 1 / secondsPerCell;
}

/**
 * Create initial game state
 */
export function createGameState(
  mode: GameModeType = 'classic',
  config: GameConfig = DEFAULT_GAME_CONFIG
): GameState {
  return {
    phase: 'menu',
    board: createBoard({
      width: config.boardWidth,
      height: config.boardHeight,
      bufferRows: 4,
    }),
    activePiece: null,
    hold: createHoldState(),
    bag: createPieceBag(config.previewCount),
    score: createScoreState(),
    combo: createComboState(),
    streak: createStreakState(),
    timing: createTimingState(config.startLevel),
    input: createInputState(),
    modeState: createModeState(mode),
    frameEvents: [],
    seed: Math.floor(Math.random() * 2147483647),
  };
}

/**
 * Reset game state for a new game (keeps mode and config)
 */
export function resetGameState(
  state: GameState,
  config: GameConfig = DEFAULT_GAME_CONFIG
): GameState {
  const mode = state.modeState.mode;
  return {
    ...createGameState(mode, config),
    phase: 'countdown',
  };
}
