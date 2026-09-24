// Pure game logic: no DOM, no canvas, no clocks. Advances only via step().
import { DRAGON, OBSTACLES, WORLD, DIFFICULTY, DT } from './config.js';
import { stepDragon, dragonBox, outOfBounds } from './physics.js';
import { hitsObstacle } from './gaps.js';

export function createGame() {
  const state = { mode: 'title', tick: 0 };
  resetRun(state);
  state.mode = 'title';
  return state;
}

export function resetRun(state) {
  state.mode = 'playing';
  state.dragon = { y: DRAGON.startY, vy: 0, prevY: DRAGON.startY };
  state.obstacles = [];
  state.nextId = 0;
  state.distance = 0;
  state.runTicks = 0;
  state.speed = DIFFICULTY.scrollSpeed.start;
  spawnObstacles(state);
}

// Keep the stream topped up: a new obstacle appears off-screen right as soon
// as there is room for one at the fixed spacing.
function spawnObstacles(state) {
  const obs = state.obstacles;
  let last = obs[obs.length - 1];
  while (!last || last.x + OBSTACLES.spacing < WORLD.width + OBSTACLES.width) {
    const x = last ? last.x + OBSTACLES.spacing : OBSTACLES.firstX;
    last = { id: state.nextId++, x, prevX: x, gapY: DRAGON.startY, variant: 'tower' };
    obs.push(last);
  }
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
  state.dragon.prevY = state.dragon.y;
  for (const ob of state.obstacles) ob.prevX = ob.x;
  if (state.mode !== 'playing') {
    if (!flap) return [];
    resetRun(state);
    return ['start', ...playTick(state, true)];
  }
  return playTick(state, flap);
}

function playTick(state, flap) {
  const events = [];
  state.runTicks++;
  if (flap) events.push('flap');
  stepDragon(state.dragon, flap);

  const dx = state.speed * DT;
  state.distance += dx;
  for (const ob of state.obstacles) ob.x -= dx;
  while (state.obstacles.length && state.obstacles[0].x + OBSTACLES.width < -8) state.obstacles.shift();
  spawnObstacles(state);

  const box = dragonBox(state.dragon);
  if (outOfBounds(box) || collidingObstacle(state, box)) {
    state.mode = 'over';
    events.push('hit');
  }
  return events;
}
