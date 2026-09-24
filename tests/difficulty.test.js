// Difficulty ramp: slow, smooth, monotonic, capped.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTY, OBSTACLES, DRAGON } from '../src/config.js';
import { MAX_STAGE, stageFor, scrollSpeedFor, maxGapDeltaFor } from '../src/difficulty.js';
import { createGame, step, currentStage } from '../src/game.js';

test('stage = score clamped to [0, cap]', () => {
  assert.equal(MAX_STAGE, DIFFICULTY.rampScore);
  assert.equal(stageFor(0), 0);
  assert.equal(stageFor(17), 17);
  assert.equal(stageFor(MAX_STAGE), MAX_STAGE);
  assert.equal(stageFor(MAX_STAGE + 1), MAX_STAGE);
  assert.equal(stageFor(1e9), MAX_STAGE);
  assert.equal(stageFor(-5), 0);
});

test('exact values at the start, midpoint and cap', () => {
  assert.equal(scrollSpeedFor(0), 140);
  assert.equal(scrollSpeedFor(20), 170);
  assert.equal(scrollSpeedFor(40), 200);
  assert.equal(maxGapDeltaFor(0), 90);
  assert.equal(maxGapDeltaFor(20), 120);
  assert.equal(maxGapDeltaFor(40), 150);
});

test('ramp is monotonic, gentle (small per-point steps) and flat past the cap', () => {
  for (let s = 1; s <= MAX_STAGE + 100; s++) {
    const dv = scrollSpeedFor(s) - scrollSpeedFor(s - 1);
    const dd = maxGapDeltaFor(s) - maxGapDeltaFor(s - 1);
    assert.ok(dv >= 0 && dv <= 2, `speed step ${dv} at ${s}`);
    assert.ok(dd >= 0 && dd <= 2, `delta step ${dd} at ${s}`);
    if (s > MAX_STAGE) {
      assert.equal(dv, 0);
      assert.equal(dd, 0);
    }
  }
});

test('cap is sane: time between obstacles never drops below 1 s', () => {
  const seconds = OBSTACLES.spacing / scrollSpeedFor(MAX_STAGE);
  assert.ok(seconds >= 1, `${seconds}s`);
});

test('gap height never changes with difficulty', () => {
  for (const stage of [0, 10, 40]) {
    const g = createGame({ seed: 1, fixedStage: stage });
    step(g, true);
    assert.equal(OBSTACLES.gapSize, 150);
  }
});

test('in a real run, speed follows the score and stops at the cap', () => {
  const g = createGame({ seed: 21 });
  step(g, true);
  const LEFT = DRAGON.x - DRAGON.hitboxW / 2;
  let lastSpeed = g.speed;
  while (g.score < MAX_STAGE + 5) {
    g.dragon.y = g.obstacles.find((o) => o.x + OBSTACLES.width > LEFT - 2).gapY;
    g.dragon.vy = 0;
    const scoreBefore = g.score; // speed is set at the top of the tick, before scoring
    step(g, false);
    assert.equal(g.mode, 'playing');
    assert.equal(currentStage(g), stageFor(g.score));
    assert.equal(g.speed, scrollSpeedFor(scoreBefore));
    assert.ok(g.speed >= lastSpeed);
    lastSpeed = g.speed;
  }
  assert.equal(g.speed, DIFFICULTY.scrollSpeed.cap);
});

test('pinned stage hook: difficulty ignores score', () => {
  const g = createGame({ seed: 3, fixedStage: 40 });
  step(g, true);
  assert.equal(g.speed, 200);
  assert.equal(currentStage(g), 40);
});
