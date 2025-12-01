/**
 * Leaderboard Display
 * Shows high scores with mode selection tabs
 */

import { Container, Text, TextStyle, Graphics } from 'pixi.js';
import { getLeaderboard } from '../storage/Leaderboard';
import { GameModeType } from '../core/types/gameState';

export interface LeaderboardDisplayCallbacks {
  onClose: () => void;
}

type ModeTab = 'classic' | 'marathon' | 'chaos' | 'zen';

/**
 * Leaderboard display component
 */
export class LeaderboardDisplay {
  private container: Container;
  private callbacks: LeaderboardDisplayCallbacks;

  // UI Elements
  private overlay!: Graphics;
  private panel!: Graphics;
  private titleText!: Text;
  private tabs: { container: Container; text: Text; mode: ModeTab }[] = [];
  private entryTexts: Text[] = [];
  private noEntriesText!: Text;
  private instructionText!: Text;

  // State
  private selectedMode: ModeTab = 'classic';
  private highlightEntry: number = -1; // Index to highlight (for newly added scores)
  private animationTime: number = 0;

  // Colors
  private colors = {
    primary: 0xFF00FF,
    secondary: 0x00FFFF,
    background: 0x0D0221,
    highlight: 0xFFFFFF,
    gold: 0xFFD700,
    silver: 0xC0C0C0,
    bronze: 0xCD7F32,
  };

  constructor(callbacks: LeaderboardDisplayCallbacks) {
    this.callbacks = callbacks;
    this.container = new Container();
    this.container.visible = false;

    this.createOverlay();
    this.createPanel();
    this.createTitle();
    this.createTabs();
    this.createEntryRows();
    this.createInstructions();
  }

  /**
   * Create dark overlay
   */
  private createOverlay(): void {
    this.overlay = new Graphics();
    this.overlay.eventMode = 'static';
    this.overlay.on('pointerdown', () => this.callbacks.onClose());
    this.container.addChild(this.overlay);
  }

  /**
   * Create dialog panel
   */
  private createPanel(): void {
    this.panel = new Graphics();
    this.panel.eventMode = 'static'; // Block clicks through to overlay
    this.container.addChild(this.panel);
  }

  /**
   * Create title text
   */
  private createTitle(): void {
    const style = new TextStyle({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 24,
      fill: this.colors.primary,
      dropShadow: {
        color: this.colors.primary,
        blur: 15,
        alpha: 0.8,
        distance: 0,
      },
    });

    this.titleText = new Text({ text: 'HIGH SCORES', style });
    this.titleText.anchor.set(0.5, 0.5);
    this.container.addChild(this.titleText);
  }

  /**
   * Create mode selection tabs
   */
  private createTabs(): void {
    const modes: { label: string; mode: ModeTab }[] = [
      { label: 'CLASSIC', mode: 'classic' },
      { label: 'MARATHON', mode: 'marathon' },
      { label: 'CHAOS', mode: 'chaos' },
      { label: 'ZEN', mode: 'zen' },
    ];

    modes.forEach((modeData) => {
      const tabContainer = new Container();

      const textStyle = new TextStyle({
        fontFamily: '"Orbitron", sans-serif',
        fontSize: 12,
        fill: this.colors.secondary,
        fontWeight: '700',
      });

      const text = new Text({ text: modeData.label, style: textStyle });
      text.anchor.set(0.5, 0.5);
      tabContainer.addChild(text);

      // Make interactive
      tabContainer.eventMode = 'static';
      tabContainer.cursor = 'pointer';

      tabContainer.on('pointerdown', () => {
        this.selectMode(modeData.mode);
      });

      this.tabs.push({
        container: tabContainer,
        text,
        mode: modeData.mode,
      });

      this.container.addChild(tabContainer);
    });
  }

  /**
   * Create entry row texts (10 rows)
   */
  private createEntryRows(): void {
    for (let i = 0; i < 10; i++) {
      const style = new TextStyle({
        fontFamily: '"Orbitron", sans-serif',
        fontSize: 14,
        fill: this.colors.highlight,
      });

      const text = new Text({ text: '', style });
      text.anchor.set(0, 0.5);
      this.entryTexts.push(text);
      this.container.addChild(text);
    }

    // No entries message
    const noEntriesStyle = new TextStyle({
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 16,
      fill: 0x666666,
      fontStyle: 'italic',
    });

    this.noEntriesText = new Text({ text: 'No scores yet!', style: noEntriesStyle });
    this.noEntriesText.anchor.set(0.5, 0.5);
    this.container.addChild(this.noEntriesText);
  }

  /**
   * Create instruction text
   */
  private createInstructions(): void {
    const style = new TextStyle({
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 11,
      fill: 0x666666,
    });

    this.instructionText = new Text({
      text: 'LEFT/RIGHT - Switch Mode | ESC - Close',
      style,
    });
    this.instructionText.anchor.set(0.5, 0.5);
    this.container.addChild(this.instructionText);
  }

