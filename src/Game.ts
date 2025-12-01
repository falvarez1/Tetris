/**
 * Main Game Orchestrator
 * Ties together all systems: input, game logic, rendering, audio
 */

import {
  GameState,
  GameConfig,
  DEFAULT_GAME_CONFIG,
  createGameState,
  resetGameState,
  GameModeType,
} from './core/types/gameState';
import { EventBus } from './core/types/events';
import { updateGame, startGame, DEFAULT_LOOP_CONFIG } from './core/engine/GameLoop';
import { InputManager } from './input/InputManager';
import { RenderPipeline } from './rendering/RenderPipeline';
import { DebugPanel, DebugSettings } from './ui/DebugPanel';
import { AudioManager, getAudioManager } from './audio/AudioManager';
import { MusicManager, getMusicManager } from './audio/MusicManager';
import { ChaosManager, getChaosManager, ChaosModifiers } from './core/chaos/ChaosManager';
import { getLeaderboard, Leaderboard } from './storage/Leaderboard';

/**
 * Game options
 */
export interface GameOptions {
  container: HTMLElement;
  mode?: GameModeType;
  config?: Partial<GameConfig>;
}

/**
 * Main Game class
 */
export class Game {
  private state: GameState;
  private config: GameConfig;
  private eventBus: EventBus;
  private inputManager: InputManager;
  private renderer: RenderPipeline;
  private debugPanel: DebugPanel | null = null;
  private audioManager: AudioManager;
  private musicManager: MusicManager;
  private chaosManager: ChaosManager;
  private chaosModifiers: ChaosModifiers = {
    gravityMultiplier: 1,
    controlsReversed: false,
    pieceFreeze: false,
    shakeIntensity: 0,
    blackout: false,
    windDirection: 0,
  };
  private leaderboard: Leaderboard;

  // App phase (menu vs playing)
  private appPhase: 'menu' | 'playing' = 'menu';
  private currentMode: GameModeType = 'classic';

  // Pending high score entry
  private pendingHighScore: { score: number; level: number; lines: number; mode: string } | null = null;
  private nameEntryTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // Wind drift timer
  private windDriftAccumulator: number = 0;
  private readonly windDriftInterval: number = 300; // ms between wind drift moves

  // Danger level tracking for dynamic music
  private lastDangerLevel: number = 0;

  // Game loop
  private running = false;
  private lastTime = 0;
  private accumulator = 0;
  private readonly fixedTimestep = DEFAULT_LOOP_CONFIG.fixedTimestep;
  private readonly maxAccumulator = DEFAULT_LOOP_CONFIG.maxAccumulator;

  // Frame info
  private fps = 0;
  private frameCount = 0;
  private fpsTime = 0;

  constructor(options: GameOptions) {
    this.config = { ...DEFAULT_GAME_CONFIG, ...options.config };
    this.eventBus = new EventBus();
    this.inputManager = new InputManager();
    this.renderer = new RenderPipeline();
    this.audioManager = getAudioManager();
    this.musicManager = getMusicManager();
    this.chaosManager = getChaosManager();
    this.leaderboard = getLeaderboard();
    this.state = createGameState(options.mode || 'classic', this.config);

    // Setup chaos manager callbacks
    this.setupChaosCallbacks();

    // Setup input callbacks
    this.inputManager.onPause(() => this.handlePauseOrMenu());
    this.inputManager.onRestart(() => this.restart());
    this.inputManager.onToggleCRT(() => this.toggleCRT());
    this.inputManager.onToggleDebug(() => this.toggleDebug());
    this.inputManager.onToggleMusic(() => this.toggleMusic());
    this.inputManager.onNextTrack(() => this.nextTrack());

    // Setup game over callbacks for return to menu
    this.renderer.setGameOverCallbacks({
      onReturnToMenu: () => this.returnToMenu(),
    });
  }

  /**
   * Handle pause/escape - either pause game or return to menu on game over
   */
  private handlePauseOrMenu(): void {
    if (this.state.phase === 'gameOver') {
      this.returnToMenu();
    } else {
      this.togglePause();
    }
  }

