// The screenshot scenes behind ?shot=start|play|win|end. Each one plays the real rules forward
// from a fresh world for a fixed time, steered by a simple autopilot (chase the nearest ember,
// keep clear of cinders that are closing in), so the frame is what a real game looks like and
// the same seed always gives the same frame. The end scene's pilot chases blindly and never
// dodges, so it is caught out as a hurried player is; the win scene's plays well until the
// beacon is lit.

import { FIELD, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN, KIND_CINDER, KIND_EMBER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 30;
const END_LIMIT_SECONDS = 600;
const WIN_LIMIT_SECONDS = 900;

/** Steer toward the nearest ember, pushed away from cinders closing in on the lantern. */
function autopilot(state, dodge) {
  const player = state.player;
  let ember = null;
  let emberDistance = Infinity;
  for (let index = 0; index < state.items.length; index += 1) {
    const item = state.items[index];
    if (!item.active || item.kind !== KIND_EMBER) continue;
    const distance = Math.hypot(item.x - player.x, item.y - player.y);
    if (distance < emberDistance) {
      emberDistance = distance;
      ember = item;
    }
  }
  let x = 0;
  let y = 0;
  if (ember !== null) {
    x = ember.x - player.x;
    y = ember.y - player.y;
  } else {
    x = FIELD.width / 2 - player.x;
    y = 0;
  }
  if (dodge) {
    for (let index = 0; index < state.items.length; index += 1) {
      const item = state.items[index];
      if (!item.active || item.kind !== KIND_CINDER) continue;
      const dx = player.x - item.x;
      const dy = player.y - item.y;
      const distance = Math.hypot(dx, dy);
      if (distance < 220 && distance > 1) {
        const push = (1 - distance / 220) * 260;
        x += (dx / distance) * push;
        y += (dy / distance) * push * 0.7;
      }
    }
  }
  const length = Math.hypot(x, y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}

/**
 * Set `world` to the named scene (start, play, win or end; any other name is start) and return
 * the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'win' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) world.step(STEP, { x: 0, y: 0 }, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'win' ? WIN_LIMIT_SECONDS : name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const dodge = name !== 'end';
  let events = 0;
  for (let index = 0; index < limit / STEP; index += 1) {
    events = world.step(STEP, autopilot(world.state, dodge), false);
    if (events & EVENT_WIN) break;
    if (events & EVENT_OVER) break;
  }
  const won = world.state.won;
  const over = world.state.lives === 0;
  return {
    screen: won ? SCREEN_WIN : over ? SCREEN_OVER : SCREEN_PLAY,
    best: world.state.score,
  };
}
