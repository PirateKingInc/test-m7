// Every configured biome has code-drawn scenery layers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENERY } from '../src/config.js';
import { BIOMES } from '../src/art.js';

test('four biomes, each with code-drawn layers', () => {
  assert.deepEqual(SCENERY.biomes, ['village', 'castle', 'mountains', 'citadel']);
  for (const b of SCENERY.biomes) {
    assert.equal(typeof BIOMES[b].far, 'function', b);
    assert.equal(typeof BIOMES[b].near, 'function', b);
    assert.equal(BIOMES[b].sky.length, 3, b);
    assert.equal(BIOMES[b].ground.length, 3, b);
  }
});