  /**
   * Return to main menu from game over
   */
  returnToMenu(): void {
    // Reset game state
    this.running = false;
    this.appPhase = 'menu';

    // Clear any pending timeouts
    if (this.nameEntryTimeoutId) {
      clearTimeout(this.nameEntryTimeoutId);
      this.nameEntryTimeoutId = null;
    }
    this.pendingHighScore = null;

    // Reset renderer
    this.renderer.reset();
    this.renderer.hideNameEntry();
    this.renderer.hideLeaderboard();

    // Stop any special music (don't resume - showMainMenu will play menu music)
    this.musicManager.stopSpecial(false);
    this.musicManager.stop();
    this.musicManager.resetPlaybackRate();

    // Show main menu (will start menu music)
    this.showMainMenu();
  }

  /**
   * Toggle CRT shader effect
   */
  toggleCRT(): void {
    this.renderer.toggleCRT();
    console.log('CRT effect toggled');
  }

  /**
   * Toggle debug panel
   */
  toggleDebug(): void {
    if (this.debugPanel) {
      this.debugPanel.toggle();
      console.log('Debug panel toggled');
    }
  }

  /**
   * Toggle music playback
   */
  toggleMusic(): void {
    // Don't toggle music while entering name (M key is used for typing)
    if (this.renderer.isNameEntryVisible()) {
      return;
    }
    if (this.musicManager.getIsPlaying() || this.musicManager.getIsPlayingSpecial()) {
      this.musicManager.pause();
      console.log('Music paused');
    } else {
      this.musicManager.play();
      console.log('Music playing');
    }
  }

  /**
   * Skip to next track
   */
  nextTrack(): void {
    // Don't skip track while entering name (N key is used for typing)
    if (this.renderer.isNameEntryVisible()) {
      return;
    }
    this.musicManager.next();
    console.log('Next track');
  }

  /**
   * Setup chaos manager callbacks
   */
  private setupChaosCallbacks(): void {
    this.chaosManager.onWarning((_eventType, name) => {
      console.log(`⚠️ CHAOS WARNING: ${name} incoming!`);
      this.renderer.showChaosWarning(name);
      this.audioManager.play('chaosWarning');
    });

    this.chaosManager.onEventStart((eventType, name) => {
      console.log(`🔥 CHAOS EVENT: ${name} activated!`);
      this.renderer.showChaosEvent(name);

      // Play event-specific sounds
      switch (eventType) {
        case 'gravitySurge':
          this.audioManager.play('gravitySurge');
          break;
        case 'windGust':
          this.audioManager.play('windGust');
          break;
        case 'boardShake':
          this.audioManager.play('earthquake');
          break;
        case 'blackout':
          this.audioManager.play('blackout');
          break;
        case 'garbageRain':
          this.audioManager.play('chaosEvent');
          this.state = {
            ...this.state,
            board: this.chaosManager.applyGarbageRain(this.state.board),
          };
          break;
        case 'bonusClear':
          this.audioManager.play('lineClear');
          this.state = {
            ...this.state,
            board: this.chaosManager.applyBonusClear(this.state.board),
          };
          break;
        default:
          this.audioManager.play('chaosEvent');
      }
    });

    this.chaosManager.onEventEnd((eventType) => {
      console.log(`✓ Chaos event ended: ${eventType}`);
      this.renderer.hideChaosEvent();
    });
  }

  /**
   * Initialize the game
   */
  async init(container: HTMLElement): Promise<void> {
    // Initialize renderer
    await this.renderer.init(container);

    // Initialize input
    this.inputManager.init();

    // Setup event listeners
    this.setupEventListeners();

    // Initialize menus
    this.initMenus();

    // Hide loading screen
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = 'none';
    }

    // Initial render
    this.renderer.render(this.state);

    // Initialize debug panel
    this.initDebugPanel();

    // Show main menu
    this.showMainMenu();

    // Setup menu keyboard handler
    this.setupMenuKeyboardHandler();

