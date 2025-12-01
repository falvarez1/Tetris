/**
 * Particle System for visual effects
 * Handles line clear explosions, combo effects, and other VFX
 */

import { Container, Graphics } from 'pixi.js';

/**
 * Individual particle
 */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  alpha: number;
  rotation: number;
  rotationSpeed: number;
  gravity: number;
  friction: number;
}

/**
 * Particle emitter configuration
 */
interface EmitterConfig {
  count: number;
  speed: { min: number; max: number };
  angle: { min: number; max: number };
  life: { min: number; max: number };
  size: { min: number; max: number };
  colors: number[];
  gravity: number;
  friction: number;
  fadeOut: boolean;
  shrink: boolean;
}

/**
 * Default emitter configurations
 */
const EMITTER_PRESETS: Record<string, EmitterConfig> = {
  lineClear: {
    count: 30,
    speed: { min: 200, max: 400 },
    angle: { min: 0, max: Math.PI * 2 },
    life: { min: 0.5, max: 1.0 },
    size: { min: 3, max: 8 },
    colors: [0xFF00FF, 0x00FFFF, 0xFFFF00, 0xFF6699],
    gravity: 300,
    friction: 0.98,
    fadeOut: true,
    shrink: true,
  },
  tetris: {
    count: 80,
    speed: { min: 300, max: 600 },
    angle: { min: 0, max: Math.PI * 2 },
    life: { min: 0.8, max: 1.5 },
    size: { min: 4, max: 12 },
    colors: [0xFF00FF, 0x00FFFF, 0xFFFF00, 0xFF6699, 0xFFFFFF],
    gravity: 200,
    friction: 0.97,
    fadeOut: true,
    shrink: true,
  },
  combo: {
    count: 20,
    speed: { min: 100, max: 250 },
    angle: { min: -Math.PI * 0.8, max: -Math.PI * 0.2 },
    life: { min: 0.4, max: 0.8 },
    size: { min: 2, max: 5 },
    colors: [0x00FFFF, 0x00FF00],
    gravity: -100,
    friction: 0.95,
    fadeOut: true,
    shrink: false,
  },
  levelUp: {
    count: 100,
    speed: { min: 150, max: 400 },
    angle: { min: 0, max: Math.PI * 2 },
    life: { min: 1.0, max: 2.0 },
    size: { min: 5, max: 15 },
    colors: [0xFFD700, 0xFFA500, 0xFFFF00, 0xFFFFFF],
    gravity: -50,
    friction: 0.99,
    fadeOut: true,
    shrink: true,
  },
  spark: {
    count: 5,
    speed: { min: 50, max: 150 },
    angle: { min: 0, max: Math.PI * 2 },
    life: { min: 0.2, max: 0.4 },
    size: { min: 2, max: 4 },
    colors: [0xFFFFFF, 0xFFFF00],
    gravity: 100,
    friction: 0.9,
    fadeOut: true,
    shrink: true,
  },
  dissolve: {
    count: 8,
    speed: { min: 30, max: 100 },
    angle: { min: -Math.PI * 0.75, max: -Math.PI * 0.25 }, // Upward drift
    life: { min: 0.4, max: 0.8 },
    size: { min: 2, max: 5 },
    colors: [0xFF00FF, 0x00FFFF, 0xFFFF00, 0xFFFFFF],
    gravity: -80, // Float upward
    friction: 0.92,
    fadeOut: true,
    shrink: true,
  },
  cellDissolve: {
    count: 12,
    speed: { min: 50, max: 150 },
    angle: { min: 0, max: Math.PI * 2 },
    life: { min: 0.3, max: 0.7 },
    size: { min: 2, max: 6 },
    colors: [], // Will use cell color
    gravity: -50,
    friction: 0.94,
    fadeOut: true,
    shrink: true,
  },
};

/**
 * Particle System manager
 */
export class ParticleSystem {
  private container: Container;
  private particles: Particle[] = [];
  private graphics: Graphics;
  private maxParticles: number = 500;

  constructor() {
    this.container = new Container();
    this.graphics = new Graphics();
    this.container.addChild(this.graphics);
  }

  /**
   * Get the container to add to the stage
   */
  getContainer(): Container {
    return this.container;
  }

