// Score, game over and restart flow.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DRAGON, OBSTACLES, WORLD, PHYSICS, DT, RESTART_LOCK_TICKS, DIFFICULTY } from '../src/config.js';
import { createGame, step, nextSeed } from '../src/game.js';
import { createRng } from '../src/rng.js';
import { nextGapY } from '../src/gaps.js';

const LEFT = DRAGON.x - DRAGON.hitboxW / 2;

// Glide through the gaps with the dragon pinned to the gap it is crossing.
function glide(g, ticks) {
  const events = [];
  for (let t = 0; t < ticks && g.mode === 'playing'; t++) {
    g.dragon.y = g.obstacles.find((o) => o.x + OBSTACLES.width > LEFT - 2).gapY;
    g.dragon.vy = 0;
    events.push(...step(g, false));
  }
  return events;
}

function crash(g) {
  while (g.mode === 'playing') step(g, false); // fall into whatever is below
}

test('title screen: nothing moves until the first input, which is also a flap', () => {
  const g = createGame({ seed: 5 });
  const xs = g.obstacles.map((o) => o.x);
  for (let t = 0; t < 120; t++) assert.deepEqual(step(g, false), []);
  assert.equal(g.mode, 'title');
  assert.deepEqual(g.obstacles.map((o) => o.x), xs);
  const ev = step(g, true);
  assert.deepEqual(ev, ['start', 'flap']);
  assert.equal(g.mode, 'playing');
  assert.equal(g.dragon.vy, PHYSICS.flapVelocity + PHYSICS.gravity * DT);
});

test('score counts each passed obstacle exactly once, when fully behind the hitbox', () => {
  const g = createGame({ seed: 8 });
  step(g, true);
  const events = glide(g, 60 * 20);
  assert.equal(g.mode, 'playing');
  const passed = g.obstacles.filter((o) => o.x + OBSTACLES.width < LEFT).length;
  const gone = g.nextId - g.obstacles.length; // despawned ones were all passed
  assert.equal(g.score, passed + gone);
  assert.equal(events.filter((e) => e === 'score').length, g.score);
  assert.ok(g.score >= 10);
  for (const o of g.obstacles) assert.equal(o.passed, o.x + OBSTACLES.width < LEFT);
});

test('score ticks over on the exact tick the trailing edge clears the hitbox', () => {
  const g = createGame({ seed: 3 });
  step(g, true);
  const first = g.obstacles[0];
  while (first.x + OBSTACLES.width >= LEFT) {
    assert.equal(g.score, 0);
    glide(g, 1);
  }
  assert.equal(g.score, 1);
});

test('a hit ends the run: world freezes, dragon comes to rest on the ground', () => {
  const g = createGame({ seed: 11 });
  step(g, true);
  glide(g, 60 * 4);
  const score = g.score;
  crash(g);
  assert.equal(g.mode, 'over');
  const xs = g.obstacles.map((o) => o.x);
  for (let t = 0; t < 240; t++) step(g, false);
  assert.deepEqual(g.obstacles.map((o) => o.x), xs, 'obstacles frozen');
  assert.equal(g.score, score, 'score frozen');
  assert.equal(g.dragon.y, WORLD.groundY - DRAGON.hitboxH / 2, 'resting on the ground');
  assert.equal(g.dragon.vy, 0);
});

test('restart lockout: taps during the first 0.4 s after a crash are ignored', () => {
  const g = createGame({ seed: 2 });
  step(g, true);
  crash(g);
  for (let t = 1; t < RESTART_LOCK_TICKS; t++) {
    assert.deepEqual(step(g, true), []);
    assert.equal(g.mode, 'over');
  }
  assert.deepEqual(step(g, true), ['start', 'flap']);
  assert.equal(g.mode, 'playing');
});

test('restart resets the run, derives a new seed, and needs no reload', () => {
  const g = createGame({ seed: 77 });
  step(g, true);
  glide(g, 60 * 6);
  crash(g);
  const oldSeed = g.seed;
  const best = g.best;
  for (let t = 0; t < RESTART_LOCK_TICKS; t++) step(g, false);
  step(g, true);
  assert.equal(g.mode, 'playing');
  assert.equal(g.seed, nextSeed(oldSeed));
  assert.equal(g.score, 0);
  assert.equal(g.newBest, false);
  assert.equal(g.best, best, 'best survives the restart');
  assert.equal(g.runTicks, 1);
  assert.equal(g.overTicks, 0);
  assert.ok(g.obstacles.every((o) => !o.passed));
  assert.equal(g.obstacles[0].x, OBSTACLES.firstX - g.speed * DT);
  // The new run's gaps come from the new seed.
  const rng = createRng(g.seed);
  assert.equal(g.obstacles[0].gapY, nextGapY(rng, DRAGON.startY, DIFFICULTY.maxGapDelta.start));
});

test('best score: set on a new record only', () => {
  const g = createGame({ seed: 4, best: 3 });
  step(g, true);
  crash(g); // score 0
  assert.equal(g.best, 3);
  assert.equal(g.newBest, false);
  for (let t = 0; t < RESTART_LOCK_TICKS; t++) step(g, false);
  step(g, true);
  glide(g, 60 * 12);
  assert.ok(g.score > 3);
  crash(g);
  assert.equal(g.best, g.score);
  assert.equal(g.newBest, true);
});

test('nextSeed is deterministic and cycles through distinct seeds', () => {
  const seen = new Set();
  let s = 1;
  for (let i = 0; i < 10_000; i++) {
    seen.add(s);
    s = nextSeed(s);
    assert.ok(Number.isInteger(s) && s >= 0 && s < 2 ** 32);
  }
  assert.equal(seen.size, 10_000);
});
