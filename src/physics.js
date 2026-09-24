import { DT, PHYSICS, DRAGON, WORLD } from './config.js';

// Advance the dragon one fixed tick (semi-implicit Euler).
// A flap SETS vertical velocity; gravity then applies; downward speed is
// clamped to terminal velocity so it can never run away.
export function stepDragon(dragon, flap, physics = PHYSICS, dt = DT) {
  if (flap) dragon.vy = physics.flapVelocity;
  dragon.vy = Math.min(dragon.vy + physics.gravity * dt, physics.terminalVelocity);
  dragon.y += dragon.vy * dt;
}

export function dragonBox(dragon) {
  return {
    x: DRAGON.x - DRAGON.hitboxW / 2,
    y: dragon.y - DRAGON.hitboxH / 2,
    w: DRAGON.hitboxW,
    h: DRAGON.hitboxH,
  };
}

// Positive-area overlap. Rectangles that merely share an edge do NOT collide.
export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Leaving the playfield: penetrating the ceiling or the ground.
// Exactly touching the line (top === ceilingY / bottom === groundY) is safe.
export function outOfBounds(box) {
  return box.y < WORLD.ceilingY || box.y + box.h > WORLD.groundY;
}
