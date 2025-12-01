/**
 * Tetromino Types and SRS (Super Rotation System) Data
 */

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type RotationState = 0 | 1 | 2 | 3; // 0=spawn, 1=CW, 2=180, 3=CCW

export interface Position {
  x: number;
  y: number;
}

/**
 * Tetromino colors (neon theme defaults)
 */
export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: '#00FFFF', // Cyan
  O: '#FFFF00', // Yellow
  T: '#FF00FF', // Purple/Magenta
  S: '#00FF00', // Green
  Z: '#FF0000', // Red
  J: '#0000FF', // Blue
  L: '#FF8800', // Orange
};

/**
 * Tetromino shapes for each rotation state
 * Coordinates are relative to the piece center/pivot
 * Using standard SRS coordinates
 */
export const TETROMINO_SHAPES: Record<TetrominoType, Record<RotationState, Position[]>> = {
  I: {
    0: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
    1: [{ x: 1, y: -1 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
    2: [{ x: -1, y: 1 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    3: [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
  },
  O: {
    0: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    1: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    2: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    3: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  },
  T: {
    0: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }],
    1: [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }],
    2: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    3: [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }],
  },
  S: {
    0: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }],
    1: [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
    2: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }],
    3: [{ x: -1, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }],
  },
  Z: {
    0: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    1: [{ x: 1, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    2: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    3: [{ x: 0, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: -1, y: 1 }],
  },
  J: {
    0: [{ x: -1, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
    1: [{ x: 0, y: -1 }, { x: 1, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }],
    2: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
    3: [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }],
  },
  L: {
    0: [{ x: 1, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
    1: [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    2: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }],
    3: [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }],
  },
};

/**
 * SRS Wall Kick Data
 * Format: [from_rotation][to_rotation] = array of kick offsets to try
 */
type WallKickKey = '0->1' | '1->0' | '1->2' | '2->1' | '2->3' | '3->2' | '3->0' | '0->3';

// Standard wall kicks for J, L, S, T, Z pieces
export const WALL_KICKS_JLSTZ: Record<WallKickKey, Position[]> = {
  '0->1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  '1->0': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
  '1->2': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
  '2->1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
  '2->3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  '3->2': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  '3->0': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
  '0->3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
};

// Special wall kicks for I piece
export const WALL_KICKS_I: Record<WallKickKey, Position[]> = {
  '0->1': [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 }],
  '1->0': [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 }],
  '1->2': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 }],
  '2->1': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 }],
  '2->3': [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 }],
  '3->2': [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 }],
  '3->0': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 }],
  '0->3': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 }],
};

// O piece has no wall kicks (doesn't rotate)
export const WALL_KICKS_O: Record<WallKickKey, Position[]> = {
  '0->1': [{ x: 0, y: 0 }],
  '1->0': [{ x: 0, y: 0 }],
  '1->2': [{ x: 0, y: 0 }],
  '2->1': [{ x: 0, y: 0 }],
  '2->3': [{ x: 0, y: 0 }],
  '3->2': [{ x: 0, y: 0 }],
  '3->0': [{ x: 0, y: 0 }],
  '0->3': [{ x: 0, y: 0 }],
};

/**
 * Get wall kick data for a specific piece type
 */
export function getWallKicks(type: TetrominoType): Record<WallKickKey, Position[]> {
  if (type === 'I') return WALL_KICKS_I;
  if (type === 'O') return WALL_KICKS_O;
  return WALL_KICKS_JLSTZ;
}

/**
 * Get wall kick key for rotation direction
 */
export function getWallKickKey(from: RotationState, to: RotationState): WallKickKey {
  return `${from}->${to}` as WallKickKey;
}

/**
 * Active piece state during gameplay
 */
export interface ActivePiece {
  type: TetrominoType;
  position: Position;
  rotation: RotationState;
  ghostY: number; // Ghost piece Y position
  lockDelay: {
    active: boolean;
    remaining: number;
    moveResets: number;
    maxResets: number;
  };
  softDropCells: number;
}

/**
 * Piece bag for 7-bag randomizer
 */
export interface PieceBag {
  current: TetrominoType[];
  next: TetrominoType[];
  preview: TetrominoType[];
}

/**
 * Get absolute positions of blocks for a piece
 */
export function getPieceBlocks(piece: ActivePiece): Position[] {
  const shape = TETROMINO_SHAPES[piece.type][piece.rotation];
  return shape.map(offset => ({
    x: piece.position.x + offset.x,
    y: piece.position.y + offset.y,
  }));
}

/**
 * Create a new piece bag using 7-bag randomizer
 */
export function createBag(): TetrominoType[] {
  const pieces: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  // Fisher-Yates shuffle
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
  }
  return pieces;
}

/**
 * Create initial piece bag state
 */
export function createPieceBag(previewCount: number = 3): PieceBag {
  const current = createBag();
  const next = createBag();
  const preview: TetrominoType[] = [];

  // Fill preview from current and next bags
  const allPieces = [...current, ...next];
  for (let i = 0; i < previewCount && i < allPieces.length; i++) {
    preview.push(allPieces[i]);
  }

  return { current, next, preview };
}

/**
 * Get next piece from bag
 */
export function getNextPiece(bag: PieceBag): { piece: TetrominoType; newBag: PieceBag } {
  const newBag = { ...bag, current: [...bag.current], next: [...bag.next], preview: [...bag.preview] };

  // Get piece from current bag
  const piece = newBag.current.shift()!;

  // If current bag is empty, swap with next and create new next
  if (newBag.current.length === 0) {
    newBag.current = newBag.next;
    newBag.next = createBag();
  }

  // Update preview
  newBag.preview.shift();
  const allPieces = [...newBag.current, ...newBag.next];
  if (newBag.preview.length < bag.preview.length && allPieces.length > newBag.preview.length) {
    newBag.preview.push(allPieces[newBag.preview.length]);
  }

  return { piece, newBag };
}
