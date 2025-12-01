/**
 * Main Render Pipeline
 * Orchestrates all rendering layers using PixiJS
 */

import { Application, Container, Graphics, Text, TextStyle, BlurFilter } from 'pixi.js';
import { GameState } from '../core/types/gameState';
import { TETROMINO_COLORS, getPieceBlocks, TetrominoType } from '../core/types/tetromino';
import { getHeatLevel, HeatLevel } from '../core/types/scoring';
import { SynthwaveBackground } from './SynthwaveBackground';
import { ParticleSystem } from './ParticleSystem';
import { ScreenEffects } from './ScreenEffects';
import { CRTFilter } from './CRTFilter';
import { BoidSystem } from './BoidSystem';
import { MainMenu } from '../ui/MainMenu';
import { SettingsMenu } from '../ui/SettingsMenu';
import { NameEntryDialog } from '../ui/NameEntryDialog';
import { LeaderboardDisplay } from '../ui/LeaderboardDisplay';
import { GameModeType } from '../core/types/gameState';
import { ChaosModifiers } from '../core/chaos/ChaosManager';

/**
 * Render configuration
 */
export interface RenderConfig {
  width: number;
  height: number;
  cellSize: number;
  boardOffsetX: number;
  boardOffsetY: number;
  showGhost: boolean;
  showGrid: boolean;
  glowEnabled: boolean;
}

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  width: 1280,
  height: 720,
  cellSize: 30,
  boardOffsetX: 0, // Will be calculated
  boardOffsetY: 0, // Will be calculated
  showGhost: true,
  showGrid: true,
  glowEnabled: true,
};

/**
 * Render Pipeline class
 */
export class RenderPipeline {
  private app: Application;
  private config: RenderConfig;

  // Layer containers (back to front)
  private backgroundLayer: Container;
  private gridLayer: Container;
  private boardLayer: Container;
  private pieceLayer: Container;
  private particleLayer: Container;
  private uiLayer: Container;

  // Graphics objects
  private gridGraphics: Graphics;
  private boardGraphics: Graphics;
  private pieceGraphics: Graphics;
  private ghostGraphics: Graphics;

  // Glow layer
  private glowLayer: Container;
  private boardGlowGraphics: Graphics;
  private pieceGlowGraphics: Graphics;
  private glowFilter: BlurFilter;

  // UI elements
  private scoreText: Text;
  private levelText: Text;
  private linesText: Text;
  private comboText: Text;
  private nextPieceContainer: Container;
  private holdPieceContainer: Container;

  // Theme colors
  private colors = {
    background: 0x0D0221,
    grid: 0xFF00FF,
    gridOpacity: 0.2,
    glow: 0xFF00FF,
  };

  // State tracking
  private lastHeatLevel: HeatLevel = 'cold';
  private initialized = false;

  // Synthwave background
  private synthwaveBackground: SynthwaveBackground | null = null;

  // Boid murmuration system
  private boidSystem: BoidSystem | null = null;

  // Particle system
  private particleSystem: ParticleSystem | null = null;

  // Last frame state for detecting changes
  private lastLinesCleared: number = 0;
  private lastLevel: number = 1;
  private lastCombo: number = 0;
  private lastPieceY: number = 0;

  // Screen effects
  private screenEffects: ScreenEffects | null = null;
  private crtFilter: CRTFilter | null = null;
  private crtEnabled: boolean = true;

  // Lock flash tracking
  private lockFlashCells: { x: number; y: number; time: number; color: number }[] = [];
  private readonly LOCK_FLASH_DURATION = 200;

  // Trail effect for active piece
  private pieceTrail: { x: number; y: number; alpha: number; color: number }[] = [];

  // Game over overlay elements
  private gameOverContainer: Container | null = null;

  // Pause overlay elements
  private pauseContainer: Container | null = null;

  // Chaos event UI
  private chaosWarningContainer: Container | null = null;
  private chaosEventContainer: Container | null = null;
  private chaosWarningTimeout: number | null = null;

  // Special clear notifications
  private specialClearContainer: Container | null = null;
  private specialClearTimeout: number | null = null;

  // Countdown overlay
  private countdownContainer: Container | null = null;
  private countdownCallback: (() => void) | null = null;

  // Menu system
  private menuLayer: Container;
  private mainMenu: MainMenu | null = null;
  private settingsMenu: SettingsMenu | null = null;
  private menuCallbacks: {
    onStartGame?: (mode: GameModeType) => void;
    onSFXVolumeChange?: (volume: number) => void;
    onMusicVolumeChange?: (volume: number) => void;
  } = {};

  // Leaderboard system
  private nameEntryDialog: NameEntryDialog | null = null;
  private leaderboardDisplay: LeaderboardDisplay | null = null;
  private leaderboardCallbacks: {
    onNameSubmit?: (name: string) => void;
    onLeaderboardClose?: () => void;
  } = {};

  constructor(config: Partial<RenderConfig> = {}) {
    this.config = { ...DEFAULT_RENDER_CONFIG, ...config };
    this.app = new Application();

    // Initialize containers
    this.backgroundLayer = new Container();
    this.gridLayer = new Container();
    this.boardLayer = new Container();
    this.pieceLayer = new Container();
    this.particleLayer = new Container();
    this.uiLayer = new Container();
    this.menuLayer = new Container();

    // Initialize graphics
    this.gridGraphics = new Graphics();
    this.boardGraphics = new Graphics();
    this.pieceGraphics = new Graphics();
    this.ghostGraphics = new Graphics();

    // Initialize glow layer
    this.glowLayer = new Container();
    this.boardGlowGraphics = new Graphics();
    this.pieceGlowGraphics = new Graphics();
    this.glowFilter = new BlurFilter({ strength: 8, quality: 4 });
    this.glowLayer.filters = [this.glowFilter];
    this.glowLayer.alpha = 0.6;

    // Initialize text (will be updated after init)
    this.scoreText = new Text({ text: '', style: this.createTextStyle() });
    this.levelText = new Text({ text: '', style: this.createTextStyle() });
    this.linesText = new Text({ text: '', style: this.createTextStyle() });
    this.comboText = new Text({ text: '', style: this.createTextStyle(32, 0x00FFFF) });

    this.nextPieceContainer = new Container();
    this.holdPieceContainer = new Container();
  }

