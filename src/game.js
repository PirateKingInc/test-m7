// Pure game logic: no DOM, no canvas, no clocks. Advances only via step().
import { DRAGON } from './config.js';
import { stepDragon, dragonBox, outOfBounds } from './physics.js';

export function createGame() {
  const state = { mode: 'title', tick: 0 };
  resetRun(state);
  state.mode = 'title';
  return state;
}

export function resetRun(state) {
  state.mode = 'playing';
  state.dragon = { y: DRAGON.startY, vy: 0, prevY: DRAGON.startY };
  state.runTicks = 0;
}

// Advance one fixed tick. `flap` is true if the single input fired since
// the previous tick. Returns a list of event names for audio / effects.
export function step(state, flap) {
  state.tick++;
  const d = state.dragon;
  d.prevY = d.y;
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
  if (outOfBounds(dragonBox(state.dragon))) {
    state.mode = 'over';
    events.push('hit');
  }
  return events;
}
