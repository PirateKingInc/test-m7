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