  /**
   * Select a mode tab
   */
  private selectMode(mode: ModeTab): void {
    this.selectedMode = mode;
    this.updateTabs();
    this.updateEntries();
  }

  /**
   * Update tab visuals
   */
  private updateTabs(): void {
    this.tabs.forEach((tab) => {
      if (tab.mode === this.selectedMode) {
        tab.text.style.fill = this.colors.highlight;
      } else {
        tab.text.style.fill = this.colors.secondary;
      }
    });
  }

  /**
   * Update entry display
   */
  private updateEntries(): void {
    const leaderboard = getLeaderboard();
    const entries = leaderboard.getEntries(this.selectedMode);

    // Hide no entries text if we have entries
    this.noEntriesText.visible = entries.length === 0;

    // Update each row
    for (let i = 0; i < 10; i++) {
      const text = this.entryTexts[i];

      if (i < entries.length) {
        const entry = entries[i];
        const rank = i + 1;

        // Format: #1  AAA  1,234,567  LV15  123L
        const rankStr = `#${rank}`.padEnd(3);
        const nameStr = entry.name.padEnd(4);
        const scoreStr = entry.score.toLocaleString().padStart(12);
        const levelStr = `LV${entry.level}`.padStart(5);
        const linesStr = `${entry.lines}L`.padStart(5);

        text.text = `${rankStr} ${nameStr} ${scoreStr} ${levelStr} ${linesStr}`;
        text.visible = true;

        // Rank-based coloring
        if (i === 0) {
          text.style.fill = this.colors.gold;
        } else if (i === 1) {
          text.style.fill = this.colors.silver;
        } else if (i === 2) {
          text.style.fill = this.colors.bronze;
        } else if (i === this.highlightEntry) {
          text.style.fill = this.colors.secondary;
        } else {
          text.style.fill = this.colors.highlight;
        }
      } else {
        text.visible = false;
      }
    }
  }

  /**
   * Handle keyboard input
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.container.visible) return false;

    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA': {
        const modes: ModeTab[] = ['classic', 'marathon', 'chaos', 'zen'];
        const currentIndex = modes.indexOf(this.selectedMode);
        const newIndex = (currentIndex - 1 + modes.length) % modes.length;
        this.selectMode(modes[newIndex]);
        return true;
      }

      case 'ArrowRight':
      case 'KeyD': {
        const modes: ModeTab[] = ['classic', 'marathon', 'chaos', 'zen'];
        const currentIndex = modes.indexOf(this.selectedMode);
        const newIndex = (currentIndex + 1) % modes.length;
        this.selectMode(modes[newIndex]);
        return true;
      }

      case 'Escape':
      case 'Enter':
      case 'Space':
        this.callbacks.onClose();
        return true;

      default:
        return false;
    }
  }

  /**
   * Show the leaderboard
   */
  show(mode?: GameModeType, highlightRank?: number): void {
    if (mode) {
      this.selectedMode = mode as ModeTab;
    }
    this.highlightEntry = highlightRank !== undefined ? highlightRank - 1 : -1;
    this.animationTime = 0;

    this.updateTabs();
    this.updateEntries();

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
   * Hide the leaderboard
   */
  hide(): void {
    this.container.visible = false;
    this.highlightEntry = -1;
  }

  /**
   * Update animation
   */
  update(deltaTime: number): void {
    if (!this.container.visible) return;

    this.animationTime += deltaTime;

    // Pulse highlight entry
    if (this.highlightEntry >= 0 && this.highlightEntry < this.entryTexts.length) {
      const text = this.entryTexts[this.highlightEntry];
      const pulse = Math.sin(this.animationTime * 0.006) * 0.3 + 0.7;
      text.alpha = pulse + 0.3;
    }
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

    // Panel
    const panelWidth = 500;
    const panelHeight = 450;
    const panelX = centerX - panelWidth / 2;
    const panelY = centerY - panelHeight / 2;

    this.panel.clear();
    this.panel.roundRect(panelX, panelY, panelWidth, panelHeight, 12);
    this.panel.fill({ color: this.colors.background, alpha: 0.95 });
    this.panel.stroke({ color: this.colors.primary, width: 3 });

    // Title
    this.titleText.x = centerX;
    this.titleText.y = panelY + 40;

    // Tabs
    const tabY = panelY + 85;
    const tabSpacing = panelWidth / 5;
    this.tabs.forEach((tab, i) => {
      tab.container.x = panelX + tabSpacing * (i + 0.8);
      tab.container.y = tabY;
    });

    // Entry rows
    const rowStartY = panelY + 130;
    const rowSpacing = 28;
    const rowX = panelX + 30;

    this.entryTexts.forEach((text, i) => {
      text.x = rowX;
      text.y = rowStartY + i * rowSpacing;
    });

    // No entries text
    this.noEntriesText.x = centerX;
    this.noEntriesText.y = centerY;

    // Instructions
    this.instructionText.x = centerX;
    this.instructionText.y = panelY + panelHeight - 25;
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
   * Destroy the display
   */
  destroy(): void {
    this.container.destroy({ children: true });
  }
}
