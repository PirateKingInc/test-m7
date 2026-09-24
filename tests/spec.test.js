// Sanity checks tying src/config.js to the numbers promised in SPEC.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS, DRAGON, OBSTACLES, WORLD, DIFFICULTY, TICK_RATE } from '../src/config.js';

test('fixed timestep is 60 Hz', () => {
  assert.equal(TICK_RATE, 60);
});

test('gap size follows the SPEC formula roundUpTo10(hitboxH + 2 * flapRise)', () => {
  const flapRise = PHYSICS.flapVelocity ** 2 / (2 * PHYSICS.gravity);
  const expected = Math.ceil((DRAGON.hitboxH + 2 * flapRise) / 10) * 10;
  assert.equal(OBSTACLES.gapSize, expected);
  assert.ok(OBSTACLES.gapSize > DRAGON.hitboxH * 4, 'gap is comfortably larger than the hitbox');
});

test('gap plus margins fits inside the playfield', () => {
  const playH = WORLD.groundY - WORLD.ceilingY;
  assert.ok(OBSTACLES.gapSize + 2 * OBSTACLES.edgeMargin < playH);
});

test('at least 3 obstacle visual variants', () => {
  assert.ok(OBSTACLES.variants.length >= 3);
  assert.equal(new Set(OBSTACLES.variants).size, OBSTACLES.variants.length);
});

test('difficulty ramps up toward a cap', () => {
  assert.ok(DIFFICULTY.rampScore > 0);
  assert.ok(DIFFICULTY.scrollSpeed.cap > DIFFICULTY.scrollSpeed.start);
  assert.ok(DIFFICULTY.maxGapDelta.cap >= DIFFICULTY.maxGapDelta.start);
});

test('obstacles spawn off-screen and are spaced wider than they are thick', () => {
  assert.ok(OBSTACLES.firstX >= WORLD.width);
  assert.ok(OBSTACLES.spacing > OBSTACLES.width + DRAGON.hitboxW);
});
