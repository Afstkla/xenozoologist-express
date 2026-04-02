export interface MobileState {
  moveX: number;
  moveZ: number;
  lookDX: number;
  lookDY: number;
  jump: boolean;
}

const JOYSTICK_RADIUS = 60; // half of 120px circle
const KNOB_RADIUS = 24;

export class MobileControls {
  private container: HTMLDivElement;
  private joystickBase: HTMLDivElement;
  private joystickKnob: HTMLDivElement;
  private emoteBtn: HTMLDivElement;

  private joystickOrigin = { x: 0, y: 0 };
  private joystickActive = false;
  private joystickTouchId: number | null = null;
  private moveX = 0;
  private moveZ = 0;

  private lookTouchId: number | null = null;
  private lookLastX = 0;
  private lookLastY = 0;
  private lookDX = 0;
  private lookDY = 0;

  private jumpPending = false;

  public onEmote: ((index: number) => void) | null = null;

  // Bound handlers for cleanup
  private _onTouchStart: (e: TouchEvent) => void;
  private _onTouchMove: (e: TouchEvent) => void;
  private _onTouchEnd: (e: TouchEvent) => void;

  constructor() {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '100',
      userSelect: 'none',
      touchAction: 'none',
    });

    // Joystick base (bottom-left)
    this.joystickBase = document.createElement('div');
    Object.assign(this.joystickBase.style, {
      position: 'absolute',
      bottom: '80px',
      left: '60px',
      width: `${JOYSTICK_RADIUS * 2}px`,
      height: `${JOYSTICK_RADIUS * 2}px`,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.15)',
      border: '2px solid rgba(255,255,255,0.3)',
      pointerEvents: 'auto',
      touchAction: 'none',
    });

    // Joystick knob
    this.joystickKnob = document.createElement('div');
    Object.assign(this.joystickKnob.style, {
      position: 'absolute',
      top: `${JOYSTICK_RADIUS - KNOB_RADIUS}px`,
      left: `${JOYSTICK_RADIUS - KNOB_RADIUS}px`,
      width: `${KNOB_RADIUS * 2}px`,
      height: `${KNOB_RADIUS * 2}px`,
      borderRadius: '50%',
      background: 'rgba(0,255,220,0.6)',
      border: '2px solid rgba(0,255,220,0.9)',
      pointerEvents: 'none',
    });
    this.joystickBase.appendChild(this.joystickKnob);
    this.container.appendChild(this.joystickBase);

    // Emote button (bottom-right)
    this.emoteBtn = document.createElement('div');
    Object.assign(this.emoteBtn.style, {
      position: 'absolute',
      bottom: '80px',
      right: '60px',
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      background: 'rgba(255,180,0,0.3)',
      border: '2px solid rgba(255,180,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      color: 'white',
      pointerEvents: 'auto',
      touchAction: 'none',
      cursor: 'pointer',
    });
    this.emoteBtn.textContent = '★';
    this.container.appendChild(this.emoteBtn);

    // Right-half transparent overlay for look
    const lookZone = document.createElement('div');
    Object.assign(lookZone.style, {
      position: 'absolute',
      top: '0',
      right: '0',
      width: '50%',
      height: '100%',
      pointerEvents: 'auto',
      touchAction: 'none',
    });
    this.container.appendChild(lookZone);

    document.body.appendChild(this.container);

    // Touch event handlers
    this._onTouchStart = this.onTouchStart.bind(this);
    this._onTouchMove = this.onTouchMove.bind(this);
    this._onTouchEnd = this.onTouchEnd.bind(this);

    this.container.addEventListener('touchstart', this._onTouchStart, { passive: false });
    this.container.addEventListener('touchmove', this._onTouchMove, { passive: false });
    this.container.addEventListener('touchend', this._onTouchEnd, { passive: false });
    this.container.addEventListener('touchcancel', this._onTouchEnd, { passive: false });

    this.emoteBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.jumpPending = true;
      if (this.onEmote) this.onEmote(0);
    }, { passive: false });
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      const target = e.target as HTMLElement;

      // Joystick
      if (target === this.joystickBase || this.joystickBase.contains(target)) {
        if (this.joystickTouchId === null) {
          this.joystickTouchId = touch.identifier;
          const rect = this.joystickBase.getBoundingClientRect();
          this.joystickOrigin.x = rect.left + JOYSTICK_RADIUS;
          this.joystickOrigin.y = rect.top + JOYSTICK_RADIUS;
          this.joystickActive = true;
        }
        continue;
      }

      // Right half = look
      if (touch.clientX > window.innerWidth / 2 && this.lookTouchId === null) {
        this.lookTouchId = touch.identifier;
        this.lookLastX = touch.clientX;
        this.lookLastY = touch.clientY;
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier === this.joystickTouchId) {
        const dx = touch.clientX - this.joystickOrigin.x;
        const dy = touch.clientY - this.joystickOrigin.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const clamped = Math.min(dist, JOYSTICK_RADIUS);
        const angle = Math.atan2(dy, dx);
        const nx = clamped / JOYSTICK_RADIUS;

        this.moveX = Math.cos(angle) * nx;
        this.moveZ = Math.sin(angle) * nx;

        // Move knob visually
        const kx = Math.cos(angle) * clamped + JOYSTICK_RADIUS - KNOB_RADIUS;
        const ky = Math.sin(angle) * clamped + JOYSTICK_RADIUS - KNOB_RADIUS;
        this.joystickKnob.style.left = `${kx}px`;
        this.joystickKnob.style.top = `${ky}px`;
      }

      if (touch.identifier === this.lookTouchId) {
        this.lookDX += touch.clientX - this.lookLastX;
        this.lookDY += touch.clientY - this.lookLastY;
        this.lookLastX = touch.clientX;
        this.lookLastY = touch.clientY;
      }
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    for (const touch of Array.from(e.changedTouches)) {
      if (touch.identifier === this.joystickTouchId) {
        this.joystickTouchId = null;
        this.joystickActive = false;
        this.moveX = 0;
        this.moveZ = 0;
        // Reset knob
        this.joystickKnob.style.left = `${JOYSTICK_RADIUS - KNOB_RADIUS}px`;
        this.joystickKnob.style.top = `${JOYSTICK_RADIUS - KNOB_RADIUS}px`;
      }
      if (touch.identifier === this.lookTouchId) {
        this.lookTouchId = null;
      }
    }
  }

  /** Returns current input state and resets accumulated deltas */
  consume(): { moveX: number; moveZ: number; lookDX: number; lookDY: number; jump: boolean } {
    const result = {
      moveX: this.moveX,
      moveZ: this.moveZ,
      lookDX: this.lookDX,
      lookDY: this.lookDY,
      jump: this.jumpPending,
    };
    this.lookDX = 0;
    this.lookDY = 0;
    this.jumpPending = false;
    return result;
  }

  show(): void {
    this.container.style.display = '';
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  dispose(): void {
    this.container.removeEventListener('touchstart', this._onTouchStart);
    this.container.removeEventListener('touchmove', this._onTouchMove);
    this.container.removeEventListener('touchend', this._onTouchEnd);
    this.container.removeEventListener('touchcancel', this._onTouchEnd);
    document.body.removeChild(this.container);
  }
}
