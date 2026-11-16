// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical area;
// the renderer scales it to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, groundY: 664 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 26,
  speed: 540,
  /** Seconds of mercy after a hit, while the lantern blinks. */
  invulnerable: 1.5,
};

export const LIVES = 3;

/** Catch this many points and the beacon is lit: you win. */
export const WIN_SCORE = 1000;

/** Seconds of play per wave; wave 10 is the last, where speeds stop growing. */
export const WAVE = { seconds: 20, max: 10 };

export const EMBER = {
  radius: 13,
  speed: 200,
  speedPerWave: 16,
  speedJitter: 70,
  /** Seconds between embers at wave 1; waves make them fall thicker. */
  interval: 0.5,
  intervalScale: 0.94,
  minInterval: 0.16,
  points: 10,
};

export const CINDER = {
  radius: 17,
  speed: 230,
  speedPerWave: 22,
  speedJitter: 90,
  interval: 0.9,
  intervalScale: 0.9,
  minInterval: 0.3,
};

export const STAR = {
  radius: 16,
  speed: 150,
  /** Seconds between power-up stars. */
  interval: 14,
};

/** Combo: catches closer together than this keep the multiplier climbing. */
export const COMBO = { window: 2.5, perCatch: 1, stepEvery: 5, maxMultiplier: 5 };

export const POWER = {
  shieldSeconds: 0, // a shield lasts until it absorbs one hit
  magnetSeconds: 8,
  slowSeconds: 6,
  slowFactor: 0.45,
  magnetRadius: 280,
};

/** How many falling things and particles can exist at once; pools are allocated once, at boot. */
export const POOL_SIZE = 96;
export const PARTICLE_POOL = 160;

export const PALETTE = {
  backdrop: '#0b0e1a',
  skyTop: '#141a33',
  skyBottom: '#2b2140',
  hillFar: '#1d2440',
  hillNear: '#232c4d',
  ground: '#1e2b23',
  grass: '#2f4a34',
  lantern: '#ffd76a',
  lanternCore: '#fff3c4',
  ember: '#ffb62e',
  emberCore: '#ffe9a3',
  cinder: '#e5534b',
  cinderCore: '#ff8a7a',
  star: '#5fe3e0',
  panel: '#171d33',
  panelEdge: '#3a4a7a',
  text: '#f2f0e4',
  muted: '#9aa3c0',
  accent: '#ffd76a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberkeeper.best';
