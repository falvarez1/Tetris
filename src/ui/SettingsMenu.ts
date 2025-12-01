/**
 * Settings Menu
 * Audio and visual settings with volume sliders
 */

import { Container, Text, TextStyle, Graphics } from 'pixi.js';

export interface SettingsMenuCallbacks {
  onBack: () => void;
  onSFXVolumeChange: (volume: number) => void;
  onMusicVolumeChange: (volume: number) => void;
  onCRTToggle: () => void;
}

interface Slider {
  container: Container;
  track: Graphics;
  fill: Graphics;
  handle: Graphics;
  value: number;
  label: Text;
  valueText: Text;
  onChange: (value: number) => void;
}

/**
 * Settings Menu class
 */
export class SettingsMenu {
  private container: Container;
  private callbacks: SettingsMenuCallbacks;
  private sliders: Map<string, Slider> = new Map();
  private titleText!: Text;
  private backButton!: Container;
  private crtToggle!: Container;
  private crtEnabled: boolean = true;
  private selectedIndex: number = 0;
  private selectableItems: Container[] = [];

  // Colors
  private colors = {
    primary: 0xFF00FF,
    secondary: 0x00FFFF,
    background: 0x0D0221,
    highlight: 0xFFFFFF,
  };

  constructor(callbacks: SettingsMenuCallbacks) {
    this.callbacks = callbacks;
    this.container = new Container();
    this.container.visible = false;

    this.createTitle();
    this.createSliders();
    this.createToggles();
    this.createBackButton();

    this.updateSelection();
  }

  /**
   * Create title
   */
  private createTitle(): void {
    const titleStyle = new TextStyle({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 32,
      fill: this.colors.secondary,
      dropShadow: {
        color: this.colors.secondary,
        blur: 15,
        alpha: 0.6,
        distance: 0,
      },
    });

    this.titleText = new Text({ text: 'SETTINGS', style: titleStyle });
    this.titleText.anchor.set(0.5, 0.5);
    this.container.addChild(this.titleText);
  }

  /**
   * Create volume sliders
   */
  private createSliders(): void {
    const sfxSlider = this.createSlider('SFX VOLUME', 0.5, (value) => {
      this.callbacks.onSFXVolumeChange(value);
    });
    this.sliders.set('sfx', sfxSlider);
    this.container.addChild(sfxSlider.container);
    this.selectableItems.push(sfxSlider.container);

    const musicSlider = this.createSlider('MUSIC VOLUME', 0.3, (value) => {
      this.callbacks.onMusicVolumeChange(value);
    });
    this.sliders.set('music', musicSlider);
    this.container.addChild(musicSlider.container);
    this.selectableItems.push(musicSlider.container);
  }

  /**
   * Create a slider control
   */
  private createSlider(labelText: string, initialValue: number, onChange: (value: number) => void): Slider {
    const sliderContainer = new Container();

    // Label
    const labelStyle = new TextStyle({
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 14,
      fill: this.colors.secondary,
    });
    const label = new Text({ text: labelText, style: labelStyle });
    label.anchor.set(0, 0.5);
    label.x = -150;
    sliderContainer.addChild(label);

    // Track
    const track = new Graphics();
    track.roundRect(-100, -6, 200, 12, 6);
    track.fill({ color: 0x333333 });
    track.stroke({ color: this.colors.primary, width: 1, alpha: 0.5 });
    sliderContainer.addChild(track);

    // Fill
    const fill = new Graphics();
    sliderContainer.addChild(fill);

    // Handle
    const handle = new Graphics();
    handle.circle(0, 0, 10);
    handle.fill({ color: this.colors.secondary });
    handle.stroke({ color: this.colors.primary, width: 2 });
    sliderContainer.addChild(handle);

    // Value text
    const valueStyle = new TextStyle({
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 12,
      fill: this.colors.highlight,
    });
    const valueText = new Text({ text: `${Math.round(initialValue * 100)}%`, style: valueStyle });
    valueText.anchor.set(0, 0.5);
    valueText.x = 120;
    sliderContainer.addChild(valueText);

    // Make interactive
    sliderContainer.eventMode = 'static';
    sliderContainer.cursor = 'pointer';

    const slider: Slider = {
      container: sliderContainer,
      track,
      fill,
      handle,
      value: initialValue,
      label,
      valueText,
      onChange,
    };

    // Update visuals
    this.updateSliderVisual(slider);

    // Drag handling
    let dragging = false;

    sliderContainer.on('pointerdown', (e) => {
      dragging = true;
      this.updateSliderFromEvent(slider, e.global.x);
    });

    sliderContainer.on('pointermove', (e) => {
      if (dragging) {
        this.updateSliderFromEvent(slider, e.global.x);
      }
    });

    sliderContainer.on('pointerup', () => {
      dragging = false;
    });

    sliderContainer.on('pointerupoutside', () => {
      dragging = false;
    });

    return slider;
  }