  /**
   * Initialize the renderer
   */
  async init(container: HTMLElement): Promise<void> {
    await this.app.init({
      width: this.config.width,
      height: this.config.height,
      backgroundColor: this.colors.background,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    container.appendChild(this.app.canvas);

    // Calculate board position (centered horizontally, positioned with bottom near screen bottom)
    const boardWidth = 10 * this.config.cellSize;
    this.config.boardOffsetX = (this.config.width - boardWidth) / 2;
    // boardOffsetY is the Y position of the BOTTOM of the board
    this.config.boardOffsetY = this.config.height - 60; // 60px margin from bottom

    // Add layers to stage
    this.app.stage.addChild(this.backgroundLayer);
    this.app.stage.addChild(this.gridLayer);
    this.app.stage.addChild(this.glowLayer); // Glow behind main graphics
    this.app.stage.addChild(this.boardLayer);
    this.app.stage.addChild(this.pieceLayer);
    this.app.stage.addChild(this.particleLayer);
    this.app.stage.addChild(this.uiLayer);
    this.app.stage.addChild(this.menuLayer);

    // Add graphics to layers
    this.gridLayer.addChild(this.gridGraphics);
    this.boardLayer.addChild(this.boardGraphics);
    this.pieceLayer.addChild(this.ghostGraphics);
    this.pieceLayer.addChild(this.pieceGraphics);

    // Add glow graphics
    this.glowLayer.addChild(this.boardGlowGraphics);
    this.glowLayer.addChild(this.pieceGlowGraphics);

    // Initialize particle system
    this.particleSystem = new ParticleSystem();
    this.particleLayer.addChild(this.particleSystem.getContainer());

    // Setup UI
    this.setupUI();

    // Draw static elements
    this.drawGrid();
    this.drawBackground();

    // Initialize screen effects
    this.screenEffects = new ScreenEffects(this.app.stage, this.config.width, this.config.height);
    this.app.stage.addChild(this.screenEffects.getFlashOverlay());
    this.app.stage.addChild(this.screenEffects.getTransitionOverlay());

    // Initialize CRT filter
    this.crtFilter = new CRTFilter({
      scanlineIntensity: 0.12,
      vignetteIntensity: 0.25,
      chromaticAberration: 1.5,
      noiseIntensity: 0.02,
      curvature: 8.0,
      brightness: 1.15,
    });
    this.crtFilter.setResolution(this.config.width, this.config.height);

    // Apply CRT filter to stage
    if (this.crtEnabled) {
      this.app.stage.filters = [this.crtFilter];
    }

    this.initialized = true;
  }

  /**
   * Toggle CRT effect
   */
  toggleCRT(): void {
    this.crtEnabled = !this.crtEnabled;
    if (this.crtEnabled && this.crtFilter) {
      this.app.stage.filters = [this.crtFilter];
    } else {
      this.app.stage.filters = [];
    }
  }

  /**
   * Create text style with retro game fonts
   */
  private createTextStyle(size: number = 24, color: number = 0xFFFFFF, isTitle: boolean = false): TextStyle {
    return new TextStyle({
      fontFamily: isTitle ? '"Press Start 2P", monospace' : '"Orbitron", sans-serif',
      fontSize: size,
      fontWeight: isTitle ? '400' : '700',
      fill: color,
      align: 'left',
      letterSpacing: isTitle ? 2 : 1,
      dropShadow: {
        color: color,
        blur: 8,
        alpha: 0.5,
        distance: 0,
      },
    });
  }

  /**
   * Setup UI elements
   */
  private setupUI(): void {
    const boardHeight = 20 * this.config.cellSize;
    const boardTop = this.config.boardOffsetY - boardHeight;
    const leftX = this.config.boardOffsetX - 150;
    const rightX = this.config.boardOffsetX + 10 * this.config.cellSize + 30;

    // Score (left side, aligned with board top)
    this.scoreText.position.set(leftX, boardTop + 50);
    this.uiLayer.addChild(this.scoreText);

    // Level
    this.levelText.position.set(leftX, boardTop + 120);
    this.uiLayer.addChild(this.levelText);

    // Lines
    this.linesText.position.set(leftX, boardTop + 190);
    this.uiLayer.addChild(this.linesText);

    // Hold piece (left side, below stats)
    const holdLabel = new Text({ text: 'HOLD', style: this.createTextStyle(14, 0xFF00FF, true) });
    holdLabel.position.set(leftX, boardTop + 280);
    this.uiLayer.addChild(holdLabel);

    this.holdPieceContainer.position.set(leftX, boardTop + 310);
    this.uiLayer.addChild(this.holdPieceContainer);

    // Combo (above board center)
    this.comboText.position.set(this.config.boardOffsetX + 5 * this.config.cellSize, boardTop - 30);
    this.comboText.anchor.set(0.5);
    this.comboText.alpha = 0;
    this.uiLayer.addChild(this.comboText);

    // Next pieces (right side)
    const nextLabel = new Text({ text: 'NEXT', style: this.createTextStyle(14, 0xFF00FF, true) });
    nextLabel.position.set(rightX, boardTop + 50);
    this.uiLayer.addChild(nextLabel);

    this.nextPieceContainer.position.set(rightX, boardTop + 80);
    this.uiLayer.addChild(this.nextPieceContainer);

    // Title (above board) - using pixel font for retro feel
    const title = new Text({ text: 'TETRIS VFX', style: this.createTextStyle(28, 0xFF00FF, true) });
    title.position.set(this.config.width / 2, 25);
    title.anchor.set(0.5);
    this.uiLayer.addChild(title);
  }

  /**
   * Draw the background
   */
  private drawBackground(): void {
    // Initialize synthwave background
    this.synthwaveBackground = new SynthwaveBackground(this.config.width, this.config.height);
    this.backgroundLayer.addChild(this.synthwaveBackground.getContainer());

    // Initialize boid murmuration system (using defaults from BoidSystem)
    this.boidSystem = new BoidSystem(this.config.width, this.config.height, {
      colors: [0xFF00FF, 0x00FFFF, 0xFF66CC, 0x66FFFF, 0xCC00FF, 0xAA44FF],
    });
    this.backgroundLayer.addChild(this.boidSystem.getContainer());
  }

  /**
   * Draw the grid
   */
  private drawGrid(): void {
    this.gridGraphics.clear();

    const { boardOffsetX, boardOffsetY, cellSize } = this.config;
    const boardWidth = 10 * cellSize;
    const boardHeight = 20 * cellSize;

    // Board background (fully opaque to block synthwave background)
    this.gridGraphics.rect(boardOffsetX, boardOffsetY - boardHeight, boardWidth, boardHeight);
    this.gridGraphics.fill({ color: 0x0a0118, alpha: 1 });

    // Grid lines
    if (this.config.showGrid) {
      this.gridGraphics.setStrokeStyle({
        width: 1,
        color: this.colors.grid,
        alpha: this.colors.gridOpacity,
      });

      // Vertical lines
      for (let x = 0; x <= 10; x++) {
        this.gridGraphics.moveTo(boardOffsetX + x * cellSize, boardOffsetY - boardHeight);
        this.gridGraphics.lineTo(boardOffsetX + x * cellSize, boardOffsetY);
      }

      // Horizontal lines
      for (let y = 0; y <= 20; y++) {
        this.gridGraphics.moveTo(boardOffsetX, boardOffsetY - y * cellSize);
        this.gridGraphics.lineTo(boardOffsetX + boardWidth, boardOffsetY - y * cellSize);
      }

      this.gridGraphics.stroke();
    }

    // Board border
    this.gridGraphics.setStrokeStyle({
      width: 3,
      color: this.colors.glow,
      alpha: 0.8,
    });
    this.gridGraphics.rect(boardOffsetX, boardOffsetY - boardHeight, boardWidth, boardHeight);
    this.gridGraphics.stroke();
  }

  /**
   * Convert board coordinates to screen coordinates
   */
  private boardToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: this.config.boardOffsetX + x * this.config.cellSize,
      y: this.config.boardOffsetY - (y + 1) * this.config.cellSize,
    };
  }

