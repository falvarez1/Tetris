/**
 * Music Manager
 * Handles background music playback from MP3 files in public/music folder
 * Features: playlist shuffle, crossfade, pause/resume, volume control
 */

interface Track {
  name: string;
  url: string;
  audio: HTMLAudioElement | null;
}

interface MusicConfig {
  volume: number;
  enabled: boolean;
  shuffle: boolean;
  crossfadeDuration: number; // seconds
}

interface SpecialTracks {
  highScore?: string;
  gameOver?: string;
  menu?: string;
}

/**
 * Music Manager class - handles background music playback
 */
export class MusicManager {
  private tracks: Track[] = [];
  private currentTrackIndex: number = -1;
  private currentAudio: HTMLAudioElement | null = null;
  private nextAudio: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private isCrossfading: boolean = false;
  private crossfadeInterval: number | null = null;
  private config: MusicConfig = {
    volume: 0.3,
    enabled: true,
    shuffle: true,
    crossfadeDuration: 2,
  };
  private shuffledIndices: number[] = [];
  private tracksLoaded: boolean = false;
  private pendingPlay: boolean = false;
  private specialTracks: SpecialTracks = {};
  private specialAudio: HTMLAudioElement | null = null;
  private isPlayingSpecial: boolean = false;
  private musicPath: string = '/music/';
  private pendingSpecial: 'highScore' | 'gameOver' | 'menu' | null = null;

  // Bound method reference for event listener cleanup
  private onTrackEndedBound: () => void;

  constructor() {
    this.onTrackEndedBound = this.onTrackEnded.bind(this);
    this.loadTrackList();
  }

