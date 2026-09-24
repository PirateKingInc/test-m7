# Kindlewing — Flight over Hollowmere

A one-button endless flyer. Guide **Ashby**, a young ember dragon, across the
kingdom of **Hollowmere**: village rooftops, the castle approach, the Greyspine
mountains and the moonlit citadel. Thread the gap in each castle tower, breached
wall, banner gantry and portcullis.

**▶ Play: https://piratekinginc.github.io/test-m7/**

## Controls

| Platform | Flap |
|---|---|
| Desktop | **Click** or **Space** |
| Mobile | **Tap** anywhere |

That's the only control. Gravity does the rest. Touching an obstacle, the
ground or the sky ends the run. Tap again to fly again straight away. Your best
score is saved in the browser.

## Run locally

It's a static site with no build step and no dependencies. Serve the repo root
over HTTP (ES modules don't load from `file://`):

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```

`?seed=12345` replays a specific gap sequence. The seed of each run is shown on
the game-over screen.

## Run the tests

Needs Node ≥ 22. There are no packages to install.

```sh
npm test                           # everything, ~4 s
FAIRNESS_LENGTH=100000 npm test    # an arbitrarily long fairness proof
```

CI runs `npm test` on every push and pull request (`.github/workflows/ci.yml`).
Every merge to `main` re-runs the tests, deploys to GitHub Pages, and polls the
live URL until it serves the game (`.github/workflows/deploy.yml`).

### What the suite proves

| Suite | Claim |
|---|---|
| `physics` | A fixed flap schedule gives a bit-identical golden trajectory. No NaN/∞ over 100k ticks of extreme input. Terminal velocity is reached and never exceeded. |
| `fairness` | For **every** difficulty stage 0‥40, a perfect-timing bot (≤ 6.7 taps/s) survives 205,000 random gaps plus 6 adversarial worst-case patterns × 41,000, and 20,000 in a row at the cap, with **0 deaths**. |
| `gaps` | 162,000 generated gaps: never off-screen, never inside the 40 px ground/ceiling margins, never a shift beyond the stage limit. Every stage's max shift is climbable and droppable at that stage's speed. |
| `collision` | Exact hitbox boundaries on every face, lip and corner: 0 px contact passes, 0.001 px overlap hits. |
| `bot` | The real score-driven game, seed 20260924, reaches **250 points** (6× the cap) reproducibly. |
| others | Scoring/restart flow, difficulty ramp and cap, variants and scenery are cosmetic-only, storage hardening, audio mapping, effects bounds, module graph. |

## Project layout

| Path | What |
|---|---|
| `SPEC.md` | Design spec: physics constants, gap formula, difficulty curve, fairness argument, out of scope |
| `BACKLOG.md` | Ideas deliberately left out of v1 |
| `src/config.js` | **All tunable numbers**: physics, obstacles, difficulty, scenery, fairness assumptions |
| `src/physics.js` · `gaps.js` · `difficulty.js` · `game.js` · `rng.js` | Pure, deterministic game logic (no DOM), fixed 60 Hz timestep, seeded gaps |
| `src/bot.js` | Perfect-timing autopilot used by the fairness proof |
| `src/render.js` · `art.js` · `effects.js` | Canvas renderer; all art drawn in code; cosmetic particles, shake and flash |
| `src/audio.js` | Web Audio synthesised sound effects |
| `src/storage.js` | Hardened `localStorage` high score |
| `src/main.js` | Browser wiring: input, fixed-timestep loop |
| `tests/` | `node:test` suites (see above) |
