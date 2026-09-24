import { OBSTACLES, WORLD } from './config.js';
import { overlaps } from './physics.js';

// Safe band for gap CENTRES: the whole gap plus its margin stays on screen
// and clear of the ceiling and the ground.
export const GAP_MIN_Y = WORLD.ceilingY + OBSTACLES.edgeMargin + OBSTACLES.gapSize / 2;
export const GAP_MAX_Y = WORLD.groundY - OBSTACLES.edgeMargin - OBSTACLES.gapSize / 2;

// Next gap centre: uniform within the safe band AND within maxDelta of the
// previous gap centre, so consecutive gaps are always reachable.
export function nextGapY(rng, prevY, maxDelta) {
  const lo = Math.max(GAP_MIN_Y, prevY - maxDelta);
  const hi = Math.min(GAP_MAX_Y, prevY + maxDelta);
  return lo + rng() * (hi - lo);
}

export function gapRect(gapY) {
  return {
    top: gapY - OBSTACLES.gapSize / 2,
    bottom: gapY + OBSTACLES.gapSize / 2,
  };
}

// The two solid rectangles of an obstacle: everything above the gap down
// from the ceiling, and everything below it down to the ground. Every visual
// variant is drawn over exactly these.
export function obstacleBoxes(ob) {
  const { top, bottom } = gapRect(ob.gapY);
  return [
    { x: ob.x, y: WORLD.ceilingY, w: OBSTACLES.width, h: top - WORLD.ceilingY },
    { x: ob.x, y: bottom, w: OBSTACLES.width, h: WORLD.groundY - bottom },
  ];
}

export function hitsObstacle(box, ob) {
  const [upper, lower] = obstacleBoxes(ob);
  return overlaps(box, upper) || overlaps(box, lower);
}
