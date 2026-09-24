// All art is drawn in code. Anything static is pre-rendered once into an
// offscreen canvas at device resolution, so a frame is a few drawImage calls.
import { WORLD, OBSTACLES } from './config.js';
import { createRng } from './rng.js';

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

// ---------------------------------------------------------------- dragon
// Ashby, drawn facing right around the hitbox centre (0, 0).
// `wing` 0 = full downstroke just after a flap, 1 = glide pose.
export function drawDragon(ctx, wing) {
  const body = '#e2652a', dark = '#a8421a', belly = '#f8c870', membrane = '#8f2f16';
  // tail
  ctx.fillStyle = dark;
  ctx.beginPath();
  ctx.moveTo(-12, -2);
  ctx.quadraticCurveTo(-26, 2, -30, 10);
  ctx.quadraticCurveTo(-24, 6, -11, 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.moveTo(-30, 10);
  ctx.lineTo(-37, 5);
  ctx.lineTo(-34, 14);
  ctx.closePath();
  ctx.fill();
  // far wing (behind body)
  drawWing(ctx, wing, membrane, dark, 0.75);
  // body
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(-1, 1, 16, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(1, 5, 11, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // back spikes
  ctx.fillStyle = '#ffb347';
  for (let i = 0; i < 3; i++) {
    const x = -10 + i * 6;
    ctx.beginPath();
    ctx.moveTo(x, -9 + i * 0.5);
    ctx.lineTo(x + 3, -15 + i);
    ctx.lineTo(x + 5, -9 + i);
    ctx.closePath();
    ctx.fill();
  }
  // legs
  ctx.fillStyle = dark;
  ctx.fillRect(-6, 9, 4, 5);
  ctx.fillRect(4, 9, 4, 5);
  // head
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(13, -6, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(21, -3, 7, 5, 0.15, 0, Math.PI * 2);
  ctx.fill();
  // horn
  ctx.fillStyle = '#fff1cf';
  ctx.beginPath();
  ctx.moveTo(8, -12);
  ctx.quadraticCurveTo(3, -21, -1, -19);
  ctx.quadraticCurveTo(4, -16, 11, -13);
  ctx.closePath();
  ctx.fill();
  // eye
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(15, -8, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#231109';
  ctx.beginPath();
  ctx.arc(16.3, -8, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(16.6, -9.6, 1, 1);
  // nostril + smile
  ctx.fillStyle = dark;
  ctx.fillRect(25, -5, 1.6, 1.6);
  ctx.strokeStyle = dark;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.quadraticCurveTo(22, 2, 26, -1);
  ctx.stroke();
  // near wing
  drawWing(ctx, wing, membrane, '#ffb347', 1);
}

function drawWing(ctx, wing, fill, edge, scale) {
  // Wing tip swings from below the body (downstroke) up to a high glide.
  const tipX = -10 * scale;
  const tipY = -6 + (14 - 36 * wing) * scale;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(4, -6);
  ctx.lineTo(tipX, tipY);
  ctx.quadraticCurveTo(-6 * scale, (tipY - 6) * 0.5, -12, -2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(4, -6);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
}

// -------------------------------------------------------------- obstacles
// Each variant renders a TOP piece (gap edge at its bottom) and a BOTTOM
// piece (gap edge at its top), each OBSTACLES.width × groundY world px.
// Art stays inside the rectangle: what you see is what you hit.
const W = OBSTACLES.width;
const H = WORLD.groundY;

function masonry(ctx, x, y, w, h, base, mortar, rowH, rng, jitter = 0) {
  ctx.fillStyle = base;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = mortar;
  ctx.lineWidth = 1.2;
  let row = 0;
  for (let yy = y; yy < y + h; yy += rowH, row++) {
    ctx.beginPath();
    ctx.moveTo(x, yy);
    ctx.lineTo(x + w, yy);
    ctx.stroke();
    let xx = x + (row % 2 ? -rowH * 0.7 : 0);
    while (xx < x + w) {
      const bw = rowH * 1.4 + (jitter ? rng() * jitter : 0);
      xx += bw;
      if (xx > x && xx < x + w) {
        ctx.beginPath();
        ctx.moveTo(xx, yy);
        ctx.lineTo(xx, Math.min(yy + rowH, y + h));
        ctx.stroke();
      }
    }
  }
}

function shade(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, 'rgba(255,255,255,0.18)');
  g.addColorStop(0.35, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

export const PAINTERS = {
  tower(ctx, top, rng) {
    masonry(ctx, 0, 0, W, H, '#8d929c', '#5e626b', 14, rng);
    // arrow slits
    ctx.fillStyle = '#2b2d33';
    for (let y = top ? H - 70 : 50; top ? y > 0 : y < H; y += top ? -90 : 90) ctx.fillRect(W / 2 - 3, y, 6, 20);
    // battlements at the gap edge: 5 merlons, shallow 6px crenels
    const edge = top ? H : 0;
    ctx.fillStyle = '#9da2ab';
    ctx.fillRect(0, top ? H - 16 : 0, W, 16);
    ctx.strokeStyle = '#5e626b';
    ctx.strokeRect(0.5, top ? H - 16 : 0.5, W - 1, 15.5);
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 4; i++) {
      const x = 8 + i * 14 + 1;
      ctx.fillRect(x, top ? edge - 6 : edge, 6, 6);
    }
    ctx.restore();
    shade(ctx, 0, 0, W, H);
  },
  wall(ctx, top, rng) {
    masonry(ctx, 0, 0, W, H, '#b59a74', '#7d6547', 20, rng, 14);
    // moss & cracks
    ctx.fillStyle = 'rgba(80,120,50,0.55)';
    for (let i = 0; i < 18; i++) ctx.fillRect(rng() * W, rng() * H, 3 + rng() * 5, 2 + rng() * 3);
    // breach edge: broken, stepped blocks (max 6px deep)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (let x = 0; x < W; x += 8) {
      const d = rng() * 6;
      ctx.fillRect(x, top ? H - d : 0, 8, d);
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(40,25,10,0.35)';
    ctx.fillRect(0, top ? H - 10 : 0, W, 4);
    shade(ctx, 0, 0, W, H);
  },
  banners(ctx, top, rng) {
    if (top) {
      // timber gantry with two long hanging banners
      ctx.fillStyle = '#5a3a1e';
      ctx.fillRect(0, 0, W, H);
      const cols = [['#b3202a', '#f2c14e'], ['#1f3f8a', '#e8e8f0']];
      for (let i = 0; i < 2; i++) {
        const x = i * (W / 2);
        const [c, trim] = cols[i];
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + W / 2, 0);
        ctx.lineTo(x + W / 2, H);
        ctx.lineTo(x + W / 4, H - 6);
        ctx.lineTo(x, H);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = trim;
        ctx.fillRect(x + 2, 0, 2, H - 4);
        ctx.fillRect(x + W / 2 - 4, 0, 2, H - 4);
        // device: a small flame sigil every 110px
        for (let y = H - 50; y > 0; y -= 110) {
          ctx.beginPath();
          ctx.moveTo(x + W / 4, y - 12);
          ctx.quadraticCurveTo(x + W / 4 + 9, y, x + W / 4, y + 10);
          ctx.quadraticCurveTo(x + W / 4 - 9, y, x + W / 4, y - 12);
          ctx.fill();
        }
      }
      ctx.fillStyle = '#3d2711';
      for (let y = 30; y < H; y += 140) ctx.fillRect(0, y, W, 6);
    } else {
      // sharpened palisade stakes, 6px points
      const n = 6;
      const sw = W / n;
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = i % 2 ? '#7a5230' : '#8c6038';
        ctx.beginPath();
        ctx.moveTo(i * sw, 6);
        ctx.lineTo(i * sw + sw / 2, 0);
        ctx.lineTo((i + 1) * sw, 6);
        ctx.lineTo((i + 1) * sw, H);
        ctx.lineTo(i * sw, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#c9a66b';
      for (let y = 40; y < H; y += 90) ctx.fillRect(0, y, W, 4);
      ctx.fillStyle = '#b3202a';
      ctx.fillRect(W / 2 - 1, 8, 2, 30);
    }
    shade(ctx, 0, 0, W, H);
  },
  portcullis(ctx, top, rng) {
    if (top) {
      ctx.fillStyle = '#23252b';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#4b4f58';
      for (let x = 3; x < W; x += 10) ctx.fillRect(x, 0, 4, H - 6);
      for (let y = H - 20; y > 0; y -= 16) ctx.fillRect(0, y, W, 3);
      // spikes at the bottom edge (6px)
      for (let x = 3; x < W; x += 10) {
        ctx.beginPath();
        ctx.moveTo(x, H - 6);
        ctx.lineTo(x + 2, H);
        ctx.lineTo(x + 4, H - 6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#6d717b';
      ctx.fillRect(0, 0, 4, H);
      ctx.fillRect(W - 4, 0, 4, H);
    } else {
      masonry(ctx, 0, 0, W, H, '#7c808a', '#50535b', 16, rng);
      ctx.fillStyle = '#4a2c14';
      ctx.beginPath();
      ctx.moveTo(12, 70);
      ctx.lineTo(12, 40);
      ctx.arc(W / 2, 40, W / 2 - 12, Math.PI, 0);
      ctx.lineTo(W - 12, 70);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2a180a';
      for (let x = 18; x < W - 12; x += 8) {
        ctx.beginPath();
        ctx.moveTo(x, 30);
        ctx.lineTo(x, 70);
        ctx.stroke();
      }
      ctx.fillStyle = '#8b8f99';
      ctx.fillRect(0, 0, W, 8);
    }
    shade(ctx, 0, 0, W, H);
  },
};

export function makeObstacleSprites(k) {
  const out = {};
  for (const v of OBSTACLES.variants) {
    const pieces = {};
    for (const top of [true, false]) {
      const c = makeCanvas(W * k, H * k);
      const ctx = c.getContext('2d');
      ctx.scale(k, k);
      PAINTERS[v](ctx, top, createRng(v.length * 7919 + (top ? 1 : 2)));
      pieces[top ? 'top' : 'bottom'] = c;
    }
    out[v] = pieces;
  }
  return out;
}

// ---------------------------------------------------------------- scenery
// Each biome = sky gradient + far layer + near layer + ground strip.
// Layers are one screen wide and tile seamlessly.
const VW = WORLD.width;

function wrap(ctx, x, w, draw) {
  draw(x);
  if (x + w > VW) draw(x - VW);
  if (x < 0) draw(x + VW);
}

export const BIOMES = {
  village: {
    sky: ['#7ec8f2', '#cdeefc', '#fdf1d0'],
    sun: { x: 280, y: 110, r: 28, color: '#fff4c2' },
    far(ctx, rng) {
      ctx.fillStyle = '#9fcf8f';
      hills(ctx, rng, 430, 60, 5);
    },
    near(ctx, rng) {
      for (let i = 0; i < 5; i++) {
        const x = i * 72 + rng() * 20;
        const h = 36 + rng() * 22;
        wrap(ctx, x, 46, (xx) => cottage(ctx, xx, WORLD.groundY, 40, h, rng() < 0.5 ? '#b4553a' : '#6b4a8c'));
      }
      ctx.fillStyle = '#4f8f3c';
      for (let i = 0; i < 7; i++) {
        const x = rng() * VW;
        wrap(ctx, x, 30, (xx) => tree(ctx, xx, WORLD.groundY, 26 + rng() * 14));
      }
    },
    ground: ['#6db34a', '#8b5a2b', '#7a4d24'],
  },
  castle: {
    sky: ['#6aa6d8', '#b9dcf2', '#f5e3c0'],
    sun: { x: 70, y: 90, r: 24, color: '#fff0b8' },
    far(ctx, rng) {
      ctx.fillStyle = '#9fb4c8';
      hills(ctx, rng, 440, 40, 3);
      ctx.fillStyle = '#7f93a8';
      castle(ctx, 210, 440, 1.1);
    },
    near(ctx, rng) {
      ctx.fillStyle = '#6f7a55';
      hills(ctx, rng, 500, 30, 4);
      ctx.fillStyle = '#8a8f99';
      for (let x = 0; x < VW; x += 18) ctx.fillRect(x, 506, 12, 10);
      ctx.fillRect(0, 514, VW, 46);
    },
    ground: ['#8e8f94', '#6c6d72', '#5a5b60'],
  },
  mountains: {
    sky: ['#4f7fb8', '#a8c6e3', '#e7eef5'],
    sun: { x: 300, y: 80, r: 18, color: '#ffffff' },
    far(ctx, rng) {
      peaks(ctx, rng, 430, 220, 6, '#7d8fae', '#f4f7fb');
    },
    near(ctx, rng) {
      peaks(ctx, rng, 520, 140, 8, '#56677f', '#e4ebf3');
      ctx.fillStyle = '#2f4f3a';
      for (let i = 0; i < 16; i++) {
        const x = rng() * VW;
        wrap(ctx, x, 20, (xx) => pine(ctx, xx, WORLD.groundY, 26 + rng() * 26));
      }
    },
    ground: ['#e9eef4', '#76706a', '#5f5a55'],
  },
  citadel: {
    sky: ['#0f1530', '#2b2e5c', '#5a3f6e'],
    sun: { x: 290, y: 100, r: 22, color: '#f3f0d8', moon: true },
    stars: true,
    far(ctx, rng) {
      ctx.fillStyle = '#2a2748';
      hills(ctx, rng, 460, 40, 3);
      ctx.fillStyle = '#1c1a36';
      castle(ctx, 60, 470, 1.4);
      castle(ctx, 250, 470, 1.0);
    },
    near(ctx, rng) {
      for (let i = 0; i < 6; i++) {
        const x = i * 62 + rng() * 14;
        const h = 44 + rng() * 30;
        wrap(ctx, x, 46, (xx) => {
          cottage(ctx, xx, WORLD.groundY, 38, h, '#2d2346', '#171327');
          ctx.fillStyle = '#ffcf6a';
          ctx.fillRect(xx + 10, WORLD.groundY - h * 0.55, 5, 6);
          ctx.fillRect(xx + 24, WORLD.groundY - h * 0.55, 5, 6);
        });
      }
    },
    ground: ['#3b3552', '#28233a', '#1f1b2e'],
  },
};

function hills(ctx, rng, baseY, amp, n) {
  const ph = [];
  for (let i = 0; i < n; i++) ph.push(rng() * Math.PI * 2);
  ctx.beginPath();
  ctx.moveTo(0, WORLD.height);
  for (let x = 0; x <= VW; x += 4) {
    let y = 0;
    for (let i = 0; i < n; i++) y += Math.sin((x / VW) * Math.PI * 2 * (i + 1) + ph[i]) / (i + 1);
    ctx.lineTo(x, baseY - amp * (0.5 + 0.5 * y / 1.5));
  }
  ctx.lineTo(VW, WORLD.height);
  ctx.closePath();
  ctx.fill();
}

function peaks(ctx, rng, baseY, h, n, rock, snow) {
  const step = VW / n;
  const tops = [];
  for (let i = 0; i < n; i++) tops.push([i * step + rng() * step * 0.4, baseY - h * (0.55 + rng() * 0.45)]);
  for (const [px, py] of tops) {
    wrap(ctx, px - step, step * 2, (x0) => {
      const cx = x0 + step;
      ctx.fillStyle = rock;
      ctx.beginPath();
      ctx.moveTo(cx - step * 1.1, baseY);
      ctx.lineTo(cx, py);
      ctx.lineTo(cx + step * 1.1, baseY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = snow;
      const s = (baseY - py) * 0.28;
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.8, py + s);
      ctx.lineTo(cx, py);
      ctx.lineTo(cx + s * 0.8, py + s);
      ctx.lineTo(cx + s * 0.3, py + s * 0.8);
      ctx.lineTo(cx, py + s * 1.1);
      ctx.lineTo(cx - s * 0.3, py + s * 0.8);
      ctx.closePath();
      ctx.fill();
    });
  }
  ctx.fillStyle = rock;
  ctx.fillRect(0, baseY - 1, VW, WORLD.height - baseY);
}

function cottage(ctx, x, groundY, w, h, roof, wall = '#f1e3c4') {
  ctx.fillStyle = wall;
  ctx.fillRect(x, groundY - h, w, h);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(x - 4, groundY - h);
  ctx.lineTo(x + w / 2, groundY - h - 20);
  ctx.lineTo(x + w + 4, groundY - h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(x + w / 2 - 4, groundY - 14, 8, 14);
  ctx.fillStyle = '#7a6a5a';
  ctx.fillRect(x + w - 10, groundY - h - 16, 5, 10);
}

function tree(ctx, x, groundY, h) {
  ctx.fillStyle = '#6b4a2b';
  ctx.fillRect(x - 2, groundY - h * 0.45, 4, h * 0.45);
  ctx.fillStyle = '#4f8f3c';
  ctx.beginPath();
  ctx.arc(x, groundY - h * 0.6, h * 0.32, 0, Math.PI * 2);
  ctx.fill();
}

function pine(ctx, x, groundY, h) {
  ctx.beginPath();
  ctx.moveTo(x, groundY - h);
  ctx.lineTo(x + h * 0.28, groundY);
  ctx.lineTo(x - h * 0.28, groundY);
  ctx.closePath();
  ctx.fill();
}

function castle(ctx, x, baseY, s) {
  const t = (tx, w, h) => {
    ctx.fillRect(x + tx * s, baseY - h * s, w * s, h * s);
    for (let i = 0; i < w; i += 6) ctx.fillRect(x + (tx + i) * s, baseY - (h + 4) * s, 3 * s, 4 * s);
  };
  t(0, 18, 80);
  t(18, 50, 50);
  t(68, 18, 80);
  t(34, 18, 105);
  ctx.beginPath();
  ctx.moveTo(x + 32 * s, baseY - 109 * s);
  ctx.lineTo(x + 43 * s, baseY - 135 * s);
  ctx.lineTo(x + 54 * s, baseY - 109 * s);
  ctx.fill();
}

export function makeBiomeLayers(name, k) {
  const b = BIOMES[name];
  const rng = createRng(name.length * 104729 + name.charCodeAt(0));
  const sky = makeCanvas(VW * k, WORLD.height * k);
  let ctx = sky.getContext('2d');
  ctx.scale(k, k);
  const g = ctx.createLinearGradient(0, 0, 0, WORLD.groundY);
  g.addColorStop(0, b.sky[0]);
  g.addColorStop(0.6, b.sky[1]);
  g.addColorStop(1, b.sky[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VW, WORLD.height);
  if (b.stars) {
    ctx.fillStyle = '#fffbe6';
    for (let i = 0; i < 70; i++) ctx.fillRect(rng() * VW, rng() * 380, rng() < 0.2 ? 2 : 1, rng() < 0.2 ? 2 : 1);
  }
  ctx.fillStyle = b.sun.color;
  ctx.beginPath();
  ctx.arc(b.sun.x, b.sun.y, b.sun.r, 0, Math.PI * 2);
  ctx.fill();
  if (b.sun.moon) {
    ctx.fillStyle = b.sky[0];
    ctx.beginPath();
    ctx.arc(b.sun.x + 9, b.sun.y - 5, b.sun.r * 0.85, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 4; i++) cloud(ctx, rng() * VW, 60 + rng() * 180, 0.7 + rng() * 0.6);
  }

  const layer = (fn) => {
    const c = makeCanvas(VW * k, WORLD.height * k);
    const cx = c.getContext('2d');
    cx.scale(k, k);
    fn(cx, rng);
    return c;
  };
  const far = layer(b.far);
  const near = layer(b.near);
  const ground = layer((cx) => {
    const [top, a, bcol] = b.ground;
    cx.fillStyle = a;
    cx.fillRect(0, WORLD.groundY, VW, WORLD.height - WORLD.groundY);
    cx.fillStyle = bcol;
    for (let x = 0; x < VW; x += 24) {
      for (let y = WORLD.groundY + 16; y < WORLD.height; y += 16) {
        cx.fillRect(x + ((y / 16) % 2) * 12, y, 14, 7);
      }
    }
    cx.fillStyle = top;
    cx.fillRect(0, WORLD.groundY, VW, 10);
    cx.fillStyle = 'rgba(0,0,0,0.25)';
    cx.fillRect(0, WORLD.groundY + 10, VW, 3);
  });
  return { sky, far, near, ground };
}

function cloud(ctx, x, y, s) {
  wrap(ctx, x - 30 * s, 60 * s, (xx) => {
    const cx = xx + 30 * s;
    ctx.beginPath();
    ctx.arc(cx - 16 * s, y, 12 * s, 0, Math.PI * 2);
    ctx.arc(cx, y - 6 * s, 16 * s, 0, Math.PI * 2);
    ctx.arc(cx + 17 * s, y, 11 * s, 0, Math.PI * 2);
    ctx.fill();
  });
}
