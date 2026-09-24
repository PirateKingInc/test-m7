// All art is drawn in code. Anything static is pre-rendered once into an
// offscreen canvas at device resolution, so a frame is a few drawImage calls.

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
