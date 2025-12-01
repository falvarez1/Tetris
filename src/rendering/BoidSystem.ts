/**
 * Boid Flocking System
 * Creates a mesmerizing starling murmuration effect in the background
 */

import { Container, Graphics, BlurFilter } from 'pixi.js';

/**
 * Individual boid entity
 */
interface Boid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  color: number;
  size: number;
  trail: { x: number; y: number; alpha: number }[];
  wanderAngle: number;  // For random wandering behavior
  noiseOffset: number;  // Unique noise offset per boid
}

/**
 * Boid system configuration
 */
interface BoidConfig {
  count: number;
  maxSpeed: number;
  maxForce: number;
  separationDistance: number;
  alignmentDistance: number;
  cohesionDistance: number;
  separationWeight: number;
  alignmentWeight: number;
  cohesionWeight: number;
  edgeMargin: number;
  edgeForce: number;
  trailLength: number;
  colors: number[];
}

const DEFAULT_CONFIG: BoidConfig = {
  count: 100,
  maxSpeed: 1.2,
  maxForce: 0.04,
  separationDistance: 35,
  alignmentDistance: 60,
  cohesionDistance: 100,
  separationWeight: 2.9,
  alignmentWeight: 0.6,
  cohesionWeight: 2.4,
  edgeMargin: 80,
  edgeForce: 0.3,
  trailLength: 5,
  colors: [0xFF00FF, 0x00FFFF, 0xFF66CC, 0x66FFFF, 0xFFAAFF],
};

/**
 * Boid Flocking System
 */
export class BoidSystem {
  private container: Container;
  private graphics: Graphics;
  private trailGraphics: Graphics;
  private boids: Boid[] = [];
  private config: BoidConfig;
  private width: number;
  private height: number;
  private time: number = 0;

  // Attractor points for interesting movement
  private attractors: { x: number; y: number; strength: number; radius: number }[] = [];

  constructor(width: number, height: number, config: Partial<BoidConfig> = {}) {
    this.width = width;
    this.height = height;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.container = new Container();
    this.trailGraphics = new Graphics();
    this.graphics = new Graphics();
    this.container.addChild(this.trailGraphics);
    this.container.addChild(this.graphics);

    // Add blur filter for dreamy effect - makes boids less distracting
    const blurFilter = new BlurFilter({ strength: 0.5, quality: 2 });
    this.container.filters = [blurFilter];
    this.container.alpha = 0.25;  // Make them subtle

    // Initialize boids
    this.initBoids();

    // Create dynamic attractors
    this.initAttractors();
  }