  /**
   * Update slider from mouse event
   */
  private updateSliderFromEvent(slider: Slider, globalX: number): void {
    const localX = globalX - slider.container.getGlobalPosition().x;
    const normalized = Math.max(0, Math.min(1, (localX + 100) / 200));
    slider.value = normalized;
    this.updateSliderVisual(slider);
    slider.onChange(slider.value);
  }

  /**
   * Update slider visual
   */
  private updateSliderVisual(slider: Slider): void {
    const x = -100 + slider.value * 200;

    // Update fill
    slider.fill.clear();
    slider.fill.roundRect(-100, -4, slider.value * 200, 8, 4);
    slider.fill.fill({ color: this.colors.primary, alpha: 0.7 });

    // Update handle position
    slider.handle.x = x;

    // Update value text
    slider.valueText.text = `${Math.round(slider.value * 100)}%`;
  }

  /**
   * Create toggle buttons
   */
  private createToggles(): void {
    this.crtToggle = this.createToggle('CRT EFFECT', this.crtEnabled, () => {
      this.crtEnabled = !this.crtEnabled;
      this.updateToggleVisual(this.crtToggle, this.crtEnabled);
      this.callbacks.onCRTToggle();
    });
    this.container.addChild(this.crtToggle);
    this.selectableItems.push(this.crtToggle);
  }

  /**
   * Create a toggle button
   */
  private createToggle(labelText: string, initialValue: boolean, onToggle: () => void): Container {
    const toggleContainer = new Container();

    // Label
    const labelStyle = new TextStyle({
      fontFamily: '"Orbitron", sans-serif',
      fontSize: 14,
      fill: this.colors.secondary,
    });
    const label = new Text({ text: labelText, style: labelStyle });
    label.anchor.set(0, 0.5);
    label.x = -150;
    toggleContainer.addChild(label);

    // Toggle box
    const box = new Graphics();
    box.roundRect(-25, -15, 50, 30, 15);
    toggleContainer.addChild(box);

    // Toggle indicator
    const indicator = new Graphics();
    indicator.circle(0, 0, 10);
    toggleContainer.addChild(indicator);

    // Store references
    (toggleContainer as any).box = box;
    (toggleContainer as any).indicator = indicator;

    this.updateToggleVisual(toggleContainer, initialValue);

    // Make interactive
    toggleContainer.eventMode = 'static';
    toggleContainer.cursor = 'pointer';

    toggleContainer.on('pointerdown', onToggle);

    return toggleContainer;
  }

  /**
   * Update toggle visual
   */
  private updateToggleVisual(toggle: Container, enabled: boolean): void {
    const box = (toggle as any).box as Graphics;
    const indicator = (toggle as any).indicator as Graphics;

    box.clear();
    box.roundRect(-25, -15, 50, 30, 15);
    box.fill({ color: enabled ? this.colors.primary : 0x333333, alpha: 0.5 });
    box.stroke({ color: this.colors.primary, width: 2 });

    indicator.clear();
    indicator.circle(0, 0, 10);
    indicator.fill({ color: enabled ? this.colors.secondary : 0x666666 });

    indicator.x = enabled ? 10 : -10;
  }

  /**
   * Create back button
   */
  private createBackButton(): void {
    this.backButton = new Container();

    const bg = new Graphics();
    bg.roundRect(-75, -20, 150, 40, 8);
    bg.fill({ color: this.colors.background, alpha: 0.8 });
    bg.stroke({ color: this.colors.primary, width: 2 });
    this.backButton.addChild(bg);

    const textStyle = new TextStyle({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 14,
      fill: this.colors.secondary,
    });
    const text = new Text({ text: 'BACK', style: textStyle });
    text.anchor.set(0.5, 0.5);
    this.backButton.addChild(text);

    (this.backButton as any).bg = bg;
    (this.backButton as any).text = text;

    this.backButton.eventMode = 'static';
    this.backButton.cursor = 'pointer';

    this.backButton.on('pointerdown', () => {
      this.callbacks.onBack();
    });

    this.container.addChild(this.backButton);
    this.selectableItems.push(this.backButton);
  }

