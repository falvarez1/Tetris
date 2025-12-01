/**
 * Screen Effects Manager
 * Handles screen shake, flash, pulse, and other visual feedback effects
 */

import { Container, Graphics, ColorMatrixFilter } from 'pixi.js';

/**
 * Shake effect configuration
 */
interface ShakeConfig {
  intensity: number;
  duration: number;
  decay: number;
}

/**
 * Flash effect configuration
 */
interface FlashConfig {
  color: number;
  alpha: number;
  duration: number;
}

/**
 * Active effect tracking
 */
interface ActiveShake {
  intensity: number;
  duration: number;
  elapsed: number;
  decay: number;
}

interface ActiveFlash {
  color: number;
  alpha: number;
  duration: number;
  elapsed: number;
}

interface ActivePulse {
  scale: number;
  duration: number;
  elapsed: number;
}

/**
 * Screen transition types
 */
export type TransitionType = 'fade' | 'wipe' | 'scanline' | 'glitch';

interface ActiveTransition {
  type: TransitionType;
  direction: 'in' | 'out';
  duration: number;
  elapsed: number;
  color: number;
  onComplete?: () => void;
}

/**
 * Screen Effects presets
 */
export const EFFECT_PRESETS = {
  // Shake presets
  shake: {
    single: { intensity: 3, duration: 100, decay: 0.9 },
    double: { intensity: 5, duration: 150, decay: 0.85 },
    triple: { intensity: 8, duration: 200, decay: 0.8 },
    tetris: { intensity: 15, duration: 300, decay: 0.75 },
    hardDrop: { intensity: 4, duration: 80, decay: 0.92 },
    levelUp: { intensity: 10, duration: 400, decay: 0.85 },
  },
  // Flash presets
  flash: {
    lineClear: { color: 0xFFFFFF, alpha: 0.3, duration: 100 },
    tetris: { color: 0xFF00FF, alpha: 0.5, duration: 200 },
    combo: { color: 0x00FFFF, alpha: 0.4, duration: 150 },
    levelUp: { color: 0xFFD700, alpha: 0.6, duration: 300 },
    gameOver: { color: 0xFF0000, alpha: 0.7, duration: 500 },
  },
};

/**
 * Screen Effects Manager class
 */
export class ScreenEffects {
  private targetContainer: Container;
  private flashOverlay: Graphics;
  private width: number;
  private height: number;

  // Active effects
  private activeShakes: ActiveShake[] = [];
  private activeFlashes: ActiveFlash[] = [];
  private activePulse: ActivePulse | null = null;

  // Original position for shake
  private originalX: number = 0;
  private originalY: number = 0;

  // Color matrix filter for effects
  private colorFilter: ColorMatrixFilter;
  private saturationBoost: number = 0;

  // Intensity multipliers (for debug panel control)
  private shakeMultiplier: number = 1.0;
  private flashMultiplier: number = 1.0;

  // Transition state
  private transitionOverlay: Graphics;
  private activeTransition: ActiveTransition | null = null;
  private scanlineOffset: number = 0;

  constructor(container: Container, width: number, height: number) {
    this.targetContainer = container;
    this.width = width;
    this.height = height;

    // Store original position
    this.originalX = container.x;
    this.originalY = container.y;

    // Create flash overlay
    this.flashOverlay = new Graphics();
    this.flashOverlay.rect(0, 0, width, height);
    this.flashOverlay.fill({ color: 0xFFFFFF, alpha: 0 });
    this.flashOverlay.visible = false;

    // Create color matrix filter
    this.colorFilter = new ColorMatrixFilter();

    // Create transition overlay
    this.transitionOverlay = new Graphics();
    this.transitionOverlay.rect(0, 0, width, height);
    this.transitionOverlay.fill({ color: 0x0D0221, alpha: 0 });
    this.transitionOverlay.visible = false;
  }

  /**
   * Get the flash overlay to add to stage
   */
  getFlashOverlay(): Graphics {
    return this.flashOverlay;
  }

  /**
   * Get the color filter to add to stage
   */
  getColorFilter(): ColorMatrixFilter {
    return this.colorFilter;
  }

  /**
   * Get the transition overlay to add to stage
   */
  getTransitionOverlay(): Graphics {
    return this.transitionOverlay;
  }

  /**
   * Start a screen transition
   */
  transition(
    type: TransitionType,
    direction: 'in' | 'out',
    duration: number = 500,
    color: number = 0x0D0221,
    onComplete?: () => void
  ): void {
    this.activeTransition = {
      type,
      direction,
      duration,
      elapsed: 0,
      color,
      onComplete,
    };
    this.transitionOverlay.visible = true;
  }

