// Physics reachability analysis shared by the gap-generation and difficulty
// tests. Not a test file itself.
import { DT, OBSTACLES, DRAGON, FAIRNESS } from '../src/config.js';
import { stepDragon } from '../src/physics.js';

// Ticks of open air between the dragon's hitbox leaving one obstacle and
// touching the next — the only time a transition between gaps can happen
// if we ignore the free play inside each gap (conservative).
export function freeWindowTicks(speed) {
  return Math.floor((OBSTACLES.spacing - OBSTACLES.width - DRAGON.hitboxW) / speed / DT);
}

// Height gained in that window, starting at rest and tapping as fast as a
// human reasonably can (one flap every FAIRNESS.minFlapIntervalTicks).
export function climbReach(speed) {
  const d = { y: 0, vy: 0 };
  for (let t = 0; t < freeWindowTicks(speed); t++) stepDragon(d, t % FAIRNESS.minFlapIntervalTicks === 0);
  return -d.y;
}

// Height lost in that window by simply not flapping, starting at rest.
export function dropReach(speed) {
  const d = { y: 0, vy: 0 };
  for (let t = 0; t < freeWindowTicks(speed); t++) stepDragon(d, false);
  return d.y;
}