  /**
   * Initialize boid entities
   */
  private initBoids(): void {
    this.boids = [];

    for (let i = 0; i < this.config.count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * this.config.maxSpeed * 0.5 + this.config.maxSpeed * 0.5;

      this.boids.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        ax: 0,
        ay: 0,
        color: this.config.colors[Math.floor(Math.random() * this.config.colors.length)],
        size: Math.random() * 1.5 + 1.5,  // Smaller boids
        trail: [],
        wanderAngle: Math.random() * Math.PI * 2,
        noiseOffset: Math.random() * 1000,
      });
    }
  }

  /**
   * Initialize attractor points
   */
  private initAttractors(): void {
    // Create orbiting attractors
    this.attractors = [
      { x: this.width * 0.3, y: this.height * 0.3, strength: 0.02, radius: 200 },
      { x: this.width * 0.7, y: this.height * 0.7, strength: 0.02, radius: 200 },
      { x: this.width * 0.5, y: this.height * 0.5, strength: 0.015, radius: 300 },
    ];
  }

  /**
   * Get the container
   */
  getContainer(): Container {
    return this.container;
  }

  /**
   * Update boid positions and render
   */
  update(deltaMs: number): void {
    const dt = Math.min(deltaMs / 16.67, 2); // Normalize to ~60fps, cap at 2x
    this.time += deltaMs / 1000;

    // Update attractor positions (orbiting)
    this.updateAttractors();

    // Update each boid
    for (const boid of this.boids) {
      // Reset acceleration
      boid.ax = 0;
      boid.ay = 0;

      // Apply flocking behaviors
      const separation = this.separation(boid);
      const alignment = this.alignment(boid);
      const cohesion = this.cohesion(boid);

      boid.ax += separation.x * this.config.separationWeight;
      boid.ay += separation.y * this.config.separationWeight;
      boid.ax += alignment.x * this.config.alignmentWeight;
      boid.ay += alignment.y * this.config.alignmentWeight;
      boid.ax += cohesion.x * this.config.cohesionWeight;
      boid.ay += cohesion.y * this.config.cohesionWeight;

      // Apply wander behavior to prevent clumping
      const wander = this.wander(boid);
      boid.ax += wander.x * 0.3;
      boid.ay += wander.y * 0.3;

      // Apply attractor forces
      for (const attractor of this.attractors) {
        const dx = attractor.x - boid.x;
        const dy = attractor.y - boid.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < attractor.radius && dist > 10) {
          const force = attractor.strength * (1 - dist / attractor.radius);
          boid.ax += (dx / dist) * force;
          boid.ay += (dy / dist) * force;
        }
      }

      // Apply edge avoidance
      const edgeForce = this.avoidEdges(boid);
      boid.ax += edgeForce.x;
      boid.ay += edgeForce.y;

      // Update velocity
      boid.vx += boid.ax * dt;
      boid.vy += boid.ay * dt;

      // Limit speed
      const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
      if (speed > this.config.maxSpeed) {
        boid.vx = (boid.vx / speed) * this.config.maxSpeed;
        boid.vy = (boid.vy / speed) * this.config.maxSpeed;
      }

      // Update position
      boid.x += boid.vx * dt;
      boid.y += boid.vy * dt;

      // Wrap around edges (soft wrap)
      if (boid.x < -50) boid.x = this.width + 50;
      if (boid.x > this.width + 50) boid.x = -50;
      if (boid.y < -50) boid.y = this.height + 50;
      if (boid.y > this.height + 50) boid.y = -50;

      // Update trail
      boid.trail.unshift({ x: boid.x, y: boid.y, alpha: 1 });
      if (boid.trail.length > this.config.trailLength) {
        boid.trail.pop();
      }
      // Fade trail
      for (let i = 0; i < boid.trail.length; i++) {
        boid.trail[i].alpha = 1 - (i / this.config.trailLength);
      }
    }

    // Render
    this.render();
  }

  /**
   * Update attractor positions
   */
  private updateAttractors(): void {
    // Orbit attractors around center points
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    this.attractors[0].x = centerX + Math.cos(this.time * 0.3) * this.width * 0.3;
    this.attractors[0].y = centerY + Math.sin(this.time * 0.4) * this.height * 0.25;

    this.attractors[1].x = centerX + Math.cos(this.time * 0.25 + Math.PI) * this.width * 0.35;
    this.attractors[1].y = centerY + Math.sin(this.time * 0.35 + Math.PI) * this.height * 0.3;

    this.attractors[2].x = centerX + Math.cos(this.time * 0.2) * this.width * 0.2;
    this.attractors[2].y = centerY + Math.sin(this.time * 0.15) * this.height * 0.15;
  }

  /**
   * Separation: steer to avoid crowding local flockmates
   */
  private separation(boid: Boid): { x: number; y: number } {
    let steerX = 0;
    let steerY = 0;
    let count = 0;

    for (const other of this.boids) {
      if (other === boid) continue;

      const dx = boid.x - other.x;
      const dy = boid.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.config.separationDistance && dist > 0) {
        // Weight by distance (closer = stronger repulsion)
        const force = 1 / dist;
        steerX += (dx / dist) * force;
        steerY += (dy / dist) * force;
        count++;
      }
    }

    if (count > 0) {
      steerX /= count;
      steerY /= count;
      return this.limitForce(steerX, steerY);
    }

    return { x: 0, y: 0 };
  }

  /**
   * Alignment: steer towards the average heading of local flockmates
   */
  private alignment(boid: Boid): { x: number; y: number } {
    let avgVx = 0;
    let avgVy = 0;
    let count = 0;

    for (const other of this.boids) {
      if (other === boid) continue;

      const dx = boid.x - other.x;
      const dy = boid.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.config.alignmentDistance) {
        avgVx += other.vx;
        avgVy += other.vy;
        count++;
      }
    }

    if (count > 0) {
      avgVx /= count;
      avgVy /= count;

      // Steer towards average velocity
      const steerX = avgVx - boid.vx;
      const steerY = avgVy - boid.vy;
      return this.limitForce(steerX, steerY);
    }

    return { x: 0, y: 0 };
  }

  /**
   * Cohesion: steer to move toward the average position of local flockmates
   */
  private cohesion(boid: Boid): { x: number; y: number } {
    let avgX = 0;
    let avgY = 0;
    let count = 0;

    for (const other of this.boids) {
      if (other === boid) continue;

      const dx = boid.x - other.x;
      const dy = boid.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.config.cohesionDistance) {
        avgX += other.x;
        avgY += other.y;
        count++;
      }
    }

    if (count > 0) {
      avgX /= count;
      avgY /= count;

      // Steer towards average position
      const steerX = avgX - boid.x;
      const steerY = avgY - boid.y;
      return this.limitForce(steerX, steerY);
    }

    return { x: 0, y: 0 };
  }

  /**
   * Avoid screen edges
   */
  private avoidEdges(boid: Boid): { x: number; y: number } {
    let steerX = 0;
    let steerY = 0;

    if (boid.x < this.config.edgeMargin) {
      steerX = (this.config.edgeMargin - boid.x) / this.config.edgeMargin * this.config.edgeForce;
    } else if (boid.x > this.width - this.config.edgeMargin) {
      steerX = -(boid.x - (this.width - this.config.edgeMargin)) / this.config.edgeMargin * this.config.edgeForce;
    }

    if (boid.y < this.config.edgeMargin) {
      steerY = (this.config.edgeMargin - boid.y) / this.config.edgeMargin * this.config.edgeForce;
    } else if (boid.y > this.height - this.config.edgeMargin) {
      steerY = -(boid.y - (this.height - this.config.edgeMargin)) / this.config.edgeMargin * this.config.edgeForce;
    }

    return { x: steerX, y: steerY };
  }

  /**
   * Wander behavior - adds natural random movement to prevent clumping
   */
  private wander(boid: Boid): { x: number; y: number } {
    // Slowly change wander angle with noise
    boid.wanderAngle += (Math.random() - 0.5) * 0.5;

    // Add time-based noise for more organic movement
    const noiseX = Math.sin(this.time * 0.5 + boid.noiseOffset) * 0.02;
    const noiseY = Math.cos(this.time * 0.7 + boid.noiseOffset * 1.3) * 0.02;

    // Project a circle in front of the boid and pick a point on it
    const wanderDistance = 30;
    const wanderRadius = 15;

    // Get the boid's current heading
    const heading = Math.atan2(boid.vy, boid.vx);

    // Calculate the center of the wander circle
    const circleX = boid.x + Math.cos(heading) * wanderDistance;
    const circleY = boid.y + Math.sin(heading) * wanderDistance;

    // Calculate the target point on the wander circle
    const targetX = circleX + Math.cos(boid.wanderAngle) * wanderRadius;
    const targetY = circleY + Math.sin(boid.wanderAngle) * wanderRadius;

    // Steer towards the target
    const steerX = (targetX - boid.x) * 0.01 + noiseX;
    const steerY = (targetY - boid.y) * 0.01 + noiseY;

    return { x: steerX, y: steerY };
  }

  /**
   * Limit force magnitude
   */
  private limitForce(x: number, y: number): { x: number; y: number } {
    const mag = Math.sqrt(x * x + y * y);
    if (mag > this.config.maxForce) {
      return {
        x: (x / mag) * this.config.maxForce,
        y: (y / mag) * this.config.maxForce,
      };
    }
    return { x, y };
  }

  /**
   * Render all boids
   */
  private render(): void {
    this.graphics.clear();
    this.trailGraphics.clear();

    // Draw trails
    for (const boid of this.boids) {
      if (boid.trail.length < 2) continue;

      for (let i = 1; i < boid.trail.length; i++) {
        const prev = boid.trail[i - 1];
        const curr = boid.trail[i];
        const alpha = curr.alpha * 0.3;
        const width = boid.size * curr.alpha;

        this.trailGraphics.moveTo(prev.x, prev.y);
        this.trailGraphics.lineTo(curr.x, curr.y);
        this.trailGraphics.stroke({ width, color: boid.color, alpha });
      }
    }

    // Draw boids as directional triangles
    for (const boid of this.boids) {
      const angle = Math.atan2(boid.vy, boid.vx);
      const size = boid.size;

      // Triangle points
      const x1 = boid.x + Math.cos(angle) * size * 2;
      const y1 = boid.y + Math.sin(angle) * size * 2;
      const x2 = boid.x + Math.cos(angle + 2.5) * size;
      const y2 = boid.y + Math.sin(angle + 2.5) * size;
      const x3 = boid.x + Math.cos(angle - 2.5) * size;
      const y3 = boid.y + Math.sin(angle - 2.5) * size;

      this.graphics.moveTo(x1, y1);
      this.graphics.lineTo(x2, y2);
      this.graphics.lineTo(x3, y3);
      this.graphics.closePath();
      this.graphics.fill({ color: boid.color, alpha: 0.9 });

      // Glow effect
      this.graphics.circle(boid.x, boid.y, size * 1.5);
      this.graphics.fill({ color: boid.color, alpha: 0.2 });
    }
  }

  /**
   * React to game events (e.g., line clear causes scatter)
   */
  scatter(intensity: number = 1): void {
    for (const boid of this.boids) {
      // Random burst of velocity
      const angle = Math.random() * Math.PI * 2;
      const force = intensity * this.config.maxSpeed * 2;
      boid.vx += Math.cos(angle) * force;
      boid.vy += Math.sin(angle) * force;
    }
  }

  /**
   * Create a temporary attractor at a position (for effects)
   */
  pulse(x: number, y: number, strength: number = 0.1, duration: number = 500): void {
    const tempAttractor = { x, y, strength, radius: 400 };
    this.attractors.push(tempAttractor);

    setTimeout(() => {
      const index = this.attractors.indexOf(tempAttractor);
      if (index > -1) {
        this.attractors.splice(index, 1);
      }
    }, duration);
  }

  /**
   * Resize the system
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.initAttractors();
  }

  /**
   * Get boid count
   */
  getBoidCount(): number {
    return this.boids.length;
  }

  /**
   * Update configuration dynamically
   */
  setConfig(config: Partial<BoidConfig>): void {
    const needsReinit = config.count !== undefined && config.count !== this.config.count;
    this.config = { ...this.config, ...config };

    if (needsReinit) {
      this.initBoids();
    }
  }

  /**
   * Set blur strength
   */
  setBlur(strength: number): void {
    const filter = this.container.filters?.[0] as BlurFilter;
    if (filter) {
      filter.strength = strength;
    }
  }

  /**
   * Set container alpha (opacity)
   */
  setAlpha(alpha: number): void {
    this.container.alpha = alpha;
  }

  /**
   * Get current config
   */
  getConfig(): BoidConfig {
    return { ...this.config };
  }

  /**
   * Destroy the system
   */
  destroy(): void {
    this.boids = [];
    this.container.destroy({ children: true });
  }
}
