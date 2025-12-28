/**
 * Touch Controls
 * Virtual D-pad and buttons for mobile gameplay
 */

import { Container, Graphics, Text, TextStyle, FederatedPointerEvent } from 'pixi.js';
import { InputActions } from '../core/engine/GameLoop';

interface TouchButton {
  graphic: Graphics;
  label?: Text;
  action: keyof InputActions;
  isPressed: boolean;
  pointerId: number | null;
}

interface DPadButton {
  graphic: Graphics;
  direction: 'left' | 'right' | 'down';
  isPressed: boolean;
  pointerId: number | null;
}

/**
 * Touch Controls class - Provides virtual controls for mobile
 */
export class TouchControls {
  private container: Container;
  private dpadContainer: Container;
  private buttonsContainer: Container;

  private dpadButtons: DPadButton[] = [];
  private actionButtons: TouchButton[] = [];

  private visible: boolean = false;
  private isMobileDevice: boolean = false;

  // DAS/ARR simulation for d-pad
  private dasLeft = { charging: false, charged: false, time: 0 };
  private dasRight = { charging: false, charged: false, time: 0 };
  private lastMoveTime = 0;
  private readonly dasTime = 167; // ms
  private readonly arrTime = 33; // ms

  // Colors
  private colors = {
    buttonBg: 0x0D0221,
    buttonBorder: 0xFF00FF,
    buttonPressed: 0xFF00FF,
    buttonPressedBg: 0xFF00FF,
    dpadBg: 0x0D0221,
    dpadBorder: 0x00FFFF,
    dpadPressed: 0x00FFFF,
    text: 0xFFFFFF,
  };

  constructor() {
    this.container = new Container();
    this.dpadContainer = new Container();
    this.buttonsContainer = new Container();

    this.container.addChild(this.dpadContainer);
    this.container.addChild(this.buttonsContainer);

    // Detect if mobile device
    this.isMobileDevice = this.detectMobileDevice();

    // Auto-show on mobile
    if (this.isMobileDevice) {
      this.show();
    }

    this.createDPad();
    this.createActionButtons();
  }

