// Verification (a): fixed-timestep flap physics is deterministic, finite and
// respects terminal velocity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PHYSICS, DT, DRAGON, WORLD } from '../src/config.js';
import { stepDragon, dragonBox, outOfBounds } from '../src/physics.js';
import { createGame, step } from '../src/game.js';

const SCHEDULE = new Set([0, 18, 30, 41, 75, 90, 91, 92, 140, 200, 230, 260, 290]);

function trajectory(ticks = 360) {
  const d = { y: 280, vy: 0 };
  const out = [];
  for (let t = 0; t < ticks; t++) {
    stepDragon(d, SCHEDULE.has(t));
    out.push([d.y, d.vy]);
  }
  return out;
}

// Tiny deterministic LCG so the "random" flap patterns are reproducible.
function lcg(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

test('a fixed flap schedule reproduces a bit-identical trajectory', () => {
  const a = trajectory();
  const b = trajectory();
  assert.deepEqual(a, b);
  // Golden values: any change to the integrator or constants must be deliberate.
  assert.equal(a[0][1], PHYSICS.flapVelocity + PHYSICS.gravity * DT);
  assert.equal(a[59][0].toFixed(6), GOLDEN_Y59);
  assert.equal(a[359][0].toFixed(6), GOLDEN_Y359);
});

test('trajectory through the game loop matches the raw integrator', () => {
  const g = createGame();
  const raw = { y: DRAGON.startY, vy: 0 };
  step(g, true); // title -> playing, first flap
  stepDragon(raw, true);
  for (let t = 1; t < 40; t++) {
    const f = SCHEDULE.has(t);
    step(g, f);
    stepDragon(raw, f);
    assert.equal(g.dragon.y, raw.y);
    assert.equal(g.dragon.vy, raw.vy);
  }
});

test('a flap sets velocity to exactly the impulse, regardless of prior velocity', () => {
  for (const vy0 of [-430, -100, 0, 250, 600]) {
    const d = { y: 300, vy: vy0 };
    stepDragon(d, true);
    assert.equal(d.vy, PHYSICS.flapVelocity + PHYSICS.gravity * DT);
  }
});

test('flap apex height matches v²/2g within one tick of travel', () => {
  const d = { y: 300, vy: 0 };
  stepDragon(d, true);
  let minY = d.y;
  for (let t = 0; t < 60; t++) {
    stepDragon(d, false);
    minY = Math.min(minY, d.y);
  }
  const rise = 300 - minY;
  const ideal = PHYSICS.flapVelocity ** 2 / (2 * PHYSICS.gravity);
  assert.ok(Math.abs(rise - ideal) < Math.abs(PHYSICS.flapVelocity) * DT, `rise ${rise} vs ideal ${ideal}`);
});

test('terminal velocity is reached and never exceeded', () => {
  const d = { y: 0, vy: 0 };
  let reached = -1;
  for (let t = 0; t < 10_000; t++) {
    stepDragon(d, false);
    assert.ok(d.vy <= PHYSICS.terminalVelocity);
    if (reached < 0 && d.vy === PHYSICS.terminalVelocity) reached = t;
  }
  assert.ok(reached > 0 && reached < 30, `reached terminal at tick ${reached}`);
  assert.equal(d.vy, PHYSICS.terminalVelocity);
});

test('no NaN / Infinity under extreme input patterns', () => {
  const patterns = {
    never: () => false,
    always: () => true,
    alternate: (t) => t % 2 === 0,
    random: ((r) => () => r() < 0.3)(lcg(42)),
    bursts: (t) => t % 97 < 12,
  };
  for (const [name, flapAt] of Object.entries(patterns)) {
    const d = { y: 280, vy: 0 };
    for (let t = 0; t < 100_000; t++) {
      stepDragon(d, flapAt(t));
      if (!Number.isFinite(d.y) || !Number.isFinite(d.vy)) assert.fail(`${name}: non-finite at tick ${t}`);
      assert.ok(d.vy >= PHYSICS.flapVelocity && d.vy <= PHYSICS.terminalVelocity, `${name}: vy ${d.vy}`);
    }
  }
});

test('ceiling and ground: touching is safe, any penetration ends the run', () => {
  const at = (y) => outOfBounds(dragonBox({ y }));
  const h = DRAGON.hitboxH / 2;
  assert.equal(at(WORLD.ceilingY + h), false, 'top exactly on ceiling');
  assert.equal(at(WORLD.ceilingY + h - 0.001), true, 'top 0.001 above ceiling');
  assert.equal(at(WORLD.groundY - h), false, 'bottom exactly on ground');
  assert.equal(at(WORLD.groundY - h + 0.001), true, 'bottom 0.001 into ground');
});

test('never flapping hits the ground on a fixed, reproducible tick', () => {
  const run = () => {
    const g = createGame();
    step(g, true);
    let t = 0;
    while (g.mode === 'playing') {
      step(g, false);
      t++;
    }
    return [t, g.dragon.y];
  };
  const [t1, y1] = run();
  assert.deepEqual(run(), [t1, y1]);
  assert.ok(y1 + DRAGON.hitboxH / 2 > WORLD.groundY);
});

test('flapping every tick hits the ceiling', () => {
  const g = createGame();
  let events = [];
  for (let t = 0; t < 600 && g.mode !== 'over'; t++) events = step(g, true);
  assert.equal(g.mode, 'over');
  assert.ok(events.includes('hit'));
});

const GOLDEN_Y59 = '60.416667';
const GOLDEN_Y359 = '731.666667';
