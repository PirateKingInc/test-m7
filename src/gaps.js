import { OBSTACLES, WORLD } from './config.js';
import { overlaps } from './physics.js';

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
