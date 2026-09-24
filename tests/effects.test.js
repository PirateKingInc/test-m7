// Juice is cosmetic, bounded, and always settles back to rest.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEffects, onEvents, updateEffects, shakeOffset, MAX_PARTICLES } from '../src/effects.js';
import { createRng } from '../src/rng.js';
import { createGame, step } from '../src/game.js';
import { createBot, botDecide } from '../src/bot.js';

const DT = 1 / 60;

test('particle pool is capped no matter how hard the events spam', () => {
  const fx = createEffects(createRng(1));
  for (let i = 0; i < 1000; i++) {
    onEvents(fx, ['flap', 'score', 'hit'], 100, 300);
    assert.ok(fx.particles.length <= MAX_PARTICLES);
  }
  assert.equal(fx.particles.length, MAX_PARTICLES);
});

test('particles expire and the pool drains to empty', () => {
  const fx = createEffects(createRng(2));
  onEvents(fx, ['hit', 'score', 'flap'], 100, 300);
  assert.ok(fx.particles.length > 0);
  for (let t = 0; t < 120; t++) updateEffects(fx, DT);
  assert.equal(fx.particles.length, 0);
});

test('shake, flash and score-pop decay to exactly zero within a second', () => {
  const fx = createEffects(createRng(3));
  onEvents(fx, ['hit', 'score'], 100, 300);
  assert.equal(fx.shake, 1);
  assert.equal(fx.flash, 1);
  assert.equal(fx.pop, 1);
  for (let t = 0; t < 60; t++) updateEffects(fx, DT);
  assert.equal(fx.shake, 0);
  assert.equal(fx.flash, 0);
  assert.equal(fx.pop, 0);
  assert.deepEqual(shakeOffset(fx).map(Math.abs), [0, 0]);
});

test('shake offset is bounded by its amplitude', () => {
  const fx = createEffects(createRng(4));
  onEvents(fx, ['hit'], 0, 0);
  for (let i = 0; i < 1000; i++) {
    const [x, y] = shakeOffset(fx);
    assert.ok(Math.abs(x) <= 7 && Math.abs(y) <= 7);
  }
});

test('a flap snaps the wing to the downstroke, then it glides back', () => {
  const fx = createEffects(createRng(5));
  assert.equal(fx.wing, 1);
  onEvents(fx, ['flap'], 0, 0);
  assert.equal(fx.wing, 0);
  for (let t = 0; t < 30; t++) updateEffects(fx, DT);
  assert.equal(fx.wing, 1);
});

test('effects never touch the simulation: a run is identical with or without them', () => {
  const run = (withFx) => {
    const g = createGame({ seed: 555 });
    const bot = createBot();
    const fx = createEffects(createRng(6));
    const ys = [];
    step(g, true);
    for (let t = 0; t < 60 * 60 && g.mode === 'playing'; t++) {
      const ev = step(g, botDecide(bot, g));
      if (withFx) {
        onEvents(fx, ev, 100, g.dragon.y);
        updateEffects(fx, DT);
      }
      ys.push(g.dragon.y, g.score);
    }
    return ys;
  };
  assert.deepEqual(run(true), run(false));
});