  /**
   * Draw a single cell
   */
  private drawCell(
    graphics: Graphics,
    x: number,
    y: number,
    color: number,
    alpha: number = 1,
    outlined: boolean = false
  ): void {
    const screen = this.boardToScreen(x, y);
    const size = this.config.cellSize - 2;
    const padding = 1;

    if (outlined) {
      graphics.setStrokeStyle({ width: 2, color, alpha });
      graphics.rect(screen.x + padding, screen.y + padding, size, size);
      graphics.stroke();
    } else {
      // Main cell
      graphics.rect(screen.x + padding, screen.y + padding, size, size);
      graphics.fill({ color, alpha });

      // Inner highlight (3D effect)
      graphics.rect(screen.x + padding, screen.y + padding, size - 4, size - 4);
      graphics.fill({ color: 0xFFFFFF, alpha: alpha * 0.15 });

      // Outline
      graphics.setStrokeStyle({ width: 1, color: 0xFFFFFF, alpha: alpha * 0.3 });
      graphics.rect(screen.x + padding, screen.y + padding, size, size);
      graphics.stroke();
    }
  }

  /**
   * Draw a glow cell (for glow layer)
   */
  private drawGlowCell(
    graphics: Graphics,
    x: number,
    y: number,
    color: number
  ): void {
    const screen = this.boardToScreen(x, y);
    const size = this.config.cellSize;

    // Draw slightly larger filled rectangle for glow effect
    graphics.rect(screen.x - 2, screen.y - 2, size + 4, size + 4);
    graphics.fill({ color, alpha: 1 });
  }

  /**
   * Get color for tetromino type
   */
  private getTetrominoColor(type: TetrominoType): number {
    const hexColor = TETROMINO_COLORS[type];
    return parseInt(hexColor.replace('#', ''), 16);
  }

  /**
   * Render the current game state
   */
  render(state: GameState, chaosModifiers?: ChaosModifiers): void {
    if (!this.initialized) return;

    const deltaMs = 16.67; // ~60fps

    // Apply blackout effect from chaos
    const isBlackout = chaosModifiers?.blackout ?? false;

    // Update synthwave background animation
    if (this.synthwaveBackground) {
      this.synthwaveBackground.update(state.streak.heatLevel);
    }

    // Update boid murmuration
    if (this.boidSystem) {
      this.boidSystem.update(deltaMs);
    }

    // Update particle system
    if (this.particleSystem) {
      this.particleSystem.update(deltaMs);
    }

    // Update screen effects
    if (this.screenEffects) {
      this.screenEffects.update(deltaMs);
    }

    // Update CRT filter
    if (this.crtFilter) {
      this.crtFilter.update(deltaMs);
    }

    // Check for line clears and trigger effects
    if (state.score.linesCleared > this.lastLinesCleared) {
      const linesJustCleared = state.score.linesCleared - this.lastLinesCleared;
      this.emitLineClearParticles(linesJustCleared);
      if (this.screenEffects) {
        this.screenEffects.onLineClear(linesJustCleared);
      }
      // Make boids scatter on line clears
      if (this.boidSystem) {
        this.boidSystem.scatter(linesJustCleared * 0.5);
        // Create attractor pulse at board center
        const centerX = this.config.boardOffsetX + 5 * this.config.cellSize;
        const centerY = this.config.boardOffsetY - 10 * this.config.cellSize;
        this.boidSystem.pulse(centerX, centerY, linesJustCleared === 4 ? 0.15 : 0.08, 800);
      }
      this.lastLinesCleared = state.score.linesCleared;
    }

    // Check for level up
    if (state.score.level > this.lastLevel) {
      if (this.screenEffects) {
        this.screenEffects.onLevelUp();
      }
      this.emitLevelUp();
      this.lastLevel = state.score.level;
    }

    // Check for combo
    if (state.combo.comboCount > this.lastCombo && state.combo.comboCount > 1) {
      if (this.screenEffects) {
        this.screenEffects.onCombo(state.combo.comboCount);
      }
    }
    this.lastCombo = state.combo.comboCount;

    // Check for hard drop (piece moved down significantly)
    if (state.activePiece && this.lastPieceY > 0) {
      const dropDistance = this.lastPieceY - state.activePiece.position.y;
      if (dropDistance > 3) {
        if (this.screenEffects) {
          this.screenEffects.onHardDrop(dropDistance);
        }
        // Add sparks at landing position
        if (this.particleSystem) {
          const blocks = getPieceBlocks(state.activePiece);
          for (const block of blocks) {
            const screen = this.boardToScreen(block.x, block.y);
            this.particleSystem.emit(screen.x + this.config.cellSize / 2, screen.y + this.config.cellSize / 2, 'spark');
          }
        }
      }
    }
    if (state.activePiece) {
      this.lastPieceY = state.activePiece.position.y;
    }

    // Update piece trail
    this.updatePieceTrail(state);

    // Update lock flash cells
    this.updateLockFlashCells(deltaMs);

    // Clear dynamic graphics
    this.boardGraphics.clear();
    this.pieceGraphics.clear();
    this.ghostGraphics.clear();
    this.boardGlowGraphics.clear();
    this.pieceGlowGraphics.clear();

    // Draw locked cells with glow (hidden during blackout)
    if (!isBlackout) {
      for (const [key, cell] of state.board.cells) {
        const [x, y] = key.split(',').map(Number);
        if (y < state.board.config.height) { // Only visible cells
          const color = cell.special === 'garbage'
            ? 0x666666
            : this.getTetrominoColor(cell.type);
          this.drawCell(this.boardGraphics, x, y, color);
          // Draw glow version (slightly larger, same color)
          if (this.config.glowEnabled) {
            this.drawGlowCell(this.boardGlowGraphics, x, y, color);
          }
        }
      }
    }

    // Draw ghost piece
    if (state.activePiece && this.config.showGhost) {
      const ghostBlocks = getPieceBlocks({
        ...state.activePiece,
        position: { x: state.activePiece.position.x, y: state.activePiece.ghostY },
      });
      const color = this.getTetrominoColor(state.activePiece.type);

      for (const block of ghostBlocks) {
        if (block.y < state.board.config.height) {
          this.drawCell(this.ghostGraphics, block.x, block.y, color, 0.3, true);
        }
      }
    }

    // Draw piece trail (before active piece)
    this.drawPieceTrail();

    // Draw active piece with glow
    if (state.activePiece) {
      const blocks = getPieceBlocks(state.activePiece);
      const color = this.getTetrominoColor(state.activePiece.type);

      for (const block of blocks) {
        if (block.y < state.board.config.height) {
          this.drawCell(this.pieceGraphics, block.x, block.y, color);
          // Draw glow for active piece
          if (this.config.glowEnabled) {
            this.drawGlowCell(this.pieceGlowGraphics, block.x, block.y, color);
          }
        }
      }
    }

    // Draw lock flash effect (after pieces)
    this.drawLockFlash();

    // Update UI
    this.updateUI(state);
  }

  /**
   * Update UI elements
   */
  private updateUI(state: GameState): void {
    this.scoreText.text = `SCORE\n${state.score.score.toLocaleString()}`;
    this.levelText.text = `LEVEL\n${state.score.level}`;
    this.linesText.text = `LINES\n${state.score.linesCleared}`;

    // Update combo display
    if (state.combo.comboCount > 1) {
      this.comboText.text = `${state.combo.comboCount}x COMBO!`;
      this.comboText.alpha = 1;
      this.comboText.scale.set(1 + state.combo.comboCount * 0.1);
    } else {
      this.comboText.alpha = Math.max(0, this.comboText.alpha - 0.02);
    }

    // Update next pieces
    this.updateNextPieces(state.bag.preview);

    // Update hold piece
    this.updateHoldPiece(state.hold.piece, state.hold.available);

    // Update heat-based effects
    const heatLevel = getHeatLevel(state.streak.heatLevel);
    if (heatLevel !== this.lastHeatLevel) {
      this.onHeatChange(heatLevel);
      this.lastHeatLevel = heatLevel;
    }
  }

