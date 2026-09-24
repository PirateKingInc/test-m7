// Verification (b): the game is beatable by construction at EVERY difficulty
// stage. For each stage 0..40, with difficulty pinned to that stage, the
// perfect-timing bot (one input, ≤ 6.7 taps/s) must survive long random gap
// sequences and adversarial worst-case sequences without a single death.
//
// Sequence length scales with FAIRNESS_LENGTH (default 1000 obstacles per
// random run): run `FAIRNESS_LENGTH=100000 npm test` for an arbitrarily
// long local proof.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, step } from '../src/game.js';
import { createBot, botDecide, MIN_FLAP_INTERVAL } from '../src/bot.js';
import { nextGapY, GAP_MIN_Y, GAP_MAX_Y } from '../src/gaps.js';
import { MAX_STAGE } from '../src/difficulty.js';

const LENGTH = Number(process.env.FAIRNESS_LENGTH) || 1000;
const clamp = (v) => Math.max(GAP_MIN_Y, Math.min(GAP_MAX_Y, v));

// Adversarial gap sources: every one of them obeys the same invariants as
// the real generator (inside the safe band, shift ≤ maxDelta) but always
// picks the extreme instead of a random point.
const ADVERSARIES = {
  // max-shift zig-zag: up by the full limit, down by the full limit, …
  zigzag: () => {
    let up = true;
    return (rng, prev, d) => clamp(prev + ((up = !up) ? -d : d));
  },
  // full-range sweep: max-size steps to one edge of the band, then back
  sweep: () => {
    let dir = -1;
    return (rng, prev, d) => {
      if (prev + dir * d < GAP_MIN_Y || prev + dir * d > GAP_MAX_Y) dir = -dir;
      return clamp(prev + dir * d);
    };
  },
  // pinned against the ceiling margin, with max-shift excursions
  hugCeiling: () => (rng, prev, d) => (rng() < 0.5 ? GAP_MIN_Y : clamp(GAP_MIN_Y + d)),
  // pinned against the ground margin, with max-shift excursions
  hugGround: () => (rng, prev, d) => (rng() < 0.5 ? GAP_MAX_Y : clamp(GAP_MAX_Y - d)),
  // every shift is maximal, direction random
  randomExtreme: () => (rng, prev, d) => clamp(prev + (rng() < 0.5 ? -d : d)),
  // long climbs: slow drift down, then repeated max climbs to the top
  climbStairs: () => {
    let climbing = true;
    return (rng, prev, d) => {
      const y = clamp(climbing ? prev - d : prev + d / 4);
      if (y === GAP_MIN_Y || y === GAP_MAX_Y) climbing = !climbing;
      return y;
    };
  },
};

function checked(source) {
  return (rng, prev, d) => {
    const y = source(rng, prev, d);
    assert.ok(y >= GAP_MIN_Y && y <= GAP_MAX_Y, `adversary left the safe band: ${y}`);
    assert.ok(Math.abs(y - prev) <= d + 1e-9, `adversary shift ${Math.abs(y - prev)} > ${d}`);
    return y;
  };
}

// Fly `obstacles` gaps at a pinned stage. Returns the run summary.
function fly({ seed, stage, obstacles, gapSource }) {
  const g = createGame({ seed, fixedStage: stage, gapSource });
  const bot = createBot();
  step(g, true);
  let flaps = 1, lastFlap = g.runTicks, minInterval = Infinity; // the start tap is a flap
  while (g.mode === 'playing' && g.score < obstacles) {
    const f = botDecide(bot, g);
    step(g, f);
    if (f) {
      flaps++;
      minInterval = Math.min(minInterval, g.runTicks - lastFlap);
      lastFlap = g.runTicks;
    }
  }
  return { alive: g.mode === 'playing', score: g.score, ticks: g.runTicks, flaps, minInterval };
}

test(`random gaps: every stage 0..${MAX_STAGE}, 5 seeds × ${LENGTH} obstacles, zero deaths`, (t) => {
  let total = 0;
  for (let stage = 0; stage <= MAX_STAGE; stage++) {
    for (let seed = 1; seed <= 5; seed++) {
      const r = fly({ seed: seed * 7919 + stage, stage, obstacles: LENGTH });
      assert.ok(r.alive, `stage ${stage} seed ${seed}: died after ${r.score} obstacles`);
      assert.ok(r.minInterval >= MIN_FLAP_INTERVAL, `bot tapped too fast: ${r.minInterval}`);
      total += r.score;
    }
  }
  t.diagnostic(`${total} random obstacles passed across ${MAX_STAGE + 1} stages, 0 deaths`);
});

for (const [name, make] of Object.entries(ADVERSARIES)) {
  test(`adversarial "${name}": every stage 0..${MAX_STAGE}, zero deaths`, (t) => {
    let total = 0;
    for (let stage = 0; stage <= MAX_STAGE; stage++) {
      for (let seed = 1; seed <= 2; seed++) {
        const r = fly({ seed, stage, obstacles: Math.ceil(LENGTH / 2), gapSource: checked(make()) });
        assert.ok(r.alive, `${name} stage ${stage} seed ${seed}: died after ${r.score} obstacles`);
        total += r.score;
      }
    }
    t.diagnostic(`${total} ${name} obstacles passed, 0 deaths`);
  });
}

test(`endurance at the cap: ${LENGTH * 20} consecutive obstacles at stage ${MAX_STAGE}`, (t) => {
  const r = fly({ seed: 424242, stage: MAX_STAGE, obstacles: LENGTH * 20 });
  assert.ok(r.alive, `died after ${r.score}`);
  t.diagnostic(`${r.score} obstacles in ${r.ticks} ticks (${(r.ticks / 3600).toFixed(1)} min of play), ${r.flaps} flaps`);
});

test('the proof is not vacuous: the same sequences kill a bot that never flaps, or taps blindly', () => {
  for (const stage of [0, MAX_STAGE]) {
    const g = createGame({ seed: 1, fixedStage: stage });
    step(g, true);
    while (g.mode === 'playing') step(g, false);
    assert.ok(g.score < 2);
    const h = createGame({ seed: 1, fixedStage: stage });
    step(h, true);
    for (let t = 0; h.mode === 'playing' && t < 60 * 60; t++) step(h, t % 20 === 0);
    assert.equal(h.mode, 'over', 'a fixed-rhythm tapper should not survive a minute');
  }
});

test('real generator output is what the proof flies (sanity: default gapSource)', () => {
  const g = createGame({ seed: 1, fixedStage: 0 });
  assert.equal(g.gapSource, nextGapY);
});
