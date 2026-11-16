# Emberkeeper

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/cidkagenoushadow/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/cidkagenoushadow/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A night-sky arcade game: you are the Keeper, a lantern spirit drifting through the dark.
Catch the falling embers, dodge the burning cinders, and light the beacon before your
three lights go out. Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.

## How to play

- **Move:** arrow keys or W A S D — or just move the mouse; the lantern glides after it.
- **Catch embers** (gold): +10 points each. Catches chained within a few seconds build a
  combo multiplier, up to x5.
- **Dodge cinders** (red, spiky): a hit costs one of your three lights and breaks the combo.
- **Stars** (cyan) grant powers: a Shield that absorbs one hit, a Magnet that pulls embers
  toward you, or Slowfall that slows everything down.
- **Win:** reach 1,000 points and the beacon is lit. **Lose:** all three lights go out.
- **Waves:** every 20 seconds the night gets faster and thicker, up to wave 10.
- **Pause:** P or Esc. **Mute:** M. **Start / restart:** Space, Enter, or click.
- Your best score is kept in the browser between visits.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — the game is plain static files under `game/`, no build
step, no network requests, and it plays offline in a desktop browser.

## Screenshots

The four screenshots under `screenshots/` are real renders of the game's own code, staged
with `?shot=start|play|win|end&seed=1` (a fixed seed, so every run stages the same scenes):
gameplay first (the cover), then the title screen, the win screen, and the game-over screen.

## Layout

- `game/index.html` — the page; `game/src/` is the game, one job per file:
  `config.js` (tuning), `random.js` (seeded RNG), `world.js` (rules and state),
  `render.js` (drawing), `input.js` (keyboard and mouse), `audio.js` (synthesised sounds),
  `shots.js` (screenshot scenes), `main.js` (boot and the game loop).
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output` and writes
  `/output/dossier.json` with the vendored make.fun library.
- `serve.ts` — a tiny static server for local play-testing.

---

<sub>Entered on [make.fun](https://make.fun/?ref=golden-panda-17&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
