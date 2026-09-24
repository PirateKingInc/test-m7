// Kindlewing — tunable game data.
// Every obstacle / difficulty / world number lives here, separate from the
// physics, game-state, and rendering code. See SPEC.md for the reasoning
// behind each value.

// Fixed simulation timestep (seconds). Logic always advances in whole ticks.
export const TICK_RATE = 60;
export const DT = 1 / TICK_RATE;

// Logical world size in "world pixels". The canvas is scaled to fit.
export const WORLD = {
  width: 360,
  height: 640,
  ceilingY: 0,
  groundY: 560, // top of the ground strip; everything below is ground
};

export const PHYSICS = {
  gravity: 1500, // px/s^2, always on
  flapVelocity: -430, // px/s, a flap SETS vertical velocity to this (up is negative)
  terminalVelocity: 600, // px/s, max downward speed
};

export const DRAGON = {
  x: 100, // fixed horizontal position of the hitbox centre
  startY: 280, // hitbox centre at run start
  hitboxW: 34,
  hitboxH: 24,
};

export const OBSTACLES = {
  width: 64, // horizontal thickness of every obstacle
  spacing: 220, // leading-edge to leading-edge distance between obstacles
  firstX: 440, // leading edge of the first obstacle at run start
  // Gap height is fixed for the whole run:
  //   gapSize = ceil(hitboxH + 2 * flapRise) where flapRise = v^2 / 2g ≈ 61.6
  gapSize: 150,
  edgeMargin: 40, // min distance from gap edge to ceiling / ground
  // Purely cosmetic reskins of the identical gap mechanic.
  variants: ['tower', 'wall', 'banners', 'portcullis'],
};

// Difficulty is a function of score only. It ramps linearly from `start`
// at score 0 to `cap` at score `rampScore`, then stays flat forever.
export const DIFFICULTY = {
  rampScore: 40,
  scrollSpeed: { start: 140, cap: 200 }, // px/s
  maxGapDelta: { start: 90, cap: 150 }, // max vertical shift between consecutive gap centres, px
};

// Fairness analysis assumes a player can tap at most once every this many
// ticks (9 ticks ≈ 6.7 taps/s — brisk but comfortably human). The autopilot
// in the fairness proof obeys the same limit.
export const FAIRNESS = {
  minFlapIntervalTicks: 9,
};

// Cosmetic backdrop milestones. No gameplay effect.
export const SCENERY = {
  pointsPerBiome: 10,
  biomes: ['village', 'castle', 'mountains', 'citadel'],
};

// Game-over input lockout so a panicked tap doesn't instantly restart.
export const RESTART_LOCK_TICKS = 24;
