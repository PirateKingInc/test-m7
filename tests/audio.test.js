// Web Audio synthesis: event mapping, gesture unlock, graceful no-op.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAudio, SOUND_FOR_EVENT } from '../src/audio.js';

// Minimal fake of the Web Audio graph that records what gets built.
function fakeAudioContext() {
  const log = { oscillators: 0, sources: 0, resumed: 0, constructed: 0 };
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = (extra = {}) => ({ connect: (n) => n, ...extra });
  class Ctx {
    constructor() {
      log.constructed++;
      this.state = 'suspended';
      this.sampleRate = 8000;
      this.currentTime = 0;
      this.destination = node();
    }
    resume() { log.resumed++; this.state = 'running'; }
    createGain() { return node({ gain: param() }); }
    createBiquadFilter() { return node({ type: '', Q: param(), frequency: param() }); }
    createOscillator() { log.oscillators++; return node({ type: '', frequency: param(), start() {}, stop() {} }); }
    createBufferSource() { log.sources++; return node({ buffer: null, start() {}, stop() {} }); }
    createBuffer(ch, len) { const d = new Float32Array(len); return { getChannelData: () => d }; }
  }
  return { Ctx, log };
}

test('every sound-worthy game event maps to a synth patch', () => {
  for (const e of ['flap', 'score', 'hit', 'biome', 'newBest']) assert.ok(SOUND_FOR_EVENT[e], e);
  assert.equal(SOUND_FOR_EVENT.start, undefined, "'start' arrives with 'flap'; no double whoosh");
});

test('silent no-op when Web Audio is unavailable', () => {
  const a = createAudio(undefined);
  a.unlock();
  assert.equal(a.ready, false);
  assert.equal(a.play('flap'), false);
  a.onEvents(['flap', 'hit']); // must not throw
});

test('silent no-op when the AudioContext constructor throws', () => {
  const a = createAudio(class { constructor() { throw new Error('NotAllowedError'); } });
  a.unlock();
  assert.equal(a.ready, false);
  a.onEvents(['score']);
});

test('nothing plays before the first user gesture unlocks audio', () => {
  const { Ctx, log } = fakeAudioContext();
  const a = createAudio(Ctx);
  a.onEvents(['flap', 'score']);
  assert.equal(log.constructed, 0);
  assert.equal(log.oscillators + log.sources, 0);
});

test('unlock creates one context, resumes it, and every patch builds a graph', () => {
  const { Ctx, log } = fakeAudioContext();
  const a = createAudio(Ctx);
  a.unlock();
  a.unlock();
  assert.equal(log.constructed, 1);
  assert.equal(log.resumed, 1);
  for (const name of new Set(Object.values(SOUND_FOR_EVENT))) {
    const before = log.oscillators + log.sources;
    assert.equal(a.play(name), true, name);
    assert.ok(log.oscillators + log.sources > before, `${name} made no sound nodes`);
  }
});

test('game events drive sounds; unknown events are ignored', () => {
  const { Ctx, log } = fakeAudioContext();
  const a = createAudio(Ctx);
  a.unlock();
  a.onEvents(['start', 'teleport']);
  assert.equal(log.oscillators + log.sources, 0);
  a.onEvents(['flap']);
  assert.equal(log.sources, 1, 'flap is a filtered-noise whoosh');
  a.onEvents(['score']);
  assert.equal(log.oscillators, 2, 'score is a two-note chime');
});
