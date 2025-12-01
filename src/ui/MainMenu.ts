/**
 * Main Menu
 * PixiJS-based main menu with synthwave styling
 */

import { Container, Text, TextStyle, Graphics } from 'pixi.js';
import { GameModeType } from '../core/types/gameState';

export interface MenuButton {
  container: Container;
  background: Graphics;
  text: Text;
  mode?: GameModeType;
  action?: string;
}

export interface MainMenuCallbacks {
  onStartGame: (mode: GameModeType) => void;
  onOpenSettings: () => void;
  onOpenLeaderboard?: () => void;
}

/**
 * Main Menu class - creates the game's main menu UI
 */
export class MainMenu {
  private container: Container;
  private titleText!: Text;
  private subtitleText!: Text;
  private buttons: MenuButton[] = [];
  private callbacks: MainMenuCallbacks;
  private selectedIndex: number = 0;
  private animationTime: number = 0;
  private controlsText!: Text;

  // Colors
  private colors = {
    primary: 0xFF00FF,    // Magenta
    secondary: 0x00FFFF,  // Cyan
    background: 0x0D0221, // Dark purple
    highlight: 0xFFFFFF,  // White
  };

  constructor(callbacks: MainMenuCallbacks) {
    this.callbacks = callbacks;
    this.container = new Container();
    this.container.visible = false;

    this.createTitle();
    this.createButtons();
    this.createControls();

    // Initial selection
    this.updateSelection();
  }

  /**
   * Create the title text
   */
  private createTitle(): void {
    // Main title
    const titleStyle = new TextStyle({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 48,
      fill: 0xFF00FF,
      stroke: { color: 0x000000, width: 4 },
      dropShadow: {
        color: 0xFF00FF,
        blur: 20,
        alpha: 0.8,
        distance: 0,
      },
      letterSpacing: 8,
    });

    this.titleText = new Text({ text: 'TETRIS', style: titleStyle });
    this.titleText.anchor.set(0.5, 0.5);
    this.container.addChild(this.titleText);

    // Subtitle
    const subtitleStyle = new TextStyle({
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 18,
      fill: 0x00FFFF,
      letterSpacing: 12,
      dropShadow: {
        color: 0x00FFFF,
        blur: 10,
        alpha: 0.5,
        distance: 0,
      },
    });

    this.subtitleText = new Text({ text: 'V F X   E D I T I O N', style: subtitleStyle });
    this.subtitleText.anchor.set(0.5, 0.5);
    this.container.addChild(this.subtitleText);
  }

  /**
   * Create menu buttons
   */
  private createButtons(): void {
    const buttonData = [
      { label: 'CLASSIC', mode: 'classic' as GameModeType, desc: 'Standard Tetris' },
      { label: 'MARATHON', mode: 'marathon' as GameModeType, desc: 'Endless Mode' },
      { label: 'CHAOS', mode: 'chaos' as GameModeType, desc: 'Random Events!' },
      { label: 'LEADERBOARD', action: 'leaderboard', desc: 'High Scores' },
      { label: 'SETTINGS', action: 'settings', desc: 'Audio & Video' },
    ];

    buttonData.forEach((data, index) => {
      const button = this.createButton(data.label, data.desc, index);
      if (data.mode) {
        button.mode = data.mode;
      } else if (data.action) {
        button.action = data.action;
      }
      this.buttons.push(button);
      this.container.addChild(button.container);
    });
  }

  /**
   * Create a single button
   */
  private createButton(label: string, description: string, _index: number): MenuButton {
    const buttonContainer = new Container();

    // Button background - increased height for pixel font
    const bg = new Graphics();
    bg.roundRect(-160, -30, 320, 60, 8);
    bg.fill({ color: 0x0D0221, alpha: 0.8 });
    bg.stroke({ color: this.colors.primary, width: 2, alpha: 0.8 });
    buttonContainer.addChild(bg);

    // Button text - using Orbitron instead of pixel font for better rendering
    const textStyle = new TextStyle({
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 18,
      fontWeight: '700',
      fill: this.colors.secondary,
      letterSpacing: 2,
    });

    const text = new Text({ text: label, style: textStyle });
    text.anchor.set(0.5, 0.5);
    text.y = -5;
    buttonContainer.addChild(text);

    // Description text (smaller, below main text)
    const descStyle = new TextStyle({
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 10,
      fill: 0x888888,
    });

    const descText = new Text({ text: description, style: descStyle });
    descText.anchor.set(0.5, 0);
    descText.y = 10;
    buttonContainer.addChild(descText);

    // Make interactive
    buttonContainer.eventMode = 'static';
    buttonContainer.cursor = 'pointer';

    buttonContainer.on('pointerover', () => {
      this.selectedIndex = this.buttons.findIndex(b => b.container === buttonContainer);
      this.updateSelection();
    });

    buttonContainer.on('pointerdown', () => {
      this.selectCurrentButton();
    });

    return {
      container: buttonContainer,
      background: bg,
      text: text,
    };
  }

