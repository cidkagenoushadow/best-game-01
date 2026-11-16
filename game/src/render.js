// Drawing only: the world's state and the current screen in, pixels out. The 1280x720 playfield
// is scaled to fit the window and centred, the margin filled with the backdrop colour. Glowing
// things are pre-rendered once to offscreen sprites and blitted each frame, so a busy sky costs
// no more than a quiet one. Text that holds a number is rebuilt only when the number changes.

import { FIELD, FONT, LIVES, PALETTE, WIN_SCORE } from './config.js';
import { KIND_CINDER, KIND_EMBER, KIND_STAR } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

/** The panel's width; its height grows with its lines: room for the title, the lines and the prompt. */
const PANEL = { width: 640, top: 128, line: 32, bottom: 72 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

/** Render `draw` once into an offscreen canvas of `size` pixels, centred on its middle. */
function makeSprite(size, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext('2d'), size / 2, size / 2, size / 2);
  return canvas;
}

function glowSprite(inner, outer) {
  return makeSprite(96, (ctx, cx, cy, half) => {
    const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, half);
    glow.addColorStop(0, inner);
    glow.addColorStop(0.35, outer);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 96, 96);
  });
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  let skyGradient = null;
  let stars = [];

  const scoreLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  const waveLabel = cachedLabel('Wave ');

  // The night's fixed stars: seeded once, they twinkle by the clock, never by the frame.
  function seedStars(random) {
    stars = [];
    for (let index = 0; index < 90; index += 1) {
      stars.push({
        x: random() * FIELD.width,
        y: random() * 460,
        radius: 0.6 + random() * 1.4,
        phase: random() * Math.PI * 2,
        speed: 0.5 + random() * 1.5,
      });
    }
  }

  const emberSprite = glowSprite('#ffe9a3', 'rgba(255,182,46,0.55)');
  const cinderSprite = glowSprite('#ff8a7a', 'rgba(229,83,75,0.5)');
  const starSprite = glowSprite('#d8fffe', 'rgba(95,227,224,0.55)');
  const lanternSprite = glowSprite('#fff3c4', 'rgba(255,215,106,0.5)');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
    skyGradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    skyGradient.addColorStop(0, PALETTE.skyTop);
    skyGradient.addColorStop(0.7, PALETTE.skyBottom);
    skyGradient.addColorStop(1, '#33284a');
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function textPlain(value, x, y, size, color, align) {
    if (!fonts.has(-size)) fonts.set(-size, `${size}px ${FONT}`);
    context.font = fonts.get(-size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function drawSky(clock) {
    context.fillStyle = skyGradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const star of stars) {
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(clock * star.speed + star.phase));
      context.globalAlpha = twinkle;
      context.fillStyle = '#dfe6ff';
      context.beginPath();
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    // A rising moon, and two hill ridges to give the sky a horizon.
    context.fillStyle = '#f4ecd2';
    context.beginPath();
    context.arc(1000, 88, 40, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.skyTop;
    context.beginPath();
    context.arc(986, 78, 36, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.hillFar;
    context.beginPath();
    context.moveTo(0, 620);
    context.quadraticCurveTo(320, 520, 640, 600);
    context.quadraticCurveTo(960, 660, 1280, 560);
    context.lineTo(1280, FIELD.groundY);
    context.lineTo(0, FIELD.groundY);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.hillNear;
    context.beginPath();
    context.moveTo(0, 640);
    context.quadraticCurveTo(400, 580, 800, 630);
    context.quadraticCurveTo(1080, 662, 1280, 620);
    context.lineTo(1280, FIELD.groundY);
    context.lineTo(0, FIELD.groundY);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.ground;
    context.fillRect(0, FIELD.groundY, FIELD.width, FIELD.height - FIELD.groundY);
    context.fillStyle = PALETTE.grass;
    for (let x = 8; x < FIELD.width; x += 46) {
      context.beginPath();
      context.moveTo(x, FIELD.groundY);
      context.lineTo(x + 5, FIELD.groundY - 9);
      context.lineTo(x + 10, FIELD.groundY);
      context.closePath();
      context.fill();
    }
  }

  function drawSpiky(x, y, radius, points, color) {
    context.fillStyle = color;
    context.beginPath();
    for (let index = 0; index < points * 2; index += 1) {
      const angle = (index / (points * 2)) * Math.PI * 2;
      const reach = index % 2 === 0 ? radius : radius * 0.55;
      const px = x + Math.cos(angle) * reach;
      const py = y + Math.sin(angle) * reach;
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
  }

  function drawItems(state, clock) {
    const items = state.items;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.active) continue;
      const flicker = 0.85 + 0.15 * Math.sin(clock * 9 + item.phase * 7);
      context.globalAlpha = flicker;
      if (item.kind === KIND_EMBER) {
        const size = item.radius * 4;
        context.drawImage(emberSprite, item.x - size / 2, item.y - size / 2, size, size);
        context.globalAlpha = 1;
        context.fillStyle = PALETTE.emberCore;
        context.beginPath();
        context.arc(item.x, item.y, item.radius * 0.55, 0, Math.PI * 2);
        context.fill();
      } else if (item.kind === KIND_CINDER) {
        const size = item.radius * 4;
        context.drawImage(cinderSprite, item.x - size / 2, item.y - size / 2, size, size);
        context.globalAlpha = 1;
        drawSpiky(item.x, item.y, item.radius, 7, PALETTE.cinder);
        context.fillStyle = PALETTE.cinderCore;
        context.beginPath();
        context.arc(item.x, item.y, item.radius * 0.35, 0, Math.PI * 2);
        context.fill();
      } else {
        const size = item.radius * 4;
        context.drawImage(starSprite, item.x - size / 2, item.y - size / 2, size, size);
        context.globalAlpha = 1;
        const pulse = 1 + 0.12 * Math.sin(clock * 5 + item.phase);
        drawSpiky(item.x, item.y, item.radius * pulse, 4, PALETTE.star);
        context.fillStyle = '#ffffff';
        context.beginPath();
        context.arc(item.x, item.y, item.radius * 0.3, 0, Math.PI * 2);
        context.fill();
      }
    }
    context.globalAlpha = 1;
  }

  function drawParticles(state) {
    for (const particle of state.particles) {
      if (!particle.active) continue;
      context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawFlame(x, y, size, lit, clock, phase) {
    if (!lit) {
      context.globalAlpha = 0.25;
      context.strokeStyle = PALETTE.muted;
      context.lineWidth = 2;
      context.beginPath();
      context.arc(x, y, size * 0.7, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
      return;
    }
    const wobble = Math.sin(clock * 6 + phase) * size * 0.12;
    context.fillStyle = PALETTE.ember;
    context.beginPath();
    context.moveTo(x, y - size);
    context.quadraticCurveTo(x + size * 0.8 + wobble, y - size * 0.2, x + size * 0.35, y + size * 0.55);
    context.quadraticCurveTo(x, y + size * 0.85, x - size * 0.35, y + size * 0.55);
    context.quadraticCurveTo(x - size * 0.8 + wobble, y - size * 0.2, x, y - size);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.emberCore;
    context.beginPath();
    context.moveTo(x, y - size * 0.55);
    context.quadraticCurveTo(x + size * 0.4, y, x, y + size * 0.4);
    context.quadraticCurveTo(x - size * 0.4, y, x, y - size * 0.55);
    context.closePath();
    context.fill();
  }

  function drawPlayer(state, clock) {
    const player = state.player;
    const glowSize = player.radius * 5.4;
    context.globalAlpha = 0.9;
    context.drawImage(lanternSprite, player.x - glowSize / 2, player.y - glowSize / 2, glowSize, glowSize);
    context.globalAlpha = 1;
    // Blink while invulnerable after a hit: hidden on every other tenth of a second.
    if (player.invulnerable !== 0 && Math.floor(player.invulnerable * 10) % 2 === 0) return;
    if (player.magnet > 0) {
      context.strokeStyle = 'rgba(95,227,224,0.55)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(player.x, player.y, player.radius + 14 + Math.sin(clock * 4) * 3, 0, Math.PI * 2);
      context.stroke();
    }
    if (player.shield) {
      context.strokeStyle = '#8fd0ff';
      context.lineWidth = 3;
      context.beginPath();
      context.arc(player.x, player.y, player.radius + 8, 0, Math.PI * 2);
      context.stroke();
    }
    // The lantern: a brass cap, a warm glass body, and a flame that never sits still.
    context.fillStyle = '#8a6a2f';
    context.fillRect(player.x - 11, player.y - player.radius - 4, 22, 7);
    context.fillStyle = '#c9a24d';
    context.beginPath();
    context.arc(player.x, player.y - player.radius - 4, 5, Math.PI, 0);
    context.fill();
    context.fillStyle = PALETTE.lantern;
    context.beginPath();
    context.arc(player.x, player.y, player.radius * 0.82, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#8a6a2f';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(player.x, player.y, player.radius * 0.82, 0, Math.PI * 2);
    context.stroke();
    drawFlame(player.x, player.y + 2, player.radius * 0.5, true, clock, 0);
  }

  function drawHud(state, muted) {
    context.textBaseline = 'top';
    text(scoreLabel(state.score), 24, 18, 28, PALETTE.text, 'left');
    text(waveLabel(state.wave), FIELD.width / 2, 18, 28, PALETTE.text, 'center');
    const firstFlame = FIELD.width - 24 - LIVES * 34;
    text('Lights', firstFlame - 14, 18, 28, PALETTE.text, 'right');
    for (let life = 0; life < LIVES; life += 1) {
      drawFlame(firstFlame + life * 34 + 12, 34, 11, life < state.lives, state.elapsed, life * 1.7);
    }
    // Goal: a progress bar toward the beacon, under the score.
    const barX = 24;
    const barY = 56;
    const barWidth = 220;
    const barHeight = 10;
    context.fillStyle = '#141a2e';
    context.fillRect(barX, barY, barWidth, barHeight);
    context.fillStyle = PALETTE.accent;
    context.fillRect(barX, barY, barWidth * Math.min(1, state.score / WIN_SCORE), barHeight);
    textPlain(`Beacon ${Math.min(state.score, WIN_SCORE)} / ${WIN_SCORE}`, barX, barY + 16, 16, PALETTE.muted, 'left');
    if (state.multiplier > 1) {
      text(`Combo x${state.multiplier}`, FIELD.width / 2, 56, 24, PALETTE.accent, 'center');
    }
    if (state.player.powerName !== '') {
      const label = state.player.shield
        ? 'Shield ready'
        : `${state.player.powerName} ${Math.ceil(state.player.powerTimer)}s`;
      textPlain(label, FIELD.width - 24, 56, 18, PALETTE.star, 'right');
    }
    textPlain(muted ? 'M — sound off' : 'M — mute', FIELD.width - 24, 82, 15, PALETTE.muted, 'right');
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(8, 10, 22, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 76, 46, accent ?? PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      textPlain(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.accent, 'center');
  }

  /** Paint one frame: the night, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, muted) {
    const clock = state.elapsed;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawSky(clock);
    drawItems(state, clock);
    drawParticles(state);
    if (screen !== SCREEN_TITLE) drawPlayer(state, clock);
    if (screen === SCREEN_TITLE) {
      drawPanel(
        'EMBERKEEPER',
        [
          'Catch the falling embers. Dodge the burning cinders.',
          'Move with ← ↑ ↓ → or W A S D — or just move the mouse.',
          'Chains of catches raise your combo. Stars grant powers.',
          `Light the beacon: reach ${WIN_SCORE} points before your lights go out.`,
          '',
          bestLabel(best),
        ],
        'Press Space or click to begin',
      );
      return;
    }
    drawHud(state, muted);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The embers will wait for you.'], 'Press P to keep playing');
    } else if (screen === SCREEN_WIN) {
      drawPanel(
        'The Beacon is Lit!',
        [`Score ${state.score}`, bestLabel(best), 'Every ember found its home.'],
        'Press Space or click to play again',
        PALETTE.accent,
      );
    } else if (screen === SCREEN_OVER) {
      drawPanel(
        'The Light Fades',
        [`Score ${state.score}`, bestLabel(best), 'The night keeps your embers — for now.'],
        'Press Space or click to try again',
        PALETTE.cinder,
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    seedStars,
    /** Map a canvas pixel to a playfield point, for pointer steering. */
    toField(px, py) {
      const ratio = window.devicePixelRatio || 1;
      return {
        x: (px * ratio - view.x) / view.scale,
        y: (py * ratio - view.y) / view.scale,
      };
    },
  };
}
