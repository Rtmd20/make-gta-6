// Keyboard input: a live set of held keys plus edge-triggered "just pressed"
// checks, so one tap of E or M does exactly one thing.
export class Input {
  constructor() {
    this.held = new Set();
    this.pressed = new Set();
    this.onFirstKey = null;
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.held.has(e.code)) {
        this.pressed.add(e.code);
        if (this.onFirstKey) {
          const cb = this.onFirstKey;
          this.onFirstKey = null;
          cb();
        }
      }
      this.held.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.code));
    window.addEventListener('blur', () => {
      this.held.clear();
      this.pressed.clear();
    });
  }

  down(...codes) {
    return codes.some((c) => this.held.has(c));
  }

  justPressed(...codes) {
    return codes.some((c) => this.pressed.has(c));
  }

  // Call at the end of each frame so edges last exactly one frame.
  endFrame() {
    this.pressed.clear();
  }
}