  /**
   * Create controls display
   */
  private createControls(): void {
    const controlsStyle = new TextStyle({
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 11,
      fill: 0x666666,
      align: 'center',
      lineHeight: 18,
    });

    const controlsText = [
      'CONTROLS',
      '',
      'ARROWS / WASD - Move',
      'UP / X - Rotate CW',
      'Z / CTRL - Rotate CCW',
      'SPACE - Hard Drop',
      'C / SHIFT - Hold',
      'ESC / P - Pause',
      '',
      'M - Toggle Music',
      'N - Next Track',
      'F2 - CRT Effect',
      'F3 - Debug Panel',
    ].join('\n');

    this.controlsText = new Text({ text: controlsText, style: controlsStyle });
    this.controlsText.anchor.set(0.5, 0);
    this.container.addChild(this.controlsText);
  }

  /**
   * Update button selection visuals
   */
  private updateSelection(): void {
    this.buttons.forEach((button, index) => {
      const isSelected = index === this.selectedIndex;

      // Update background
      button.background.clear();
      button.background.roundRect(-150, -25, 300, 50, 8);

      if (isSelected) {
        button.background.fill({ color: this.colors.primary, alpha: 0.2 });
        button.background.stroke({ color: this.colors.secondary, width: 3 });
        button.text.style.fill = this.colors.highlight;
      } else {
        button.background.fill({ color: 0x0D0221, alpha: 0.8 });
        button.background.stroke({ color: this.colors.primary, width: 2, alpha: 0.5 });
        button.text.style.fill = this.colors.secondary;
      }
    });
  }

  /**
   * Handle keyboard input
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.container.visible) return false;

    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        this.selectedIndex = (this.selectedIndex - 1 + this.buttons.length) % this.buttons.length;
        this.updateSelection();
        return true;

      case 'ArrowDown':
      case 'KeyS':
        this.selectedIndex = (this.selectedIndex + 1) % this.buttons.length;
        this.updateSelection();
        return true;

      case 'Enter':
      case 'Space':
        this.selectCurrentButton();
        return true;

      default:
        return false;
    }
  }

  /**
   * Select the current button
   */
  private selectCurrentButton(): void {
    const button = this.buttons[this.selectedIndex];

    if (button.mode) {
      this.callbacks.onStartGame(button.mode);
    } else if (button.action === 'settings') {
      this.callbacks.onOpenSettings();
    } else if (button.action === 'leaderboard') {
      if (this.callbacks.onOpenLeaderboard) {
        this.callbacks.onOpenLeaderboard();
      }
    }
  }

  /**
   * Update animation
   */
  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Animate title
    const pulse = Math.sin(this.animationTime * 0.002) * 0.1 + 1;
    this.titleText.scale.set(pulse);

    // Subtle color shift on subtitle
    this.subtitleText.alpha = 0.8 + Math.sin(this.animationTime * 0.003) * 0.2;
  }

  /**
   * Position elements for screen size
   */
  layout(width: number, height: number): void {
    const centerX = width / 2;

    // Title at top
    this.titleText.x = centerX;
    this.titleText.y = height * 0.15;

    // Subtitle below title
    this.subtitleText.x = centerX;
    this.subtitleText.y = height * 0.23;

    // Buttons in middle
    const buttonStartY = height * 0.38;
    const buttonSpacing = 70;

    this.buttons.forEach((button, index) => {
      button.container.x = centerX;
      button.container.y = buttonStartY + index * buttonSpacing;
    });

    // Controls at bottom
    this.controlsText.x = centerX;
    this.controlsText.y = height * 0.7;
  }

  /**
   * Show the menu
   */
  show(): void {
    this.container.visible = true;
    this.container.alpha = 0;

    // Fade in
    const fadeIn = () => {
      this.container.alpha = Math.min(1, this.container.alpha + 0.05);
      if (this.container.alpha < 1) {
        requestAnimationFrame(fadeIn);
      }
    };
    fadeIn();
  }

  /**
   * Hide the menu
   */
  hide(): void {
    this.container.visible = false;
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
   * Destroy the menu
   */
  destroy(): void {
    this.container.destroy({ children: true });
  }
}
