// Cosmetic-only effects state (particles, shake, flash, score pop).
// Lives on the render side; the simulation never reads it.
export const MAX_PARTICLES = 160;

export function createEffects(random = Math.random) {
  return { particles: [], shake: 0, flash: 0, pop: 0, wing: 1, random };
}

export function spawn(fx, n, x, y, opts) {
  const r = fx.random;
  for (let i = 0; i < n; i++) {
    if (fx.particles.length >= MAX_PARTICLES) fx.particles.shift();
    const a = opts.angle + (r() - 0.5) * opts.spread;
    const s = opts.speed * (0.5 + r() * 0.8);
    fx.particles.push({
      x, y,
      vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: opts.life * (0.6 + r() * 0.6), age: 0,
      size: opts.size * (0.6 + r() * 0.8),
      color: opts.colors[Math.floor(r() * opts.colors.length)],
      gravity: opts.gravity ?? 0,
    });
  }
}

// React to simulation events. (x, y) is the dragon's current position.
export function onEvents(fx, events, x, y) {
  for (const e of events) {
    if (e === 'flap' || e === 'start') {
      fx.wing = 0;
      spawn(fx, 6, x - 14, y + 4, { angle: Math.PI * 0.75, spread: 1.2, speed: 70, life: 0.45, size: 3.2, colors: ['#ffcf5a', '#ff8a2a', '#ff5a1f'], gravity: -40 });
    } else if (e === 'score') {
      fx.pop = 1;
      spawn(fx, 10, x + 10, y, { angle: -Math.PI / 2, spread: Math.PI * 1.6, speed: 110, life: 0.5, size: 2.4, colors: ['#fff3b0', '#ffd66b'], gravity: 120 });
    } else if (e === 'hit') {
      fx.shake = 1;
      fx.flash = 1;
      spawn(fx, 24, x, y, { angle: 0, spread: Math.PI * 2, speed: 180, life: 0.7, size: 3.5, colors: ['#ffcf5a', '#ff6a2a', '#8a8f99', '#5b5f66'], gravity: 400 });
    }
  }
}

export function updateEffects(fx, dt) {
  fx.shake = Math.max(0, fx.shake - dt * 2.5);
  fx.flash = Math.max(0, fx.flash - dt * 3.5);
  fx.pop = Math.max(0, fx.pop - dt * 4);
  fx.wing = Math.min(1, fx.wing + dt * 3.2);
  const ps = fx.particles;
  let w = 0;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    p.age += dt;
    if (p.age >= p.life) continue;
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    ps[w++] = p;
  }
  ps.length = w;
}

export function shakeOffset(fx) {
  const m = fx.shake * fx.shake * 7;
  return [(fx.random() - 0.5) * 2 * m, (fx.random() - 0.5) * 2 * m];
}
