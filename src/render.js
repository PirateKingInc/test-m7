// Canvas renderer. Reads game state, never writes it.
import { WORLD, DRAGON, PHYSICS, OBSTACLES, DT, RESTART_LOCK_TICKS, SCENERY } from './config.js';
import { drawDragon, makeObstacleSprites, makeBiomeLayers, makeCanvas } from './art.js';
import { shakeOffset } from './effects.js';
import { gapRect } from './gaps.js';

const VW = WORLD.width;
const VH = WORLD.height;
const FONT = 'Georgia, "Times New Roman", serif';
const CROSSFADE_S = 1.5;

export function createRenderer(canvas, win = window) {
  const ctx = canvas.getContext('2d', { alpha: false });
  let k = 1, offX = 0, offY = 0, sprites = null, fade = null;
  const layers = new Map();
  const view = { time: 0, angle: 0, from: 0, to: 0, t: 1 };

  // Fit the 360×640 world into the window (letterboxed), at device resolution.
  function resize() {
    const dpr = Math.min(win.devicePixelRatio || 1, 2);
    const iw = win.innerWidth, ih = win.innerHeight;
    canvas.width = Math.round(iw * dpr);
    canvas.height = Math.round(ih * dpr);
    canvas.style.width = iw + 'px';
    canvas.style.height = ih + 'px';
    const scale = Math.min(iw / VW, ih / VH);
    k = scale * dpr;
    offX = Math.round((canvas.width - VW * k) / 2);
    offY = Math.round((canvas.height - VH * k) / 2);
    sprites = makeObstacleSprites(k); // pre-rendered at device resolution
    fade = makeCanvas(VW * k, VH * k);
    layers.clear();
  }

  // Biome layers are built lazily (first time a biome is seen) and cached.
  function biome(i) {
    if (!layers.has(i)) layers.set(i, makeBiomeLayers(SCENERY.biomes[i], k));
    return layers.get(i);
  }

  function tile(c, img, dist, parallax, sy = 0, sh = VH) {
    const x = -((dist * parallax) % VW);
    c.drawImage(img, 0, sy * k, VW * k, sh * k, x, sy, VW, sh);
    c.drawImage(img, 0, sy * k, VW * k, sh * k, x + VW, sy, VW, sh);
  }

  function drawBackdrop(c, i, dist) {
    const L = biome(i);
    tile(c, L.sky, dist, 0.03);
    tile(c, L.far, dist, 0.18);
    tile(c, L.near, dist, 0.5);
  }

  function drawGround(c, i, dist) {
    tile(c, biome(i).ground, dist, 1, WORLD.groundY, VH - WORLD.groundY);
  }

  // During a biome change the incoming scenery is composited into an
  // offscreen buffer and faded in as one image, so layers don't ghost.
  function drawScenery(dist, paint) {
    paint(ctx, view.t < 1 ? view.from : view.to, dist);
    if (view.t >= 1) return;
    const f = fade.getContext('2d');
    f.setTransform(k, 0, 0, k, 0, 0);
    f.clearRect(0, 0, VW, VH);
    paint(f, view.to, dist);
    ctx.globalAlpha = view.t;
    ctx.drawImage(fade, 0, 0, VW * k, VH * k, 0, 0, VW, VH);
    ctx.globalAlpha = 1;
  }

  // Obstacle art is cropped from tall pre-rendered pieces so it lines up
  // exactly with the two hitbox rectangles.
  function drawObstacle(ob, x) {
    const { top, bottom } = gapRect(ob.gapY);
    const sp = sprites[ob.variant];
    const W = OBSTACLES.width, H = WORLD.groundY;
    ctx.drawImage(sp.top, 0, (H - top) * k, W * k, top * k, x, 0, W, top);
    ctx.drawImage(sp.bottom, 0, 0, W * k, (H - bottom) * k, x, bottom, W, H - bottom);
  }

  function text(str, x, y, size, fill = '#ffd66b', stroke = '#3a1d0b', align = 'center') {
    ctx.font = `bold ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size / 7);
    ctx.strokeStyle = stroke;
    ctx.strokeText(str, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(str, x, y);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(30,15,5,0.35)';
    roundRect(x + 4, y + 6, w, h, 14);
    ctx.fill();
    ctx.fillStyle = '#f3e2b8';
    roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#7a4b1f';
    ctx.stroke();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // fx is the cosmetic effects state from effects.js (particles, shake, …).
  function draw(state, alpha, fx, frameDt) {
    view.time += frameDt;
    if (state.biome !== view.to) {
      view.from = view.to;
      view.to = state.biome;
      view.t = 0;
    }
    view.t = Math.min(1, view.t + frameDt / CROSSFADE_S);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#120d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const [sx, sy] = shakeOffset(fx);
    ctx.setTransform(k, 0, 0, k, offX + sx * k, offY + sy * k);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, VW, VH);
    ctx.clip(); // tiled layers must not spill into the letterbox

    const playing = state.mode === 'playing';
    // Scroll distance, interpolated; the title screen drifts on its own.
    const dist = state.mode === 'title'
      ? view.time * 40
      : state.distance - (playing ? state.speed * DT * (1 - alpha) : 0);
    drawScenery(dist, drawBackdrop);

    if (state.mode !== 'title') {
      for (const ob of state.obstacles) {
        const x = playing ? ob.prevX + (ob.x - ob.prevX) * alpha : ob.x;
        if (x < VW && x + OBSTACLES.width > 0) drawObstacle(ob, x);
      }
    }

    drawScenery(dist, drawGround); // ground scrolls with the obstacles

    for (const p of fx.particles) {
      ctx.globalAlpha = 1 - p.age / p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    const d = state.dragon;
    let y = playing ? d.prevY + (d.y - d.prevY) * alpha : d.y;
    let target = 0;
    if (state.mode === 'title') y += Math.sin(view.time * 3) * 7;
    else target = d.vy < 0 ? -0.35 : Math.min(1.25, (d.vy / PHYSICS.terminalVelocity) * 1.4 - 0.35);
    view.angle += (target - view.angle) * Math.min(1, frameDt * 12);
    ctx.save();
    ctx.translate(DRAGON.x, y);
    ctx.rotate(view.angle);
    drawDragon(ctx, state.mode === 'title' ? 0.5 + 0.5 * Math.sin(view.time * 9) : fx.wing);
    ctx.restore();

    if (fx.flash > 0) {
      ctx.fillStyle = `rgba(255,245,220,${fx.flash * 0.7})`;
      ctx.fillRect(0, 0, VW, VH);
    }

    if (state.mode === 'title') drawTitle(state);
    else if (state.mode === 'playing') text(String(state.score), VW / 2, 78, 56 * (1 + fx.pop * 0.25));
    else drawGameOver(state);
    ctx.restore();
  }

  function drawTitle(state) {
    text('KINDLEWING', VW / 2, 128, 46);
    text('Flight over Hollowmere', VW / 2, 170, 19, '#fff4dd', '#3a1d0b');
    panel(50, 380, VW - 100, 118);
    ctx.fillStyle = '#5a3212';
    ctx.font = `bold 17px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('Help Ashby cross the kingdom!', VW / 2, 408);
    ctx.font = `15px ${FONT}`;
    ctx.fillText('Tap · Click · Space to flap', VW / 2, 436);
    ctx.fillText(`Best: ${state.best}`, VW / 2, 462);
    if (Math.sin(view.time * 5) > -0.4) text('Tap to fly', VW / 2, 535, 26);
  }

  function drawGameOver(state) {
    const show = Math.min(1, state.overTicks / 18);
    ctx.globalAlpha = show;
    ctx.fillStyle = 'rgba(20,10,30,0.35)';
    ctx.fillRect(0, 0, VW, VH);
    const py = 170 + (1 - show) * 40;
    text('GROUNDED!', VW / 2, py - 32, 40);
    panel(60, py, VW - 120, 200);
    ctx.fillStyle = '#5a3212';
    ctx.textAlign = 'center';
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText('SCORE', VW / 2 - 60, py + 36);
    ctx.fillText('BEST', VW / 2 + 60, py + 36);
    ctx.font = `bold 44px ${FONT}`;
    ctx.fillText(String(state.score), VW / 2 - 60, py + 82);
    ctx.fillText(String(state.best), VW / 2 + 60, py + 82);
    if (state.newBest) {
      ctx.fillStyle = '#b3202a';
      roundRect(VW / 2 - 62, py + 112, 124, 28, 8);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillText('NEW BEST!', VW / 2, py + 130);
    }
    ctx.fillStyle = '#8a6a4a';
    ctx.font = `12px ${FONT}`;
    ctx.fillText(`seed ${state.seed}`, VW / 2, py + 180);
    ctx.globalAlpha = 1;
    if (state.overTicks >= RESTART_LOCK_TICKS && Math.sin(view.time * 5) > -0.4) {
      text('Tap to fly again', VW / 2, py + 250, 26);
    }
  }


  resize();
  return { draw, resize };
}
