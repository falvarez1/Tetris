/**
 * SRS Rotation System
 */

import { BoardState } from '../types/board';
import {
  ActivePiece,
  RotationState,
  getWallKicks,
  getWallKickKey,
} from '../types/tetromino';
import { canPlacePiece } from './Collision';

/**
 * Rotation direction
 */
export type RotationDirection = 'cw' | 'ccw' | '180';

/**
 * Result of a rotation attempt
 */
export interface RotationResult {
  success: boolean;
  newPiece: ActivePiece | null;
  wasWallKick: boolean;
  kickIndex: number;
}

/**
 * Get new rotation state after rotating
 */
export function getNewRotation(
  current: RotationState,
  direction: RotationDirection
): RotationState {
  switch (direction) {
    case 'cw':
      return ((current + 1) % 4) as RotationState;
    case 'ccw':
      return ((current + 3) % 4) as RotationState;
    case '180':
      return ((current + 2) % 4) as RotationState;
  }
}

/**
 * Try to rotate a piece using SRS wall kicks
 */
export function tryRotate(
  board: BoardState,
  piece: ActivePiece,
  direction: RotationDirection
): RotationResult {
  const newRotation = getNewRotation(piece.rotation, direction);

  // For 180 rotation, try both paths and use the one that works
  if (direction === '180') {
    // Try CW -> CW
    const cwFirst = tryRotate(board, piece, 'cw');
    if (cwFirst.success && cwFirst.newPiece) {
      const cwSecond = tryRotate(board, cwFirst.newPiece, 'cw');
      if (cwSecond.success) {
        return cwSecond;
      }
    }

    // Try CCW -> CCW
    const ccwFirst = tryRotate(board, piece, 'ccw');
    if (ccwFirst.success && ccwFirst.newPiece) {
      const ccwSecond = tryRotate(board, ccwFirst.newPiece, 'ccw');
      if (ccwSecond.success) {
        return ccwSecond;
      }
    }

    // If neither works, try simple 180 without wall kicks
    if (canPlacePiece(board, piece.type, piece.position, newRotation)) {
      return {
        success: true,
        newPiece: { ...piece, rotation: newRotation },
        wasWallKick: false,
        kickIndex: 0,
      };
    }

    return {
      success: false,
      newPiece: null,
      wasWallKick: false,
      kickIndex: -1,
    };
  }

  // Get wall kick data for this piece type
  const wallKicks = getWallKicks(piece.type);
  const kickKey = getWallKickKey(piece.rotation, newRotation);
  const kicks = wallKicks[kickKey];

  // Try each wall kick offset
  for (let i = 0; i < kicks.length; i++) {
    const kick = kicks[i];
    const newPosition = {
      x: piece.position.x + kick.x,
      y: piece.position.y + kick.y,
    };

    if (canPlacePiece(board, piece.type, newPosition, newRotation)) {
      return {
        success: true,
        newPiece: {
          ...piece,
          position: newPosition,
          rotation: newRotation,
        },
        wasWallKick: i > 0, // First kick (index 0) is no offset
        kickIndex: i,
      };
    }
  }

  // No valid rotation found
  return {
    success: false,
    newPiece: null,
    wasWallKick: false,
    kickIndex: -1,
  };
}

/**
 * Apply rotation to piece if valid
 */
export function rotatePiece(
  board: BoardState,
  piece: ActivePiece,
  direction: RotationDirection
): { piece: ActivePiece; wasWallKick: boolean; kickIndex: number } | null {
  const result = tryRotate(board, piece, direction);

  if (result.success && result.newPiece) {
    return {
      piece: result.newPiece,
      wasWallKick: result.wasWallKick,
      kickIndex: result.kickIndex,
    };
  }

  return null;
}
