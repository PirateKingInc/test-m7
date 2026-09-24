// All sound is synthesised with the Web Audio API — no audio files.
// The pure game emits event names; this maps them to little synth patches.
// ('start' always arrives together with 'flap', so it has no sound of its own.)
export const SOUND_FOR_EVENT = {
  flap: 'flap',
  score: 'chime',
  hit: 'crash',
  biome: 'fanfare',
  newBest: 'jingle',
};

export function createAudio(AudioCtor) {
  let ctx = null;
  let master = null;
  let noise = null;

  function unlock() {
    if (!AudioCtor) return;
    try {
      if (!ctx) {
        ctx = new AudioCtor();
        master = ctx.createGain();
        master.gain.value = 0.35;
        master.connect(ctx.destination);
        const len = Math.floor(ctx.sampleRate * 0.5);
        noise = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = noise.getChannelData(0);
        let seed = 1;
        for (let i = 0; i < len; i++) {
          seed = (seed * 16807) % 2147483647;
          data[i] = (seed / 2147483647) * 2 - 1;
        }
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch {
      ctx = null;
    }
  }

  function tone(type, f0, f1, t0, dur, vol) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function whoosh(t0, dur, f0, f1, vol, q = 1.2) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t0);
    bp.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.25);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp).connect(g).connect(master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  const patches = {
    flap(t) {
      whoosh(t, 0.16, 500, 1600, 0.9);
    },
    chime(t) {
      tone('triangle', 988, 988, t, 0.12, 0.35);
      tone('triangle', 1319, 1319, t + 0.07, 0.2, 0.3);
    },
    crash(t) {
      whoosh(t, 0.35, 900, 120, 1.2, 0.7);
      tone('sawtooth', 160, 45, t, 0.4, 0.4);
    },
    fanfare(t) {
      [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, t + i * 0.09, 0.14, 0.12));
    },
    jingle(t) {
      // waits for the crash to finish before celebrating
      [784, 988, 1175, 1568].forEach((f, i) => tone('triangle', f, f, t + 0.45 + i * 0.08, 0.18, 0.25));
    },
  };

  function play(name) {
    if (!ctx || !patches[name]) return false;
    try {
      patches[name](ctx.currentTime + 0.005);
      return true;
    } catch {
      return false;
    }
  }

  function onEvents(events) {
    for (const e of events) {
      const name = SOUND_FOR_EVENT[e];
      if (name) play(name);
    }
  }

  return { unlock, play, onEvents, get ready() { return !!ctx; } };
}
