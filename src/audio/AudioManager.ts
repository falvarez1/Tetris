/**
 * Audio Manager
 * Handles all game sound effects using Web Audio API synthesis
 * Creates retro-style synthesized sounds without external files
 */

export type SoundType =
  | 'move'
  | 'rotate'
  | 'softDrop'
  | 'hardDrop'
  | 'lock'
  | 'hold'
  | 'lineClear'
  | 'tetris'
  | 'combo'
  | 'levelUp'
  | 'gameOver'
  | 'pause'
  | 'resume'
  | 'menuSelect'
  | 'chaosWarning'
  | 'chaosEvent'
  | 'gravitySurge'
  | 'windGust'
  | 'earthquake'
  | 'blackout'
  | 'perfectClear'
  | 'tSpin'
  | 'countdown';

interface SoundConfig {
  volume: number;
  enabled: boolean;
}

/**
 * Audio Manager class - creates synthesized retro sounds
 */
export class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private config: SoundConfig = {
    volume: 0.5,
    enabled: true,
  };

  constructor() {
    this.initAudioContext();
  }

  /**
   * Initialize audio context (must be called after user interaction)
   */
  private initAudioContext(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.config.volume;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  /**
   * Resume audio context (required after user interaction)
   */
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  /**
   * Play a sound effect
   */
  play(sound: SoundType): void {
    if (!this.config.enabled || !this.audioContext || !this.masterGain) return;

    // Resume context if needed
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const now = this.audioContext.currentTime;

    switch (sound) {
      case 'move':
        this.playMove(now);
        break;
      case 'rotate':
        this.playRotate(now);
        break;
      case 'softDrop':
        this.playSoftDrop(now);
        break;
      case 'hardDrop':
        this.playHardDrop(now);
        break;
      case 'lock':
        this.playLock(now);
        break;
      case 'hold':
        this.playHold(now);
        break;
      case 'lineClear':
        this.playLineClear(now);
        break;
      case 'tetris':
        this.playTetris(now);
        break;
      case 'combo':
        this.playCombo(now);
        break;
      case 'levelUp':
        this.playLevelUp(now);
        break;
      case 'gameOver':
        this.playGameOver(now);
        break;
      case 'pause':
        this.playPause(now);
        break;
      case 'resume':
        this.playResume(now);
        break;
      case 'menuSelect':
        this.playMenuSelect(now);
        break;
      case 'chaosWarning':
        this.playChaosWarning(now);
        break;
      case 'chaosEvent':
        this.playChaosEvent(now);
        break;
      case 'gravitySurge':
        this.playGravitySurge(now);
        break;
      case 'windGust':
        this.playWindGust(now);
        break;
      case 'earthquake':
        this.playEarthquake(now);
        break;
      case 'blackout':
        this.playBlackout(now);
        break;
      case 'perfectClear':
        this.playPerfectClear(now);
        break;
      case 'tSpin':
        this.playTSpin(now);
        break;
      case 'countdown':
        this.playCountdown(now);
        break;
    }
  }

  /**
   * Create oscillator with envelope
   */
  private createOscillator(
    type: OscillatorType,
    frequency: number,
    startTime: number,
    duration: number,
    volume: number = 0.3
  ): OscillatorNode {
    const osc = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();

    osc.type = type;
    osc.frequency.value = frequency;

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(startTime);
    osc.stop(startTime + duration);

    return osc;
  }

  /**
   * Create noise for percussion sounds
   */
  private createNoise(startTime: number, duration: number, volume: number = 0.1): void {
    const bufferSize = this.audioContext!.sampleRate * duration;
    const buffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.audioContext!.createBufferSource();
    const gain = this.audioContext!.createGain();
    const filter = this.audioContext!.createBiquadFilter();

    noise.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);

    noise.start(startTime);
    noise.stop(startTime + duration);
  }

  // Sound implementations

  private playMove(now: number): void {
    // Quick tick sound
    this.createOscillator('square', 200, now, 0.05, 0.15);
  }

  private playRotate(now: number): void {
    // Higher pitched blip
    this.createOscillator('square', 400, now, 0.06, 0.2);
    this.createOscillator('square', 500, now + 0.02, 0.04, 0.1);
  }

  private playSoftDrop(now: number): void {
    // Soft thud
    this.createOscillator('sine', 150, now, 0.08, 0.15);
  }

  private playHardDrop(now: number): void {
    // Impact sound with bass thump
    this.createOscillator('sine', 80, now, 0.15, 0.4);
    this.createOscillator('square', 120, now, 0.1, 0.25);
    this.createNoise(now, 0.1, 0.15);
  }

  private playLock(now: number): void {
    // Satisfying click/snap
    this.createOscillator('square', 300, now, 0.08, 0.2);
    this.createOscillator('triangle', 200, now + 0.02, 0.06, 0.15);
  }

  private playHold(now: number): void {
    // Swoosh effect
    const osc = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  private playLineClear(now: number): void {
    // Rising chime
    this.createOscillator('sine', 523, now, 0.15, 0.25); // C5
    this.createOscillator('sine', 659, now + 0.05, 0.12, 0.2); // E5
    this.createOscillator('sine', 784, now + 0.1, 0.1, 0.15); // G5
    this.createNoise(now, 0.08, 0.1);
  }

  private playTetris(now: number): void {
    // Epic fanfare for 4 lines
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      this.createOscillator('square', freq, now + i * 0.08, 0.2, 0.25);
      this.createOscillator('sine', freq, now + i * 0.08, 0.25, 0.2);
    });

    // Add sparkle
    for (let i = 0; i < 8; i++) {
      const sparkleFreq = 1200 + Math.random() * 800;
      this.createOscillator('sine', sparkleFreq, now + 0.3 + i * 0.04, 0.1, 0.08);
    }

    this.createNoise(now, 0.15, 0.12);
  }

  private playCombo(now: number): void {
    // Increasing pitch for combo
    this.createOscillator('square', 440, now, 0.1, 0.2);
    this.createOscillator('square', 554, now + 0.05, 0.1, 0.2);
    this.createOscillator('square', 659, now + 0.1, 0.15, 0.2);
  }

  private playLevelUp(now: number): void {
    // Triumphant ascending arpeggio
    const notes = [262, 330, 392, 523, 659, 784, 1047]; // C4 to C6
    notes.forEach((freq, i) => {
      this.createOscillator('square', freq, now + i * 0.06, 0.15, 0.2);
      this.createOscillator('sine', freq * 2, now + i * 0.06, 0.1, 0.1);
    });

    // Victory noise burst
    this.createNoise(now + 0.4, 0.2, 0.15);
  }

  private playGameOver(now: number): void {
    // Descending sad tones
    const notes = [392, 349, 330, 294, 262, 220, 196]; // Descending scale
    notes.forEach((freq, i) => {
      this.createOscillator('sawtooth', freq, now + i * 0.12, 0.3, 0.15);
    });

    // Low rumble
    this.createOscillator('sine', 60, now, 1.0, 0.2);
    this.createNoise(now + 0.5, 0.5, 0.1);
  }

  private playPause(now: number): void {
    // Descending pause beep
    const osc = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.linearRampToValueAtTime(300, now + 0.1);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  private playResume(now: number): void {
    // Ascending resume beep
    const osc = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.1);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  private playMenuSelect(now: number): void {
    // UI click
    this.createOscillator('square', 800, now, 0.05, 0.15);
    this.createOscillator('sine', 1200, now + 0.02, 0.03, 0.1);
  }

  private playChaosWarning(now: number): void {
    // Ominous warning klaxon - alternating notes
    for (let i = 0; i < 3; i++) {
      this.createOscillator('sawtooth', 400, now + i * 0.3, 0.15, 0.25);
      this.createOscillator('sawtooth', 500, now + i * 0.3 + 0.15, 0.15, 0.25);
    }
    // Low rumble undertone
    this.createOscillator('sine', 80, now, 0.9, 0.15);
  }

  private playChaosEvent(now: number): void {
    // Dramatic impact sound
    this.createOscillator('square', 150, now, 0.3, 0.35);
    this.createOscillator('sawtooth', 100, now, 0.25, 0.25);
    this.createNoise(now, 0.15, 0.2);
    // Rising tone
    const osc = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  private playGravitySurge(now: number): void {
    // Fast descending whoosh
    const osc = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.4);
    // Impact at end
    this.createOscillator('sine', 60, now + 0.35, 0.2, 0.3);
  }

  private playWindGust(now: number): void {
    // Whooshing wind sound using filtered noise
    const bufferSize = this.audioContext!.sampleRate * 0.6;
    const buffer = this.audioContext!.createBuffer(1, bufferSize, this.audioContext!.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.audioContext!.createBufferSource();
    const gain = this.audioContext!.createGain();
    const filter = this.audioContext!.createBiquadFilter();
    noise.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.linearRampToValueAtTime(2000, now + 0.3);
    filter.frequency.linearRampToValueAtTime(500, now + 0.6);
    filter.Q.value = 2;
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    noise.start(now);
    noise.stop(now + 0.6);
  }

  private playEarthquake(now: number): void {
    // Low rumbling with noise
    this.createOscillator('sine', 40, now, 0.5, 0.4);
    this.createOscillator('sine', 50, now + 0.1, 0.4, 0.35);
    this.createOscillator('triangle', 60, now + 0.2, 0.3, 0.3);
    // Rattling noise
    for (let i = 0; i < 5; i++) {
      this.createNoise(now + i * 0.1, 0.08, 0.12);
    }
  }

  private playBlackout(now: number): void {
    // Power-down sound effect
    const osc = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.5);
    // Click at start
    this.createOscillator('square', 100, now, 0.05, 0.2);
  }

  private playPerfectClear(now: number): void {
    // Triumphant fanfare with sparkles
    const notes = [523, 659, 784, 1047, 1319]; // C5, E5, G5, C6, E6
    notes.forEach((freq, i) => {
      this.createOscillator('sine', freq, now + i * 0.1, 0.4, 0.3);
      this.createOscillator('triangle', freq * 2, now + i * 0.1, 0.3, 0.15);
    });
    // Sparkle cascade
    for (let i = 0; i < 12; i++) {
      const sparkleFreq = 1500 + Math.random() * 1500;
      this.createOscillator('sine', sparkleFreq, now + 0.5 + i * 0.05, 0.15, 0.08);
    }
    this.createNoise(now, 0.2, 0.15);
  }

  private playTSpin(now: number): void {
    // Spinning whoosh with impact
    const osc = this.audioContext!.createOscillator();
    const gain = this.audioContext!.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(600, now + 0.15);
    osc.frequency.linearRampToValueAtTime(300, now + 0.3);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.masterGain!);
    osc.start(now);
    osc.stop(now + 0.35);
    // Impact notes
    this.createOscillator('square', 523, now + 0.3, 0.15, 0.25);
    this.createOscillator('square', 659, now + 0.35, 0.12, 0.2);
    this.createOscillator('square', 784, now + 0.4, 0.1, 0.15);
  }

  private playCountdown(now: number): void {
    // Simple beep for countdown
    this.createOscillator('square', 440, now, 0.1, 0.3);
    this.createOscillator('sine', 880, now, 0.08, 0.15);
  }

  /**
   * Set master volume
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.config.volume;
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.config.volume;
  }

  /**
   * Enable/disable sounds
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Toggle sound on/off
   */
  toggle(): boolean {
    this.config.enabled = !this.config.enabled;
    return this.config.enabled;
  }

  /**
   * Destroy audio manager
   */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance
let audioManagerInstance: AudioManager | null = null;

export function getAudioManager(): AudioManager {
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager();
  }
  return audioManagerInstance;
}