  /**
   * Load the list of available tracks from the music folder
   * In Vite, we need to use import.meta.glob for dynamic imports
   */
  private async loadTrackList(): Promise<void> {
    try {
      // Get base URL for Vite (handles different deployment paths like /Tetris/)
      const baseUrl = import.meta.env.BASE_URL || '/';
      this.musicPath = `${baseUrl}music/`.replace(/\/\//g, '/');

      // Try to fetch the track list from a manifest or scan directory
      // Since we can't dynamically scan directories in browser, we'll use a different approach:
      // The user can put tracks in public/music/ and we'll try common names or use a manifest

      // First try to load a manifest file
      const manifestResponse = await fetch(`${this.musicPath}playlist.json`).catch(() => null);

      if (manifestResponse?.ok) {
        const manifest = await manifestResponse.json();
        this.tracks = manifest.tracks.map((name: string) => ({
          name: name.replace(/\.mp3$/i, ''),
          url: `${this.musicPath}${name}`,
          audio: null,
        }));

        // Load special tracks if defined
        if (manifest.special) {
          this.specialTracks = manifest.special;
        }
      } else {
        // No manifest - try to detect tracks by attempting to load them
        // This is a fallback approach that tries numbered tracks
        await this.detectTracks();
      }

      if (this.tracks.length > 0) {
        console.log(`Music Manager: Found ${this.tracks.length} track(s):`);
        this.tracks.forEach(t => console.log(`  - ${t.name}`));
        this.shufflePlaylist();
        this.tracksLoaded = true;

        // If play was requested before tracks loaded, start now
        if (this.pendingPlay) {
          this.pendingPlay = false;
          this.play();
        }

        // If special track was requested before tracks loaded, start now
        if (this.pendingSpecial) {
          const pending = this.pendingSpecial;
          this.pendingSpecial = null;
          this.playSpecial(pending);
        }
      } else {
        console.log('Music Manager: No tracks found in public/music/');
        console.log('To add music: place MP3 files in public/music/ folder');
        console.log('Optionally create playlist.json with: { "tracks": ["song1.mp3", "song2.mp3"] }');
      }
    } catch (e) {
      console.warn('Music Manager: Could not load track list', e);
    }
  }

  /**
   * Try to detect tracks by attempting to load common filenames
   */
  private async detectTracks(): Promise<void> {
    // Get base URL for Vite (handles different deployment paths like /Tetris/)
    const baseUrl = import.meta.env.BASE_URL || '/';
    const musicPath = `${baseUrl}music/`.replace(/\/\//g, '/');

    // Try numbered tracks (track1.mp3, track2.mp3, etc.)
    const potentialTracks: string[] = [];

    // Try track1 through track20
    for (let i = 1; i <= 20; i++) {
      potentialTracks.push(`track${i}.mp3`);
      potentialTracks.push(`track${i.toString().padStart(2, '0')}.mp3`);
      potentialTracks.push(`${i}.mp3`);
      potentialTracks.push(`song${i}.mp3`);
    }

    // Try common names
    potentialTracks.push(
      'music.mp3',
      'background.mp3',
      'bgm.mp3',
      'theme.mp3',
      'tetris.mp3',
      'main.mp3',
      'game.mp3'
    );

    // Test each potential track with a HEAD request
    const foundTracks: string[] = [];

    for (const trackName of potentialTracks) {
      try {
        const response = await fetch(`${musicPath}${trackName}`, { method: 'HEAD' });
        if (response.ok) {
          foundTracks.push(trackName);
        }
      } catch {
        // Track doesn't exist, continue
      }
    }

    this.tracks = foundTracks.map((name) => ({
      name: name.replace(/\.mp3$/i, ''),
      url: `${musicPath}${name}`,
      audio: null,
    }));
  }

  /**
   * Shuffle the playlist
   */
  private shufflePlaylist(): void {
    this.shuffledIndices = Array.from({ length: this.tracks.length }, (_, i) => i);

    if (this.config.shuffle && this.tracks.length > 1) {
      // Fisher-Yates shuffle
      for (let i = this.shuffledIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.shuffledIndices[i], this.shuffledIndices[j]] = [
          this.shuffledIndices[j],
          this.shuffledIndices[i],
        ];
      }
    }
  }

  /**
   * Get the next track index
   */
  private getNextTrackIndex(): number {
    if (this.tracks.length === 0) return -1;

    const currentShuffleIndex = this.shuffledIndices.indexOf(this.currentTrackIndex);
    const nextShuffleIndex = (currentShuffleIndex + 1) % this.shuffledIndices.length;

    // Reshuffle if we've gone through all tracks
    if (nextShuffleIndex === 0 && this.config.shuffle) {
      this.shufflePlaylist();
    }

    return this.shuffledIndices[nextShuffleIndex];
  }

  /**
   * Load and prepare an audio element for a track
   */
  private loadTrack(index: number): HTMLAudioElement | null {
    if (index < 0 || index >= this.tracks.length) return null;

    const track = this.tracks[index];
    const audio = new Audio(track.url);
    audio.volume = this.config.volume;
    audio.preload = 'auto';

    // Set up ended event for auto-advance (using bound method for cleanup)
    audio.addEventListener('ended', this.onTrackEndedBound);

    return audio;
  }

  /**
   * Start playing music
   */
  async play(): Promise<void> {
    if (!this.config.enabled) return;

    // If tracks aren't loaded yet, queue the play request
    if (!this.tracksLoaded) {
      console.log('Music Manager: Tracks not loaded yet, queuing play request...');
      this.pendingPlay = true;
      return;
    }

    if (this.tracks.length === 0) {
      console.log('Music Manager: No tracks to play');
      return;
    }

    if (this.isPaused && this.currentAudio) {
      // Resume paused track
      this.isPaused = false;
      this.isPlaying = true;
      await this.currentAudio.play().catch((e) => console.warn('Music play failed:', e));
      return;
    }

    if (this.isPlaying) return;

    // Start fresh
    this.currentTrackIndex = this.shuffledIndices[0] ?? 0;
    this.currentAudio = this.loadTrack(this.currentTrackIndex);

    if (this.currentAudio) {
      this.isPlaying = true;
      console.log(`Starting music: ${this.tracks[this.currentTrackIndex].name}`);
      await this.currentAudio.play().catch((e) => {
        console.warn('Music play failed (autoplay blocked?):', e);
        console.log('Click anywhere on the page to enable music');
        this.isPlaying = false;

        // Add one-time click handler to resume music
        const resumeOnClick = () => {
          document.removeEventListener('click', resumeOnClick);
          this.play();
        };
        document.addEventListener('click', resumeOnClick);
      });
    }
  }

  /**
   * Pause music playback (both regular and special)
   */
  pause(): void {
    // Pause special audio if playing
    if (this.isPlayingSpecial && this.specialAudio) {
      this.specialAudio.pause();
      this.isPaused = true;
      return;
    }

    // Pause regular audio
    if (!this.isPlaying || !this.currentAudio) return;

    this.isPaused = true;
    this.currentAudio.pause();
  }

  /**
   * Resume music playback (both regular and special)
   */
  async resume(): Promise<void> {
    if (!this.isPaused) return;

    // Resume special audio if it was playing
    if (this.isPlayingSpecial && this.specialAudio) {
      this.isPaused = false;
      await this.specialAudio.play().catch((e) => console.warn('Special music resume failed:', e));
      return;
    }

    // Resume regular audio
    if (!this.currentAudio) return;

    this.isPaused = false;
    await this.currentAudio.play().catch((e) => console.warn('Music resume failed:', e));
  }

  /**
   * Stop music playback
   */
  stop(): void {
    // Cancel any ongoing crossfade
    if (this.crossfadeInterval) {
      clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
    }
    this.isCrossfading = false;

    // Stop current audio
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      // Remove event listener to prevent auto-advance
      this.currentAudio.removeEventListener('ended', this.onTrackEndedBound);
      this.currentAudio = null;
    }

    // Stop next audio (used during crossfade)
    if (this.nextAudio) {
      this.nextAudio.pause();
      this.nextAudio.currentTime = 0;
      this.nextAudio.removeEventListener('ended', this.onTrackEndedBound);
      this.nextAudio = null;
    }

    this.isPlaying = false;
    this.isPaused = false;
    this.currentTrackIndex = -1;
  }

