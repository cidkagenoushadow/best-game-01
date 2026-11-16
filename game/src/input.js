// Keyboard and pointer input. Held keys give a steering vector; one-shot presses (start or
// restart, pause, mute) are queued as bit flags and taken once by the loop, so a press between
// two frames is never lost and never counted twice. Moving the pointer steers the lantern toward
// it; a click is a confirm, so the game is fully playable with mouse alone.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let actions = 0;
  // Where the pointer last was, in the canvas's own pixels; null until it moves.
  let pointer = null;
  let pointerAge = Infinity;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    up = false;
    down = false;
    pointer = null;
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    pointerAge = 0;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    pointerAge = 0;
    actions |= ACTION_CONFIRM;
  });

  return {
    /**
     * The steering vector for this frame, in -1..1 on each axis. Keys win while held;
     * otherwise the lantern glides toward the pointer, easing off as it arrives, and
     * stops a second after the pointer stops moving. `toField` maps a canvas pixel to
     * a playfield point; `player` is the lantern's current position.
     */
    move(toField, player) {
      const keys = { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
      if (keys.x !== 0 || keys.y !== 0) return keys;
      pointerAge += 1 / 60;
      if (pointer === null || pointerAge > 1) return { x: 0, y: 0 };
      const target = toField(pointer.x, pointer.y);
      const dx = target.x - player.x;
      const dy = target.y - player.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 12) return { x: 0, y: 0 };
      const strength = Math.min(1, distance / 120);
      return { x: (dx / distance) * strength, y: (dy / distance) * strength };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
