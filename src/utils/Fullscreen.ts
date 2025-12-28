/**
 * Fullscreen API Utility
 * Cross-browser support for fullscreen mode
 */

export class FullscreenManager {
  private element: HTMLElement;
  private isFullscreenActive: boolean = false;
  private onChangeCallbacks: Array<(isFullscreen: boolean) => void> = [];

  constructor(element: HTMLElement) {
    this.element = element;
    this.setupListeners();
  }

  /**
   * Setup fullscreen change listeners
   */
  private setupListeners(): void {
    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => this.handleChange());
    document.addEventListener('webkitfullscreenchange', () => this.handleChange());
    document.addEventListener('mozfullscreenchange', () => this.handleChange());
    document.addEventListener('msfullscreenchange', () => this.handleChange());
  }

  /**
   * Handle fullscreen state change
   */
  private handleChange(): void {
    this.isFullscreenActive = this.isCurrentlyFullscreen();
    this.onChangeCallbacks.forEach(callback => callback(this.isFullscreenActive));
  }

  /**
   * Check if currently in fullscreen
   */
  private isCurrentlyFullscreen(): boolean {
    return !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
  }

  /**
   * Check if fullscreen API is supported
   */
  isSupported(): boolean {
    return !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    );
  }

  /**
   * Request fullscreen
   */
  async requestFullscreen(): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Fullscreen API is not supported');
      return;
    }

    if (this.isFullscreenActive) {
      console.log('Already in fullscreen mode');
      return;
    }

    try {
      // Try standard API first
      if (this.element.requestFullscreen) {
        await this.element.requestFullscreen();
      }
      // Webkit (Safari)
      else if ((this.element as any).webkitRequestFullscreen) {
        await (this.element as any).webkitRequestFullscreen();
      }
      // Firefox
      else if ((this.element as any).mozRequestFullScreen) {
        await (this.element as any).mozRequestFullScreen();
      }
      // IE/Edge
      else if ((this.element as any).msRequestFullscreen) {
        await (this.element as any).msRequestFullscreen();
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error);
      throw error;
    }
  }

  /**
   * Exit fullscreen
   */
  async exitFullscreen(): Promise<void> {
    if (!this.isFullscreenActive) {
      return;
    }

    try {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      } else if ((document as any).mozCancelFullScreen) {
        await (document as any).mozCancelFullScreen();
      } else if ((document as any).msExitFullscreen) {
        await (document as any).msExitFullscreen();
      }
    } catch (error) {
      console.error('Failed to exit fullscreen:', error);
      throw error;
    }
  }

  /**
   * Toggle fullscreen
   */
  async toggle(): Promise<void> {
    if (this.isFullscreenActive) {
      await this.exitFullscreen();
    } else {
      await this.requestFullscreen();
    }
  }

  /**
   * Get current fullscreen state
   */
  isFullscreen(): boolean {
    return this.isFullscreenActive;
  }

  /**
   * Register callback for fullscreen changes
   */
  onChange(callback: (isFullscreen: boolean) => void): void {
    this.onChangeCallbacks.push(callback);
  }

  /**
   * Unregister callback
   */
  removeOnChange(callback: (isFullscreen: boolean) => void): void {
    const index = this.onChangeCallbacks.indexOf(callback);
    if (index > -1) {
      this.onChangeCallbacks.splice(index, 1);
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.onChangeCallbacks = [];
  }
}

/**
 * Singleton instance
 */
let fullscreenManager: FullscreenManager | null = null;

/**
 * Get or create fullscreen manager
 */
export function getFullscreenManager(element?: HTMLElement): FullscreenManager {
  if (!fullscreenManager && element) {
    fullscreenManager = new FullscreenManager(element);
  }
  if (!fullscreenManager) {
    throw new Error('FullscreenManager not initialized. Provide an element on first call.');
  }
  return fullscreenManager;
}