  /**
   * Fade to black then execute callback and fade back
   */
  fadeTransition(onMidpoint: () => void, duration: number = 600): void {
    this.transition('fade', 'out', duration / 2, 0x0D0221, () => {
      onMidpoint();
      this.transition('fade', 'in', duration / 2, 0x0D0221);
    });
  }

  /**
   * Scanline wipe transition (retro CRT style)
   */
  scanlineTransition(onMidpoint: () => void, duration: number = 800): void {
    this.transition('scanline', 'out', duration / 2, 0x0D0221, () => {
      onMidpoint();
      this.transition('scanline', 'in', duration / 2, 0x0D0221);
    });
  }

  /**
   * Glitch transition effect
   */
  glitchTransition(onMidpoint: () => void, duration: number = 400): void {
    this.transition('glitch', 'out', duration / 2, 0xFF00FF, () => {
      onMidpoint();
      this.transition('glitch', 'in', duration / 2, 0xFF00FF);
    });
  }

  /**
   * Check if a transition is active
   */
  isTransitioning(): boolean {
    return this.activeTransition !== null;
  }

  /**
   * Trigger screen shake
   */
  shake(preset: keyof typeof EFFECT_PRESETS.shake | ShakeConfig): void {
    const config = typeof preset === 'string'
      ? EFFECT_PRESETS.shake[preset]
      : preset;

    this.activeShakes.push({
      intensity: config.intensity * this.shakeMultiplier,
      duration: config.duration,
      elapsed: 0,
      decay: config.decay,
    });
  }

  /**
   * Trigger screen flash
   */
  flash(preset: keyof typeof EFFECT_PRESETS.flash | FlashConfig): void {
    const config = typeof preset === 'string'
      ? EFFECT_PRESETS.flash[preset]
      : preset;

    this.activeFlashes.push({
      color: config.color,
      alpha: config.alpha * this.flashMultiplier,
      duration: config.duration,
      elapsed: 0,
    });

    this.flashOverlay.visible = true;
  }

  /**
   * Trigger pulse effect (scale bounce)
   */
  pulse(scale: number = 1.02, duration: number = 200): void {
    this.activePulse = {
      scale,
      duration,
      elapsed: 0,
    };
  }

  /**
   * Enable chromatic aberration effect (placeholder for future implementation)
   */
  enableChromatic(_intensity: number = 3): void {
    // Chromatic aberration effect not yet implemented
  }

  /**
   * Disable chromatic aberration (placeholder for future implementation)
   */
  disableChromatic(): void {
    // Chromatic aberration effect not yet implemented
  }

  /**
   * Boost saturation temporarily
   */
  boostSaturation(amount: number = 0.3, duration: number = 200): void {
    this.saturationBoost = amount;
    setTimeout(() => {
      this.saturationBoost = 0;
    }, duration);
  }

  /**
   * Trigger effects for line clear
   */
  onLineClear(linesCleared: number): void {
    switch (linesCleared) {
      case 1:
        this.shake('single');
        this.flash('lineClear');
        break;
      case 2:
        this.shake('double');
        this.flash('lineClear');
        this.boostSaturation(0.2, 150);
        break;
      case 3:
        this.shake('triple');
        this.flash('lineClear');
        this.boostSaturation(0.3, 200);
        break;
      case 4:
        // TETRIS!
        this.shake('tetris');
        this.flash('tetris');
        this.pulse(1.03, 300);
        this.boostSaturation(0.5, 300);
        this.enableChromatic(5);
        setTimeout(() => this.disableChromatic(), 300);
        break;
    }
  }

  /**
   * Trigger effects for combo
   */
  onCombo(comboCount: number): void {
    if (comboCount > 2) {
      this.flash('combo');
      this.shake({
        intensity: Math.min(comboCount * 2, 12),
        duration: 100 + comboCount * 20,
        decay: 0.85
      });
    }
  }

  /**
   * Trigger effects for hard drop
   */
  onHardDrop(distance: number): void {
    if (distance > 2) {
      this.shake({
        intensity: Math.min(distance * 0.5, 6),
        duration: 60 + distance * 5,
        decay: 0.9,
      });
    }
  }

  /**
   * Trigger effects for level up
   */
  onLevelUp(): void {
    this.shake('levelUp');
    this.flash('levelUp');
    this.pulse(1.05, 400);
    this.boostSaturation(0.4, 400);
  }

  /**
   * Update all active effects
   */
  update(deltaMs: number): void {
    // Update shakes
    this.updateShakes(deltaMs);

    // Update flashes
    this.updateFlashes(deltaMs);

    // Update pulse
    this.updatePulse(deltaMs);

    // Update color filter
    this.updateColorFilter();

    // Update transitions
    this.updateTransition(deltaMs);
  }