  /**
   * Update selection visuals
   */
  private updateSelection(): void {
    this.selectableItems.forEach((item, index) => {
      const isSelected = index === this.selectedIndex;

      // Update styling based on selection
      if ((item as any).bg) {
        const bg = (item as any).bg as Graphics;
        const text = (item as any).text as Text;

        bg.clear();
        bg.roundRect(-75, -20, 150, 40, 8);
        bg.fill({ color: isSelected ? this.colors.primary : this.colors.background, alpha: isSelected ? 0.3 : 0.8 });
        bg.stroke({ color: isSelected ? this.colors.secondary : this.colors.primary, width: isSelected ? 3 : 2 });

        if (text) {
          text.style.fill = isSelected ? this.colors.highlight : this.colors.secondary;
        }
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
        this.selectedIndex = (this.selectedIndex - 1 + this.selectableItems.length) % this.selectableItems.length;
        this.updateSelection();
        return true;

      case 'ArrowDown':
      case 'KeyS':
        this.selectedIndex = (this.selectedIndex + 1) % this.selectableItems.length;
        this.updateSelection();
        return true;

      case 'ArrowLeft':
      case 'KeyA':
        this.adjustSlider(-0.1);
        return true;

      case 'ArrowRight':
      case 'KeyD':
        this.adjustSlider(0.1);
        return true;

      case 'Enter':
      case 'Space':
        this.activateSelected();
        return true;

      case 'Escape':
        this.callbacks.onBack();
        return true;

      default:
        return false;
    }
  }

  /**
   * Adjust slider at current selection
   */
  private adjustSlider(delta: number): void {
    const item = this.selectableItems[this.selectedIndex];

    // Check if it's a slider
    for (const [_key, slider] of this.sliders) {
      if (slider.container === item) {
        slider.value = Math.max(0, Math.min(1, slider.value + delta));
        this.updateSliderVisual(slider);
        slider.onChange(slider.value);
        break;
      }
    }
  }

  /**
   * Activate the selected item
   */
  private activateSelected(): void {
    const item = this.selectableItems[this.selectedIndex];

    if (item === this.backButton) {
      this.callbacks.onBack();
    } else if (item === this.crtToggle) {
      this.crtEnabled = !this.crtEnabled;
      this.updateToggleVisual(this.crtToggle, this.crtEnabled);
      this.callbacks.onCRTToggle();
    }
  }

  /**
   * Position elements
   */
  layout(width: number, height: number): void {
    const centerX = width / 2;

    // Title
    this.titleText.x = centerX;
    this.titleText.y = height * 0.15;

    // Sliders
    let y = height * 0.35;
    const spacing = 80;

    const sfxSlider = this.sliders.get('sfx');
    if (sfxSlider) {
      sfxSlider.container.x = centerX;
      sfxSlider.container.y = y;
      y += spacing;
    }

    const musicSlider = this.sliders.get('music');
    if (musicSlider) {
      musicSlider.container.x = centerX;
      musicSlider.container.y = y;
      y += spacing;
    }

    // CRT toggle
    this.crtToggle.x = centerX;
    this.crtToggle.y = y;
    y += spacing;

    // Back button
    this.backButton.x = centerX;
    this.backButton.y = height * 0.8;
  }

  /**
   * Set slider values from external state
   */
  setSFXVolume(volume: number): void {
    const slider = this.sliders.get('sfx');
    if (slider) {
      slider.value = volume;
      this.updateSliderVisual(slider);
    }
  }

  setMusicVolume(volume: number): void {
    const slider = this.sliders.get('music');
    if (slider) {
      slider.value = volume;
      this.updateSliderVisual(slider);
    }
  }

  setCRTEnabled(enabled: boolean): void {
    this.crtEnabled = enabled;
    this.updateToggleVisual(this.crtToggle, enabled);
  }

  /**
   * Show the menu
   */
  show(): void {
    this.container.visible = true;
    this.selectedIndex = 0;
    this.updateSelection();
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
   * Destroy
   */
  destroy(): void {
    this.container.destroy({ children: true });
  }
}
