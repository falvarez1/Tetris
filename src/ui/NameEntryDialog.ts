/**
 * Name Entry Dialog
 * Arcade-style 3-character name input for high scores
 */

import { Container, Text, TextStyle, Graphics } from 'pixi.js';

export interface NameEntryCallbacks {
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

/**
 * Arcade-style name entry dialog
 */
export class NameEntryDialog {
  private container: Container;
  private callbacks: NameEntryCallbacks;

  // UI Elements
  private overlay!: Graphics;
  private panel!: Graphics;
  private titleText!: Text;
  private scoreText!: Text;
  private rankText!: Text;
  private nameChars: Text[] = [];
  private cursorGraphic!: Graphics;
  private instructionText!: Text;

  // State
  private name: string = 'AAA';
  private cursorPosition: number = 0;
  private cursorBlinkTime: number = 0;
  private animationTime: number = 0;

  // Colors
  private colors = {
    primary: 0xFF00FF,
    secondary: 0x00FFFF,
    background: 0x0D0221,
    highlight: 0xFFFFFF,
    gold: 0xFFD700,
  };

  constructor(callbacks: NameEntryCallbacks) {
    this.callbacks = callbacks;
    this.container = new Container();
    this.container.visible = false;

    this.createOverlay();
    this.createPanel();
    this.createTitle();
    this.createScoreDisplay();
    this.createNameInput();
    this.createInstructions();
  }

  /**
   * Create dark overlay
   */
  private createOverlay(): void {
    this.overlay = new Graphics();
    this.container.addChild(this.overlay);
  }

  /**
   * Create dialog panel
   */
  private createPanel(): void {
    this.panel = new Graphics();
    this.container.addChild(this.panel);
  }

  /**
   * Create title text
   */
  private createTitle(): void {
    const style = new TextStyle({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 28,
      fill: this.colors.gold,
      dropShadow: {
        color: this.colors.gold,
        blur: 15,
        alpha: 0.8,
        distance: 0,
      },
    });

    this.titleText = new Text({ text: 'NEW HIGH SCORE!', style });
    this.titleText.anchor.set(0.5, 0.5);
    this.container.addChild(this.titleText);
  }

  /**
   * Create score display
   */
  private createScoreDisplay(): void {
    // Score text
    const scoreStyle = new TextStyle({
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 24,
      fill: this.colors.highlight,
      fontWeight: '700',
    });

    this.scoreText = new Text({ text: 'SCORE: 0', style: scoreStyle });
    this.scoreText.anchor.set(0.5, 0.5);
    this.container.addChild(this.scoreText);

    // Rank text
    const rankStyle = new TextStyle({
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 18,
      fill: this.colors.secondary,
    });

    this.rankText = new Text({ text: 'RANK: #1', style: rankStyle });
    this.rankText.anchor.set(0.5, 0.5);
    this.container.addChild(this.rankText);
  }

  /**
   * Create name input characters
   */
  private createNameInput(): void {
    const charStyle = new TextStyle({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 48,
      fill: this.colors.primary,
      stroke: { color: 0x000000, width: 2 },
      padding: 40, // Large padding to prevent clipping on pixel fonts
    });

    // Create 3 character slots
    for (let i = 0; i < 3; i++) {
      const charText = new Text({ text: 'A', style: charStyle });
      // Use top-center anchor to prevent top clipping
      charText.anchor.set(0.5, 0);
      this.nameChars.push(charText);
      this.container.addChild(charText);
    }

    // Cursor/selection indicator
    this.cursorGraphic = new Graphics();
    this.container.addChild(this.cursorGraphic);
  }

  /**
   * Create instruction text
   */
  private createInstructions(): void {
    const style = new TextStyle({
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 12,
      fill: 0x888888,
      align: 'center',
      lineHeight: 18,
    });

    this.instructionText = new Text({
      text: 'UP/DOWN - Change Letter\nLEFT/RIGHT - Move Cursor\nENTER - Confirm | ESC - Cancel',
      style,
    });
    this.instructionText.anchor.set(0.5, 0.5);
    this.container.addChild(this.instructionText);
  }

  /**
   * Update the name display
   */
  private updateNameDisplay(): void {
    for (let i = 0; i < 3; i++) {
      this.nameChars[i].text = this.name[i] || '_';

      // Highlight current position
      if (i === this.cursorPosition) {
        this.nameChars[i].style.fill = this.colors.highlight;
      } else {
        this.nameChars[i].style.fill = this.colors.primary;
      }
    }
  }

  /**
   * Update cursor graphic
   */
  private updateCursor(): void {
    this.cursorGraphic.clear();

    // Blink effect
    const visible = Math.floor(this.cursorBlinkTime / 300) % 2 === 0;
    if (!visible) return;

    const charText = this.nameChars[this.cursorPosition];
    if (!charText) return;

    const x = charText.x;
    const y = charText.y + 60; // Offset below text (anchor is at top)

    this.cursorGraphic.rect(x - 25, y, 50, 4);
    this.cursorGraphic.fill({ color: this.colors.secondary });
  }

