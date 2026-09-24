// Verification (c): generated gap placements are always on-screen, clear of
// the ground/ceiling margins, and reachable from the previous gap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OBSTACLES, WORLD, DRAGON, DIFFICULTY } from '../src/config.js';
import { createRng } from '../src/rng.js';
import { nextGapY, gapRect, GAP_MIN_Y, GAP_MAX_Y } from '../src/gaps.js';
import { MAX_STAGE, maxGapDeltaFor, scrollSpeedFor } from '../src/difficulty.js';
import { createGame, step } from '../src/game.js';
import { climbReach, dropReach } from './reach.js';

const SEEDS = 40;
const PER_SEED = 2_000; // 80,000 placements

function checkSequence(seed, maxDelta, n) {
  const rng = createRng(seed);
  let prev = DRAGON.startY;
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < n; i++) {
    const y = nextGapY(rng, prev, maxDelta);
    const { top, bottom } = gapRect(y);
    if (!Number.isFinite(y)) assert.fail(`seed ${seed} #${i}: non-finite gap ${y}`);
    if (top < WORLD.ceilingY + OBSTACLES.edgeMargin) assert.fail(`seed ${seed} #${i}: gap top ${top} inside ceiling margin`);
    if (bottom > WORLD.groundY - OBSTACLES.edgeMargin) assert.fail(`seed ${seed} #${i}: gap bottom ${bottom} inside ground margin`);
    if (top < 0 || bottom > WORLD.height) assert.fail(`seed ${seed} #${i}: gap off-screen`);
    if (Math.abs(y - prev) > maxDelta + 1e-9) assert.fail(`seed ${seed} #${i}: shift ${Math.abs(y - prev)} > ${maxDelta}`);
    lo = Math.min(lo, y);
    hi = Math.max(hi, y);
    prev = y;
  }
  return [lo, hi];
}

test(`${SEEDS * PER_SEED} placements: on-screen, clear of margins, shift ≤ maxGapDelta`, () => {
  const maxDelta = DIFFICULTY.maxGapDelta.start;
  let lo = Infinity, hi = -Infinity;
  for (let s = 1; s <= SEEDS; s++) {
    const [a, b] = checkSequence(s, maxDelta, PER_SEED);
    lo = Math.min(lo, a);
    hi = Math.max(hi, b);
  }
  // …and the generator actually uses the whole safe band.
  assert.ok(lo - GAP_MIN_Y < 2, `lowest centre ${lo}`);
  assert.ok(GAP_MAX_Y - hi < 2, `highest centre ${hi}`);
});

test('every difficulty stage: 2,000 placements each, all within bounds and that stage\'s max shift', () => {
  // 41 stages × 2,000 = 82,000 more placements, each checked against the
  // shift limit of the stage it was generated for.
  for (let stage = 0; stage <= MAX_STAGE; stage++) checkSequence(1000 + stage, maxGapDeltaFor(stage), 2_000);
});

test('every difficulty stage: consecutive gaps are reachable with that stage\'s physics', () => {
  for (let stage = 0; stage <= MAX_STAGE; stage++) {
    const d = maxGapDeltaFor(stage);
    // Gaps spawned at this stage may be flown at a later (faster) stage, so
    // check against both this stage's speed and the capped top speed.
    for (const speed of [scrollSpeedFor(stage), scrollSpeedFor(MAX_STAGE)]) {
      assert.ok(climbReach(speed) >= d, `stage ${stage} @${speed}px/s: climb ${climbReach(speed).toFixed(1)} < ${d}`);
      assert.ok(dropReach(speed) >= d, `stage ${stage} @${speed}px/s: drop ${dropReach(speed).toFixed(1)} < ${d}`);
    }
  }
});

test('safe band leaves the configured margin at both ends', () => {
  assert.equal(gapRect(GAP_MIN_Y).top, WORLD.ceilingY + OBSTACLES.edgeMargin);
  assert.equal(gapRect(GAP_MAX_Y).bottom, WORLD.groundY - OBSTACLES.edgeMargin);
});

test('extreme rng outputs (0 and just under 1) stay in bounds', () => {
  for (const r of [0, 1 - 2 ** -32]) {
    for (const prev of [GAP_MIN_Y, GAP_MAX_Y, (GAP_MIN_Y + GAP_MAX_Y) / 2]) {
      const y = nextGapY(() => r, prev, DIFFICULTY.maxGapDelta.cap);
      assert.ok(y >= GAP_MIN_Y && y <= GAP_MAX_Y, `r=${r} prev=${prev} -> ${y}`);
    }
  }
});

test('consecutive gaps are physically reachable at the current scroll speed', () => {
  const speed = DIFFICULTY.scrollSpeed.start;
  const maxDelta = DIFFICULTY.maxGapDelta.start;
  assert.ok(climbReach(speed) >= maxDelta, `climb ${climbReach(speed)} < ${maxDelta}`);
  assert.ok(dropReach(speed) >= maxDelta, `drop ${dropReach(speed)} < ${maxDelta}`);
});

test('same seed -> same sequence; different seeds -> different sequences', () => {
  const seq = (seed) => {
    const rng = createRng(seed);
    const out = [];
    let prev = DRAGON.startY;
    for (let i = 0; i < 50; i++) out.push((prev = nextGapY(rng, prev, 100)));
    return out;
  };
  assert.deepEqual(seq(1234), seq(1234));
  assert.notDeepEqual(seq(1234), seq(1235));
});

test('the game spawns exactly the seeded sequence at constant spacing', () => {
  const g = createGame({ seed: 99, fixedStage: 0 });
  step(g, true);
  const rng = createRng(99);
  let prev = DRAGON.startY;
  const expected = [];
  const seen = new Map();
  for (let t = 0; t < 60 * 30; t++) {
    // Pin the dragon inside the gap it is flying through; this test is about the stream.
    g.dragon.y = g.obstacles.find((o) => o.x + OBSTACLES.width > DRAGON.x - DRAGON.hitboxW / 2 - 2).gapY;
    g.dragon.vy = 0;
    step(g, false);
    assert.equal(g.mode, 'playing');
    for (const o of g.obstacles) seen.set(o.id, o.gapY);
    for (let i = 1; i < g.obstacles.length; i++) {
      assert.ok(Math.abs(g.obstacles[i].x - g.obstacles[i - 1].x - OBSTACLES.spacing) < 1e-6);
    }
  }
  for (let i = 0; i < seen.size; i++) expected.push((prev = nextGapY(rng, prev, DIFFICULTY.maxGapDelta.start)));
  assert.deepEqual([...seen.values()], expected);
  assert.ok(seen.size > 15);
});
