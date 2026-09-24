// "Perfect timing" autopilot: the constructive half of the fairness proof,
// and the CI bot playthrough.
//
// It uses only the single flap input, and never taps faster than one flap
// every FAIRNESS.minFlapIntervalTicks (≈6.7 taps/s, comfortably human).
//
// Policy: flap whenever the dragon's centre sinks below an aim line.
// A flap from the aim line rises ~62px (v²/2g) and a fall past it overshoots
// by at most one tick of travel, so the dragon oscillates in roughly
// [aim - 62, aim + 10]. The aim line is placed so that band sits inside the
// gap being flown through:
//  - approaching an obstacle: AIM_BELOW_CENTRE below its gap centre;
//  - inside an obstacle: slide the aim toward the next gap, as far as the
//    current gap's safe band allows (LEAN_UP / LEAN_DOWN), so the dragon
//    leaves already on the correct side for the transition;
//  - perfect timing: if the next gap is lower and simply falling would
//    carry the dragon clear of the current obstacle without touching its
//    lower lip, don't flap — a flap there only wastes descent time.
import { DRAGON, OBSTACLES, PHYSICS, DT, FAIRNESS } from './config.js';
import { stepDragon } from './physics.js';

export const MIN_FLAP_INTERVAL = FAIRNESS.minFlapIntervalTicks;
export const AIM_BELOW_CENTRE = 25; // px
export const LEAN_UP = 20; // px: aim ≥ centre + 5  → peak stays ≥ 6px under the gap top
export const LEAN_DOWN = 22; // px: aim ≤ centre + 47 → overshoot stays ≥ 6px above the gap bottom

const LEFT = DRAGON.x - DRAGON.hitboxW / 2;
const RIGHT = DRAGON.x + DRAGON.hitboxW / 2;

// Runs always begin with a flap (the tap that starts them), so the bot
// starts its tap-rate clock at zero.
export function createBot() {
  return { sinceFlap: 0 };
}

// The first obstacle the dragon has not fully cleared, and the one after it.
function upcoming(state) {
  const obs = state.obstacles;
  let i = 0;
  while (i < obs.length && obs[i].x + OBSTACLES.width < LEFT) i++;
  return [obs[i], obs[i + 1]];
}

export function aimLine(state) {
  const [cur, nxt] = upcoming(state);
  if (!cur) return DRAGON.startY + AIM_BELOW_CENTRE;
  const aim = cur.gapY + AIM_BELOW_CENTRE;
  if (!nxt || cur.x >= RIGHT) return aim;
  const want = nxt.gapY + AIM_BELOW_CENTRE;
  return Math.max(aim - LEAN_UP, Math.min(aim + LEAN_DOWN, want));
}

// True if the dragon can drop out of the current obstacle without flapping.
function fallClears(state, cur) {
  const lip = cur.gapY + OBSTACLES.gapSize / 2 - DRAGON.hitboxH / 2;
  const d = { y: state.dragon.y, vy: state.dragon.vy };
  let x = cur.x;
  // Mirrors the game's order: dragon moves, obstacles move, then collision.
  while (x + OBSTACLES.width >= LEFT) {
    stepDragon(d, false, PHYSICS, DT);
    x -= state.speed * DT;
    if (d.y > lip && x + OBSTACLES.width > LEFT) return false;
  }
  return true;
}

// Call once per tick; returns whether to flap on this tick.
export function botDecide(bot, state) {
  bot.sinceFlap++;
  if (bot.sinceFlap < MIN_FLAP_INTERVAL || state.dragon.y <= aimLine(state)) return false;
  const [cur, nxt] = upcoming(state);
  if (cur && nxt && cur.x < RIGHT && nxt.gapY > cur.gapY && fallClears(state, cur)) return false;
  bot.sinceFlap = 0;
  return true;
}
