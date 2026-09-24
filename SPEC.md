# Kindlewing — Flight over Hollowmere

An original one-button endless flyer. **Ashby**, a young ember dragon, flies
east across the kingdom of **Hollowmere** — over its village rooftops, up the
castle approach, through the Greyspine mountains and past the moonlit
citadel — threading gaps in whatever the kingdom has built in the way.

All names, characters, places and art are original to this project.

## 1. Core rules

| Rule | Value |
|---|---|
| Input | **One** action: tap / click / Space. Each press = one flap. Nothing else. |
| Gravity | Always on. |
| Obstacles | Scroll right→left at a constant speed; each has exactly one passable gap. |
| Death | Hitbox overlaps an obstacle, the ground, or the ceiling. |
| Score | Obstacles fully passed. |
| High score | Persisted in `localStorage`. |
| Restart | Tap on the game-over screen (after a 0.4 s lockout). No reload. |

## 2. World & timing

* Logical world: **360 × 640** px, scaled to fit the screen (letterboxed).
* Ceiling at `y = 0`, ground top at `y = 560` (80 px ground strip).
* **Fixed timestep**: logic runs at exactly **60 ticks/s** (`DT = 1/60 s`),
  decoupled from the display refresh via an accumulator. Rendering
  interpolates between ticks.
* Game logic (`src/game.js`, `src/physics.js`, `src/gaps.js`,
  `src/difficulty.js`) is pure JS with no DOM access and is fully
  unit-testable in Node.

## 3. Flap physics

Semi-implicit Euler, per tick:

```
if (flap) vy = FLAP_VELOCITY          // a flap SETS velocity, it doesn't add
vy = min(vy + GRAVITY * DT, TERMINAL_VELOCITY)
y  = y + vy * DT
```

| Constant | Value | Notes |
|---|---|---|
| `GRAVITY` | **1500 px/s²** | |
| `FLAP_VELOCITY` (impulse) | **−430 px/s** | up is negative |
| `TERMINAL_VELOCITY` | **600 px/s** | downward speed cap |
| Flap rise (apex height) | 430² / (2·1500) ≈ **61.6 px** | reached after ≈ 0.29 s |
| Dragon hitbox | **34 × 24 px** axis-aligned box, centred at x = 100 | sprite is drawn slightly larger than the box (forgiving) |

Because a flap sets `vy` and gravity is clamped, `vy` is always in
`[−430 + 25, 600]` after a tick: no runaway or NaN state is reachable.

## 4. Obstacles

| Parameter | Value |
|---|---|
| Obstacle width | **64 px** |
| Spawn spacing | **220 px** leading edge → leading edge (constant distance; time between obstacles shrinks as speed rises) |
| First obstacle | leading edge at x = 440 (off-screen right) |
| Gap size | **150 px, constant for the whole run** |
| Edge margin | gap is always ≥ **40 px** from ceiling and ground |

### Gap-size formula

```
gapSize = roundUpTo10( hitboxH + 2 · flapRise )
        = roundUpTo10( 24 + 2 · 61.6 ) = roundUpTo10(147.3) = 150 px
```

i.e. the gap fits the hitbox plus two full flap arcs: a player who flaps from
the bottom of the gap never has to worry about hitting the top in the same
arc. That is 6.25× the hitbox height, 126 px of vertical free play.

### Gap placement (seeded)

Gap **centres** are drawn from a seeded PRNG (mulberry32). A run is fully
reproducible from its seed.

```
GAP_MIN_Y = 0   + 40 + 75 = 115      // gap top    ≥ 40
GAP_MAX_Y = 560 − 40 − 75 = 445      // gap bottom ≤ 520
lo = max(GAP_MIN_Y, prevGapY − maxGapDelta(stage))
hi = min(GAP_MAX_Y, prevGapY + maxGapDelta(stage))
gapY = lo + rng() · (hi − lo)
```

The first gap is measured from the dragon's start height (y = 280).

### Visual variants (cosmetic only)

All variants are drawn over the **identical** pair of hitbox rectangles
(`[0, gapTop]` and `[gapBottom, 560]`, width 64). Picked by a separate
cosmetic PRNG stream so they never perturb the gap sequence; no variant
appears twice in a row.

1. **tower** — stone castle towers: one rising from below with
   crenellations, one hanging from a sky-bridge above.