  /**
   * Handle keyboard input
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.container.visible) return false;

    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.changeCharacter(1);
        return true;

      case 'ArrowDown':
      case 'KeyS':
        this.changeCharacter(-1);
        return true;

      case 'ArrowLeft':
      case 'KeyA':
        this.moveCursor(-1);
        return true;

      case 'ArrowRight':
      case 'KeyD':
        this.moveCursor(1);
        return true;

      case 'Enter':
      case 'Space':
        this.submit();
        return true;

      case 'Escape':
        this.cancel();
        return true;

      case 'Backspace':
        this.moveCursor(-1);
        return true;

      default:
        // Handle direct letter input
        if (event.key.length === 1 && /^[A-Za-z]$/.test(event.key)) {
          this.setCharacter(event.key.toUpperCase());
          this.moveCursor(1);
          return true;
        }
        return false;
    }
  }

  /**
   * Change character at current position
   */
  private changeCharacter(direction: number): void {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const currentChar = this.name[this.cursorPosition];
    let index = chars.indexOf(currentChar);

    index = (index + direction + chars.length) % chars.length;

    this.name =
      this.name.substring(0, this.cursorPosition) +
      chars[index] +
      this.name.substring(this.cursorPosition + 1);

    this.updateNameDisplay();
  }

  /**
   * Set character at current position
   */
  private setCharacter(char: string): void {
    this.name =
      this.name.substring(0, this.cursorPosition) +
      char +
      this.name.substring(this.cursorPosition + 1);

    this.updateNameDisplay();
  }

  /**
   * Move cursor left/right
   */
  private moveCursor(direction: number): void {
    this.cursorPosition = Math.max(0, Math.min(2, this.cursorPosition + direction));
    this.cursorBlinkTime = 0; // Reset blink
    this.updateNameDisplay();
  }

  /**
   * Submit the name
   */
  private submit(): void {
    this.callbacks.onSubmit(this.name.trim() || 'AAA');
  }

  /**
   * Cancel entry
   */
  private cancel(): void {
    this.callbacks.onCancel();
  }

  /**
   * Show the dialog
   */
  show(score: number, rank: number): void {
    this.name = 'AAA';
    this.cursorPosition = 0;
    this.cursorBlinkTime = 0;
    this.animationTime = 0;

    this.scoreText.text = `SCORE: ${score.toLocaleString()}`;
    this.rankText.text = `RANK: #${rank}`;

    this.updateNameDisplay();
    this.container.visible = true;
    this.container.alpha = 0;

    // Fade in
    const fadeIn = () => {
      this.container.alpha = Math.min(1, this.container.alpha + 0.1);
      if (this.container.alpha < 1) {
        requestAnimationFrame(fadeIn);
      }
    };
    fadeIn();
  }

  /**
   * Hide the dialog
   */
  hide(): void {
    this.container.visible = false;
  }

  /**
   * Update animation
   */
  update(deltaTime: number): void {
    if (!this.container.visible) return;

    this.cursorBlinkTime += deltaTime;
    this.animationTime += deltaTime;

    this.updateCursor();

    // Subtle title pulse
    const pulse = Math.sin(this.animationTime * 0.004) * 0.05 + 1;
    this.titleText.scale.set(pulse);
  }

  /**
   * Layout elements for screen size
   */
  layout(width: number, height: number): void {
    const centerX = width / 2;
    const centerY = height / 2;

    // Overlay
    this.overlay.clear();
    this.overlay.rect(0, 0, width, height);
    this.overlay.fill({ color: 0x000000, alpha: 0.85 });

    // Panel - increased height for better spacing
    const panelWidth = 420;
    const panelHeight = 380;
    this.panel.clear();
    this.panel.roundRect(
      centerX - panelWidth / 2,
      centerY - panelHeight / 2,
      panelWidth,
      panelHeight,
      12
    );
    this.panel.fill({ color: this.colors.background, alpha: 0.95 });
    this.panel.stroke({ color: this.colors.primary, width: 3 });

    // Title
    this.titleText.x = centerX;
    this.titleText.y = centerY - 140;

    // Score
    this.scoreText.x = centerX;
    this.scoreText.y = centerY - 80;

    // Rank
    this.rankText.x = centerX;
    this.rankText.y = centerY - 50;

    // Name characters - positioned with top-center anchor
    const charSpacing = 70;
    const nameY = centerY - 10; // Adjusted for top anchor
    for (let i = 0; i < 3; i++) {
      this.nameChars[i].x = centerX + (i - 1) * charSpacing;
      this.nameChars[i].y = nameY;
    }

    // Instructions
    this.instructionText.x = centerX;
    this.instructionText.y = centerY + 140;
  }

  /**
   * Check if visible
   */
  isVisible(): boolean {
    return this.container.visible;
  }

  /**
   * Get the container
   */
  getContainer(): Container {
    return this.container;
  }

  /**
   * Destroy the dialog
   */
  destroy(): void {
    this.container.destroy({ children: true });
  }
}
