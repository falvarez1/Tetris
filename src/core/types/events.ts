/**
 * Game Event Types
 * Events emitted by game logic for consumption by renderer/audio
 */

import { TetrominoType, Position, RotationState } from './tetromino';
import { ClearEvent } from './scoring';

/**
 * All possible game events
 */
export type GameEvent =
  | PieceSpawnEvent
  | PieceMoveEvent
  | PieceRotateEvent
  | PieceLockEvent
  | PieceHoldEvent
  | HardDropEvent
  | SoftDropEvent
  | LinesClearEvent
  | LevelUpEvent
  | ComboEvent
  | BackToBackEvent
  | PerfectClearEvent
  | GameOverEvent
  | ChaosEvent
  | HeatChangeEvent
  | DangerZoneEvent;

export interface PieceSpawnEvent {
  type: 'piece-spawn';
  piece: TetrominoType;
}

export interface PieceMoveEvent {
  type: 'piece-move';
  direction: 'left' | 'right' | 'down';
  position: Position;
}

export interface PieceRotateEvent {
  type: 'piece-rotate';
  rotation: RotationState;
  wasWallKick: boolean;
  kickIndex: number;
}

export interface PieceLockEvent {
  type: 'piece-lock';
  positions: Position[];
  piece: TetrominoType;
}

export interface PieceHoldEvent {
  type: 'piece-hold';
  swapped: TetrominoType | null;
  held: TetrominoType;
}

export interface HardDropEvent {
  type: 'hard-drop';
  startY: number;
  endY: number;
  cells: number;
}

export interface SoftDropEvent {
  type: 'soft-drop';
  cells: number;
}

export interface LinesClearEvent {
  type: 'lines-clear';
  event: ClearEvent;
}

export interface LevelUpEvent {
  type: 'level-up';
  newLevel: number;
  previousLevel: number;
}

export interface ComboEvent {
  type: 'combo';
  count: number;
}

export interface BackToBackEvent {
  type: 'back-to-back';
  count: number;
}

export interface PerfectClearEvent {
  type: 'perfect-clear';
  points: number;
}

export interface GameOverEvent {
  type: 'game-over';
  finalScore: number;
  finalLevel: number;
  linesCleared: number;
}

export interface ChaosEvent {
  type: 'chaos-event';
  event: {
    id: string;
    eventType: ChaosEventType;
    intensity: number;
    duration: number;
    data?: Record<string, unknown>;
  };
}

export type ChaosEventType =
  | 'gravity-flip'
  | 'gravity-surge'
  | 'garbage-row'
  | 'glitch-piece'
  | 'board-shake'
  | 'color-swap'
  | 'invisible-drop'
  | 'narrow-well'
  | 'time-warp';

export interface HeatChangeEvent {
  type: 'heat-change';
  heat: number;
  delta: number;
  previousHeat: number;
}

export interface DangerZoneEvent {
  type: 'danger-zone';
  active: boolean;
  intensity: number; // 0-1 how high the stack is
}

/**
 * Event emitter interface
 */
export interface GameEventEmitter {
  emit(event: GameEvent): void;
  getEvents(): GameEvent[];
  clearEvents(): void;
}

/**
 * Create an event emitter for a single frame
 */
export function createEventEmitter(): GameEventEmitter {
  const events: GameEvent[] = [];

  return {
    emit(event: GameEvent) {
      events.push(event);
    },
    getEvents() {
      return [...events];
    },
    clearEvents() {
      events.length = 0;
    },
  };
}

/**
 * Event listener type
 */
export type GameEventListener<T extends GameEvent['type']> = (
  event: Extract<GameEvent, { type: T }>
) => void;

/**
 * Event bus for pub/sub
 */
export class EventBus {
  private listeners: Map<string, Set<GameEventListener<any>>> = new Map();

  on<T extends GameEvent['type']>(type: T, listener: GameEventListener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  off<T extends GameEvent['type']>(type: T, listener: GameEventListener<T>): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(event: GameEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }

  emitAll(events: GameEvent[]): void {
    events.forEach(event => this.emit(event));
  }

  clear(): void {
    this.listeners.clear();
  }
}
