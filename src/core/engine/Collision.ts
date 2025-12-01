/**
 * Collision Detection System
 */

import {
  BoardState,
  isValidPosition,
  isCellOccupied,
} from '../types/board';
import {
  ActivePiece,
  Position,
  RotationState,
  TetrominoType,
  TETROMINO_SHAPES,
  getPieceBlocks,
} from '../types/tetromino';

/**
 * Check if a piece position is valid (no collisions, within bounds)
 */
export function isValidPiecePosition(
  board: BoardState,
  piece: ActivePiece
): boolean {
  const blocks = getPieceBlocks(piece);

  for (const block of blocks) {
    // Check bounds
    if (!isValidPosition(board, block.x, block.y)) {
      return false;
    }

    // Check collision with locked cells
    if (isCellOccupied(board, block.x, block.y)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a hypothetical piece position is valid
 */
export function canPlacePiece(
  board: BoardState,
  type: TetrominoType,
  position: Position,
  rotation: RotationState
): boolean {
  const shape = TETROMINO_SHAPES[type][rotation];

  for (const offset of shape) {
    const x = position.x + offset.x;
    const y = position.y + offset.y;

    if (!isValidPosition(board, x, y)) {
      return false;
    }

    if (isCellOccupied(board, x, y)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if piece can move in a direction
 */
export function canMove(
  board: BoardState,
  piece: ActivePiece,
  dx: number,
  dy: number
): boolean {
  const newPosition = {
    x: piece.position.x + dx,
    y: piece.position.y + dy,
  };

  return canPlacePiece(board, piece.type, newPosition, piece.rotation);
}

/**
 * Move piece if valid, return new piece state or null if invalid
 */
export function tryMove(
  board: BoardState,
  piece: ActivePiece,
  dx: number,
  dy: number
): ActivePiece | null {
  if (!canMove(board, piece, dx, dy)) {
    return null;
  }

  return {
    ...piece,
    position: {
      x: piece.position.x + dx,
      y: piece.position.y + dy,
    },
  };
}

/**
 * Check if piece is on the ground (can't move down)
 */
export function isOnGround(board: BoardState, piece: ActivePiece): boolean {
  return !canMove(board, piece, 0, -1);
}

/**
 * Calculate ghost piece Y position (lowest valid position)
 */
export function calculateGhostY(board: BoardState, piece: ActivePiece): number {
  let ghostY = piece.position.y;

  while (canPlacePiece(board, piece.type, { x: piece.position.x, y: ghostY - 1 }, piece.rotation)) {
    ghostY--;
  }

  return ghostY;
}

/**
 * Check if game is over (piece spawned overlapping existing blocks)
 */
export function checkBlockOut(board: BoardState, piece: ActivePiece): boolean {
  return !isValidPiecePosition(board, piece);
}

/**
 * Check if any blocks are above the visible area (lock out condition)
 */
export function checkLockOut(board: BoardState, piece: ActivePiece): boolean {
  const blocks = getPieceBlocks(piece);
  const visibleTop = board.config.height;

  return blocks.every(block => block.y >= visibleTop);
}

/**
 * Get all positions that would be occupied by dropping the piece
 */
export function getDropPositions(
  board: BoardState,
  piece: ActivePiece
): { positions: Position[]; dropDistance: number } {
  const ghostY = calculateGhostY(board, piece);
  const dropDistance = piece.position.y - ghostY;

  const droppedPiece: ActivePiece = {
    ...piece,
    position: { x: piece.position.x, y: ghostY },
  };

  return {
    positions: getPieceBlocks(droppedPiece),
    dropDistance,
  };
}

/**
 * T-Spin detection
 * Returns: { isTSpin: boolean, isMini: boolean }
 */
export function detectTSpin(
  board: BoardState,
  piece: ActivePiece,
  wasWallKick: boolean,
  kickIndex: number
): { isTSpin: boolean; isMini: boolean } {
  // Only T piece can T-Spin
  if (piece.type !== 'T') {
    return { isTSpin: false, isMini: false };
  }

  // Check the four corners around the T piece center
  const corners: Position[] = [
    { x: piece.position.x - 1, y: piece.position.y + 1 },  // Top-left
    { x: piece.position.x + 1, y: piece.position.y + 1 },  // Top-right
    { x: piece.position.x - 1, y: piece.position.y - 1 },  // Bottom-left
    { x: piece.position.x + 1, y: piece.position.y - 1 },  // Bottom-right
  ];

  // Count filled corners (walls count as filled)
  let filledCorners = 0;
  for (const corner of corners) {
    if (!isValidPosition(board, corner.x, corner.y) || isCellOccupied(board, corner.x, corner.y)) {
      filledCorners++;
    }
  }

  // Need at least 3 corners filled for T-Spin
  if (filledCorners < 3) {
    return { isTSpin: false, isMini: false };
  }

  // Determine which corners are "front" based on rotation
  const frontCornerIndices = getFrontCornerIndices(piece.rotation);
  let frontCornersFilled = 0;
  for (const idx of frontCornerIndices) {
    const corner = corners[idx];
    if (!isValidPosition(board, corner.x, corner.y) || isCellOccupied(board, corner.x, corner.y)) {
      frontCornersFilled++;
    }
  }

  // Full T-Spin: both front corners filled
  // Mini T-Spin: only one front corner filled (unless it's a wall kick to position 4)
  const isTSpin = true;
  const isMini = frontCornersFilled < 2 && !(wasWallKick && kickIndex === 4);

  return { isTSpin, isMini };
}

/**
 * Get front corner indices based on T piece rotation
 */
function getFrontCornerIndices(rotation: RotationState): [number, number] {
  switch (rotation) {
    case 0: return [0, 1]; // Top-left, Top-right
    case 1: return [1, 3]; // Top-right, Bottom-right
    case 2: return [2, 3]; // Bottom-left, Bottom-right
    case 3: return [0, 2]; // Top-left, Bottom-left
  }
}

/**
 * Check if board is perfectly clear (all cells empty)
 */
export function isPerfectClear(board: BoardState): boolean {
  return board.cells.size === 0;
}