  /**
   * Update active shake effects
   */
  private updateShakes(deltaMs: number): void {
    let totalOffsetX = 0;
    let totalOffsetY = 0;

    for (let i = this.activeShakes.length - 1; i >= 0; i--) {
      const shake = this.activeShakes[i];
      shake.elapsed += deltaMs;

      if (shake.elapsed >= shake.duration) {
        this.activeShakes.splice(i, 1);
        continue;
      }

      // Calculate remaining intensity with decay
      const progress = shake.elapsed / shake.duration;
      const currentIntensity = shake.intensity * Math.pow(shake.decay, progress * 10);

      // Random offset
      totalOffsetX += (Math.random() - 0.5) * 2 * currentIntensity;
      totalOffsetY += (Math.random() - 0.5) * 2 * currentIntensity;
    }

    // Apply combined shake offset
    this.targetContainer.x = this.originalX + totalOffsetX;
    this.targetContainer.y = this.originalY + totalOffsetY;

    // Reset position if no active shakes
    if (this.activeShakes.length === 0) {
      this.targetContainer.x = this.originalX;
      this.targetContainer.y = this.originalY;
    }
  }

  /**
   * Update active flash effects
   */
  private updateFlashes(deltaMs: number): void {
    if (this.activeFlashes.length === 0) {
      this.flashOverlay.visible = false;
      return;
    }

    let maxAlpha = 0;
    let dominantColor = 0xFFFFFF;

    for (let i = this.activeFlashes.length - 1; i >= 0; i--) {
      const flash = this.activeFlashes[i];
      flash.elapsed += deltaMs;

      if (flash.elapsed >= flash.duration) {
        this.activeFlashes.splice(i, 1);
        continue;
      }

      // Calculate current alpha (fade out)
      const progress = flash.elapsed / flash.duration;
      const currentAlpha = flash.alpha * (1 - progress);

      if (currentAlpha > maxAlpha) {
        maxAlpha = currentAlpha;
        dominantColor = flash.color;
      }
    }

    // Update flash overlay
    this.flashOverlay.clear();
    this.flashOverlay.rect(0, 0, this.width, this.height);
    this.flashOverlay.fill({ color: dominantColor, alpha: maxAlpha });
    this.flashOverlay.visible = maxAlpha > 0;
  }

  /**
   * Update pulse effect
   */
  private updatePulse(deltaMs: number): void {
    if (!this.activePulse) {
      return;
    }

    this.activePulse.elapsed += deltaMs;

    if (this.activePulse.elapsed >= this.activePulse.duration) {
      this.activePulse = null;
      // Reset scale, pivot, and position back to original
      this.targetContainer.scale.set(1);
      this.targetContainer.pivot.set(0, 0);
      this.targetContainer.position.set(this.originalX, this.originalY);
      return;
    }

    // Ease out sine for smooth pulse
    const progress = this.activePulse.elapsed / this.activePulse.duration;
    const eased = Math.sin(progress * Math.PI);
    const currentScale = 1 + (this.activePulse.scale - 1) * eased;

    this.targetContainer.scale.set(currentScale);
    this.targetContainer.pivot.set(this.width / 2, this.height / 2);
    this.targetContainer.position.set(this.width / 2, this.height / 2);
  }

  /**
   * Update color filter effects
   */
  private updateColorFilter(): void {
    this.colorFilter.reset();

    // Apply saturation boost
    if (this.saturationBoost > 0) {
      this.colorFilter.saturate(this.saturationBoost, true);
    }

    // Apply brightness boost during effects
    if (this.activeFlashes.length > 0) {
      this.colorFilter.brightness(1.1, true);
    }
  }

  /**
   * Update transition effects
   */
  private updateTransition(deltaMs: number): void {
    if (!this.activeTransition) {
      return;
    }

    this.activeTransition.elapsed += deltaMs;
    const t = this.activeTransition;
    const progress = Math.min(t.elapsed / t.duration, 1);

    // Ease function (ease in out quad)
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    // Calculate alpha based on direction
    let alpha: number;
    if (t.direction === 'out') {
      alpha = eased; // Fade to opaque
    } else {
      alpha = 1 - eased; // Fade to transparent
    }

    // Draw transition based on type
    this.transitionOverlay.clear();

    switch (t.type) {
      case 'fade':
        this.drawFadeTransition(t.color, alpha);
        break;
      case 'wipe':
        this.drawWipeTransition(t.color, t.direction === 'out' ? eased : 1 - eased);
        break;
      case 'scanline':
        this.drawScanlineTransition(t.color, alpha, deltaMs);
        break;
      case 'glitch':
        this.drawGlitchTransition(t.color, alpha);
        break;
    }

    // Check if transition is complete
    if (progress >= 1) {
      const onComplete = t.onComplete;
      if (t.direction === 'in') {
        // Fade in complete, hide overlay
        this.activeTransition = null;
        this.transitionOverlay.visible = false;
      } else {
        // Fade out complete, call callback then continue with fade in
        this.activeTransition = null;
      }
      if (onComplete) {
        onComplete();
      }
    }
  }