  /**
   * Detect if running on mobile device
   */
  private detectMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           ('ontouchstart' in window);
  }

  /**
   * Create D-Pad for movement (left side of screen)
   */
  private createDPad(): void {
    const buttonSize = 70;
    const spacing = 10;

    // Left button
    const leftBtn = this.createDPadButton('left', -buttonSize - spacing, 0, buttonSize);
    this.dpadButtons.push(leftBtn);
    this.dpadContainer.addChild(leftBtn.graphic);

    // Right button
    const rightBtn = this.createDPadButton('right', buttonSize + spacing, 0, buttonSize);
    this.dpadButtons.push(rightBtn);
    this.dpadContainer.addChild(rightBtn.graphic);

    // Down button (soft drop)
    const downBtn = this.createDPadButton('down', 0, buttonSize + spacing, buttonSize);
    this.dpadButtons.push(downBtn);
    this.dpadContainer.addChild(downBtn.graphic);
  }

  /**
   * Create a single D-pad button
   */
  private createDPadButton(
    direction: 'left' | 'right' | 'down',
    x: number,
    y: number,
    size: number
  ): DPadButton {
    const graphic = new Graphics();

    // Draw circle button
    graphic.circle(0, 0, size / 2);
    graphic.fill({ color: this.colors.dpadBg, alpha: 0.6 });
    graphic.stroke({ color: this.colors.dpadBorder, width: 3, alpha: 0.8 });

    graphic.x = x;
    graphic.y = y;
    graphic.eventMode = 'static';
    graphic.cursor = 'pointer';

    // Add arrow symbol
    const arrow = this.createArrow(direction, size / 3);
    graphic.addChild(arrow);

    const button: DPadButton = {
      graphic,
      direction,
      isPressed: false,
      pointerId: null,
    };

    // Touch events
    graphic.on('pointerdown', (event: FederatedPointerEvent) => {
      if (button.pointerId === null) {
        button.isPressed = true;
        button.pointerId = event.pointerId;
        this.updateDPadVisual(button);
        event.stopPropagation();
      }
    });

    graphic.on('pointerup', (event: FederatedPointerEvent) => {
      if (button.pointerId === event.pointerId) {
        button.isPressed = false;
        button.pointerId = null;
        this.updateDPadVisual(button);
        // Reset DAS when releasing
        if (direction === 'left') {
          this.dasLeft = { charging: false, charged: false, time: 0 };
        } else if (direction === 'right') {
          this.dasRight = { charging: false, charged: false, time: 0 };
        }
      }
    });

    graphic.on('pointerupoutside', (event: FederatedPointerEvent) => {
      if (button.pointerId === event.pointerId) {
        button.isPressed = false;
        button.pointerId = null;
        this.updateDPadVisual(button);
        // Reset DAS
        if (direction === 'left') {
          this.dasLeft = { charging: false, charged: false, time: 0 };
        } else if (direction === 'right') {
          this.dasRight = { charging: false, charged: false, time: 0 };
        }
      }
    });

    return button;
  }

  /**
   * Create arrow graphic for D-pad
   */
  private createArrow(direction: 'left' | 'right' | 'down', size: number): Graphics {
    const arrow = new Graphics();
    const arrowSize = size;

    if (direction === 'left') {
      arrow.moveTo(arrowSize / 2, 0);
      arrow.lineTo(-arrowSize / 2, arrowSize / 2);
      arrow.lineTo(-arrowSize / 2, -arrowSize / 2);
      arrow.lineTo(arrowSize / 2, 0);
    } else if (direction === 'right') {
      arrow.moveTo(-arrowSize / 2, 0);
      arrow.lineTo(arrowSize / 2, arrowSize / 2);
      arrow.lineTo(arrowSize / 2, -arrowSize / 2);
      arrow.lineTo(-arrowSize / 2, 0);
    } else if (direction === 'down') {
      arrow.moveTo(0, -arrowSize / 2);
      arrow.lineTo(arrowSize / 2, arrowSize / 2);
      arrow.lineTo(-arrowSize / 2, arrowSize / 2);
      arrow.lineTo(0, -arrowSize / 2);
    }

    arrow.fill({ color: this.colors.dpadBorder, alpha: 0.8 });

    return arrow;
  }

  /**
   * Update D-pad button visual state
   */
  private updateDPadVisual(button: DPadButton): void {
    button.graphic.clear();
    button.graphic.circle(0, 0, 35);

    if (button.isPressed) {
      button.graphic.fill({ color: this.colors.dpadPressed, alpha: 0.4 });
      button.graphic.stroke({ color: this.colors.dpadPressed, width: 4 });
    } else {
      button.graphic.fill({ color: this.colors.dpadBg, alpha: 0.6 });
      button.graphic.stroke({ color: this.colors.dpadBorder, width: 3, alpha: 0.8 });
    }
  }

  /**
   * Create action buttons (right side of screen)
   */
  private createActionButtons(): void {
    const buttonSize = 65;
    const spacing = 20;

    // Rotate CW (primary action - top)
    const rotateBtn = this.createActionButton(
      'rotateCW',
      0,
      -buttonSize - spacing,
      buttonSize,
      '↻'
    );
    this.actionButtons.push(rotateBtn);
    this.buttonsContainer.addChild(rotateBtn.graphic);

    // Hard Drop (right)
    const dropBtn = this.createActionButton(
      'hardDrop',
      buttonSize + spacing,
      0,
      buttonSize,
      '▼'
    );
    this.actionButtons.push(dropBtn);
    this.buttonsContainer.addChild(dropBtn.graphic);

    // Hold (left)
    const holdBtn = this.createActionButton(
      'hold',
      -buttonSize - spacing,
      0,
      buttonSize,
      'H'
    );
    this.actionButtons.push(holdBtn);
    this.buttonsContainer.addChild(holdBtn.graphic);

    // Rotate CCW (bottom)
    const rotateCCWBtn = this.createActionButton(
      'rotateCCW',
      0,
      buttonSize + spacing,
      buttonSize,
      '↺'
    );
    this.actionButtons.push(rotateCCWBtn);
    this.buttonsContainer.addChild(rotateCCWBtn.graphic);
  }

  /**
   * Create a single action button
   */
  private createActionButton(
    action: keyof InputActions,
    x: number,
    y: number,
    size: number,
    label: string
  ): TouchButton {
    const graphic = new Graphics();

    // Draw circle button
    graphic.circle(0, 0, size / 2);
    graphic.fill({ color: this.colors.buttonBg, alpha: 0.6 });
    graphic.stroke({ color: this.colors.buttonBorder, width: 3, alpha: 0.8 });

    graphic.x = x;
    graphic.y = y;
    graphic.eventMode = 'static';
    graphic.cursor = 'pointer';

    // Add label
    const labelStyle = new TextStyle({
      fontFamily: '"Press Start 2P", monospace',
      fontSize: 24,
      fill: this.colors.text,
      align: 'center',
    });

    const labelText = new Text({ text: label, style: labelStyle });
    labelText.anchor.set(0.5, 0.5);
    graphic.addChild(labelText);

    const button: TouchButton = {
      graphic,
      label: labelText,
      action,
      isPressed: false,
      pointerId: null,
    };

    // Touch events
    graphic.on('pointerdown', (event: FederatedPointerEvent) => {
      if (button.pointerId === null) {
        button.isPressed = true;
        button.pointerId = event.pointerId;
        this.updateButtonVisual(button);
        event.stopPropagation();
      }
    });

    graphic.on('pointerup', (event: FederatedPointerEvent) => {
      if (button.pointerId === event.pointerId) {
        button.isPressed = false;
        button.pointerId = null;
        this.updateButtonVisual(button);
      }
    });

    graphic.on('pointerupoutside', (event: FederatedPointerEvent) => {
      if (button.pointerId === event.pointerId) {
        button.isPressed = false;
        button.pointerId = null;
        this.updateButtonVisual(button);
      }
    });

    return button;
  }

  /**
   * Update action button visual state
   */
  private updateButtonVisual(button: TouchButton): void {
    button.graphic.clear();
    button.graphic.circle(0, 0, 32.5);

    if (button.isPressed) {
      button.graphic.fill({ color: this.colors.buttonPressedBg, alpha: 0.4 });
      button.graphic.stroke({ color: this.colors.buttonPressed, width: 4 });
      if (button.label) {
        button.label.style.fill = this.colors.buttonPressed;
      }
    } else {
      button.graphic.fill({ color: this.colors.buttonBg, alpha: 0.6 });
      button.graphic.stroke({ color: this.colors.buttonBorder, width: 3, alpha: 0.8 });
      if (button.label) {
        button.label.style.fill = this.colors.text;
      }
    }
  }

  /**
   * Update touch controls and return input actions
   * This simulates DAS/ARR for D-pad similar to keyboard
   */
  update(deltaMs: number): InputActions {
    const actions: InputActions = {
      moveLeft: false,
      moveRight: false,
      softDrop: false,
      hardDrop: false,
      rotateCW: false,
      rotateCCW: false,
      rotate180: false,
      hold: false,
    };

    // Action buttons (trigger actions - fire once per press)
    this.actionButtons.forEach(button => {
      if (button.isPressed && button.action !== 'hardDrop') {
        // Only trigger once when first pressed
        // We'll track this by releasing the button internally after triggering
        actions[button.action] = true;
        // Auto-release action buttons after one frame
        setTimeout(() => {
          button.isPressed = false;
          button.pointerId = null;
          this.updateButtonVisual(button);
        }, 50);
      } else if (button.action === 'hardDrop' && button.isPressed) {
        actions.hardDrop = true;
        setTimeout(() => {
          button.isPressed = false;
          button.pointerId = null;
          this.updateButtonVisual(button);
        }, 50);
      }
    });

    // D-pad with DAS/ARR
    const leftBtn = this.dpadButtons.find(b => b.direction === 'left');
    const rightBtn = this.dpadButtons.find(b => b.direction === 'right');
    const downBtn = this.dpadButtons.find(b => b.direction === 'down');

    // Soft drop (simple - held down)
    if (downBtn?.isPressed) {
      actions.softDrop = true;
    }

    // Horizontal movement with DAS/ARR
    const leftHeld = leftBtn?.isPressed || false;
    const rightHeld = rightBtn?.isPressed || false;

    // Left movement
    if (leftHeld && !rightHeld) {
      if (!this.dasLeft.charging) {
        // Just started - move immediately
        actions.moveLeft = true;
        this.dasLeft.charging = true;
        this.dasLeft.charged = false;
        this.dasLeft.time = 0;
      } else {
        this.dasLeft.time += deltaMs;
        if (this.dasLeft.time >= this.dasTime) {
          this.dasLeft.charged = true;
        }
        if (this.dasLeft.charged) {
          // ARR phase
          this.lastMoveTime += deltaMs;
          if (this.lastMoveTime >= this.arrTime) {
            actions.moveLeft = true;
            this.lastMoveTime = 0;
          }
        }
      }
      this.dasRight = { charging: false, charged: false, time: 0 };
    }
    // Right movement
    else if (rightHeld && !leftHeld) {
      if (!this.dasRight.charging) {
        // Just started - move immediately
        actions.moveRight = true;
        this.dasRight.charging = true;
        this.dasRight.charged = false;
        this.dasRight.time = 0;
      } else {
        this.dasRight.time += deltaMs;
        if (this.dasRight.time >= this.dasTime) {
          this.dasRight.charged = true;
        }
        if (this.dasRight.charged) {
          // ARR phase
          this.lastMoveTime += deltaMs;
          if (this.lastMoveTime >= this.arrTime) {
            actions.moveRight = true;
            this.lastMoveTime = 0;
          }
        }
      }
      this.dasLeft = { charging: false, charged: false, time: 0 };
    }
    // Neither held
    else {
      this.dasLeft = { charging: false, charged: false, time: 0 };
      this.dasRight = { charging: false, charged: false, time: 0 };
      this.lastMoveTime = 0;
    }

    return actions;
  }

  /**
   * Position controls on screen
   */
  layout(width: number, height: number): void {
    const margin = 60;

    // D-pad on bottom-left
    this.dpadContainer.x = margin + 80;
    this.dpadContainer.y = height - margin - 80;

    // Action buttons on bottom-right
    this.buttonsContainer.x = width - margin - 80;
    this.buttonsContainer.y = height - margin - 80;
  }

  /**
   * Show controls
   */
  show(): void {
    this.visible = true;
    this.container.visible = true;
    this.container.alpha = 1;
  }

  /**
   * Hide controls
   */
  hide(): void {
    this.visible = false;
    this.container.visible = false;
  }

  /**
   * Toggle visibility
   */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Check if visible
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * Get the container
   */
  getContainer(): Container {
    return this.container;
  }

  /**
   * Check if mobile device
   */
  isMobile(): boolean {
    return this.isMobileDevice;
  }

  /**
   * Destroy controls
   */
  destroy(): void {
    this.container.destroy({ children: true });
  }
}
