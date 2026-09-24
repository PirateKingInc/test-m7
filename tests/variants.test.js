// Obstacle visual variants are cosmetic reskins of one identical mechanic.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OBSTACLES, DRAGON } from '../src/config.js';
import { obstacleBoxes, hitsObstacle } from '../src/gaps.js';
import { createGame, step } from '../src/game.js';
import { createRng } from '../src/rng.js';
import { PAINTERS } from '../src/art.js';

const LEFT = DRAGON.x - DRAGON.hitboxW / 2;

function variantsOf(seed, n) {
  const g = createGame({ seed, fixedStage: 0 });
  step(g, true);
  const seen = new Map();
  while (seen.size < n) {
    g.dragon.y = g.obstacles.find((o) => o.x + OBSTACLES.width > LEFT - 2).gapY;
    g.dragon.vy = 0;
    step(g, false);
    for (const o of g.obstacles) seen.set(o.id, o);
  }
  return [...seen.values()].slice(0, n);
}

test('at least 3 variants, each with its own code-drawn art', () => {
  assert.ok(OBSTACLES.variants.length >= 3);
  for (const v of OBSTACLES.variants) assert.equal(typeof PAINTERS[v], 'function', `no art for ${v}`);
});

test('every variant has the identical hitbox', () => {
  const rng = createRng(9);
  for (let i = 0; i < 2000; i++) {
    const base = { x: rng() * 400 - 20, gapY: 115 + rng() * 330 };
    const box = { x: rng() * 360, y: rng() * 560, w: DRAGON.hitboxW, h: DRAGON.hitboxH };
    const ref = obstacleBoxes({ ...base, variant: OBSTACLES.variants[0] });
    const hit = hitsObstacle(box, { ...base, variant: OBSTACLES.variants[0] });
    for (const v of OBSTACLES.variants) {
      assert.deepEqual(obstacleBoxes({ ...base, variant: v }), ref);
      assert.equal(hitsObstacle(box, { ...base, variant: v }), hit);
    }
  }
});

test('all variants appear, never twice in a row, roughly evenly', () => {
  const obs = variantsOf(31, 1200);
  const counts = Object.fromEntries(OBSTACLES.variants.map((v) => [v, 0]));
  for (let i = 0; i < obs.length; i++) {
    counts[obs[i].variant]++;
    if (i > 0) assert.notEqual(obs[i].variant, obs[i - 1].variant, `repeat at #${i}`);
  }
  const even = obs.length / OBSTACLES.variants.length;
  for (const [v, c] of Object.entries(counts)) assert.ok(c > even * 0.8 && c < even * 1.2, `${v}: ${c}`);
});

test('skins never perturb the gap sequence', () => {
  // The gaps must equal the plain seeded generator, variant draws or not.
  const obs = variantsOf(77, 300);
  const g = createGame({ seed: 77, fixedStage: 0 });
  const rng = createRng(77);
  let prev = DRAGON.startY;
  for (const o of obs) {
    prev = g.gapSource(rng, prev, 90);
    assert.equal(o.gapY, prev);
  }
});

test('variant choice is reproducible from the seed', () => {
  assert.deepEqual(variantsOf(5, 100).map((o) => o.variant), variantsOf(5, 100).map((o) => o.variant));
});
