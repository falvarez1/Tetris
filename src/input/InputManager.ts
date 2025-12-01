/**
 * Input Manager
 * Handles keyboard input and converts to game actions with DAS/ARR
 */

import { InputActions } from '../core/engine/GameLoop';

/**
 * Key binding configuration
 */
export interface KeyBindings {
  moveLeft: string[];
  moveRight: string[];
  softDrop: string[];
  hardDrop: string[];
  rotateCW: string[];
  rotateCCW: string[];
  rotate180: string[];
  hold: string[];
  pause: string[];
  restart: string[];
  toggleCRT: string[];
  toggleDebug: string[];
  toggleMusic: string[];
  nextTrack: string[];
}

/**
 * Default key bindings
 */
export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveLeft: ['ArrowLeft', 'KeyA'],
  moveRight: ['ArrowRight', 'KeyD'],
  softDrop: ['ArrowDown', 'KeyS'],
  hardDrop: ['Space'],
  rotateCW: ['ArrowUp', 'KeyX'],
  rotateCCW: ['KeyZ', 'ControlLeft', 'ControlRight'],
  rotate180: ['KeyW'],
  hold: ['KeyC', 'ShiftLeft', 'ShiftRight'],
  pause: ['Escape', 'KeyP'],
  restart: ['KeyR'],
  toggleCRT: ['F2', 'Backquote'],  // F2 or ` key
  toggleDebug: ['F3'],  // Debug panel
  toggleMusic: ['KeyM'],  // M to toggle music
  nextTrack: ['KeyN'],  // N for next track
};

/**
 * Input timing configuration
 */
export interface InputConfig {
  das: number;  // Delayed Auto Shift (ms) - time before auto-repeat starts
  arr: number;  // Auto Repeat Rate (ms) - time between auto-repeats
}

export const DEFAULT_INPUT_CONFIG: InputConfig = {
  das: 167,  // ~10 frames at 60fps - standard Tetris DAS
  arr: 33,   // ~2 frames at 60fps - comfortable repeat rate
};

/**
 * Input Manager class - Queue-based for reliability
 */
export class InputManager {
  private bindings: KeyBindings;
  private config: InputConfig;

  // Currently pressed keys
  private keysDown: Set<string> = new Set();

  // Queued trigger actions (consumed once)
  private actionQueue: {
    rotateCW: boolean;
    rotateCCW: boolean;
    rotate180: boolean;
    hardDrop: boolean;
    hold: boolean;
  } = {
    rotateCW: false,
    rotateCCW: false,
    rotate180: false,
    hardDrop: false,
    hold: false,
  };

  // DAS state for horizontal movement
  private dasLeft = { charging: false, charged: false, time: 0 };
  private dasRight = { charging: false, charged: false, time: 0 };
  private lastMoveTime = 0;

  // Callbacks
  private onPauseCallback?: () => void;
  private onRestartCallback?: () => void;
  private onToggleCRTCallback?: () => void;
  private onToggleDebugCallback?: () => void;
  private onToggleMusicCallback?: () => void;
  private onNextTrackCallback?: () => void;

  constructor(
    bindings: KeyBindings = DEFAULT_KEY_BINDINGS,
    config: InputConfig = DEFAULT_INPUT_CONFIG
  ) {
    this.bindings = bindings;
    this.config = config;
  }

  /**
   * Initialize input listeners
   */
  init(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  /**
   * Cleanup input listeners
   */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }

  /**
   * Set pause callback
   */
  onPause(callback: () => void): void {
    this.onPauseCallback = callback;
  }

  /**
   * Set restart callback
   */
  onRestart(callback: () => void): void {
    this.onRestartCallback = callback;
  }

  /**
   * Set toggle CRT callback
   */
  onToggleCRT(callback: () => void): void {
    this.onToggleCRTCallback = callback;
  }

  /**
   * Set toggle debug callback
   */
  onToggleDebug(callback: () => void): void {
    this.onToggleDebugCallback = callback;
  }

  /**
   * Set toggle music callback
   */
  onToggleMusic(callback: () => void): void {
    this.onToggleMusicCallback = callback;
  }

  /**
   * Set next track callback
   */
  onNextTrack(callback: () => void): void {
    this.onNextTrackCallback = callback;
  }

