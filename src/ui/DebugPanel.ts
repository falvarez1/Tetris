/**
 * Debug Panel
 * Real-time adjustment of visual effects and game parameters
 */

export interface DebugSettings {
  // Boid settings
  boidCount: number;
  boidMaxSpeed: number;
  boidMaxForce: number;
  boidSeparation: number;
  boidAlignment: number;
  boidCohesion: number;
  boidBlur: number;
  boidAlpha: number;

  // CRT settings
  crtScanlines: number;
  crtVignette: number;
  crtChromatic: number;
  crtNoise: number;
  crtCurvature: number;
  crtBrightness: number;

  // Screen effects
  shakeIntensity: number;
  flashIntensity: number;
}

export type DebugSettingsChangeHandler = (settings: Partial<DebugSettings>) => void;

/**
 * Debug Panel class - creates an overlay UI for adjusting settings
 */
export class DebugPanel {
  private container: HTMLDivElement;
  private visible: boolean = false;
  private settings: DebugSettings;
  private onChange: DebugSettingsChangeHandler;

  constructor(initialSettings: Partial<DebugSettings> = {}, onChange: DebugSettingsChangeHandler) {
    this.onChange = onChange;
    this.settings = {
      // Boid defaults (matching user preferred settings)
      boidCount: 100,
      boidMaxSpeed: 1.2,
      boidMaxForce: 0.04,
      boidSeparation: 2.9,
      boidAlignment: 0.6,
      boidCohesion: 2.4,
      boidBlur: 0.5,
      boidAlpha: 0.25,

      // CRT defaults
      crtScanlines: 0.12,
      crtVignette: 0.25,
      crtChromatic: 1.5,
      crtNoise: 0.02,
      crtCurvature: 8.0,
      crtBrightness: 1.15,

      // Screen effects
      shakeIntensity: 1.0,
      flashIntensity: 1.0,

      ...initialSettings,
    };

    this.container = this.createContainer();
    this.createUI();
    document.body.appendChild(this.container);
  }

  /**
   * Create the main container
   */
  private createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'debug-panel';
    container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 320px;
      max-height: 90vh;
      overflow-y: auto;
      background: rgba(13, 2, 33, 0.95);
      border: 2px solid #FF00FF;
      border-radius: 8px;
      padding: 15px;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      color: #FFFFFF;
      z-index: 10000;
      display: none;
      box-shadow: 0 0 20px rgba(255, 0, 255, 0.3);
    `;
    return container;
  }

  /**
   * Create the UI elements
   */
  private createUI(): void {
    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      font-size: 18px;
      font-weight: bold;
      color: #00FFFF;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #FF00FF;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <span>DEBUG PANEL</span>
      <span style="font-size: 11px; color: #888;">F3 to close</span>
    `;
    this.container.appendChild(header);

    // Boid section
    this.createSection('BOID MURMURATION', [
      { key: 'boidCount', label: 'Count', min: 50, max: 800, step: 50 },
      { key: 'boidMaxSpeed', label: 'Max Speed', min: 0.2, max: 5, step: 0.1 },
      { key: 'boidMaxForce', label: 'Max Force', min: 0.01, max: 0.2, step: 0.01 },
      { key: 'boidSeparation', label: 'Separation', min: 0.5, max: 5, step: 0.1 },
      { key: 'boidAlignment', label: 'Alignment', min: 0, max: 3, step: 0.1 },
      { key: 'boidCohesion', label: 'Cohesion', min: 0, max: 3, step: 0.1 },
      { key: 'boidBlur', label: 'Blur', min: 0, max: 10, step: 0.5 },
      { key: 'boidAlpha', label: 'Opacity', min: 0.1, max: 1, step: 0.05 },
    ]);

    // CRT section
    this.createSection('CRT SHADER', [
      { key: 'crtScanlines', label: 'Scanlines', min: 0, max: 0.5, step: 0.01 },
      { key: 'crtVignette', label: 'Vignette', min: 0, max: 1, step: 0.05 },
      { key: 'crtChromatic', label: 'Chromatic Aberration', min: 0, max: 5, step: 0.1 },
      { key: 'crtNoise', label: 'Noise', min: 0, max: 0.1, step: 0.005 },
      { key: 'crtCurvature', label: 'Curvature', min: 0, max: 20, step: 0.5 },
      { key: 'crtBrightness', label: 'Brightness', min: 0.5, max: 2, step: 0.05 },
    ]);

    // Screen effects section
    this.createSection('SCREEN EFFECTS', [
      { key: 'shakeIntensity', label: 'Shake Intensity', min: 0, max: 3, step: 0.1 },
      { key: 'flashIntensity', label: 'Flash Intensity', min: 0, max: 3, step: 0.1 },
    ]);

    // Buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
      display: flex;
      gap: 10px;
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #FF00FF;
    `;

    const resetButton = this.createButton('Reset Defaults', () => this.resetDefaults());
    const exportButton = this.createButton('Copy Settings', () => this.exportSettings());

    buttonContainer.appendChild(resetButton);
    buttonContainer.appendChild(exportButton);
    this.container.appendChild(buttonContainer);
  }

  /**
   * Create a section with sliders
   */
  private createSection(title: string, controls: Array<{ key: keyof DebugSettings; label: string; min: number; max: number; step: number }>): void {
    const section = document.createElement('div');
    section.style.cssText = `
      margin-bottom: 20px;
    `;

    const sectionTitle = document.createElement('div');
    sectionTitle.style.cssText = `
      font-size: 13px;
      font-weight: bold;
      color: #FF00FF;
      margin-bottom: 10px;
    `;
    sectionTitle.textContent = title;
    section.appendChild(sectionTitle);

    for (const control of controls) {
      const controlDiv = this.createSlider(control.key, control.label, control.min, control.max, control.step);
      section.appendChild(controlDiv);
    }

    this.container.appendChild(section);
  }

  /**
   * Create a slider control
   */
  private createSlider(key: keyof DebugSettings, label: string, min: number, max: number, step: number): HTMLDivElement {
    const controlDiv = document.createElement('div');
    controlDiv.style.cssText = `
      margin-bottom: 8px;
    `;

    const labelRow = document.createElement('div');
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
    `;

    const labelEl = document.createElement('span');
    labelEl.style.color = '#AAAAAA';
    labelEl.textContent = label;

    const valueEl = document.createElement('span');
    valueEl.style.cssText = `
      color: #00FFFF;
      font-family: monospace;
    `;
    valueEl.id = `debug-value-${key}`;
    valueEl.textContent = this.formatValue(this.settings[key]);

    labelRow.appendChild(labelEl);
    labelRow.appendChild(valueEl);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(this.settings[key]);
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      -webkit-appearance: none;
      background: linear-gradient(to right, #FF00FF, #00FFFF);
      border-radius: 3px;
      outline: none;
      cursor: pointer;
    `;

    // Style the thumb
    slider.addEventListener('input', () => {
      const value = parseFloat(slider.value);
      this.settings[key] = value as any;
      valueEl.textContent = this.formatValue(value);
      this.onChange({ [key]: value });
    });

    controlDiv.appendChild(labelRow);
    controlDiv.appendChild(slider);

    return controlDiv;
  }

  /**
   * Create a button
   */
  private createButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = label;
    button.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      background: transparent;
      border: 1px solid #FF00FF;
      color: #FF00FF;
      font-size: 11px;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
    `;

    button.addEventListener('mouseenter', () => {
      button.style.background = '#FF00FF';
      button.style.color = '#000';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'transparent';
      button.style.color = '#FF00FF';
    });

    button.addEventListener('click', onClick);

    return button;
  }

  /**
   * Format a value for display
   */
  private formatValue(value: number): string {
    if (Number.isInteger(value)) {
      return String(value);
    }
    return value.toFixed(2);
  }

  /**
   * Reset to default values
   */
  private resetDefaults(): void {
    const defaults: DebugSettings = {
      boidCount: 100,
      boidMaxSpeed: 1.2,
      boidMaxForce: 0.04,
      boidSeparation: 2.9,
      boidAlignment: 0.6,
      boidCohesion: 2.4,
      boidBlur: 0.5,
      boidAlpha: 0.25,
      crtScanlines: 0.12,
      crtVignette: 0.25,
      crtChromatic: 1.5,
      crtNoise: 0.02,
      crtCurvature: 8.0,
      crtBrightness: 1.15,
      shakeIntensity: 1.0,
      flashIntensity: 1.0,
    };

    this.settings = { ...defaults };

    // Update all sliders
    for (const key of Object.keys(defaults) as Array<keyof DebugSettings>) {
      const valueEl = document.getElementById(`debug-value-${key}`);
      if (valueEl) {
        valueEl.textContent = this.formatValue(defaults[key]);
      }
      // Find slider by iterating through inputs
      const inputs = this.container.querySelectorAll('input[type="range"]');
      inputs.forEach((input) => {
        const inp = input as HTMLInputElement;
        // Check the label text to match the key
        const parent = inp.parentElement;
        if (parent) {
          const valueSpan = parent.querySelector(`#debug-value-${key}`);
          if (valueSpan) {
            inp.value = String(defaults[key]);
          }
        }
      });
    }

    // Update all UI elements properly
    this.updateUI();

    this.onChange(defaults);
  }

  /**
   * Update all UI elements to match current settings
   */
  private updateUI(): void {
    for (const key of Object.keys(this.settings) as Array<keyof DebugSettings>) {
      const valueEl = document.getElementById(`debug-value-${key}`);
      if (valueEl) {
        valueEl.textContent = this.formatValue(this.settings[key]);
      }
    }
  }

  /**
   * Export settings to clipboard
   */
  private exportSettings(): void {
    const text = JSON.stringify(this.settings, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      console.log('Settings copied to clipboard');
      // Brief visual feedback
      const button = this.container.querySelector('button:last-child') as HTMLButtonElement;
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          button.textContent = originalText;
        }, 1000);
      }
    });
  }

  /**
   * Toggle visibility
   */
  toggle(): void {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? 'block' : 'none';
  }

  /**
   * Show the panel
   */
  show(): void {
    this.visible = true;
    this.container.style.display = 'block';
  }

  /**
   * Hide the panel
   */
  hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
  }

  /**
   * Check if visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Get current settings
   */
  getSettings(): DebugSettings {
    return { ...this.settings };
  }

  /**
   * Destroy the panel
   */
  destroy(): void {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }
}