    // Start render loop (always running for background effects)
    this.startRenderLoop();
  }

  /**
   * Initialize menus
   */
  private initMenus(): void {
    this.renderer.initMenus(
      (mode) => this.startGameWithMode(mode),
      (volume) => this.audioManager.setVolume(volume),
      (volume) => this.musicManager.setVolume(volume),
      () => this.toggleCRT()
    );

    // Initialize leaderboard UI
    this.renderer.initLeaderboard(
      (name) => this.onHighScoreNameSubmit(name),
      () => this.onLeaderboardClose()
    );
  }

  /**
   * Handle high score name submission
   */
  private onHighScoreNameSubmit(name: string): void {
    if (this.pendingHighScore) {
      const entry = this.leaderboard.createEntry(
        name,
        this.pendingHighScore.score,
        this.pendingHighScore.level,
        this.pendingHighScore.lines,
        this.pendingHighScore.mode
      );
      const added = this.leaderboard.addEntry(entry);

      if (added) {
        const rank = this.leaderboard.getRank(this.pendingHighScore.score, this.pendingHighScore.mode);
        console.log(`High score added! Rank: #${rank}`);
        // Show leaderboard with highlight
        this.renderer.showLeaderboard(this.pendingHighScore.mode as GameModeType, rank);
      }

      this.pendingHighScore = null;
    }
  }

  /**
   * Handle leaderboard close
   */
  private onLeaderboardClose(): void {
    // Nothing special needed, just close
  }

  /**
   * Setup keyboard handler for menus
   */
  private setupMenuKeyboardHandler(): void {
    window.addEventListener('keydown', (event) => {
      if (this.renderer.isMenuVisible()) {
        const handled = this.renderer.handleMenuKeyDown(event);
        if (handled) {
          event.preventDefault();
        }
      }
    });
  }

  /**
   * Show main menu
   */
  showMainMenu(): void {
    this.appPhase = 'menu';
    this.renderer.showMainMenu();
    // Play intro/menu music
    this.musicManager.playSpecial('menu');
  }

  /**
   * Start game with selected mode
   */
  private startGameWithMode(mode: GameModeType): void {
    this.currentMode = mode;
    this.appPhase = 'playing';

    // Clear any pending high score entry timeout
    if (this.nameEntryTimeoutId) {
      clearTimeout(this.nameEntryTimeoutId);
      this.nameEntryTimeoutId = null;
    }
    this.pendingHighScore = null;

    // Hide any open leaderboard UI
    this.renderer.hideNameEntry();
    this.renderer.hideLeaderboard();

    // Stop any special music (like high score music) and resume regular music
    this.musicManager.stopSpecial(true);

    // Create new game state for selected mode
    this.state = createGameState(mode, this.config);

    // Enable/disable chaos manager based on mode
    if (mode === 'chaos') {
      this.chaosManager.enable();
      console.log('Chaos mode enabled!');
    } else {
      this.chaosManager.disable();
    }

    // Reset dynamic music speed
    this.musicManager.resetPlaybackRate();
    this.lastDangerLevel = 0;
    this.windDriftAccumulator = 0;

    // Show countdown then start
    this.renderer.showCountdown(() => {
      this.start();
    });
  }

  /**
   * Start render loop (for background effects while in menu)
   */
  private startRenderLoop(): void {
    const renderLoop = (_currentTime: number) => {
      // Update menu animations
      if (this.renderer.isMenuVisible()) {
        this.renderer.updateMenus(16.67);
      }

      // Always render for background effects
      if (this.appPhase === 'menu') {
        // Render a dummy state for background only
        this.renderer.render(this.state);
      }

      requestAnimationFrame(renderLoop);
    };

    requestAnimationFrame(renderLoop);
  }

  /**
   * Initialize debug panel with current settings
   */
  private initDebugPanel(): void {
    this.debugPanel = new DebugPanel({}, (settings) => this.onDebugSettingsChange(settings));
  }

  /**
   * Handle debug settings changes
   */
  private onDebugSettingsChange(settings: Partial<DebugSettings>): void {
    const boidSystem = this.renderer.getBoidSystem();
    const crtFilter = this.renderer.getCRTFilter();
    const screenEffects = this.renderer.getScreenEffects();

    // Update boid settings
    if (boidSystem) {
      if (settings.boidCount !== undefined) {
        boidSystem.setConfig({ count: settings.boidCount });
      }
      if (settings.boidMaxSpeed !== undefined) {
        boidSystem.setConfig({ maxSpeed: settings.boidMaxSpeed });
      }
      if (settings.boidMaxForce !== undefined) {
        boidSystem.setConfig({ maxForce: settings.boidMaxForce });
      }
      if (settings.boidSeparation !== undefined) {
        boidSystem.setConfig({ separationWeight: settings.boidSeparation });
      }
      if (settings.boidAlignment !== undefined) {
        boidSystem.setConfig({ alignmentWeight: settings.boidAlignment });
      }
      if (settings.boidCohesion !== undefined) {
        boidSystem.setConfig({ cohesionWeight: settings.boidCohesion });
      }
      if (settings.boidBlur !== undefined) {
        boidSystem.setBlur(settings.boidBlur);
      }
      if (settings.boidAlpha !== undefined) {
        boidSystem.setAlpha(settings.boidAlpha);
      }
    }

    // Update CRT settings
    if (crtFilter) {
      if (settings.crtScanlines !== undefined) {
        crtFilter.scanlineIntensity = settings.crtScanlines;
      }
      if (settings.crtVignette !== undefined) {
        crtFilter.vignetteIntensity = settings.crtVignette;
      }
      if (settings.crtChromatic !== undefined) {
        crtFilter.chromaticAberration = settings.crtChromatic;
      }
      if (settings.crtNoise !== undefined) {
        crtFilter.noiseIntensity = settings.crtNoise;
      }
      if (settings.crtCurvature !== undefined) {
        crtFilter.curvature = settings.crtCurvature;
      }
      if (settings.crtBrightness !== undefined) {
        crtFilter.brightness = settings.crtBrightness;
      }
    }

    // Update screen effects
    if (screenEffects) {
      if (settings.shakeIntensity !== undefined) {
        screenEffects.setShakeIntensity(settings.shakeIntensity);
      }
      if (settings.flashIntensity !== undefined) {
        screenEffects.setFlashIntensity(settings.flashIntensity);
      }
    }
  }

  /**
   * Setup event listeners for game events
   */
  private setupEventListeners(): void {
    // Log events for debugging
    this.eventBus.on('piece-spawn', (e) => {
      console.log('Spawned:', e.piece);
    });

    this.eventBus.on('lines-clear', (e) => {
      console.log('Lines cleared:', e.event.type, e.event.lines.length, 'lines');
      // Play appropriate sound based on lines cleared
      if (e.event.lines.length === 4) {
        this.audioManager.play('tetris');
      } else {
        this.audioManager.play('lineClear');
      }

      // Show special clear visual for T-Spins and Tetrises
      const clearType = e.event.type;
      if (clearType.startsWith('t-spin')) {
        this.renderer.showSpecialClear(clearType, e.event.points, e.event.backToBack);
        this.audioManager.play('tSpin');
      } else if (clearType === 'tetris') {
        this.renderer.showSpecialClear(clearType, e.event.points, e.event.backToBack);
      }
    });

    this.eventBus.on('back-to-back', (e) => {
      console.log('Back-to-back!', e.count);
      // Show B2B notification for consecutive difficult clears
      if (e.count >= 2) {
        this.renderer.showBackToBack(e.count);
        this.audioManager.play('combo'); // Extra combo sound for B2B
      }
    });

    this.eventBus.on('perfect-clear', (e) => {
      console.log('PERFECT CLEAR!', e.points);
      this.renderer.showSpecialClear('perfect-clear', e.points, false);
      this.audioManager.play('perfectClear');
    });

    this.eventBus.on('level-up', (e) => {
      console.log('Level up!', e.previousLevel, '->', e.newLevel);
      this.audioManager.play('levelUp');
    });

    this.eventBus.on('game-over', (e) => {
      console.log('Game Over! Score:', e.finalScore);
      this.renderer.showGameOver(e.finalScore);
      this.audioManager.play('gameOver');

      // Check if score qualifies for leaderboard
      if (this.leaderboard.qualifiesForLeaderboard(e.finalScore, this.currentMode)) {
        const rank = this.leaderboard.getRank(e.finalScore, this.currentMode);
        console.log(`New high score! Rank: #${rank}`);

        // Store pending high score
        this.pendingHighScore = {
          score: e.finalScore,
          level: this.state.score.level,
          lines: this.state.score.linesCleared,
          mode: this.currentMode,
        };

        // Show name entry after a short delay
        this.nameEntryTimeoutId = setTimeout(() => {
          // Only show if game is still in gameOver phase (user hasn't restarted)
          if (this.state.phase === 'gameOver' && this.pendingHighScore) {
            // Play high score music
            this.musicManager.playSpecial('highScore');
            this.renderer.showNameEntry(e.finalScore, rank);
          }
          this.nameEntryTimeoutId = null;
        }, 1500);
      }
    });

    this.eventBus.on('piece-lock', () => {
      this.audioManager.play('lock');
    });

    this.eventBus.on('piece-hold', () => {
      this.audioManager.play('hold');
    });

    this.eventBus.on('hard-drop', () => {
      this.audioManager.play('hardDrop');
    });

    this.eventBus.on('combo', (e) => {
      if (e.count > 1) {
        this.audioManager.play('combo');
      }
    });

    this.eventBus.on('piece-move', () => {
      this.audioManager.play('move');
    });

    this.eventBus.on('piece-rotate', () => {
      this.audioManager.play('rotate');
    });

    this.eventBus.on('soft-drop', () => {
      this.audioManager.play('softDrop');
    });
  }

  /**
   * Start the game
   */
  start(): void {
    if (this.running) return;

    // Start game state
    const result = startGame(this.state, this.config);
    this.state = result.state;
    this.eventBus.emitAll(result.events);

    // Start game loop
    this.running = true;
    this.lastTime = performance.now();
    this.accumulator = 0;

    // Start background music
    this.musicManager.play();

    requestAnimationFrame(this.gameLoop);
  }

  /**
   * Main game loop
   */
  private gameLoop = (currentTime: number): void => {
    if (!this.running) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    // FPS calculation
    this.frameCount++;
    this.fpsTime += deltaTime;
    if (this.fpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = 0;
    }

    // Don't update if paused
    if (this.state.phase !== 'paused') {
      // Update chaos manager and get modifiers
      this.chaosModifiers = this.chaosManager.update(currentTime, this.state);

      // Apply chaos shake effect
      if (this.chaosModifiers.shakeIntensity > 0) {
        const screenEffects = this.renderer.getScreenEffects();
        if (screenEffects) {
          screenEffects.shake({
            intensity: this.chaosModifiers.shakeIntensity,
            duration: 100,
            decay: 0.9,
          });
        }
      }

      // Update dynamic music speed based on danger level (stack height)
      this.updateDynamicMusicSpeed();

      // Accumulate time
      this.accumulator += Math.min(deltaTime, this.maxAccumulator);

      // Apply gravity multiplier - faster updates when gravity surge is active
      const effectiveTimestep = this.fixedTimestep / this.chaosModifiers.gravityMultiplier;

      // Update wind drift accumulator
      if (this.chaosModifiers.windDirection !== 0) {
        this.windDriftAccumulator += deltaTime;
      } else {
        this.windDriftAccumulator = 0;
      }

      // Process game updates when accumulator threshold is met
      // CRITICAL: Only consume input when we're actually going to process it
      if (this.accumulator >= effectiveTimestep) {
        // Get input actions ONLY when updating - prevents consuming inputs that won't be processed
        let actions = this.inputManager.update(this.accumulator);

        // Apply chaos modifiers to input
        if (this.chaosModifiers.controlsReversed) {
          // Swap left/right
          const temp = actions.moveLeft;
          actions = { ...actions, moveLeft: actions.moveRight, moveRight: temp };
        }

        // Apply wind gust - periodically push piece left or right
        if (this.chaosModifiers.windDirection !== 0 && this.windDriftAccumulator >= this.windDriftInterval) {
          if (this.chaosModifiers.windDirection < 0) {
            actions = { ...actions, moveLeft: true };
          } else {
            actions = { ...actions, moveRight: true };
          }
          this.windDriftAccumulator = 0;
        }

        // Block input if piece frozen
        if (this.chaosModifiers.pieceFreeze) {
          actions = {
            moveLeft: false,
            moveRight: false,
            softDrop: false,
            hardDrop: false,
            rotateCW: false,
            rotateCCW: false,
            rotate180: false,
            hold: false,
          };
        }

        const result = updateGame(this.state, this.fixedTimestep, actions, this.config);
        this.state = result.state;
        this.eventBus.emitAll(result.events);
        this.accumulator -= effectiveTimestep;
      }
    }

    // Render with chaos modifiers
    this.renderer.render(this.state, this.chaosModifiers);

    // Continue loop
    requestAnimationFrame(this.gameLoop);
  };

  /**
   * Update dynamic music speed based on danger level (stack height)
   */
  private updateDynamicMusicSpeed(): void {
    // Calculate danger level based on stack height (0-1)
    const maxDangerHeight = 16; // Start speeding up when stack reaches row 16 from bottom
    let highestRow = 0;

    // Find the highest occupied row
    for (const key of this.state.board.cells.keys()) {
      const [, y] = key.split(',').map(Number);
      if (y > highestRow) {
        highestRow = y;
      }
    }

    // Calculate danger level (0 = safe, 1 = danger zone)
    const dangerLevel = Math.max(0, Math.min(1, (highestRow - 4) / maxDangerHeight));

    // Only update if danger level changed significantly (avoid constant updates)
    if (Math.abs(dangerLevel - this.lastDangerLevel) > 0.05) {
      this.lastDangerLevel = dangerLevel;

      // Map danger level to playback rate (1.0 = normal, up to 1.3 = danger)
      const playbackRate = 1.0 + (dangerLevel * 0.3);
      this.musicManager.setPlaybackRate(playbackRate);
    }
  }

  /**
   * Pause/unpause the game
   */
  togglePause(): void {
    if (this.state.phase === 'playing') {
      this.state = { ...this.state, phase: 'paused' };
      this.renderer.showPause();
      this.audioManager.play('pause');
      this.musicManager.pause();
      console.log('Game paused');
    } else if (this.state.phase === 'paused') {
      this.state = { ...this.state, phase: 'playing' };
      this.renderer.hidePause();
      this.audioManager.play('resume');
      this.musicManager.resume();
      console.log('Game resumed');
    }
  }

  /**
   * Restart the game
   */
  restart(): void {
    // Only allow restart if game over or playing
    if (this.state.phase !== 'gameOver' && this.state.phase !== 'playing' && this.state.phase !== 'paused') {
      return;
    }

    // Clear any pending high score entry timeout
    if (this.nameEntryTimeoutId) {
      clearTimeout(this.nameEntryTimeoutId);
      this.nameEntryTimeoutId = null;
    }
    this.pendingHighScore = null;

    // Hide any open leaderboard UI
    this.renderer.hideNameEntry();
    this.renderer.hideLeaderboard();

    this.state = resetGameState(this.state, this.config);

    // Reset renderer (clears game over overlay and resets tracking state)
    this.renderer.reset();

    // Start a new game
    const result = startGame(this.state, this.config);
    this.state = result.state;
    this.eventBus.emitAll(result.events);

    // Stop any special music (high score, etc.) before playing regular music
    this.musicManager.stopSpecial(false);

    // Play next track on restart
    this.musicManager.next();

    console.log('Game restarted');
  }

  /**
   * Stop the game
   */
  stop(): void {
    this.running = false;
  }

  /**
   * Get current game state
   */
  getState(): Readonly<GameState> {
    return this.state;
  }

  /**
   * Get event bus for external listeners
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return this.fps;
  }

  /**
   * Destroy the game and cleanup
   */
  destroy(): void {
    this.stop();
    this.inputManager.destroy();
    this.renderer.destroy();
    this.eventBus.clear();
    this.musicManager.destroy();
    if (this.debugPanel) {
      this.debugPanel.destroy();
    }
  }
}