  /**
   * Update input state and get actions for this frame
   */
  update(deltaMs: number): InputActions {
    const actions: InputActions = {
      moveLeft: false,
      moveRight: false,
      softDrop: false,
      hardDrop: false,
      rotateCW: false,
      rotateCCW: false,
      rotate180: false,
      hold: false,
    };

    // Consume queued trigger actions
    if (this.actionQueue.rotateCW) {
      actions.rotateCW = true;
      this.actionQueue.rotateCW = false;
    }
    if (this.actionQueue.rotateCCW) {
      actions.rotateCCW = true;
      this.actionQueue.rotateCCW = false;
    }
    if (this.actionQueue.rotate180) {
      actions.rotate180 = true;
      this.actionQueue.rotate180 = false;
    }
    if (this.actionQueue.hardDrop) {
      actions.hardDrop = true;
      this.actionQueue.hardDrop = false;
    }
    if (this.actionQueue.hold) {
      actions.hold = true;
      this.actionQueue.hold = false;
    }

    // Check soft drop (held)
    if (this.isDown(this.bindings.softDrop)) {
      actions.softDrop = true;
    }

    // Process horizontal movement with DAS/ARR
    const leftHeld = this.isDown(this.bindings.moveLeft);
    const rightHeld = this.isDown(this.bindings.moveRight);

    // Update DAS for left
    if (leftHeld && !rightHeld) {
      if (!this.dasLeft.charging) {
        // Just started pressing - move immediately
        actions.moveLeft = true;
        this.dasLeft.charging = true;
        this.dasLeft.charged = false;
        this.dasLeft.time = 0;
      } else {
        this.dasLeft.time += deltaMs;
        if (this.dasLeft.time >= this.config.das) {
          this.dasLeft.charged = true;
        }
        if (this.dasLeft.charged) {
          // ARR phase
          if (this.config.arr === 0) {
            actions.moveLeft = true; // Move every frame
          } else {
            this.lastMoveTime += deltaMs;
            if (this.lastMoveTime >= this.config.arr) {
              actions.moveLeft = true;
              this.lastMoveTime = 0;
            }
          }
        }
      }
      // Reset right DAS when left is held
      this.dasRight = { charging: false, charged: false, time: 0 };
    }
    // Update DAS for right
    else if (rightHeld && !leftHeld) {
      if (!this.dasRight.charging) {
        // Just started pressing - move immediately
        actions.moveRight = true;
        this.dasRight.charging = true;
        this.dasRight.charged = false;
        this.dasRight.time = 0;
      } else {
        this.dasRight.time += deltaMs;
        if (this.dasRight.time >= this.config.das) {
          this.dasRight.charged = true;
        }
        if (this.dasRight.charged) {
          // ARR phase
          if (this.config.arr === 0) {
            actions.moveRight = true; // Move every frame
          } else {
            this.lastMoveTime += deltaMs;
            if (this.lastMoveTime >= this.config.arr) {
              actions.moveRight = true;
              this.lastMoveTime = 0;
            }
          }
        }
      }
      // Reset left DAS when right is held
      this.dasLeft = { charging: false, charged: false, time: 0 };
    }
    // Neither held - reset both
    else {
      this.dasLeft = { charging: false, charged: false, time: 0 };
      this.dasRight = { charging: false, charged: false, time: 0 };
      this.lastMoveTime = 0;
    }

    return actions;
  }

  /**
   * Check if any of the keys in the array is currently held down
   */
  private isDown(keys: string[]): boolean {
    return keys.some(key => this.keysDown.has(key));
  }

  /**
   * Handle keydown event
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.code;

    // Prevent default for game keys
    if (this.isGameKey(key)) {
      event.preventDefault();
    }

    // Track if this is a new press (not a repeat)
    if (!this.keysDown.has(key)) {
      this.keysDown.add(key);

      // Queue trigger actions immediately on keydown
      if (this.bindings.rotateCW.includes(key)) {
        this.actionQueue.rotateCW = true;
      }
      if (this.bindings.rotateCCW.includes(key)) {
        this.actionQueue.rotateCCW = true;
      }
      if (this.bindings.rotate180.includes(key)) {
        this.actionQueue.rotate180 = true;
      }
      if (this.bindings.hardDrop.includes(key)) {
        this.actionQueue.hardDrop = true;
      }
      if (this.bindings.hold.includes(key)) {
        this.actionQueue.hold = true;
      }

      // Check for pause
      if (this.bindings.pause.includes(key)) {
        this.onPauseCallback?.();
      }

      // Check for restart
      if (this.bindings.restart.includes(key)) {
        this.onRestartCallback?.();
      }

      // Check for toggle CRT
      if (this.bindings.toggleCRT.includes(key)) {
        this.onToggleCRTCallback?.();
      }

      // Check for toggle debug
      if (this.bindings.toggleDebug.includes(key)) {
        this.onToggleDebugCallback?.();
      }

      // Check for toggle music
      if (this.bindings.toggleMusic.includes(key)) {
        this.onToggleMusicCallback?.();
      }

      // Check for next track
      if (this.bindings.nextTrack.includes(key)) {
        this.onNextTrackCallback?.();
      }
    }
  };

  /**
   * Handle keyup event
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    const key = event.code;
    this.keysDown.delete(key);
  };

  /**
   * Handle window blur (release all keys)
   */
  private handleBlur = (): void => {
    this.keysDown.clear();
    this.dasLeft = { charging: false, charged: false, time: 0 };
    this.dasRight = { charging: false, charged: false, time: 0 };
    this.actionQueue = {
      rotateCW: false,
      rotateCCW: false,
      rotate180: false,
      hardDrop: false,
      hold: false,
    };
  };

  /**
   * Check if a key is a game key (to prevent default)
   */
  private isGameKey(key: string): boolean {
    const allKeys = [
      ...this.bindings.moveLeft,
      ...this.bindings.moveRight,
      ...this.bindings.softDrop,
      ...this.bindings.hardDrop,
      ...this.bindings.rotateCW,
      ...this.bindings.rotateCCW,
      ...this.bindings.rotate180,
      ...this.bindings.hold,
      ...this.bindings.pause,
      ...this.bindings.toggleCRT,
      ...this.bindings.toggleDebug,
      ...this.bindings.toggleMusic,
      ...this.bindings.nextTrack,
    ];
    return allKeys.includes(key);
  }

  /**
   * Update key bindings
   */
  setBindings(bindings: Partial<KeyBindings>): void {
    this.bindings = { ...this.bindings, ...bindings };
  }

  /**
   * Update input config
   */
  setConfig(config: Partial<InputConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current bindings
   */
  getBindings(): KeyBindings {
    return { ...this.bindings };
  }

  /**
   * Get current config
   */
  getConfig(): InputConfig {
    return { ...this.config };
  }
}
