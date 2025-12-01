/**
 * Board State Types
 */

import { TetrominoType, Position } from './tetromino';

/**
 * Board configuration
 */
export interface BoardConfig {
  width: number;      // Default: 10
  height: number;     // Visible height, default: 20
  bufferRows: number; // Hidden rows above for spawning, default: 4
}

/**
 * Default board configuration
 */
export const DEFAULT_BOARD_CONFIG: BoardConfig = {
  width: 10,
  height: 20,
  bufferRows: 4,
};

/**
 * Cell state - represents a single cell on the board
 */
export interface CellState {
  type: TetrominoType;
  lockedAt?: number; // Timestamp when locked (for animations)
  special?: 'garbage' | 'glitch' | 'bomb'; // For Chaos mode
}

/**
 * Board state - the playing field
 */
export interface BoardState {
  config: BoardConfig;
  cells: Map<string, CellState>; // Key format: "x,y"
  pendingClearRows: number[];    // Rows waiting to be cleared (for animation)
  lastModified: number;
}

/**
 * Create cell key from position
 */
export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Parse cell key to position
 */
export function parseKey(key: string): Position {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

/**
 * Create an empty board
 */
export function createBoard(config: BoardConfig = DEFAULT_BOARD_CONFIG): BoardState {
  return {
    config,
    cells: new Map(),
    pendingClearRows: [],
    lastModified: Date.now(),
  };
}

/**
 * Get cell at position
 */
export function getCell(board: BoardState, x: number, y: number): CellState | null {
  return board.cells.get(cellKey(x, y)) ?? null;
}

/**
 * Set cell at position (returns new board state)
 */
export function setCell(
  board: BoardState,
  x: number,
  y: number,
  cell: CellState | null
): BoardState {
  const newCells = new Map(board.cells);
  const key = cellKey(x, y);

  if (cell === null) {
    newCells.delete(key);
  } else {
    newCells.set(key, cell);
  }

  return {
    ...board,
    cells: newCells,
    lastModified: Date.now(),
  };
}

/**
 * Check if position is valid (within board bounds)
 */
export function isValidPosition(board: BoardState, x: number, y: number): boolean {
  const totalHeight = board.config.height + board.config.bufferRows;
  return x >= 0 && x < board.config.width && y >= 0 && y < totalHeight;
}

/**
 * Check if cell is occupied
 */
export function isCellOccupied(board: BoardState, x: number, y: number): boolean {
  return board.cells.has(cellKey(x, y));
}

/**
 * Get all filled rows (rows with all cells occupied)
 */
export function getFilledRows(board: BoardState): number[] {
  const filledRows: number[] = [];
  const totalHeight = board.config.height + board.config.bufferRows;

  for (let y = 0; y < totalHeight; y++) {
    let filled = true;
    for (let x = 0; x < board.config.width; x++) {
      if (!isCellOccupied(board, x, y)) {
        filled = false;
        break;
      }
    }
    if (filled) {
      filledRows.push(y);
    }
  }

  return filledRows;
}

/**
 * Clear specified rows and drop cells above
 */
export function clearRows(board: BoardState, rows: number[]): BoardState {
  if (rows.length === 0) return board;

  const sortedRows = [...rows].sort((a, b) => b - a); // Sort descending
  const newCells = new Map<string, CellState>();
  const totalHeight = board.config.height + board.config.bufferRows;

  // For each column
  for (let x = 0; x < board.config.width; x++) {
    let writeY = 0;

    // For each row from bottom to top
    for (let readY = 0; readY < totalHeight; readY++) {
      // Skip cleared rows
      if (sortedRows.includes(readY)) continue;

      const cell = getCell(board, x, readY);
      if (cell) {
        newCells.set(cellKey(x, writeY), cell);
      }
      writeY++;
    }
  }

  return {
    ...board,
    cells: newCells,
    pendingClearRows: [],
    lastModified: Date.now(),
  };
}

/**
 * Lock a piece onto the board
 */
export function lockPiece(
  board: BoardState,
  positions: Position[],
  type: TetrominoType
): BoardState {
  let newBoard = board;
  const timestamp = Date.now();

  for (const pos of positions) {
    newBoard = setCell(newBoard, pos.x, pos.y, {
      type,
      lockedAt: timestamp,
    });
  }

  return newBoard;
}

/**
 * Get the highest occupied row (lowest Y value with a cell)
 * Returns -1 if board is empty
 */
export function getHighestOccupiedRow(board: BoardState): number {
  let highest = -1;

  for (const key of board.cells.keys()) {
    const pos = parseKey(key);
    if (highest === -1 || pos.y > highest) {
      highest = pos.y;
    }
  }

  return highest;
}

/**
 * Check if the board is in danger zone (stack is too high)
 */
export function isDangerZone(board: BoardState, threshold: number = 16): boolean {
  return getHighestOccupiedRow(board) >= threshold;
}

/**
 * Insert garbage rows from the bottom
 */
export function insertGarbageRows(
  board: BoardState,
  count: number,
  gapColumn: number
): BoardState {
  const newCells = new Map<string, CellState>();
  const totalHeight = board.config.height + board.config.bufferRows;

  // Move existing cells up
  for (const [key, cell] of board.cells) {
    const pos = parseKey(key);
    const newY = pos.y + count;

    // Only keep cells that fit
    if (newY < totalHeight) {
      newCells.set(cellKey(pos.x, newY), cell);
    }
  }

  // Add garbage rows at the bottom
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < board.config.width; x++) {
      if (x !== gapColumn) {
        newCells.set(cellKey(x, y), {
          type: 'I', // Garbage uses gray color typically
          special: 'garbage',
        });
      }
    }
  }

  return {
    ...board,
    cells: newCells,
    lastModified: Date.now(),
  };
}
