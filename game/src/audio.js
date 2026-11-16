// Every sound is made here, with the Web Audio API and nothing else: short oscillator notes
// shaped by a gain envelope, so the game ships no audio files and loads nothing. The context is
// created on the first player gesture (browsers block sound before one), and every call is safe
// when there is no audio device at all.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context !== null || muted) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  /** One note: an oscillator that slides from `from` to `to` Hz over `seconds`, then fades out. */
  function tone({ type = 'sine', from = 440, to = null, at = 0, seconds = 0.12, volume = 0.12 }) {
    const ctx = ensure();
    if (ctx === null) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const start = ctx.currentTime + at;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    if (to !== null) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.02);
  }

  return {
    get muted() {
      return muted;
    },
    setMuted(value) {
      muted = value;
      if (muted && context !== null) context.suspend().catch(() => {});
      if (!muted && context !== null) context.resume().catch(() => {});
    },
    /** The first gesture: warm the context up so the next sound is on time. */
    unlock() {
      ensure();
    },
    click() {
      tone({ type: 'triangle', from: 660, to: 880, seconds: 0.07, volume: 0.08 });
    },
    /** Catch: a bright blip that climbs a semitone with every step of the combo. */
    catch(combo) {
      const step = Math.min(combo, 12);
      const base = 523 * 2 ** (step / 12);
      tone({ type: 'sine', from: base, to: base * 1.5, seconds: 0.14, volume: 0.14 });
      tone({ type: 'triangle', from: base * 2, seconds: 0.08, volume: 0.05 });
    },
    hit() {
      tone({ type: 'sawtooth', from: 160, to: 55, seconds: 0.28, volume: 0.18 });
      tone({ type: 'square', from: 90, to: 40, seconds: 0.2, volume: 0.1 });
    },
    shieldBreak() {
      tone({ type: 'triangle', from: 880, to: 220, seconds: 0.2, volume: 0.12 });
    },
    power() {
      [523, 659, 784, 1047].forEach((frequency, index) => {
        tone({ type: 'triangle', from: frequency, at: index * 0.07, seconds: 0.16, volume: 0.1 });
      });
    },
    wave() {
      tone({ type: 'sine', from: 392, to: 587, seconds: 0.25, volume: 0.1 });
      tone({ type: 'sine', from: 587, to: 784, at: 0.12, seconds: 0.25, volume: 0.08 });
    },
    win() {
      [523, 659, 784, 1047, 1319].forEach((frequency, index) => {
        tone({ type: 'triangle', from: frequency, at: index * 0.12, seconds: 0.3, volume: 0.12 });
      });
    },
    lose() {
      [392, 330, 262, 196].forEach((frequency, index) => {
        tone({ type: 'sine', from: frequency, at: index * 0.16, seconds: 0.3, volume: 0.11 });
      });
    },
  };
}
