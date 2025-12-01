/**
 * Chaos Manager
 * Manages random chaos events during gameplay
 */

import { GameState } from '../types/gameState';
import { BoardState, cellKey, parseKey } from '../types/board';

/**
 * Chaos event types
 */
export type ChaosEventType =
  | 'gravitySurge'     // Pieces fall 3x faster
  | 'garbageRain'      // Random garbage lines rise from bottom
  | 'pieceFreeze'      // Current piece freezes momentarily
  | 'boardShake'       // Screen shakes violently
  | 'blackout'         // Board goes dark except active piece
  | 'speedFlip'        // Controls temporarily reversed
  | 'bonusClear'       // Clear all gray blocks
  | 'windGust';        // Pieces drift left or right

/**
 * Active chaos event
 */
export interface ActiveChaosEvent {
  type: ChaosEventType;
  startTime: number;
  duration: number;
  data?: any;
}

/**
 * Chaos event definition
 */
interface ChaosEventDef {
  type: ChaosEventType;
  name: string;
  duration: number;  // ms
  probability: number;  // relative weight
  instant: boolean;  // if true, applies immediately and ends
}

/**
 * Chaos event definitions
 */
const CHAOS_EVENTS: ChaosEventDef[] = [
  { type: 'gravitySurge', name: 'GRAVITY SURGE', duration: 8000, probability: 15, instant: false },
  { type: 'garbageRain', name: 'GARBAGE RAIN', duration: 0, probability: 12, instant: true },
  { type: 'pieceFreeze', name: 'FREEZE', duration: 2000, probability: 10, instant: false },
  { type: 'boardShake', name: 'EARTHQUAKE', duration: 5000, probability: 15, instant: false },
  { type: 'blackout', name: 'BLACKOUT', duration: 6000, probability: 10, instant: false },
  { type: 'speedFlip', name: 'REVERSED', duration: 5000, probability: 8, instant: false },
  { type: 'bonusClear', name: 'BONUS CLEAR', duration: 0, probability: 5, instant: true },
  { type: 'windGust', name: 'WIND GUST', duration: 4000, probability: 12, instant: false },
];

/**
 * Chaos Manager class
 */
export class ChaosManager {
  private enabled: boolean = false;
  private activeEvents: ActiveChaosEvent[] = [];
  private lastEventTime: number = 0;
  private eventCooldown: number = 15000;  // Min time between events (ms)
  private maxEventCooldown: number = 30000;  // Max time between events (ms)
  private currentCooldown: number = 15000;
  private warningCallback?: (event: ChaosEventType, name: string) => void;
  private eventCallback?: (event: ChaosEventType, name: string) => void;
  private eventEndCallback?: (event: ChaosEventType) => void;

  /**
   * Enable chaos mode
   */
  enable(): void {
    this.enabled = true;
    this.activeEvents = [];
    this.lastEventTime = performance.now();
    this.currentCooldown = this.randomCooldown();
  }

  /**
   * Disable chaos mode
   */
  disable(): void {
    this.enabled = false;
    this.activeEvents = [];
  }

  /**
   * Set warning callback (called before event triggers)
   */
  onWarning(callback: (event: ChaosEventType, name: string) => void): void {
    this.warningCallback = callback;
  }

  /**
   * Set event start callback
   */
  onEventStart(callback: (event: ChaosEventType, name: string) => void): void {
    this.eventCallback = callback;
  }

  /**
   * Set event end callback
   */
  onEventEnd(callback: (event: ChaosEventType) => void): void {
    this.eventEndCallback = callback;
  }

  /**
   * Get random cooldown between events
   */
  private randomCooldown(): number {
    return this.eventCooldown + Math.random() * (this.maxEventCooldown - this.eventCooldown);
  }

  /**
   * Update chaos manager
   */
  update(currentTime: number, state: GameState): ChaosModifiers {
    const modifiers: ChaosModifiers = {
      gravityMultiplier: 1,
      controlsReversed: false,
      pieceFreeze: false,
      shakeIntensity: 0,
      blackout: false,
      windDirection: 0,
    };

    if (!this.enabled || state.phase !== 'playing') {
      return modifiers;
    }

    // Check for expired events
    for (let i = this.activeEvents.length - 1; i >= 0; i--) {
      const event = this.activeEvents[i];
      if (currentTime - event.startTime >= event.duration) {
        this.eventEndCallback?.(event.type);
        this.activeEvents.splice(i, 1);
      }
    }

    // Check if it's time for a new event
    if (currentTime - this.lastEventTime >= this.currentCooldown) {
      this.triggerRandomEvent(currentTime);
      this.lastEventTime = currentTime;
      this.currentCooldown = this.randomCooldown();
    }

    // Apply active event modifiers
    for (const event of this.activeEvents) {
      switch (event.type) {
        case 'gravitySurge':
          modifiers.gravityMultiplier = 3;
          break;
        case 'pieceFreeze':
          modifiers.pieceFreeze = true;
          break;
        case 'boardShake':
          modifiers.shakeIntensity = 15;
          break;
        case 'blackout':
          modifiers.blackout = true;
          break;
        case 'speedFlip':
          modifiers.controlsReversed = true;
          break;
        case 'windGust':
          modifiers.windDirection = event.data?.direction || 0;
          break;
      }
    }

    return modifiers;
  }