  /**
   * Update next piece preview
   */
  private updateNextPieces(preview: TetrominoType[]): void {
    this.nextPieceContainer.removeChildren();

    const smallCellSize = 20;
    let offsetY = 0;

    for (let i = 0; i < Math.min(preview.length, 3); i++) {
      const type = preview[i];
      const color = this.getTetrominoColor(type);
      const graphics = new Graphics();

      // Get shape for rotation 0
      const shape = this.getTetrominoShape(type);
      for (const pos of shape) {
        graphics.rect(
          pos.x * smallCellSize,
          -pos.y * smallCellSize,
          smallCellSize - 2,
          smallCellSize - 2
        );
        graphics.fill(color);
      }

      graphics.position.set(0, offsetY);
      this.nextPieceContainer.addChild(graphics);
      offsetY += 80;
    }
  }

  /**
   * Update hold piece display
   */
  private updateHoldPiece(type: TetrominoType | null, available: boolean): void {
    this.holdPieceContainer.removeChildren();

    if (type) {
      const smallCellSize = 20;
      const color = this.getTetrominoColor(type);
      const graphics = new Graphics();

      const shape = this.getTetrominoShape(type);
      for (const pos of shape) {
        graphics.rect(
          pos.x * smallCellSize,
          -pos.y * smallCellSize,
          smallCellSize - 2,
          smallCellSize - 2
        );
        graphics.fill({ color, alpha: available ? 1 : 0.4 });
      }

      this.holdPieceContainer.addChild(graphics);
    }
  }