  /**
   * Play a special track (high score, game over, etc.)
   * Stops regular music and plays the special track
   */
  async playSpecial(type: 'highScore' | 'gameOver' | 'menu'): Promise<void> {
    if (!this.config.enabled) return;

    // If tracks aren't loaded yet, queue the request
    if (!this.tracksLoaded) {
      console.log(`Music Manager: Tracks not loaded yet, queuing special track '${type}'...`);
      this.pendingSpecial = type;
      return;
    }

    const trackName = this.specialTracks[type];
    if (!trackName) {
      console.log(`Music Manager: No special track configured for '${type}'`);
      return;
    }

    // Stop regular music
    this.stop();
    this.stopSpecial();

    // Create and play special track
    const url = `${this.musicPath}${trackName}`;
    this.specialAudio = new Audio(url);
    this.specialAudio.volume = this.config.volume;
    this.specialAudio.loop = true;

    this.isPlayingSpecial = true;
    console.log(`Playing special track: ${trackName}`);

    await this.specialAudio.play().catch((e) => {
      console.warn(`Failed to play special track '${type}' (autoplay blocked?):`, e);
      console.log('Click anywhere on the page to enable music');

      // Add one-time click handler to resume music
      const resumeOnClick = () => {
        document.removeEventListener('click', resumeOnClick);
        document.removeEventListener('keydown', resumeOnKey);
        if (this.specialAudio && this.isPlayingSpecial) {
          this.specialAudio.play().catch(() => {
            // Still failed, give up
            this.isPlayingSpecial = false;
          });
        }
      };
      const resumeOnKey = () => {
        document.removeEventListener('click', resumeOnClick);
        document.removeEventListener('keydown', resumeOnKey);
        if (this.specialAudio && this.isPlayingSpecial) {
          this.specialAudio.play().catch(() => {
            this.isPlayingSpecial = false;
          });
        }
      };
      document.addEventListener('click', resumeOnClick);
      document.addEventListener('keydown', resumeOnKey);
    });
  }

  /**
   * Stop special track and optionally resume regular music
   */
  stopSpecial(resumeRegular: boolean = false): void {
    if (this.specialAudio) {
      this.specialAudio.pause();
      this.specialAudio.currentTime = 0;
      this.specialAudio = null;
    }
    this.isPlayingSpecial = false;

    if (resumeRegular) {
      this.play();
    }
  }

  /**
   * Check if playing a special track
   */
  getIsPlayingSpecial(): boolean {
    return this.isPlayingSpecial;
  }

  /**
   * Skip to next track
   */
  async next(): Promise<void> {
    if (this.tracks.length === 0) return;

    const nextIndex = this.getNextTrackIndex();
    if (nextIndex === -1) return;

    if (this.config.crossfadeDuration > 0 && this.currentAudio && !this.isCrossfading) {
      // Crossfade to next track
      await this.crossfadeTo(nextIndex);
    } else {
      // Hard cut to next track
      this.stop();
      this.currentTrackIndex = nextIndex;
      this.currentAudio = this.loadTrack(this.currentTrackIndex);
      if (this.currentAudio) {
        this.isPlaying = true;
        await this.currentAudio.play().catch((e) => console.warn('Music play failed:', e));
        console.log(`Now playing: ${this.tracks[this.currentTrackIndex].name}`);
      }
    }
  }

