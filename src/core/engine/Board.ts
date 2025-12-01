/**
 * Board Management
 */

import {
  BoardState,
  CellState,
  lockPiece,
  getFilledRows,
  clearRows as clearBoardRows,
  insertGarbageRows,
  getHighestOccupiedRow,
} from '../types/board';
import {
  ActivePiece,
  TetrominoType,
  Position,
  getPieceBlocks,
  getNextPiece,
  PieceBag,
} from '../types/tetromino';
import { isValidPiecePosition, calculateGhostY } from './Collision';
import { GameConfig, DEFAULT_GAME_CONFIG } from '../types/gameState';

/**
 * Spawn a new piece at the top of the board
 */
export function spawnPiece(
  board: BoardState,
  type: TetrominoType,
  config: GameConfig = DEFAULT_GAME_CONFIG
): ActivePiece | null {
  // Standard spawn position: centered, at top of visible area
  const spawnX = Math.floor(board.config.width / 2) - 1;
  const spawnY = board.config.height; // Just above visible area

  const piece: ActivePiece = {
    type,
    position: { x: spawnX, y: spawnY },
    rotation: 0,
    ghostY: 0,
    lockDelay: {
      active: false,
      remaining: config.lockDelay,
      moveResets: 0,
      maxResets: config.lockDelayResets,
    },
    softDropCells: 0,
  };

  // Calculate ghost Y
  piece.ghostY = calculateGhostY(board, piece);

  // Check if spawn is valid (game over check)
  if (!isValidPiecePosition(board, piece)) {
    return null; // Block out - game over
  }

  return piece;
}

/**
 * Spawn the next piece from the bag
 */
export function spawnNextPiece(
  board: BoardState,
  bag: PieceBag,
  config: GameConfig = DEFAULT_GAME_CONFIG
): { piece: ActivePiece | null; newBag: PieceBag } {
  const { piece: type, newBag } = getNextPiece(bag);
  const piece = spawnPiece(board, type, config);
  return { piece, newBag };
}

/**
 * Lock the active piece onto the board
 */
export function lockActivePiece(
  board: BoardState,
  piece: ActivePiece
): { newBoard: BoardState; lockedPositions: Position[] } {
  const positions = getPieceBlocks(piece);
  const newBoard = lockPiece(board, positions, piece.type);

  return {
    newBoard,
    lockedPositions: positions,
  };
}

/**
 * Process line clears
 */
export function processLineClears(
  board: BoardState
): { newBoard: BoardState; clearedRows: number[] } {
  const clearedRows = getFilledRows(board);

  if (clearedRows.length === 0) {
    return { newBoard: board, clearedRows: [] };
  }

  const newBoard = clearBoardRows(board, clearedRows);

  return { newBoard, clearedRows };
}

/**
 * Add garbage rows to the board
 */
export function addGarbageRows(
  board: BoardState,
  count: number,
  gapColumn?: number
): BoardState {
  // Random gap if not specified
  const gap = gapColumn ?? Math.floor(Math.random() * board.config.width);
  return insertGarbageRows(board, count, gap);
}

/**
 * Get board danger level (0-1 scale based on stack height)
 */
export function getDangerLevel(board: BoardState): number {
  const highestRow = getHighestOccupiedRow(board);
  if (highestRow === -1) return 0;

  // Danger starts at row 12 (8 rows from top of visible area)
  const dangerThreshold = board.config.height - 8;
  if (highestRow < dangerThreshold) return 0;

  const dangerRange = board.config.height - dangerThreshold;
  return Math.min(1, (highestRow - dangerThreshold) / dangerRange);
}

/**
 * Check if board is in danger zone
 */
export function isInDangerZone(board: BoardState): boolean {
  return getDangerLevel(board) > 0;
}

/**
 * Get all cells as an array (for rendering)
 */
export function getCellArray(
  board: BoardState
): { x: number; y: number; cell: CellState }[] {
  const cells: { x: number; y: number; cell: CellState }[] = [];

  for (const [key, cell] of board.cells) {
    const [x, y] = key.split(',').map(Number);
    cells.push({ x, y, cell });
  }

  return cells;
}

/**
 * Get cells in the visible area only
 */
export function getVisibleCells(
  board: BoardState
): { x: number; y: number; cell: CellState }[] {
  return getCellArray(board).filter(({ y }) => y < board.config.height);
}

/**
 * Update piece ghost position
 */
export function updateGhostY(board: BoardState, piece: ActivePiece): ActivePiece {
  return {
    ...piece,
    ghostY: calculateGhostY(board, piece),
  };
}

/**
 * Reset lock delay (called when piece moves successfully)
 */
export function resetLockDelay(
  piece: ActivePiece,
  config: GameConfig = DEFAULT_GAME_CONFIG
): ActivePiece {
  // Only reset if we haven't exceeded max resets
  if (piece.lockDelay.moveResets >= piece.lockDelay.maxResets) {
    return piece;
  }

  return {
    ...piece,
    lockDelay: {
      ...piece.lockDelay,
      remaining: config.lockDelay,
      moveResets: piece.lockDelay.moveResets + 1,
    },
  };
}

/**
 * Activate lock delay (called when piece lands)
 */
export function activateLockDelay(piece: ActivePiece): ActivePiece {
  if (piece.lockDelay.active) {
    return piece;
  }

  return {
    ...piece,
    lockDelay: {
      ...piece.lockDelay,
      active: true,
    },
  };
}

/**
 * Deactivate lock delay (called when piece lifts off ground)
 */
export function deactivateLockDelay(piece: ActivePiece): ActivePiece {
  if (!piece.lockDelay.active) {
    return piece;
  }

  return {
    ...piece,
    lockDelay: {
      ...piece.lockDelay,
      active: false,
    },
  };
}

/**
 * Update lock delay timer
 */
export function updateLockDelay(piece: ActivePiece, deltaMs: number): ActivePiece {
  if (!piece.lockDelay.active) {
    return piece;
  }

  return {
    ...piece,
    lockDelay: {
      ...piece.lockDelay,
      remaining: piece.lockDelay.remaining - deltaMs,
    },
  };
}

/**
 * Check if lock delay has expired
 */
export function isLockDelayExpired(piece: ActivePiece): boolean {
  return piece.lockDelay.active && piece.lockDelay.remaining <= 0;
}
