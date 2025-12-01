/**
 * Synthwave Background Effect
 * Creates an animated 80s-style synthwave background using PixiJS Graphics
 */

import { Container, Graphics } from 'pixi.js';

/**
 * Synthwave background colors
 */
const COLORS = {
  skyTop: 0x0D0221,
  skyMid: 0x660033,
  horizon: 0xFF6699,
  sunTop: 0xFFE566,
  sunBottom: 0xFF3366,
  grid: 0xFF00FF,
  gridGlow: 0x00FFFF,
  mountain: 0x050010,
  stars: 0xFFFFFF,
};

/**
 * Synthwave background controller
 */
export class SynthwaveBackground {
  private container: Container;
  private skyGraphics: Graphics;
  private sunGraphics: Graphics;
  private mountainGraphics: Graphics;
  private gridGraphics: Graphics;
  private starGraphics: Graphics;
  private startTime: number;
  private width: number;
  private height: number;
  private heat: number = 0;
  private scrollOffset: number = 0;
  private stars: { x: number; y: number; size: number; twinkle: number }[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.startTime = performance.now();

    // Create container
    this.container = new Container();

    // Create layers (back to front)
    this.skyGraphics = new Graphics();
    this.starGraphics = new Graphics();
    this.sunGraphics = new Graphics();
    this.mountainGraphics = new Graphics();
    this.gridGraphics = new Graphics();

    this.container.addChild(this.skyGraphics);
    this.container.addChild(this.starGraphics);
    this.container.addChild(this.sunGraphics);
    this.container.addChild(this.mountainGraphics);
    this.container.addChild(this.gridGraphics);

    // Generate stars
    this.generateStars();

    // Initial draw
    this.drawStatic();
  }

