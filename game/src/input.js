// Verde Cay — keyboard input. Tracks held keys and edge-triggered presses
// (keys the game consumes once per press, like E, M, P, Q and 1-3).
const HELD = new Set();
const PRESSED = new Set();

export function initInput() {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    HELD.add(e.code);
    PRESSED.add(e.code);
  });
  window.addEventListener('keyup', (e) => HELD.delete(e.code));
  window.addEventListener('blur', () => { HELD.clear(); });
}

export function held(code) { return HELD.has(code); }
export function axis(neg, pos) { return (HELD.has(pos) ? 1 : 0) - (HELD.has(neg) ? 1 : 0); }

// True once for the frame after the key went down, then cleared by endFrame.
export function pressed(code) { return PRESSED.has(code); }
export function endFrame() { PRESSED.clear(); }