  /**
   * Draw fade transition
   */
  private drawFadeTransition(color: number, alpha: number): void {
    this.transitionOverlay.rect(0, 0, this.width, this.height);
    this.transitionOverlay.fill({ color, alpha });
  }

  /**
   * Draw wipe transition (horizontal sweep)
   */
  private drawWipeTransition(color: number, progress: number): void {
    const wipeWidth = this.width * progress;
    this.transitionOverlay.rect(0, 0, wipeWidth, this.height);
    this.transitionOverlay.fill({ color, alpha: 1 });

    // Add glow edge
    if (progress > 0 && progress < 1) {
      const edgeX = wipeWidth;
      this.transitionOverlay.rect(edgeX - 5, 0, 10, this.height);
      this.transitionOverlay.fill({ color: 0xFF00FF, alpha: 0.8 });
    }
  }

  /**
   * Draw scanline transition (retro CRT style)
   */
  private drawScanlineTransition(color: number, alpha: number, deltaMs: number): void {
    // Animate scanline offset
    this.scanlineOffset += deltaMs * 0.5;

    // Draw base fade
    this.transitionOverlay.rect(0, 0, this.width, this.height);
    this.transitionOverlay.fill({ color, alpha: alpha * 0.8 });

    // Draw animated scanlines
    const scanlineHeight = 4;
    const scanlineSpacing = 8;
    const numLines = Math.ceil(this.height / scanlineSpacing);

    for (let i = 0; i < numLines; i++) {
      const y = (i * scanlineSpacing + this.scanlineOffset) % this.height;
      this.transitionOverlay.rect(0, y, this.width, scanlineHeight);
      this.transitionOverlay.fill({ color: 0x000000, alpha: alpha * 0.5 });
    }
  }

  /**
   * Draw glitch transition
   */
  private drawGlitchTransition(color: number, alpha: number): void {
    // Draw base
    this.transitionOverlay.rect(0, 0, this.width, this.height);
    this.transitionOverlay.fill({ color, alpha: alpha * 0.7 });

    // Add glitch slices
    const numSlices = Math.floor(5 + Math.random() * 5);
    for (let i = 0; i < numSlices; i++) {
      const y = Math.random() * this.height;
      const h = 5 + Math.random() * 30;
      const offsetX = (Math.random() - 0.5) * 40;
      const sliceColor = Math.random() < 0.5 ? 0x00FFFF : 0xFF00FF;

      this.transitionOverlay.rect(offsetX, y, this.width, h);
      this.transitionOverlay.fill({ color: sliceColor, alpha: alpha * 0.6 });
    }

    // Add noise
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const size = 2 + Math.random() * 10;
      this.transitionOverlay.rect(x, y, size, size);
      this.transitionOverlay.fill({ color: 0xFFFFFF, alpha: alpha * 0.3 });
    }
  }

  /**
   * Resize the effects system
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    this.flashOverlay.clear();
    this.flashOverlay.rect(0, 0, width, height);
    this.flashOverlay.fill({ color: 0xFFFFFF, alpha: 0 });
  }

  /**
   * Clear all active effects
   */
  clear(): void {
    this.activeShakes = [];
    this.activeFlashes = [];
    this.activePulse = null;
    this.activeTransition = null;
    this.saturationBoost = 0;

    this.targetContainer.x = this.originalX;
    this.targetContainer.y = this.originalY;
    this.targetContainer.scale.set(1);
    this.flashOverlay.visible = false;
    this.transitionOverlay.visible = false;
  }

  /**
   * Set shake intensity multiplier
   */
  setShakeIntensity(multiplier: number): void {
    this.shakeMultiplier = multiplier;
  }

  /**
   * Set flash intensity multiplier
   */
  setFlashIntensity(multiplier: number): void {
    this.flashMultiplier = multiplier;
  }

  /**
   * Destroy the effects system
   */
  destroy(): void {
    this.clear();
    this.flashOverlay.destroy();
    this.transitionOverlay.destroy();
  }
}