2. **wall** — a tall curtain wall with a broken breach punched through it.
3. **banners** — long heraldic banners hanging from a timber gantry above,
   a banner-pole palisade below.
4. **portcullis** — an iron portcullis raised above a gatehouse arch.

## 5. Difficulty ramp

Difficulty is a function of **score only**. The *stage* is
`min(score, 40)`, so there are exactly **41 distinct stages (0‥40)**; every
score ≥ 40 plays identically to stage 40 (**the cap**).

Linear ramp, `t = stage / 40`:

| Parameter | Stage 0 | per point | Stage 40 (cap) |
|---|---|---|---|
| Scroll speed | 140 px/s | +1.5 px/s | **200 px/s** |
| Max gap shift between consecutive gaps | 90 px | +1.5 px | **150 px** |
| Gap size | 150 px | 0 | 150 px (constant per run, by design) |

"Gap tightness" is expressed as a larger allowed vertical swing between
consecutive gaps rather than a shrinking gap, because the core rules require
the gap height to stay constant for a run.

| Stage | Speed (px/s) | Time between obstacles | Max gap shift |
|---|---|---|---|
| 0 | 140 | 1.57 s | 90 |
| 10 | 155 | 1.42 s | 105 |
| 20 | 170 | 1.29 s | 120 |
| 30 | 185 | 1.19 s | 135 |
| 40+ | 200 | 1.10 s | 150 |

### Why the cap is always beatable

Free-air window between leaving one obstacle and touching the next:
`(220 − 64 − 34) / speed`. At the cap that is 36 ticks (0.61 s). Flapping
at a human rate (one flap per 9 ticks ≈ 6.7 taps/s) climbs **183 px** in that
window — more than the 150 px max shift, *before* counting the 126 px of
free play inside each gap. Descending is easier still (free fall from rest
covers > 200 px). The CI fairness suite checks this for every stage and then
proves it constructively with the bot (§8).

## 6. Scenery

Purely cosmetic backdrop that changes every **10 points**, cycling:

`village → castle approach → Greyspine mountains → moonlit citadel → village …`

Crossfades over ~1.5 s. No gameplay effect: it reads the score, nothing in
the simulation reads it.

## 7. Screens

* **Title** — name, dragon hovering, "tap / click / Space to fly", best score.
  The first input starts the run *and* counts as the first flap.
* **Playing** — score at the top.
* **Game over** — the dragon tumbles to the ground; panel shows score, best,
  a "new best!" flag and the run seed. Tap to fly again immediately (after a
  24-tick / 0.4 s lockout to swallow panic-taps).

## 8. Verification plan (all run in CI)

* **Physics** — a fixed flap schedule produces a bit-identical trajectory
  on every run; `vy`/`y` always finite; `vy` never exceeds terminal
  velocity; flap velocity exact.
* **Fairness proof** — for **every stage 0‥40**, the scripted
  perfect-timing bot (`src/bot.js`, ≤ 6.7 taps/s) survives long random gap
  sequences *and* adversarial ones (max-shift zig-zags, full-range sweeps,
  hugging ceiling / ground) with difficulty pinned at that stage.
* **Gap generation** — ≥ 10,000 placements per check (hundreds of thousands
  total) assert: never off-screen, never inside the edge margins, never a
  shift greater than the stage's `maxGapDelta`, and `maxGapDelta` never
  exceeds what the physics can climb/drop at that stage's speed.
* **Collision** — exact boundary cases: edge-touching is a clean pass, any
  positive overlap (down to 0.001 px) is a hit, for every side and every
  obstacle variant.
* **Bot playthrough** — a normal (score-driven) run from a fixed seed to
  well past the cap (score 250 = 6× the cap) with no death, reproducible.

## 9. Constraints

Static site: vanilla HTML/CSS/JS + `<canvas>`. No runtime dependencies, no
asset files — all art is drawn in code and all audio is synthesised with the
Web Audio API. Tests use Node's built-in `node:test` (no npm packages).

## 10. Out of scope

Power-ups · multiple lives · level select · any second input (no pause key,
no dive button, no mute key) · in-run scenery that affects collision ·
currency / shop · accounts / online leaderboards. Ideas go in
[BACKLOG.md](BACKLOG.md).
