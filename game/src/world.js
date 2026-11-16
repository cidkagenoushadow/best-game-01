// The game's rules and state, with no drawing and no browser in it: the lantern keeper, the
// pool of falling embers, cinders and stars, spawning, collisions, combo, waves, power-ups and
// the win and lose conditions. step() advances one fixed step and returns what happened as bit
// flags, so the caller can react (sound, announcements) without the world knowing about them.
// Nothing here allocates after createWorld returns.

import {
  CINDER,
  COMBO,
  EMBER,
  FIELD,
  LIVES,
  PARTICLE_POOL,
  POOL_SIZE,
  POWER,
  PLAYER,
  STAR,
  WAVE,
  WIN_SCORE,
} from './config.js';

export const KIND_EMBER = 0;
export const KIND_CINDER = 1;
export const KIND_STAR = 2;

export const POWER_SHIELD = 0;
export const POWER_MAGNET = 1;
export const POWER_SLOW = 2;
export const POWER_NAMES = ['Shield', 'Magnet', 'Slowfall'];

export const EVENT_COIN = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_WIN = 8;
export const EVENT_POWER = 16;
export const EVENT_WAVE = 32;
export const EVENT_SHIELD = 64;

function overlapsCircle(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const reach = a.radius + b.radius;
  return dx * dx + dy * dy < reach * reach;
}

