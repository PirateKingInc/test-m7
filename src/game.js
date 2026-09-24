// Pure game logic: no DOM, no canvas, no clocks. Advances only via step().
import { DRAGON, OBSTACLES, WORLD, DT, RESTART_LOCK_TICKS } from './config.js';
import { stepDragon, dragonBox, outOfBounds } from './physics.js';
import { hitsObstacle, nextGapY } from './gaps.js';
import { createRng } from './rng.js';
import { stageFor, scrollSpeedFor, maxGapDeltaFor } from './difficulty.js';

// opts.seed       run seed: the gap sequence is a pure function of it
// opts.best       best score carried in (e.g. from storage)
// opts.gapSource  test hook, (rng, prevY, maxDelta) => gapY, replaces nextGapY
// opts.fixedStage test hook: pin difficulty to one stage regardless of score
export function createGame(opts = {}) {
  const state = {
    mode: 'title',
    tick: 0,
    best: Math.max(0, opts.best | 0),
    gapSource: opts.gapSource || nextGapY,
    fixedStage: opts.fixedStage,
  };
  resetRun(state, opts.seed ?? 1);
  state.mode = 'title';
  return state;
}

export function resetRun(state, seed) {
  state.seed = seed >>> 0;
  state.rng = createRng(state.seed);
  // Separate stream for looks only, so the choice of skin can never perturb
  // the gap sequence.
  state.cosmeticRng = createRng(state.seed ^ 0x9e3779b9);
  state.lastVariant = -1;
  state.lastGapY = DRAGON.startY; // the first gap is measured from the start height
  state.mode = 'playing';
  state.dragon = { y: DRAGON.startY, vy: 0, prevY: DRAGON.startY };
  state.obstacles = [];
  state.nextId = 0;
  state.score = 0;
  state.newBest = false;
  state.distance = 0;
  state.runTicks = 0;
  state.overTicks = 0;
  state.speed = scrollSpeedFor(currentStage(state));
  spawnObstacles(state);
}

export function currentStage(state) {
  return state.fixedStage ?? stageFor(state.score);
}

// Each restart gets a new seed derived from the last, so a whole session of
// runs is reproducible from its first seed.
export function nextSeed(seed) {
  return (Math.imul(seed ^ (seed >>> 16), 0x45d9f3b) + 0x3c6ef372) >>> 0;
}

// Keep the stream topped up: a new obstacle appears off-screen right as soon
// as there is room for one at the fixed spacing.
function spawnObstacles(state) {
  const obs = state.obstacles;
  let last = obs[obs.length - 1];
  while (!last || last.x + OBSTACLES.spacing < WORLD.width + OBSTACLES.width) {
    const x = last ? last.x + OBSTACLES.spacing : OBSTACLES.firstX;
    const gapY = state.gapSource(state.rng, state.lastGapY, maxGapDeltaFor(currentStage(state)));
    state.lastGapY = gapY;
    last = { id: state.nextId++, x, prevX: x, gapY, variant: pickVariant(state), passed: false };
    obs.push(last);
  }
}

// Cosmetic only: every variant reskins the same two hitbox rectangles.
// Uniform over the variants other than the previous one (no repeats).
function pickVariant(state) {
  const n = OBSTACLES.variants.length;
  let v = Math.floor(state.cosmeticRng() * (n - 1));
  if (state.lastVariant >= 0 && v >= state.lastVariant) v++;
  state.lastVariant = v;
  return OBSTACLES.variants[v];
}

// First obstacle whose solid parts overlap the box, or null.
export function collidingObstacle(state, box) {
  for (const ob of state.obstacles) {
    if (ob.x >= box.x + box.w) break; // ordered left to right
    if (hitsObstacle(box, ob)) return ob;
  }
  return null;
}

// Advance one fixed tick. `flap` is true if the single input fired since
// the previous tick. Returns a list of event names for audio / effects.
export function step(state, flap) {
  state.tick++;
  const d = state.dragon;
  d.prevY = d.y;
  for (const ob of state.obstacles) ob.prevX = ob.x;

  if (state.mode === 'title') {
    if (!flap) return [];
    resetRun(state, state.seed);
    return ['start', ...playTick(state, true)];
  }

  if (state.mode === 'over') {
    state.overTicks++;
    if (flap && state.overTicks >= RESTART_LOCK_TICKS) {
      resetRun(state, nextSeed(state.seed));
      return ['start', ...playTick(state, true)];
    }
    // The world freezes; the dragon tumbles down and comes to rest on the ground.
    const floor = WORLD.groundY - DRAGON.hitboxH / 2;
    if (d.y < floor) {
      stepDragon(d, false);
      if (d.y >= floor) {
        d.y = floor;
        d.vy = 0;
      }
    }
    return [];
  }

  return playTick(state, flap);
}

function playTick(state, flap) {
  const events = [];
  state.runTicks++;
  if (flap) events.push('flap');
  stepDragon(state.dragon, flap);

  state.speed = scrollSpeedFor(currentStage(state));
  const dx = state.speed * DT;
  state.distance += dx;
  for (const ob of state.obstacles) ob.x -= dx;
  while (state.obstacles.length && state.obstacles[0].x + OBSTACLES.width < -8) state.obstacles.shift();
  spawnObstacles(state);

  const box = dragonBox(state.dragon);
  if (outOfBounds(box) || collidingObstacle(state, box)) {
    state.mode = 'over';
    state.overTicks = 0;
    if (state.score > state.best) {
      state.best = state.score;
      state.newBest = true;
    }
    events.push('hit');
    return events;
  }

  // Score once the obstacle's trailing edge is fully behind the hitbox.
  for (const ob of state.obstacles) {
    if (!ob.passed && ob.x + OBSTACLES.width < box.x) {
      ob.passed = true;
      state.score++;
      events.push('score');
    }
  }
  return events;
}