  /**
   * Generate random star positions
   */
  private generateStars(): void {
    this.stars = [];
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height * 0.5, // Only in upper half
        size: Math.random() * 2 + 0.5,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  /**
   * Draw static elements
   */
  private drawStatic(): void {
    const horizonY = this.height * 0.55;

    // Sky gradient (using rectangles for simplicity)
    this.skyGraphics.clear();
    const gradientSteps = 20;
    for (let i = 0; i < gradientSteps; i++) {
      const t = i / gradientSteps;
      const y = t * horizonY;
      const h = horizonY / gradientSteps + 1;

      let color: number;
      if (t < 0.5) {
        color = this.lerpColor(COLORS.skyTop, COLORS.skyMid, t * 2);
      } else {
        color = this.lerpColor(COLORS.skyMid, COLORS.horizon, (t - 0.5) * 2);
      }

      this.skyGraphics.rect(0, y, this.width, h);
      this.skyGraphics.fill(color);
    }

    // Ground gradient
    const groundSteps = 10;
    for (let i = 0; i < groundSteps; i++) {
      const t = i / groundSteps;
      const y = horizonY + t * (this.height - horizonY);
      const h = (this.height - horizonY) / groundSteps + 1;
      const alpha = 1 - t * 0.3;

      this.skyGraphics.rect(0, y, this.width, h);
      this.skyGraphics.fill({ color: COLORS.skyTop, alpha });
    }

    // Sun
    this.drawSun(horizonY);

    // Mountains
    this.drawMountains(horizonY);
  }

  /**
   * Draw the sun with bands
   */
  private drawSun(horizonY: number): void {
    this.sunGraphics.clear();

    const centerX = this.width / 2;
    const centerY = horizonY - this.height * 0.05;
    const radius = this.width * 0.12;

    // Sun glow
    for (let i = 3; i >= 0; i--) {
      const glowRadius = radius * (1.3 + i * 0.15);
      const alpha = 0.1 - i * 0.02;
      this.sunGraphics.circle(centerX, centerY, glowRadius);
      this.sunGraphics.fill({ color: COLORS.sunBottom, alpha });
    }

    // Sun body with gradient (using concentric circles)
    const sunSteps = 15;
    for (let i = sunSteps - 1; i >= 0; i--) {
      const t = i / sunSteps;
      const r = radius * (1 - t * 0.02);
      const y = centerY - radius + (t * radius * 2);
      const color = this.lerpColor(COLORS.sunBottom, COLORS.sunTop, t);

      // Only draw if above horizon for this slice
      if (y < horizonY) {
        this.sunGraphics.circle(centerX, centerY, r);
        this.sunGraphics.fill(color);
      }
    }

    // Sun bands (synthwave style)
    const bandCount = 6;
    const bandStartY = centerY;
    for (let i = 0; i < bandCount; i++) {
      const bandY = bandStartY + (i + 1) * (radius * 0.8 / bandCount);
      const bandHeight = 4 + i * 1.5;

      if (bandY < horizonY && bandY > centerY - radius) {
        // Calculate band width based on circle
        const dy = Math.abs(bandY - centerY);
        if (dy < radius) {
          const bandWidth = Math.sqrt(radius * radius - dy * dy) * 2;

          this.sunGraphics.rect(centerX - bandWidth / 2, bandY, bandWidth, bandHeight);
          this.sunGraphics.fill(COLORS.skyTop);
        }
      }
    }
  }

  /**
   * Draw mountain silhouettes
   */
  private drawMountains(horizonY: number): void {
    this.mountainGraphics.clear();

    // Generate procedural mountain shape
    this.mountainGraphics.moveTo(0, horizonY);

    const points: number[] = [];
    const segments = 30;
    for (let i = 0; i <= segments; i++) {
      const x = (i / segments) * this.width;
      const baseHeight = Math.sin(i * 0.5) * 20 +
                         Math.sin(i * 1.3) * 15 +
                         Math.sin(i * 2.7) * 8;
      const y = horizonY - Math.max(0, baseHeight + 10);
      points.push(x, y);
    }

    // Draw mountain polygon
    this.mountainGraphics.moveTo(0, horizonY);
    for (let i = 0; i < points.length; i += 2) {
      this.mountainGraphics.lineTo(points[i], points[i + 1]);
    }
    this.mountainGraphics.lineTo(this.width, horizonY);
    this.mountainGraphics.lineTo(0, horizonY);
    this.mountainGraphics.fill(COLORS.mountain);
  }

  /**
   * Draw animated grid
   */
  private drawGrid(): void {
    this.gridGraphics.clear();

    const horizonY = this.height * 0.55;
    const gridColor = this.heat > 0.5 ? COLORS.gridGlow : COLORS.grid;
    const intensity = 0.4 + this.heat * 0.4;

    // Perspective grid
    const verticalLines = 25;
    const horizontalLines = 20;
    const vanishingX = this.width / 2;
    const groundHeight = this.height - horizonY;

    // Vertical lines (converging to vanishing point)
    this.gridGraphics.setStrokeStyle({
      width: 1,
      color: gridColor,
      alpha: intensity * 0.6,
    });

    for (let i = 0; i <= verticalLines; i++) {
      const t = i / verticalLines;
      const bottomX = t * this.width;

      this.gridGraphics.moveTo(vanishingX, horizonY);
      this.gridGraphics.lineTo(bottomX, this.height);
    }
    this.gridGraphics.stroke();

    // Horizontal lines (with perspective spacing)
    this.gridGraphics.setStrokeStyle({
      width: 1.5,
      color: gridColor,
      alpha: intensity,
    });

    for (let i = 0; i < horizontalLines; i++) {
      // Non-linear spacing for perspective effect
      const t = Math.pow((i + this.scrollOffset) / horizontalLines, 1.8);
      const y = horizonY + t * groundHeight;

      if (y > horizonY && y < this.height) {
        // Calculate line width based on perspective
        const perspectiveT = (y - horizonY) / groundHeight;
        const lineWidth = perspectiveT * this.width;
        const startX = (this.width - lineWidth) / 2;

        this.gridGraphics.moveTo(startX, y);
        this.gridGraphics.lineTo(startX + lineWidth, y);
      }
    }
    this.gridGraphics.stroke();

    // Horizon glow line
    this.gridGraphics.setStrokeStyle({
      width: 3,
      color: COLORS.horizon,
      alpha: 0.8 + this.heat * 0.2,
    });
    this.gridGraphics.moveTo(0, horizonY);
    this.gridGraphics.lineTo(this.width, horizonY);
    this.gridGraphics.stroke();
  }

  /**
   * Draw animated stars
   */
  private drawStars(time: number): void {
    this.starGraphics.clear();

    for (const star of this.stars) {
      // Twinkle effect
      const twinkle = Math.sin(time * 2 + star.twinkle) * 0.5 + 0.5;
      const alpha = 0.3 + twinkle * 0.7;
      const size = star.size * (0.8 + twinkle * 0.4);

      this.starGraphics.circle(star.x, star.y, size);
      this.starGraphics.fill({ color: COLORS.stars, alpha });
    }
  }

  /**
   * Linear interpolate between two colors
   */
  private lerpColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 0xff;
    const g1 = (color1 >> 8) & 0xff;
    const b1 = color1 & 0xff;

    const r2 = (color2 >> 16) & 0xff;
    const g2 = (color2 >> 8) & 0xff;
    const b2 = color2 & 0xff;

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return (r << 16) | (g << 8) | b;
  }

  /**
   * Get the container to add to the stage
   */
  getContainer(): Container {
    return this.container;
  }

  /**
   * Update the background animation
   */
  update(heat: number = 0): void {
    const elapsed = (performance.now() - this.startTime) / 1000;
    this.heat = Math.max(0, Math.min(1, heat));

    // Scroll the grid
    const scrollSpeed = 0.3 + this.heat * 0.3;
    this.scrollOffset = (this.scrollOffset + scrollSpeed * 0.016) % 1;

    // Redraw animated elements
    this.drawStars(elapsed);
    this.drawGrid();
  }

  /**
   * Resize the background
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    // Regenerate stars for new dimensions
    this.generateStars();

    // Redraw everything
    this.drawStatic();
    this.drawGrid();
  }

  /**
   * Destroy the background
   */
  destroy(): void {
    this.container.destroy({ children: true });
  }
}