  /**
   * Crossfade to a new track
   */
  private async crossfadeTo(nextIndex: number): Promise<void> {
    if (this.isCrossfading) return;

    this.isCrossfading = true;
    this.nextAudio = this.loadTrack(nextIndex);

    if (!this.nextAudio || !this.currentAudio) {
      this.isCrossfading = false;
      return;
    }

    this.nextAudio.volume = 0;
    await this.nextAudio.play().catch((e) => console.warn('Next track play failed:', e));

    const fadeSteps = 20;
    const fadeInterval = (this.config.crossfadeDuration * 1000) / fadeSteps;
    const volumeStep = this.config.volume / fadeSteps;
    let step = 0;

    const oldAudio = this.currentAudio;

    this.crossfadeInterval = window.setInterval(() => {
      step++;

      if (oldAudio) {
        oldAudio.volume = Math.max(0, this.config.volume - volumeStep * step);
      }
      if (this.nextAudio) {
        this.nextAudio.volume = Math.min(this.config.volume, volumeStep * step);
      }

      if (step >= fadeSteps) {
        if (this.crossfadeInterval) {
          clearInterval(this.crossfadeInterval);
          this.crossfadeInterval = null;
        }

        if (oldAudio) {
          oldAudio.pause();
          oldAudio.currentTime = 0;
        }

        this.currentAudio = this.nextAudio;
        this.currentTrackIndex = nextIndex;
        this.nextAudio = null;
        this.isCrossfading = false;

        console.log(`Now playing: ${this.tracks[this.currentTrackIndex].name}`);
      }
    }, fadeInterval);
  }

  /**
   * Handle track ended event
   */
  private onTrackEnded(): void {
    if (this.isCrossfading) return;
    this.next();
  }

  /**
   * Set music volume (0-1)
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    if (this.currentAudio) {
      this.currentAudio.volume = this.config.volume;
    }
    if (this.nextAudio) {
      this.nextAudio.volume = this.config.volume;
    }
    if (this.specialAudio) {
      this.specialAudio.volume = this.config.volume;
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.config.volume;
  }

  /**
   * Enable/disable music
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  /**
   * Check if music is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Toggle music on/off
   */
  toggle(): boolean {
    this.config.enabled = !this.config.enabled;
    if (!this.config.enabled) {
      this.stop();
    }
    return this.config.enabled;
  }

  /**
   * Enable/disable shuffle
   */
  setShuffle(shuffle: boolean): void {
    this.config.shuffle = shuffle;
    this.shufflePlaylist();
  }

  /**
   * Check if shuffle is enabled
   */
  isShuffleEnabled(): boolean {
    return this.config.shuffle;
  }

  /**
   * Get current track name
   */
  getCurrentTrackName(): string | null {
    if (this.currentTrackIndex >= 0 && this.currentTrackIndex < this.tracks.length) {
      return this.tracks[this.currentTrackIndex].name;
    }
    return null;
  }

  /**
   * Get track count
   */
  getTrackCount(): number {
    return this.tracks.length;
  }

  /**
   * Check if music is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying && !this.isPaused;
  }

  /**
   * Set playback rate for dynamic speed based on game intensity
   * @param rate 0.5 to 2.0 (1.0 is normal speed)
   */
  setPlaybackRate(rate: number): void {
    const clampedRate = Math.max(0.5, Math.min(2.0, rate));
    if (this.currentAudio) {
      this.currentAudio.playbackRate = clampedRate;
    }
    if (this.nextAudio) {
      this.nextAudio.playbackRate = clampedRate;
    }
  }

  /**
   * Get current playback rate
   */
  getPlaybackRate(): number {
    return this.currentAudio?.playbackRate ?? 1.0;
  }

  /**
   * Reset playback rate to normal
   */
  resetPlaybackRate(): void {
    this.setPlaybackRate(1.0);
  }

  /**
   * Destroy and cleanup
   */
  destroy(): void {
    this.stop();
    if (this.crossfadeInterval) {
      clearInterval(this.crossfadeInterval);
    }
    this.tracks = [];
    this.currentAudio = null;
    this.nextAudio = null;
  }
}

// Singleton instance
let musicManagerInstance: MusicManager | null = null;

export function getMusicManager(): MusicManager {
  if (!musicManagerInstance) {
    musicManagerInstance = new MusicManager();
  }
  return musicManagerInstance;
}