  /**
   * Emit particles at a position
   */
  emit(x: number, y: number, preset: keyof typeof EMITTER_PRESETS): void {
    const config = EMITTER_PRESETS[preset];
    if (!config) return;

    for (let i = 0; i < config.count; i++) {
      if (this.particles.length >= this.maxParticles) {
        // Remove oldest particle
        this.particles.shift();
      }

      const angle = this.randomRange(config.angle.min, config.angle.max);
      const speed = this.randomRange(config.speed.min, config.speed.max);
      const life = this.randomRange(config.life.min, config.life.max);
      const size = this.randomRange(config.size.min, config.size.max);
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size,
        color,
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: config.gravity,
        friction: config.friction,
      });
    }
  }

  /**
   * Emit particles along a line (for line clears)
   */
  emitLine(startX: number, y: number, width: number, preset: keyof typeof EMITTER_PRESETS): void {
    const config = EMITTER_PRESETS[preset];
    if (!config) return;

    // Distribute particles along the line
    const spacing = width / config.count;
    for (let i = 0; i < config.count; i++) {
      const x = startX + i * spacing + spacing / 2;

      if (this.particles.length >= this.maxParticles) {
        this.particles.shift();
      }

      const angle = this.randomRange(config.angle.min, config.angle.max);
      const speed = this.randomRange(config.speed.min, config.speed.max);
      const life = this.randomRange(config.life.min, config.life.max);
      const size = this.randomRange(config.size.min, config.size.max);
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size,
        color,
        alpha: 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 10,
        gravity: config.gravity,
        friction: config.friction,
      });
    }
  }

  /**
   * Update all particles
   */
  update(deltaTime: number): void {
    const dt = deltaTime / 1000; // Convert to seconds

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Apply physics
      p.vy += p.gravity * dt;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed * dt;

      // Reduce life
      p.life -= dt;

      // Calculate life ratio for fade/shrink
      const lifeRatio = p.life / p.maxLife;
      p.alpha = lifeRatio;
      p.size *= 0.99; // Gradual shrink

      // Remove dead particles
      if (p.life <= 0 || p.size < 0.5) {
        this.particles.splice(i, 1);
      }
    }

    // Render particles
    this.render();
  }

  /**
   * Render all particles
   */
  private render(): void {
    this.graphics.clear();

    for (const p of this.particles) {
      // Calculate rotated diamond points
      const s = p.size / 2;
      const cos = Math.cos(p.rotation);
      const sin = Math.sin(p.rotation);

      // Diamond vertices rotated around particle center
      const top = { x: p.x + (-sin * s), y: p.y + (-cos * s) };
      const right = { x: p.x + (cos * s), y: p.y + (-sin * s) };
      const bottom = { x: p.x + (sin * s), y: p.y + (cos * s) };
      const left = { x: p.x + (-cos * s), y: p.y + (sin * s) };

      // Draw diamond shape
      this.graphics.moveTo(top.x, top.y);
      this.graphics.lineTo(right.x, right.y);
      this.graphics.lineTo(bottom.x, bottom.y);
      this.graphics.lineTo(left.x, left.y);
      this.graphics.closePath();
      this.graphics.fill({ color: p.color, alpha: p.alpha });

      // Add glow effect for larger particles
      if (p.size > 4) {
        this.graphics.circle(p.x, p.y, p.size);
        this.graphics.fill({ color: p.color, alpha: p.alpha * 0.3 });
      }
    }
  }

  /**
   * Emit dissolve particles for a single cell with custom color
   * Creates a pixelated dissolve effect for the cell
   */
  emitCellDissolve(x: number, y: number, cellSize: number, cellColor: number, delay: number = 0): void {
    const config = EMITTER_PRESETS.cellDissolve;
    if (!config) return;

    // Delay the emission for staggered effect
    setTimeout(() => {
      // Emit particles across the cell area
      for (let i = 0; i < config.count; i++) {
        if (this.particles.length >= this.maxParticles) {
          this.particles.shift();
        }

        // Random position within the cell
        const px = x + Math.random() * cellSize;
        const py = y + Math.random() * cellSize;

        const angle = this.randomRange(config.angle.min, config.angle.max);
        const speed = this.randomRange(config.speed.min, config.speed.max);
        const life = this.randomRange(config.life.min, config.life.max);
        const size = this.randomRange(config.size.min, config.size.max);

        // Use cell color with some variation
        const useWhite = Math.random() < 0.3; // 30% white sparkles
        const color = useWhite ? 0xFFFFFF : cellColor;

        this.particles.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life,
          maxLife: life,
          size,
          color,
          alpha: 1,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 10,
          gravity: config.gravity,
          friction: config.friction,
        });
      }
    }, delay);
  }

  /**
   * Emit dissolve effect across a row of cells (sweeping left to right)
   */
  emitRowDissolve(
    startX: number,
    y: number,
    cellSize: number,
    cellCount: number,
    colors: (number | null)[]
  ): void {
    const sweepDelay = 30; // ms between each cell

    for (let i = 0; i < cellCount; i++) {
      const cellX = startX + i * cellSize;
      const cellColor = colors[i] || 0xFF00FF; // Default to magenta if no color

      // Stagger the dissolve from left to right
      this.emitCellDissolve(cellX, y, cellSize, cellColor, i * sweepDelay);
    }
  }

  /**
   * Random number in range
   */
  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Get particle count (for debugging)
   */
  getParticleCount(): number {
    return this.particles.length;
  }

  /**
   * Clear all particles
   */
  clear(): void {
    this.particles = [];
    this.graphics.clear();
  }

  /**
   * Destroy the particle system
   */
  destroy(): void {
    this.clear();
    this.container.destroy({ children: true });
  }
}