  /**
   * Get tetromino shape for preview/hold display
   * Uses the actual TETROMINO_SHAPES from the game, normalized to start at (0,0)
   */
  private getTetrominoShape(type: TetrominoType): { x: number; y: number }[] {
    // Use the official shapes from TETROMINO_SHAPES, rotation 0
    const officialShapes: Record<TetrominoType, { x: number; y: number }[]> = {
      I: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
      O: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
      T: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }],
      S: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }],
      Z: [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
      J: [{ x: -1, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
      L: [{ x: 1, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
    };

    const shape = officialShapes[type];

    // Normalize to start at (0,0) for preview display
    const minX = Math.min(...shape.map(p => p.x));
    const minY = Math.min(...shape.map(p => p.y));

    return shape.map(p => ({ x: p.x - minX, y: p.y - minY }));
  }

  /**
   * Handle heat level change (for VFX)
   */
  private onHeatChange(heatLevel: HeatLevel): void {
    // Update colors based on heat
    switch (heatLevel) {
      case 'cold':
        this.colors.glow = 0xFF00FF;
        break;
      case 'warm':
        this.colors.glow = 0xFF44FF;
        break;
      case 'hot':
        this.colors.glow = 0xFF88FF;
        break;
      case 'fire':
        this.colors.glow = 0xFFAAFF;
        break;
      case 'inferno':
        this.colors.glow = 0xFFFFFF;
        break;
    }

    // Redraw grid with new colors
    this.drawGrid();
  }

  /**
   * Emit particles for line clears with dissolve effect
   */
  private emitLineClearParticles(linesCleared: number): void {
    if (!this.particleSystem) return;

    const boardWidth = 10 * this.config.cellSize;
    const cellSize = this.config.cellSize;

    // Synthwave color palette for dissolve effect
    const synthwaveColors = [0xFF00FF, 0x00FFFF, 0xFF66CC, 0x66FFFF, 0xFFFF00, 0xFF6699];

    // Emit dissolve particles across the board for each line cleared
    for (let i = 0; i < linesCleared; i++) {
      // Emit at bottom portion of the board (most likely location of clears)
      const lineY = this.config.boardOffsetY - (i + 2) * this.config.cellSize;

      // Create colors array for each cell in the row
      const rowColors: number[] = [];
      for (let x = 0; x < 10; x++) {
        rowColors.push(synthwaveColors[Math.floor(Math.random() * synthwaveColors.length)]);
      }

      // Emit row dissolve with staggered effect
      this.particleSystem.emitRowDissolve(
        this.config.boardOffsetX,
        lineY,
        cellSize,
        10,
        rowColors
      );

      // Also emit the explosion particles for extra impact
      if (linesCleared === 4) {
        // TETRIS - extra particles!
        this.particleSystem.emitLine(this.config.boardOffsetX, lineY, boardWidth, 'tetris');
      } else {
        this.particleSystem.emitLine(this.config.boardOffsetX, lineY, boardWidth, 'lineClear');
      }
    }

    // Extra combo particles if combo is active
    if (linesCleared > 1) {
      const centerX = this.config.boardOffsetX + boardWidth / 2;
      const centerY = this.config.boardOffsetY - 10 * this.config.cellSize;
      this.particleSystem.emit(centerX, centerY, 'combo');
    }
  }

  /**
   * Emit level up celebration
   */
  emitLevelUp(): void {
    if (!this.particleSystem) return;

    const centerX = this.config.width / 2;
    const centerY = this.config.height / 2;
    this.particleSystem.emit(centerX, centerY, 'levelUp');
  }

  /**
   * Update piece trail effect
   */
  private updatePieceTrail(state: GameState): void {
    // Fade existing trail
    for (let i = this.pieceTrail.length - 1; i >= 0; i--) {
      this.pieceTrail[i].alpha -= 0.15;
      if (this.pieceTrail[i].alpha <= 0) {
        this.pieceTrail.splice(i, 1);
      }
    }

    // Add new trail points for active piece
    if (state.activePiece) {
      const blocks = getPieceBlocks(state.activePiece);
      const color = this.getTetrominoColor(state.activePiece.type);

      for (const block of blocks) {
        this.pieceTrail.push({
          x: block.x,
          y: block.y,
          alpha: 0.4,
          color,
        });
      }

      // Limit trail length
      while (this.pieceTrail.length > 40) {
        this.pieceTrail.shift();
      }
    }
  }

  /**
   * Update lock flash cells
   */
  private updateLockFlashCells(deltaMs: number): void {
    for (let i = this.lockFlashCells.length - 1; i >= 0; i--) {
      this.lockFlashCells[i].time -= deltaMs;
      if (this.lockFlashCells[i].time <= 0) {
        this.lockFlashCells.splice(i, 1);
      }
    }
  }

  /**
   * Trigger lock flash for cells
   */
  triggerLockFlash(cells: { x: number; y: number }[], color: number): void {
    for (const cell of cells) {
      this.lockFlashCells.push({
        x: cell.x,
        y: cell.y,
        time: this.LOCK_FLASH_DURATION,
        color,
      });
    }
  }

  /**
   * Draw piece trail
   */
  private drawPieceTrail(): void {
    for (const trail of this.pieceTrail) {
      if (trail.y < 20) { // Only visible cells
        this.drawCell(this.ghostGraphics, trail.x, trail.y, trail.color, trail.alpha * 0.5, false);
      }
    }
  }

  /**
   * Draw lock flash effect
   */
  private drawLockFlash(): void {
    for (const cell of this.lockFlashCells) {
      const progress = cell.time / this.LOCK_FLASH_DURATION;
      const screen = this.boardToScreen(cell.x, cell.y);
      const size = this.config.cellSize;
      const expansion = (1 - progress) * 10;

      // White flash that fades out
      this.pieceGraphics.rect(
        screen.x - expansion,
        screen.y - expansion,
        size + expansion * 2,
        size + expansion * 2
      );
      this.pieceGraphics.fill({ color: 0xFFFFFF, alpha: progress * 0.8 });
    }
  }

  // Game over callbacks
  private gameOverCallbacks: {
    onReturnToMenu?: () => void;
  } = {};

  /**
   * Set game over callbacks
   */
  setGameOverCallbacks(callbacks: { onReturnToMenu?: () => void }): void {
    this.gameOverCallbacks = callbacks;
  }

  /**
   * Show game over screen
   */
  showGameOver(finalScore: number): void {
    // Remove existing game over screen if present
    this.hideGameOver();

    // Create container for all game over elements
    this.gameOverContainer = new Container();

    const overlay = new Graphics();
    overlay.rect(0, 0, this.config.width, this.config.height);
    overlay.fill({ color: 0x000000, alpha: 0.7 });
    this.gameOverContainer.addChild(overlay);

    const gameOverText = new Text({
      text: 'GAME OVER',
      style: this.createTextStyle(48, 0xFF0000),
    });
    gameOverText.anchor.set(0.5);
    gameOverText.position.set(this.config.width / 2, this.config.height / 2 - 60);
    this.gameOverContainer.addChild(gameOverText);

    const finalScoreText = new Text({
      text: `Final Score: ${finalScore.toLocaleString()}`,
      style: this.createTextStyle(32, 0xFFFFFF),
    });
    finalScoreText.anchor.set(0.5);
    finalScoreText.position.set(this.config.width / 2, this.config.height / 2 + 10);
    this.gameOverContainer.addChild(finalScoreText);

    const restartText = new Text({
      text: '[R] Restart',
      style: this.createTextStyle(20, 0x00FFFF),
    });
    restartText.anchor.set(0.5);
    restartText.position.set(this.config.width / 2, this.config.height / 2 + 70);
    this.gameOverContainer.addChild(restartText);

    const menuText = new Text({
      text: '[ESC] Return to Menu',
      style: this.createTextStyle(20, 0xFF00FF),
    });
    menuText.anchor.set(0.5);
    menuText.position.set(this.config.width / 2, this.config.height / 2 + 105);
    this.gameOverContainer.addChild(menuText);

    // Make menu text interactive
    menuText.eventMode = 'static';
    menuText.cursor = 'pointer';
    menuText.on('pointerover', () => {
      menuText.style.fill = 0xFFFFFF;
    });
    menuText.on('pointerout', () => {
      menuText.style.fill = 0xFF00FF;
    });
    menuText.on('pointerdown', () => {
      if (this.gameOverCallbacks.onReturnToMenu) {
        this.gameOverCallbacks.onReturnToMenu();
      }
    });

    this.uiLayer.addChild(this.gameOverContainer);
  }

  /**
   * Hide game over screen
   */
  hideGameOver(): void {
    if (this.gameOverContainer) {
      this.uiLayer.removeChild(this.gameOverContainer);
      this.gameOverContainer.destroy({ children: true });
      this.gameOverContainer = null;
    }
  }

  /**
   * Show pause screen
   */
  showPause(): void {
    // Remove existing pause screen if present
    this.hidePause();

    // Create container for all pause elements
    this.pauseContainer = new Container();

    const overlay = new Graphics();
    overlay.rect(0, 0, this.config.width, this.config.height);
    overlay.fill({ color: 0x000000, alpha: 0.6 });
    this.pauseContainer.addChild(overlay);

    const pauseText = new Text({
      text: 'PAUSED',
      style: this.createTextStyle(56, 0x00FFFF),
    });
    pauseText.anchor.set(0.5);
    pauseText.position.set(this.config.width / 2, this.config.height / 2 - 40);
    this.pauseContainer.addChild(pauseText);

    const resumeText = new Text({
      text: 'Press ESC or P to resume',
      style: this.createTextStyle(24, 0xFFFFFF),
    });
    resumeText.anchor.set(0.5);
    resumeText.position.set(this.config.width / 2, this.config.height / 2 + 30);
    this.pauseContainer.addChild(resumeText);

    const controlsText = new Text({
      text: 'Controls: Arrow Keys / WASD to move\nSpace = Hard Drop | Z/X = Rotate | C = Hold\nF2 = Toggle CRT | R = Restart',
      style: this.createTextStyle(16, 0xAAAAAA),
    });
    controlsText.anchor.set(0.5);
    controlsText.position.set(this.config.width / 2, this.config.height / 2 + 100);
    this.pauseContainer.addChild(controlsText);

    this.uiLayer.addChild(this.pauseContainer);
  }

  /**
   * Hide pause screen
   */
  hidePause(): void {
    if (this.pauseContainer) {
      this.uiLayer.removeChild(this.pauseContainer);
      this.pauseContainer.destroy({ children: true });
      this.pauseContainer = null;
    }
  }

  /**
   * Reset renderer state for new game
   */
  reset(): void {
    this.hideGameOver();
    this.hidePause();
    this.lastLinesCleared = 0;
    this.lastLevel = 1;
    this.lastCombo = 0;
    this.lastPieceY = 0;
    this.pieceTrail = [];
    this.lockFlashCells = [];
    if (this.screenEffects) {
      this.screenEffects.clear();
    }
  }

  /**
   * Get PixiJS application
   */
  getApp(): Application {
    return this.app;
  }

  /**
   * Resize renderer
   */
  resize(width: number, height: number): void {
    this.config.width = width;
    this.config.height = height;
    this.app.renderer.resize(width, height);

    // Recalculate board position
    const boardWidth = 10 * this.config.cellSize;
    const boardHeight = 20 * this.config.cellSize;
    this.config.boardOffsetX = (width - boardWidth) / 2;
    this.config.boardOffsetY = (height - boardHeight) / 2 + 50;

    // Resize synthwave background
    if (this.synthwaveBackground) {
      this.synthwaveBackground.resize(width, height);
    }

    this.drawGrid();
  }

  /**
   * Get boid system for debug access
   */
  getBoidSystem(): BoidSystem | null {
    return this.boidSystem;
  }

  /**
   * Get CRT filter for debug access
   */
  getCRTFilter(): CRTFilter | null {
    return this.crtFilter;
  }

  /**
   * Get screen effects for debug access
   */
  getScreenEffects(): ScreenEffects | null {
    return this.screenEffects;
  }

  /**
   * Initialize menus with callbacks
   */
  initMenus(
    onStartGame: (mode: GameModeType) => void,
    onSFXVolumeChange: (volume: number) => void,
    onMusicVolumeChange: (volume: number) => void,
    onCRTToggle: () => void
  ): void {
    this.menuCallbacks.onStartGame = onStartGame;
    this.menuCallbacks.onSFXVolumeChange = onSFXVolumeChange;
    this.menuCallbacks.onMusicVolumeChange = onMusicVolumeChange;

    // Create main menu
    this.mainMenu = new MainMenu({
      onStartGame: (mode) => {
        // Use scanline transition when starting game
        if (this.screenEffects) {
          this.screenEffects.scanlineTransition(() => {
            this.hideMainMenu();
            onStartGame(mode);
          });
        } else {
          this.hideMainMenu();
          onStartGame(mode);
        }
      },
      onOpenSettings: () => {
        // Use fade transition to settings
        if (this.screenEffects) {
          this.screenEffects.fadeTransition(() => {
            this.hideMainMenu();
            this.showSettingsMenu();
          }, 400);
        } else {
          this.hideMainMenu();
          this.showSettingsMenu();
        }
      },
      onOpenLeaderboard: () => {
        // Show leaderboard overlay
        this.showLeaderboard();
      },
    });
    this.mainMenu.layout(this.config.width, this.config.height);
    this.menuLayer.addChild(this.mainMenu.getContainer());

    // Create settings menu
    this.settingsMenu = new SettingsMenu({
      onBack: () => {
        // Use fade transition back to main menu
        if (this.screenEffects) {
          this.screenEffects.fadeTransition(() => {
            this.hideSettingsMenu();
            this.showMainMenu();
          }, 400);
        } else {
          this.hideSettingsMenu();
          this.showMainMenu();
        }
      },
      onSFXVolumeChange,
      onMusicVolumeChange,
      onCRTToggle,
    });
    this.settingsMenu.layout(this.config.width, this.config.height);
    this.menuLayer.addChild(this.settingsMenu.getContainer());
  }

  /**
   * Show main menu
   */
  showMainMenu(): void {
    if (this.mainMenu) {
      this.mainMenu.show();
      // Hide game layers
      this.gridLayer.visible = false;
      this.boardLayer.visible = false;
      this.pieceLayer.visible = false;
      this.uiLayer.visible = false;
    }
  }

  /**
   * Hide main menu
   */
  hideMainMenu(): void {
    if (this.mainMenu) {
      this.mainMenu.hide();
      // Show game layers
      this.gridLayer.visible = true;
      this.boardLayer.visible = true;
      this.pieceLayer.visible = true;
      this.uiLayer.visible = true;
    }
  }

  /**
   * Show settings menu
   */
  showSettingsMenu(): void {
    if (this.settingsMenu) {
      this.settingsMenu.show();
    }
  }

  /**
   * Hide settings menu
   */
  hideSettingsMenu(): void {
    if (this.settingsMenu) {
      this.settingsMenu.hide();
    }
  }

  /**
   * Handle menu keyboard input
   */
  handleMenuKeyDown(event: KeyboardEvent): boolean {
    // Leaderboard input takes priority
    if (this.nameEntryDialog?.isVisible()) {
      return this.nameEntryDialog.handleKeyDown(event);
    }
    if (this.leaderboardDisplay?.isVisible()) {
      return this.leaderboardDisplay.handleKeyDown(event);
    }
    if (this.mainMenu?.isVisible()) {
      return this.mainMenu.handleKeyDown(event);
    }
    if (this.settingsMenu?.isVisible()) {
      return this.settingsMenu.handleKeyDown(event);
    }
    return false;
  }

  /**
   * Check if any menu is visible
   */
  isMenuVisible(): boolean {
    return (this.mainMenu?.isVisible() ?? false) ||
           (this.settingsMenu?.isVisible() ?? false) ||
           (this.nameEntryDialog?.isVisible() ?? false) ||
           (this.leaderboardDisplay?.isVisible() ?? false);
  }

  /**
   * Update menus (for animations)
   */
  updateMenus(deltaTime: number): void {
    if (this.mainMenu?.isVisible()) {
      this.mainMenu.update(deltaTime);
    }
    if (this.nameEntryDialog?.isVisible()) {
      this.nameEntryDialog.update(deltaTime);
    }
    if (this.leaderboardDisplay?.isVisible()) {
      this.leaderboardDisplay.update(deltaTime);
    }
  }

  /**
   * Get main menu for external access
   */
  getMainMenu(): MainMenu | null {
    return this.mainMenu;
  }

  /**
   * Get settings menu for external access
   */
  getSettingsMenu(): SettingsMenu | null {
    return this.settingsMenu;
  }

  /**
   * Show chaos warning (before event triggers)
   */
  showChaosWarning(eventName: string): void {
    // Clear any existing warning
    this.hideChaosWarning();

    this.chaosWarningContainer = new Container();

    // Warning background
    const bg = new Graphics();
    bg.rect(0, 0, this.config.width, 60);
    bg.fill({ color: 0xFF0000, alpha: 0.3 });
    this.chaosWarningContainer.addChild(bg);

    // Warning text
    const warningText = new Text({
      text: `⚠️ ${eventName} INCOMING! ⚠️`,
      style: this.createTextStyle(28, 0xFFFF00, true),
    });
    warningText.anchor.set(0.5);
    warningText.position.set(this.config.width / 2, 30);
    this.chaosWarningContainer.addChild(warningText);

    // Flashing animation
    let flashState = true;
    const flashInterval = setInterval(() => {
      if (this.chaosWarningContainer) {
        this.chaosWarningContainer.alpha = flashState ? 1 : 0.5;
        flashState = !flashState;
      }
    }, 150);

    this.uiLayer.addChild(this.chaosWarningContainer);

    // Auto-hide after 1.5 seconds
    this.chaosWarningTimeout = window.setTimeout(() => {
      clearInterval(flashInterval);
      this.hideChaosWarning();
    }, 1500);
  }

  /**
   * Hide chaos warning
   */
  private hideChaosWarning(): void {
    if (this.chaosWarningTimeout) {
      clearTimeout(this.chaosWarningTimeout);
      this.chaosWarningTimeout = null;
    }
    if (this.chaosWarningContainer) {
      this.uiLayer.removeChild(this.chaosWarningContainer);
      this.chaosWarningContainer.destroy({ children: true });
      this.chaosWarningContainer = null;
    }
  }

  /**
   * Show chaos event (when event is active)
   */
  showChaosEvent(eventName: string): void {
    // Clear any existing event display
    this.hideChaosEvent();

    this.chaosEventContainer = new Container();

    // Event indicator at top of screen
    const bg = new Graphics();
    bg.rect(this.config.width / 2 - 150, 50, 300, 40);
    bg.fill({ color: 0xFF00FF, alpha: 0.6 });
    bg.stroke({ color: 0x00FFFF, width: 2 });
    this.chaosEventContainer.addChild(bg);

    const eventText = new Text({
      text: `🔥 ${eventName} 🔥`,
      style: this.createTextStyle(18, 0xFFFFFF),
    });
    eventText.anchor.set(0.5);
    eventText.position.set(this.config.width / 2, 70);
    this.chaosEventContainer.addChild(eventText);

    this.uiLayer.addChild(this.chaosEventContainer);
  }

  /**
   * Hide chaos event display
   */
  hideChaosEvent(): void {
    if (this.chaosEventContainer) {
      this.uiLayer.removeChild(this.chaosEventContainer);
      this.chaosEventContainer.destroy({ children: true });
      this.chaosEventContainer = null;
    }
  }

  /**
   * Initialize leaderboard UI components
   */
  initLeaderboard(
    onNameSubmit: (name: string) => void,
    onLeaderboardClose: () => void
  ): void {
    this.leaderboardCallbacks.onNameSubmit = onNameSubmit;
    this.leaderboardCallbacks.onLeaderboardClose = onLeaderboardClose;

    // Create name entry dialog
    this.nameEntryDialog = new NameEntryDialog({
      onSubmit: (name) => {
        this.hideNameEntry();
        if (this.leaderboardCallbacks.onNameSubmit) {
          this.leaderboardCallbacks.onNameSubmit(name);
        }
      },
      onCancel: () => {
        this.hideNameEntry();
      },
    });
    this.nameEntryDialog.layout(this.config.width, this.config.height);
    this.menuLayer.addChild(this.nameEntryDialog.getContainer());

    // Create leaderboard display
    this.leaderboardDisplay = new LeaderboardDisplay({
      onClose: () => {
        this.hideLeaderboard();
        if (this.leaderboardCallbacks.onLeaderboardClose) {
          this.leaderboardCallbacks.onLeaderboardClose();
        }
      },
    });
    this.leaderboardDisplay.layout(this.config.width, this.config.height);
    this.menuLayer.addChild(this.leaderboardDisplay.getContainer());
  }

  /**
   * Show name entry dialog for high score
   */
  showNameEntry(score: number, rank: number): void {
    if (this.nameEntryDialog) {
      this.nameEntryDialog.show(score, rank);
    }
  }

  /**
   * Hide name entry dialog
   */
  hideNameEntry(): void {
    if (this.nameEntryDialog) {
      this.nameEntryDialog.hide();
    }
  }

  /**
   * Show leaderboard display
   */
  showLeaderboard(mode?: GameModeType, highlightRank?: number): void {
    if (this.leaderboardDisplay) {
      this.leaderboardDisplay.show(mode, highlightRank);
    }
  }

  /**
   * Hide leaderboard display
   */
  hideLeaderboard(): void {
    if (this.leaderboardDisplay) {
      this.leaderboardDisplay.hide();
    }
  }

  /**
   * Check if name entry is visible
   */
  isNameEntryVisible(): boolean {
    return this.nameEntryDialog?.isVisible() ?? false;
  }

  /**
   * Check if leaderboard is visible
   */
  isLeaderboardVisible(): boolean {
    return this.leaderboardDisplay?.isVisible() ?? false;
  }

  /**
   * Handle leaderboard keyboard input
   */
  handleLeaderboardKeyDown(event: KeyboardEvent): boolean {
    if (this.nameEntryDialog?.isVisible()) {
      return this.nameEntryDialog.handleKeyDown(event);
    }
    if (this.leaderboardDisplay?.isVisible()) {
      return this.leaderboardDisplay.handleKeyDown(event);
    }
    return false;
  }

  /**
   * Update leaderboard UI (for animations)
   */
  updateLeaderboard(deltaTime: number): void {
    if (this.nameEntryDialog?.isVisible()) {
      this.nameEntryDialog.update(deltaTime);
    }
    if (this.leaderboardDisplay?.isVisible()) {
      this.leaderboardDisplay.update(deltaTime);
    }
  }

  /**
   * Show special clear notification (T-Spin, Perfect Clear, Back-to-Back)
   */
  showSpecialClear(clearType: string, points: number, isBackToBack: boolean = false): void {
    // Clear existing notification
    this.hideSpecialClear();

    this.specialClearContainer = new Container();

    // Determine text and color based on clear type
    let text = '';
    let color = 0xFFFFFF;
    let fontSize = 36;

    if (clearType.startsWith('t-spin')) {
      text = clearType.toUpperCase().replace('-', ' ');
      color = 0xFF00FF; // Magenta for T-Spin
      fontSize = 42;
    } else if (clearType === 'perfect-clear') {
      text = 'PERFECT CLEAR!';
      color = 0xFFD700; // Gold
      fontSize = 48;
    } else if (clearType === 'tetris') {
      text = 'TETRIS!';
      color = 0x00FFFF; // Cyan
      fontSize = 44;
    }

    // Add B2B prefix if active
    if (isBackToBack && clearType !== 'perfect-clear') {
      text = `B2B ${text}`;
      color = 0xFFFF00; // Yellow for B2B
    }

    // Main text
    const clearText = new Text({
      text: text,
      style: this.createTextStyle(fontSize, color, true),
    });
    clearText.anchor.set(0.5);
    clearText.position.set(this.config.width / 2, this.config.height / 2 - 80);
    this.specialClearContainer.addChild(clearText);

    // Points text
    const pointsText = new Text({
      text: `+${points.toLocaleString()}`,
      style: this.createTextStyle(28, 0xFFFFFF),
    });
    pointsText.anchor.set(0.5);
    pointsText.position.set(this.config.width / 2, this.config.height / 2 - 30);
    this.specialClearContainer.addChild(pointsText);

    // Animate scale up
    this.specialClearContainer.scale.set(0.5);
    this.specialClearContainer.alpha = 0;

    this.uiLayer.addChild(this.specialClearContainer);

    // Animate in
    let frame = 0;
    const animateIn = () => {
      frame++;
      if (this.specialClearContainer) {
        const progress = Math.min(frame / 10, 1);
        this.specialClearContainer.scale.set(0.5 + progress * 0.5);
        this.specialClearContainer.alpha = progress;

        if (progress < 1) {
          requestAnimationFrame(animateIn);
        }
      }
    };
    animateIn();

    // Emit extra particles for special clears
    if (this.particleSystem && clearType === 'perfect-clear') {
      // Golden celebration particles
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          if (this.particleSystem) {
            this.particleSystem.emit(
              this.config.width / 2 + (Math.random() - 0.5) * 300,
              this.config.height / 2,
              'levelUp'
            );
          }
        }, i * 100);
      }
    }

    // Auto-hide after 1.5 seconds
    this.specialClearTimeout = window.setTimeout(() => {
      this.hideSpecialClear();
    }, 1500);
  }

  /**
   * Hide special clear notification
   */
  private hideSpecialClear(): void {
    if (this.specialClearTimeout) {
      clearTimeout(this.specialClearTimeout);
      this.specialClearTimeout = null;
    }
    if (this.specialClearContainer) {
      this.uiLayer.removeChild(this.specialClearContainer);
      this.specialClearContainer.destroy({ children: true });
      this.specialClearContainer = null;
    }
  }

  /**
   * Show countdown (3-2-1-GO!) before game starts
   */
  showCountdown(onComplete: () => void): void {
    this.countdownCallback = onComplete;
    this.countdownContainer = new Container();

    const centerX = this.config.width / 2;
    const centerY = this.config.height / 2;

    // Semi-transparent background overlay
    const overlay = new Graphics();
    overlay.rect(0, 0, this.config.width, this.config.height);
    overlay.fill({ color: 0x0D0221, alpha: 0.7 });
    this.countdownContainer.addChild(overlay);

    // Animated radial pulse rings
    const pulseContainer = new Container();
    pulseContainer.position.set(centerX, centerY);
    this.countdownContainer.addChild(pulseContainer);

    // Create multiple pulse rings
    const pulseRings: Graphics[] = [];
    for (let i = 0; i < 3; i++) {
      const ring = new Graphics();
      ring.circle(0, 0, 50);
      ring.stroke({ color: 0x00FFFF, width: 3, alpha: 0.8 });
      ring.scale.set(0);
      ring.alpha = 0;
      pulseRings.push(ring);
      pulseContainer.addChild(ring);
    }

    // "GET READY" subtitle
    const subtitleStyle = new TextStyle({
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 24,
      fill: 0xFF00FF,
      letterSpacing: 8,
    });
    const subtitleText = new Text({ text: 'GET READY', style: subtitleStyle });
    subtitleText.anchor.set(0.5);
    subtitleText.position.set(centerX, centerY - 120);
    subtitleText.alpha = 0.8;
    this.countdownContainer.addChild(subtitleText);

    // Create bright, glowing countdown text style
    const countdownStyle = new TextStyle({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 160,
      fill: 0x00FFFF,
      stroke: { color: 0x000000, width: 10 },
      dropShadow: {
        color: 0x00FFFF,
        blur: 40,
        alpha: 1,
        distance: 0,
        angle: 0,
      },
    });

    const countdownText = new Text({
      text: '3',
      style: countdownStyle,
    });
    countdownText.anchor.set(0.5);
    countdownText.position.set(centerX, centerY);
    this.countdownContainer.addChild(countdownText);

    // Decorative corner brackets
    const bracketGraphics = new Graphics();
    const bracketSize = 40;
    const bracketOffset = 180;
    const bracketColor = 0xFF00FF;

    // Top-left bracket
    bracketGraphics.moveTo(centerX - bracketOffset, centerY - bracketOffset + bracketSize);
    bracketGraphics.lineTo(centerX - bracketOffset, centerY - bracketOffset);
    bracketGraphics.lineTo(centerX - bracketOffset + bracketSize, centerY - bracketOffset);

    // Top-right bracket
    bracketGraphics.moveTo(centerX + bracketOffset - bracketSize, centerY - bracketOffset);
    bracketGraphics.lineTo(centerX + bracketOffset, centerY - bracketOffset);
    bracketGraphics.lineTo(centerX + bracketOffset, centerY - bracketOffset + bracketSize);

    // Bottom-left bracket
    bracketGraphics.moveTo(centerX - bracketOffset, centerY + bracketOffset - bracketSize);
    bracketGraphics.lineTo(centerX - bracketOffset, centerY + bracketOffset);
    bracketGraphics.lineTo(centerX - bracketOffset + bracketSize, centerY + bracketOffset);

    // Bottom-right bracket
    bracketGraphics.moveTo(centerX + bracketOffset - bracketSize, centerY + bracketOffset);
    bracketGraphics.lineTo(centerX + bracketOffset, centerY + bracketOffset);
    bracketGraphics.lineTo(centerX + bracketOffset, centerY + bracketOffset - bracketSize);

    bracketGraphics.stroke({ color: bracketColor, width: 4, alpha: 0.8 });
    this.countdownContainer.addChild(bracketGraphics);

    // Add directly to stage at the very top (above screen effects/transitions)
    this.app.stage.addChild(this.countdownContainer);

    // Pulse ring animation
    let pulseTime = 0;
    const animatePulse = () => {
      if (!this.countdownContainer) return;
      pulseTime += 16;

      pulseRings.forEach((ring, i) => {
        const offset = i * 200;
        const progress = ((pulseTime + offset) % 700) / 700;
        ring.scale.set(1 + progress * 4);
        ring.alpha = Math.max(0, 0.6 - progress * 0.8);
      });

      // Subtle bracket pulse
      const pulse = Math.sin(pulseTime * 0.008) * 0.2 + 0.8;
      bracketGraphics.alpha = pulse;

      requestAnimationFrame(animatePulse);
    };
    animatePulse();

    // Countdown sequence
    const counts = ['3', '2', '1', 'GO!'];
    let countIndex = 0;

    const updateCount = () => {
      if (!this.countdownContainer) return;

      // Scale animation - dramatic zoom in
      countdownText.scale.set(2.5);
      countdownText.alpha = 1;
      countdownText.rotation = -0.1;

      const animateOut = () => {
        if (!countdownText || !this.countdownContainer) return;
        if (countdownText.scale.x > 0.8) {
          countdownText.scale.x -= 0.08;
          countdownText.scale.y -= 0.08;
          countdownText.rotation += 0.005;
          countdownText.alpha = Math.max(0.3, countdownText.alpha - 0.02);
          requestAnimationFrame(animateOut);
        }
      };
      animateOut();

      countIndex++;
      if (countIndex < counts.length) {
        setTimeout(() => {
          if (countdownText && this.countdownContainer) {
            countdownText.text = counts[countIndex];
            if (counts[countIndex] === 'GO!') {
              // Epic color change for GO!
              countdownText.style.fill = 0x00FF00;
              countdownText.style.dropShadow = {
                color: 0x00FF00,
                blur: 50,
                alpha: 1,
                distance: 0,
                angle: 0,
              };
              subtitleText.text = 'FIGHT!';
              subtitleText.style.fill = 0x00FF00;

              // Flash effect
              overlay.clear();
              overlay.rect(0, 0, this.config.width, this.config.height);
              overlay.fill({ color: 0x00FF00, alpha: 0.3 });
            }
            updateCount();
          }
        }, 700);
      } else {
        // Countdown complete
        setTimeout(() => {
          this.hideCountdown();
          if (this.countdownCallback) {
            this.countdownCallback();
            this.countdownCallback = null;
          }
        }, 400);
      }
    };

    updateCount();
  }

  /**
   * Hide countdown
   */
  private hideCountdown(): void {
    if (this.countdownContainer) {
      this.app.stage.removeChild(this.countdownContainer);
      this.countdownContainer.destroy({ children: true });
      this.countdownContainer = null;
    }
  }

  /**
   * Show back-to-back notification
   */
  showBackToBack(count: number): void {
    // Clear any existing
    this.hideSpecialClear();

    this.specialClearContainer = new Container();

    const b2bText = new Text({
      text: `BACK-TO-BACK x${count}!`,
      style: this.createTextStyle(32, 0xFFFF00, true),
    });
    b2bText.anchor.set(0.5);
    b2bText.position.set(this.config.width / 2, this.config.height / 2 - 120);
    this.specialClearContainer.addChild(b2bText);

    this.uiLayer.addChild(this.specialClearContainer);

    // Auto-hide after 1 second
    this.specialClearTimeout = window.setTimeout(() => {
      this.hideSpecialClear();
    }, 1000);
  }

  /**
   * Destroy renderer
   */
  destroy(): void {
    if (this.synthwaveBackground) {
      this.synthwaveBackground.destroy();
    }
    if (this.boidSystem) {
      this.boidSystem.destroy();
    }
    if (this.particleSystem) {
      this.particleSystem.destroy();
    }
    if (this.screenEffects) {
      this.screenEffects.destroy();
    }
    if (this.mainMenu) {
      this.mainMenu.destroy();
    }
    if (this.settingsMenu) {
      this.settingsMenu.destroy();
    }
    if (this.nameEntryDialog) {
      this.nameEntryDialog.destroy();
    }
    if (this.leaderboardDisplay) {
      this.leaderboardDisplay.destroy();
    }
    if (this.specialClearTimeout) {
      clearTimeout(this.specialClearTimeout);
    }
    this.app.destroy(true);
  }
}
