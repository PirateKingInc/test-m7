// High-score persistence: survives reloads, never throws, never trusts garbage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadBest, saveBest, BEST_KEY } from '../src/storage.js';
import { createGame, step } from '../src/game.js';

function memoryStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    dump: () => Object.fromEntries(m),
  };
}

const throwing = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('QuotaExceededError'); },
};

test('round-trips a best score (a "reload" is a fresh load from the same storage)', () => {
  const s = memoryStorage();
  assert.equal(loadBest(s), 0);
  assert.equal(saveBest(s, 42), true);
  assert.equal(s.dump()[BEST_KEY], '42');
  assert.equal(loadBest(s), 42);
});

test('garbage in storage reads as 0', () => {
  for (const v of ['', 'abc', '12abc', '-5', '3.7', 'NaN', 'Infinity', '1e99', '{}', ' ', '99999999999']) {
    assert.equal(loadBest(memoryStorage({ [BEST_KEY]: v })), 0, JSON.stringify(v));
  }
  assert.equal(loadBest(memoryStorage({ [BEST_KEY]: ' 17 ' })), 17);
});

test('missing or blocked storage never throws', () => {
  assert.equal(loadBest(null), 0);
  assert.equal(loadBest(undefined), 0);
  assert.equal(loadBest(throwing), 0);
  assert.equal(saveBest(null, 5), false);
  assert.equal(saveBest(throwing, 5), false);
});

test('saved values are clamped to sane integers', () => {
  const s = memoryStorage();
  saveBest(s, -3);
  assert.equal(loadBest(s), 0);
  saveBest(s, 7.9);
  assert.equal(loadBest(s), 7);
  saveBest(s, NaN);
  assert.equal(loadBest(s), 0);
  saveBest(s, 1e12);
  assert.equal(loadBest(s), 1e9);
});

test('the game starts from the stored best and reports a new record', () => {
  const s = memoryStorage({ [BEST_KEY]: '2' });
  const g = createGame({ seed: 8, best: loadBest(s) });
  assert.equal(g.best, 2);
  assert.equal(g.mode, 'title');
  step(g, true);
  while (g.mode === 'playing' && g.score < 3) {
    g.dragon.y = g.obstacles.find((o) => o.x + 64 > 81).gapY;
    g.dragon.vy = 0;
    step(g, false);
  }
  while (g.mode === 'playing') step(g, false);
  assert.equal(g.newBest, true);
  saveBest(s, g.best);
  assert.equal(loadBest(s), 3);
});
