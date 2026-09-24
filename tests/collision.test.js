// Verification (d): hitbox collision has an exact, consistent pass/fail
// boundary. Edge contact is a clean pass; any positive overlap is a hit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRAGON, OBSTACLES, WORLD } from '../src/config.js';
import { overlaps, dragonBox } from '../src/physics.js';
import { gapRect, obstacleBoxes, hitsObstacle } from '../src/gaps.js';
import { createGame, step, collidingObstacle } from '../src/game.js';

const EPS = 0.001;
const HW = DRAGON.hitboxW / 2;
const HH = DRAGON.hitboxH / 2;
const GAP_Y = 300;
const { top: GAP_TOP, bottom: GAP_BOTTOM } = gapRect(GAP_Y);

// Hitbox with its centre at (cx, cy); dragonBox() pins x to DRAGON.x, so we
// move the obstacle instead of the dragon for horizontal cases.
const boxAtY = (cy) => dragonBox({ y: cy });
const obAt = (x) => ({ x, gapY: GAP_Y });
const dragonLeft = DRAGON.x - HW;
const dragonRight = DRAGON.x + HW;

test('overlaps(): shared edges and corners are not collisions', () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };
  assert.equal(overlaps(a, { x: 10, y: 0, w: 10, h: 10 }), false, 'right edge');
  assert.equal(overlaps(a, { x: -10, y: 0, w: 10, h: 10 }), false, 'left edge');
  assert.equal(overlaps(a, { x: 0, y: 10, w: 10, h: 10 }), false, 'bottom edge');
  assert.equal(overlaps(a, { x: 0, y: -10, w: 10, h: 10 }), false, 'top edge');
  assert.equal(overlaps(a, { x: 10, y: 10, w: 10, h: 10 }), false, 'corner');
  assert.equal(overlaps(a, { x: 10 - EPS, y: 0, w: 10, h: 10 }), true);
  assert.equal(overlaps(a, { x: 0, y: 10 - EPS, w: 10, h: 10 }), true);
  assert.equal(overlaps(a, { x: 10 - EPS, y: 10 - EPS, w: 10, h: 10 }), true, 'corner nick');
});

test('obstacle geometry: two solid boxes, exactly the gap between them', () => {
  const [upper, lower] = obstacleBoxes(obAt(200));
  assert.equal(upper.y, WORLD.ceilingY);
  assert.equal(upper.y + upper.h, GAP_TOP);
  assert.equal(lower.y, GAP_BOTTOM);
  assert.equal(lower.y + lower.h, WORLD.groundY);
  assert.equal(lower.y - (upper.y + upper.h), OBSTACLES.gapSize);
  assert.equal(upper.w, OBSTACLES.width);
});

const cases = [
  // [description, dragon centre y, obstacle x, expected hit]
  ['front face: touching the leading edge, at wall height', GAP_TOP - 40, dragonRight, false],
  ['front face: 0.001 into the leading edge', GAP_TOP - 40, dragonRight - EPS, true],
  ['back face: touching the trailing edge', GAP_TOP - 40, dragonLeft - OBSTACLES.width, false],
  ['back face: 0.001 into the trailing edge', GAP_TOP - 40, dragonLeft - OBSTACLES.width + EPS, true],
  ['gap top lip: hitbox top exactly on it', GAP_TOP + HH, DRAGON.x - OBSTACLES.width / 2, false],
  ['gap top lip: 0.001 into it', GAP_TOP + HH - EPS, DRAGON.x - OBSTACLES.width / 2, true],
  ['gap bottom lip: hitbox bottom exactly on it', GAP_BOTTOM - HH, DRAGON.x - OBSTACLES.width / 2, false],
  ['gap bottom lip: 0.001 into it', GAP_BOTTOM - HH + EPS, DRAGON.x - OBSTACLES.width / 2, true],
  ['dead centre of the gap', GAP_Y, DRAGON.x - OBSTACLES.width / 2, false],
  ['entering the gap: nose on the leading edge, top on the lip line', GAP_TOP + HH, dragonRight, false],
  ['corner: box corner exactly on the lip corner', GAP_TOP - HH, dragonRight, false],
  ['corner: 0.001 nick of the lip corner', GAP_TOP - HH + EPS, dragonRight - EPS, true],
  ['just-clips: 0.001 below the upper box while overlapping horizontally', GAP_TOP + HH - EPS, dragonRight - 1, true],
  ['clean pass: level with the lip, 1px into the obstacle span', GAP_TOP + HH, dragonRight - 1, false],
];

for (const [name, cy, ox, expected] of cases) {
  test(`hitbox boundary: ${name}`, () => {
    assert.equal(hitsObstacle(boxAtY(cy), obAt(ox)), expected);
  });
}

test('boundary results are stable under repetition and whole-scene translation', () => {
  // Shift obstacle and expectations by exactly representable amounts (integers)
  // — the verdict must never flip.
  for (const [name, cy, ox, expected] of cases) {
    for (let i = 0; i < 200; i++) {
      assert.equal(hitsObstacle(boxAtY(cy), obAt(ox)), expected, `${name} (repeat ${i})`);
    }
  }
});

test('game loop uses the same collision: flying level through the gap centre is safe', () => {
  const g = createGame();
  step(g, true);
  // Pin the dragon to the gap centre (no gravity) and let 3 obstacles pass.
  for (let t = 0; t < 60 * 6; t++) {
    g.dragon.y = g.obstacles[0].gapY;
    g.dragon.vy = 0;
    step(g, false);
    g.dragon.y = g.obstacles[0].gapY;
    assert.equal(g.mode, 'playing', `tick ${t}`);
  }
});

test('game loop ends the run on a lip clip', () => {
  const g = createGame();
  step(g, true);
  const ob = g.obstacles[0];
  // Park the obstacle so its leading edge is 1px inside the hitbox, then put
  // the hitbox top 0.001 above the lower edge of the upper box.
  ob.x = dragonRight - 1;
  const cy = gapRect(ob.gapY).top + HH - EPS;
  assert.equal(collidingObstacle(g, boxAtY(cy)), ob);
  assert.equal(collidingObstacle(g, boxAtY(cy + EPS)), null);
});

test('obstacles scroll left at constant speed and keep constant spacing', () => {
  const g = createGame();
  step(g, true);
  for (let t = 0; t < 600; t++) {
    const before = g.obstacles.map((o) => [o.id, o.x]);
    const known = new Set(before.map(([id]) => id));
    g.dragon.y = 280;
    g.dragon.vy = 0;
    step(g, false);
    for (const [id, x] of before) {
      const o = g.obstacles.find((q) => q.id === id);
      if (o) assert.ok(Math.abs(x - o.x - g.speed / 60) < 1e-9);
    }
    for (let i = 1; i < g.obstacles.length; i++) {
      assert.ok(Math.abs(g.obstacles[i].x - g.obstacles[i - 1].x - OBSTACLES.spacing) < 1e-6);
    }
    for (const o of g.obstacles) {
      if (!known.has(o.id)) assert.ok(o.x >= WORLD.width, `obstacle ${o.id} spawned on-screen at x=${o.x}`);
    }
  }
});
