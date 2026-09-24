// Browser entry point: wires input and the fixed-timestep loop around the
// pure game logic.
import { DT } from './config.js';
import { createGame, step } from './game.js';
import { createRenderer } from './render.js';
import { loadBest, saveBest } from './storage.js';

// Even touching window.localStorage can throw (e.g. blocked cookies).
function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
const storage = getStorage();

// ?seed=N replays a specific gap sequence; otherwise every visit is fresh.
const seedParam = Number.parseInt(new URLSearchParams(location.search).get('seed') ?? '', 10);
const seed = Number.isFinite(seedParam) ? seedParam : (Math.random() * 2 ** 32) >>> 0;

const canvas = document.getElementById('game');
const state = createGame({ seed, best: loadBest(storage) });
const renderer = createRenderer(canvas);
window.kindlewing = { state }; // handy for debugging and browser smoke tests

// ---- the single input: tap / click / Space --------------------------------
let flapQueued = false;
function press() {
  flapQueued = true;
}
window.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  e.preventDefault();
  press();
}, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' && e.key !== ' ') return;
  e.preventDefault();
  if (!e.repeat) press();
});
// No scrolling, zooming or long-press menus during play.
for (const type of ['touchstart', 'touchmove', 'gesturestart', 'dblclick', 'contextmenu']) {
  window.addEventListener(type, (e) => e.preventDefault(), { passive: false });
}

window.addEventListener('resize', () => renderer.resize());

// ---- fixed-timestep loop --------------------------------------------------
let last = performance.now();
let acc = 0;
document.addEventListener('visibilitychange', () => {
  last = performance.now();
  acc = 0;
});

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25; // don't spiral after a stall
  acc += dt;
  let flapped = false;
  while (acc >= DT) {
    const events = step(state, flapQueued);
    flapQueued = false;
    acc -= DT;
    if (events.includes('flap')) flapped = true;
    if (events.includes('hit') && state.newBest) saveBest(storage, state.best);
  }
  renderer.draw(state, acc / DT, dt, flapped);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
