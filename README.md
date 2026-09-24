# Kindlewing — Flight over Hollowmere

A one-button endless flyer. Guide **Ashby**, a young ember dragon, across the
kingdom of **Hollowmere**: village rooftops, the castle approach, the Greyspine
mountains and the moonlit citadel. Thread the gap in each tower, wall, banner
gantry and portcullis.

**▶ Play: https://piratekinginc.github.io/test-m7/**

## Controls

| Platform | Flap |
|---|---|
| Desktop | **Click** or **Space** |
| Mobile | **Tap** anywhere |

That's the only control. Gravity does the rest. Touching an obstacle, the
ground or the sky ends the run. Tap again to fly again straight away.

## Run locally

It's a static site with no build step and no dependencies. Serve the repo root
over HTTP (ES modules don't load from `file://`):

```sh
python3 -m http.server 8000
# open http://localhost:8000/
```

`?seed=12345` replays a specific gap sequence. The seed of each run is shown
on the game-over screen.

## Run the tests

Needs Node ≥ 22. There are no packages to install.

```sh
npm test
```

CI runs the same command on every push and pull request
(`.github/workflows/ci.yml`). Every merge to `main` runs the tests again and
deploys to GitHub Pages (`.github/workflows/deploy.yml`).

## Project layout

| Path | What |
|---|---|
| `SPEC.md` | Design spec: physics constants, gap formula, difficulty curve, fairness argument |
| `BACKLOG.md` | Ideas deliberately left out of scope |
| `src/config.js` | All tunable numbers: physics, obstacles, difficulty, scenery |
| `src/physics.js`, `src/game.js` | Pure, deterministic game logic (no DOM) |
| `src/render.js`, `src/art.js` | Canvas renderer; all art drawn in code |
| `src/main.js` | Browser wiring: input, fixed-timestep loop |
| `tests/` | `node:test` suites |
