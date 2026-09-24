// Scenery backdrop shifts are a cosmetic milestone with no gameplay effect.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENERY } from '../src/config.js';
import { createGame, step, biomeFor } from '../src/game.js';
import { createBot, botDecide } from '../src/bot.js';

test('biome advances every 10 points and cycles', () => {
  const n = SCENERY.biomes.length;
  for (let score = 0; score < 200; score++) {
    assert.equal(biomeFor(score), Math.floor(score / SCENERY.pointsPerBiome) % n);
  }
  assert.equal(biomeFor(9), 0);
  assert.equal(biomeFor(10), 1);
  assert.equal(biomeFor(39), 3);
  assert.equal(biomeFor(40), 0, 'back to the village');
});

test('a biome event fires exactly when the backdrop changes', () => {
  const g = createGame({ seed: 20260924 });
  const bot = createBot();
  step(g, true);
  const changes = [];
  while (g.mode === 'playing' && g.score < 45) {
    const ev = step(g, botDecide(bot, g));
    if (ev.includes('biome')) changes.push([g.score, g.biome]);
    assert.equal(g.biome, biomeFor(g.score));
  }
  assert.deepEqual(changes, [[10, 1], [20, 2], [30, 3], [40, 0]]);
});

test('no gameplay effect: scrambling the biome every tick leaves the run identical', () => {
  const run = (scramble) => {
    const g = createGame({ seed: 4242 });
    const bot = createBot();
    step(g, true);
    const trace = [];
    for (let t = 0; t < 60 * 90 && g.mode === 'playing'; t++) {
      if (scramble) g.biome = t % SCENERY.biomes.length;
      step(g, botDecide(bot, g));
      trace.push(g.dragon.y, g.score, g.speed, g.obstacles.length);
    }
    return trace;
  };
  assert.deepEqual(run(true), run(false));
});

test('a restart returns to the first biome', () => {
  const g = createGame({ seed: 1 });
  step(g, true);
  g.biome = 3;
  while (g.mode === 'playing') step(g, false);
  for (let t = 0; t < 30; t++) step(g, false);
  step(g, true);
  assert.equal(g.biome, 0);
});
