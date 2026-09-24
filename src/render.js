// Canvas renderer. Reads game state, never writes it.
import { WORLD, DRAGON, PHYSICS } from './config.js';
import { drawDragon } from './art.js';

const VW = WORLD.width;
const VH = WORLD.height;
const FONT = 'Georgia, "Times New Roman", serif';

export function createRenderer(canvas, win = window) {
  const ctx = canvas.getContext('2d', { alpha: false });
  let k = 1, offX = 0, offY = 0;
  const view = { time: 0, angle: 0, wing: 1 };

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
  }

  function text(str, x, y, size) {
    ctx.font = `bold ${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size / 7);
    ctx.strokeStyle = '#3a1d0b';
    ctx.strokeText(str, x, y);
    ctx.fillStyle = '#ffd66b';
    ctx.fillText(str, x, y);
  }

  function draw(state, alpha, frameDt, flapped) {
    view.time += frameDt;
    if (flapped) view.wing = 0;
    view.wing = Math.min(1, view.wing + frameDt * 3.2);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#120d1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(k, 0, 0, k, offX, offY);

    const g = ctx.createLinearGradient(0, 0, 0, WORLD.groundY);
    g.addColorStop(0, '#7ec8f2');
    g.addColorStop(1, '#fdf1d0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, WORLD.groundY);
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(0, WORLD.groundY, VW, VH - WORLD.groundY);
    ctx.fillStyle = '#6db34a';
    ctx.fillRect(0, WORLD.groundY, VW, 10);

    const d = state.dragon;
    const playing = state.mode === 'playing';
    let y = playing ? d.prevY + (d.y - d.prevY) * alpha : d.y;
    let target = 0;
    if (state.mode === 'title') y += Math.sin(view.time * 3) * 7;
    else target = d.vy < 0 ? -0.35 : Math.min(1.25, (d.vy / PHYSICS.terminalVelocity) * 1.4 - 0.35);
    view.angle += (target - view.angle) * Math.min(1, frameDt * 12);
    ctx.save();
    ctx.translate(DRAGON.x, y);
    ctx.rotate(view.angle);
    drawDragon(ctx, state.mode === 'title' ? 0.5 + 0.5 * Math.sin(view.time * 9) : view.wing);
    ctx.restore();

    if (state.mode === 'title') text('KINDLEWING', VW / 2, 128, 46);
    if (state.mode !== 'playing') text('Tap to fly', VW / 2, 480, 26);
  }

  resize();
  return { draw, resize };
}