  /**
   * Trigger a random chaos event
   */
  private triggerRandomEvent(_currentTime: number): void {
    const event = this.selectRandomEvent();
    if (!event) return;

    const eventDef = CHAOS_EVENTS.find(e => e.type === event);
    if (!eventDef) return;

    // Trigger warning first
    this.warningCallback?.(event, eventDef.name);

    // Trigger event after brief warning
    setTimeout(() => {
      this.eventCallback?.(event, eventDef.name);

      if (eventDef.instant) {
        // Instant events don't have duration
        this.eventEndCallback?.(event);
      } else {
        // Add to active events
        const activeEvent: ActiveChaosEvent = {
          type: event,
          startTime: performance.now(),
          duration: eventDef.duration,
        };

        // Add event-specific data
        if (event === 'windGust') {
          activeEvent.data = { direction: Math.random() < 0.5 ? -1 : 1 };
        }

        this.activeEvents.push(activeEvent);
      }
    }, 1500); // 1.5 second warning
  }

  /**
   * Select a random event based on probabilities
   */
  private selectRandomEvent(): ChaosEventType | null {
    const totalWeight = CHAOS_EVENTS.reduce((sum, e) => sum + e.probability, 0);
    let random = Math.random() * totalWeight;

    for (const event of CHAOS_EVENTS) {
      random -= event.probability;
      if (random <= 0) {
        return event.type;
      }
    }

    return CHAOS_EVENTS[0].type;
  }

  /**
   * Check if an event is currently active
   */
  isEventActive(type: ChaosEventType): boolean {
    return this.activeEvents.some(e => e.type === type);
  }

  /**
   * Get all active events
   */
  getActiveEvents(): ActiveChaosEvent[] {
    return [...this.activeEvents];
  }

  /**
   * Apply garbage rain to board
   */
  applyGarbageRain(board: BoardState): BoardState {
    const garbageCount = 1 + Math.floor(Math.random() * 2); // 1-2 lines
    const newCells = new Map<string, { type: 'I'; special: 'garbage' }>();
    const totalHeight = board.config.height + board.config.bufferRows;

    // Shift all existing cells up by garbageCount
    for (const [key, cell] of board.cells) {
      const pos = parseKey(key);
      const newY = pos.y + garbageCount;

      // Only keep cells that fit within bounds
      if (newY < totalHeight) {
        newCells.set(cellKey(pos.x, newY), cell as { type: 'I'; special: 'garbage' });
      }
    }

    // Add garbage rows at the bottom with one random gap per row
    for (let y = 0; y < garbageCount; y++) {
      const gapPosition = Math.floor(Math.random() * board.config.width);
      for (let x = 0; x < board.config.width; x++) {
        if (x !== gapPosition) {
          newCells.set(cellKey(x, y), { type: 'I', special: 'garbage' });
        }
      }
    }

    return {
      ...board,
      cells: newCells,
      lastModified: Date.now(),
    };
  }

  /**
   * Apply bonus clear to board (remove all garbage blocks)
   */
  applyBonusClear(board: BoardState): BoardState {
    const newCells = new Map(board.cells);

    // Remove all garbage cells
    for (const [key, cell] of board.cells) {
      if (cell.special === 'garbage') {
        newCells.delete(key);
      }
    }

    return {
      ...board,
      cells: newCells,
      lastModified: Date.now(),
    };
  }

  /**
   * Check if chaos mode is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

/**
 * Modifiers applied by active chaos events
 */
export interface ChaosModifiers {
  gravityMultiplier: number;
  controlsReversed: boolean;
  pieceFreeze: boolean;
  shakeIntensity: number;
  blackout: boolean;
  windDirection: number;  // -1 = left, 0 = none, 1 = right
}

// Singleton
let chaosManagerInstance: ChaosManager | null = null;

export function getChaosManager(): ChaosManager {
  if (!chaosManagerInstance) {
    chaosManagerInstance = new ChaosManager();
  }
  return chaosManagerInstance;
}
