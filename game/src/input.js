// Keyboard and mouse input for Verde Cay. WASD moves, E enters and exits cars and
// boats, F fires, Space brakes, Shift runs, M opens the map, P pauses, Q cycles the
// radio, 1-3 pick a weapon, and dragging the mouse orbits the chase camera.
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MAP = 'map';
export const ACTION_ENTER = 'enter';
export const ACTION_FIRE = 'fire';
export const ACTION_BRAKE = 'brake';
export const ACTION_RUN = 'run';
export const ACTION_RADIO = 'radio';

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM, Escape: ACTION_PAUSE, KeyP: ACTION_PAUSE,
  KeyM: ACTION_MAP, KeyE: ACTION_ENTER, KeyF: ACTION_FIRE,
  Space: ACTION_BRAKE, ShiftLeft: ACTION_RUN, ShiftRight: ACTION_RUN,
  KeyQ: ACTION_RADIO,
};

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  let dragX = 0;
  let dragY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    const action = KEY_ACTIONS[event.code];
    if (action) pressed.add(action);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  }
  function onKeyUp(event) { keys.delete(event.code); }
  function onPointerDown(event) {
    dragging = true; lastX = event.clientX; lastY = event.clientY;
    try { canvas.setPointerCapture(event.pointerId); } catch { /* touch fallback */ }
  }
  function onPointerMove(event) {
    if (!dragging) return;
    dragX += event.clientX - lastX;
    dragY += event.clientY - lastY;
    lastX = event.clientX; lastY = event.clientY;
  }
  function onPointerUp() { dragging = false; }
  function onBlur() { keys.clear(); dragging = false; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  function forward() {
    let value = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) value += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) value -= 1;
    return value;
  }
  function strafe() {
    let value = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) value -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) value += 1;
    return value;
  }
  function consume(action) {
    if (!pressed.has(action)) return false;
    pressed.delete(action);
    return true;
  }
  function consumeDrag() {
    const out = { x: dragX, y: dragY };
    dragX = 0; dragY = 0;
    return out;
  }
  function isHeld(code) { return keys.has(code); }
  function weaponSlot() {
    if (keys.has('Digit1')) return 0;
    if (keys.has('Digit2')) return 1;
    if (keys.has('Digit3')) return 2;
    return -1;
  }
  return { forward, strafe, consume, consumeDrag, isHeld, weaponSlot, keys };
}
