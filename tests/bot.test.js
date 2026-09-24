// Verification (e): a scripted perfect-timing run through the REAL game —
// score-driven difficulty, real generator — survives far past the cap,
// deterministically.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step, currentStage } from '../src/game.js';
import { createBot, botDecide, MIN_FLAP_INTERVAL } from '../src/bot.js';
import { MAX_STAGE } from '../src/difficulty.js';
import { DIFFICULTY } from '../src/config.js';

const TARGET = 250; // > 6× the difficulty cap (40)

function playthrough(seed, target = TARGET) {
  const g = createGame({ seed });
  const bot = createBot();
  const flapTicks = [];
  let hash = 0;
  let reachedCapAt = -1;
  step(g, true);
  flapTicks.push(g.runTicks);
  while (g.mode === 'playing' && g.score < target) {
    const f = botDecide(bot, g);
    step(g, f);
    if (f) flapTicks.push(g.runTicks);
    if (reachedCapAt < 0 && currentStage(g) === MAX_STAGE) reachedCapAt = g.runTicks;
    assert.ok(Number.isFinite(g.dragon.y) && Number.isFinite(g.dragon.vy));
    hash = (Math.imul(hash, 31) + Math.round(g.dragon.y * 1000)) | 0;
  }
  return { g, flapTicks, hash, reachedCapAt };
}

test(`bot playthrough: seed 20260924 reaches ${TARGET} points (cap is ${MAX_STAGE}) without dying`, (t) => {
  const { g, flapTicks, reachedCapAt } = playthrough(20260924);
  assert.equal(g.mode, 'playing', `died at ${g.score}`);
  assert.equal(g.score, TARGET);
  assert.equal(g.speed, DIFFICULTY.scrollSpeed.cap);
  assert.ok(reachedCapAt > 0);
  for (let i = 1; i < flapTicks.length; i++) {
    assert.ok(flapTicks[i] - flapTicks[i - 1] >= MIN_FLAP_INTERVAL, 'tap rate stays human');
  }
  const minutes = g.runTicks / 3600;
  t.diagnostic(
    `score ${g.score} in ${g.runTicks} ticks (${minutes.toFixed(1)} min), cap reached at tick ${reachedCapAt}, ` +
      `${flapTicks.length} flaps (${(flapTicks.length / (g.runTicks / 60)).toFixed(2)}/s)`,
  );
});

test('bot playthrough is reproducible from its seed (identical trajectory)', () => {
  const a = playthrough(20260924, 60);
  const b = playthrough(20260924, 60);
  assert.equal(a.hash, b.hash);
  assert.deepEqual(a.flapTicks, b.flapTicks);
});

test('bot playthrough: 10 more seeds all pass the cap and reach 150', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const { g } = playthrough(seed * 1_000_003, 150);
    assert.equal(g.mode, 'playing', `seed ${seed} died at ${g.score}`);
  }
});