export function createWorld(random) {
  const player = {
    x: 0,
    y: 0,
    radius: PLAYER.radius,
    invulnerable: 0,
    shield: false,
    magnet: 0,
    slow: 0,
    powerName: '',
    powerTimer: 0,
    flicker: 0,
  };
  const items = [];
  for (let index = 0; index < POOL_SIZE; index += 1) {
    items.push({ active: false, kind: KIND_EMBER, x: 0, y: 0, radius: 0, speed: 0, sway: 0, phase: 0 });
  }
  const particles = [];
  for (let index = 0; index < PARTICLE_POOL; index += 1) {
    particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff' });
  }
  const state = {
    player,
    items,
    particles,
    score: 0,
    best: 0,
    lives: LIVES,
    wave: 1,
    elapsed: 0,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    emberTimer: 0,
    cinderTimer: 0,
    starTimer: 0,
    over: false,
    won: false,
  };

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.groundY - 90;
    player.invulnerable = 0;
    player.shield = false;
    player.magnet = 0;
    player.slow = 0;
    player.powerName = '';
    player.powerTimer = 0;
    for (const item of items) item.active = false;
    for (const particle of particles) particle.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.wave = 1;
    state.elapsed = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    state.emberTimer = EMBER.interval;
    state.cinderTimer = CINDER.interval;
    state.starTimer = STAR.interval;
    state.over = false;
    state.won = false;
  }

  function freeItem() {
    for (let index = 0; index < items.length; index += 1) if (!items[index].active) return items[index];
    return null;
  }

  function burst(x, y, color, count, speed) {
    let made = 0;
    for (let index = 0; index < particles.length && made < count; index += 1) {
      const particle = particles[index];
      if (particle.active) continue;
      const angle = random() * Math.PI * 2;
      const velocity = speed * (0.4 + random() * 0.6);
      particle.active = true;
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * velocity;
      particle.vy = Math.sin(angle) * velocity - 40;
      particle.maxLife = 0.5 + random() * 0.5;
      particle.life = particle.maxLife;
      particle.size = 2 + random() * 3;
      particle.color = color;
      made += 1;
    }
  }

  function spawnEmber() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_EMBER;
    item.radius = EMBER.radius;
    item.x = 20 + random() * (FIELD.width - 40);
    item.y = -item.radius * 2;
    item.speed = EMBER.speed + EMBER.speedPerWave * (state.wave - 1) + random() * EMBER.speedJitter;
    item.sway = 20 + random() * 30;
    item.phase = random() * Math.PI * 2;
  }

  function spawnCinder() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_CINDER;
    item.radius = CINDER.radius;
    item.x = 20 + random() * (FIELD.width - 40);
    item.y = -item.radius * 2;
    item.speed = CINDER.speed + CINDER.speedPerWave * (state.wave - 1) + random() * CINDER.speedJitter;
    item.sway = 10 + random() * 25;
    item.phase = random() * Math.PI * 2;
  }

  function spawnStar() {
    const item = freeItem();
    if (item === null) return;
    item.active = true;
    item.kind = KIND_STAR;
    item.radius = STAR.radius;
    item.x = 40 + random() * (FIELD.width - 80);
    item.y = -item.radius * 2;
    item.speed = STAR.speed;
    item.sway = 30;
    item.phase = random() * Math.PI * 2;
  }

  function emberInterval() {
    return Math.max(EMBER.minInterval, EMBER.interval * EMBER.intervalScale ** (state.wave - 1));
  }

  function cinderInterval() {
    return Math.max(CINDER.minInterval, CINDER.interval * CINDER.intervalScale ** (state.wave - 1));
  }

  function applyPower(kind) {
    if (kind === POWER_SHIELD) {
      player.shield = true;
      player.powerName = POWER_NAMES[POWER_SHIELD];
      player.powerTimer = 0;
    } else if (kind === POWER_MAGNET) {
      player.magnet = POWER.magnetSeconds;
      player.powerName = POWER_NAMES[POWER_MAGNET];
      player.powerTimer = POWER.magnetSeconds;
    } else {
      player.slow = POWER.slowSeconds;
      player.powerName = POWER_NAMES[POWER_SLOW];
      player.powerTimer = POWER.slowSeconds;
    }
  }

  /**
   * One fixed step. `move` is {x, y} in -1..1 (keyboard or pointer steering). With `harmless`
   * set (the title screen's backdrop) things fall but nothing touches the player and nothing
   * scores, so the title can shimmer behind its panel.
   */
  function step(dt, move, harmless) {
    let events = 0;
    state.elapsed += dt;
    const wave = Math.min(WAVE.max, 1 + Math.floor(state.elapsed / WAVE.seconds));
    if (wave !== state.wave) {
      state.wave = wave;
      events |= EVENT_WAVE;
    }
    player.flicker += dt;

    const length = Math.hypot(move.x, move.y);
    const nx = length > 1 ? move.x / length : move.x;
    const ny = length > 1 ? move.y / length : move.y;
    player.x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x + nx * PLAYER.speed * dt));
    player.y = Math.min(FIELD.groundY - player.radius, Math.max(70, player.y + ny * PLAYER.speed * dt));
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (player.magnet > 0) {
      player.magnet = Math.max(0, player.magnet - dt);
      player.powerTimer = player.magnet;
    }
    if (player.slow > 0) {
      player.slow = Math.max(0, player.slow - dt);
      player.powerTimer = player.slow;
    }
    if (player.magnet === 0 && player.slow === 0 && !player.shield) player.powerName = '';

    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) {
        state.combo = 0;
        state.multiplier = 1;
      }
    }

    const fall = player.slow > 0 ? POWER.slowFactor : 1;

    state.emberTimer -= dt;
    if (state.emberTimer <= 0) {
      spawnEmber();
      state.emberTimer += emberInterval();
    }
    state.cinderTimer -= dt;
    if (state.cinderTimer <= 0) {
      spawnCinder();
      state.cinderTimer += cinderInterval();
    }
    state.starTimer -= dt;
    if (state.starTimer <= 0) {
      spawnStar();
      state.starTimer += STAR.interval;
    }

    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      item.y += item.speed * fall * dt;
      item.x += Math.sin(state.elapsed * 2 + item.phase) * item.sway * dt;
      if (player.magnet > 0 && item.kind === KIND_EMBER) {
        const dx = player.x - item.x;
        const dy = player.y - item.y;
        const distance = Math.hypot(dx, dy);
        if (distance < POWER.magnetRadius && distance > 1) {
          const pull = 420 * (1 - distance / POWER.magnetRadius);
          item.x += (dx / distance) * pull * dt;
          item.y += (dy / distance) * pull * dt;
        }
      }
      if (item.y > FIELD.groundY + item.radius) {
        item.active = false;
        continue;
      }
      if (harmless || !overlapsCircle(item, player)) continue;
      if (item.kind === KIND_EMBER) {
        item.active = false;
        state.combo += 1;
        state.comboTimer = COMBO.window;
        state.multiplier = Math.min(COMBO.maxMultiplier, 1 + Math.floor(state.combo / COMBO.stepEvery));
        state.score += EMBER.points * state.multiplier;
        burst(item.x, item.y, '#ffb62e', 10, 160);
        events |= EVENT_COIN;
        if (state.score >= WIN_SCORE) {
          state.won = true;
          state.over = true;
          events |= EVENT_WIN;
          break;
        }
      } else if (item.kind === KIND_STAR) {
        item.active = false;
        applyPower(Math.floor(random() * 3));
        burst(item.x, item.y, '#5fe3e0', 14, 200);
        events |= EVENT_POWER;
      } else if (player.invulnerable === 0) {
        item.active = false;
        burst(item.x, item.y, '#e5534b', 16, 240);
        if (player.shield) {
          player.shield = false;
          player.powerName = '';
          player.invulnerable = PLAYER.invulnerable;
          events |= EVENT_SHIELD;
        } else {
          state.lives -= 1;
          state.combo = 0;
          state.multiplier = 1;
          player.invulnerable = PLAYER.invulnerable;
          events |= EVENT_HIT;
          if (state.lives === 0) {
            state.over = true;
            events |= EVENT_OVER;
            break;
          }
        }
      }
    }

    for (let index = 0; index < particles.length; index += 1) {
      const particle = particles[index];
      if (!particle.active) continue;
      particle.life -= dt;
      if (particle.life <= 0) {
        particle.active = false;
        continue;
      }
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 160 * dt;
    }
    return events;
  }

  reset();
  return { state, reset, step };
}
