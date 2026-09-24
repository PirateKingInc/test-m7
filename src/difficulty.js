// Difficulty is a function of score only. Parameters live in DIFFICULTY in
// config.js; this file only interprets them.
import { DIFFICULTY } from './config.js';

// The stage is the score clamped to the cap. Stages 0..rampScore are the
// only distinct difficulty settings the game can ever be in.
export const MAX_STAGE = DIFFICULTY.rampScore;

export function stageFor(score) {
  return Math.max(0, Math.min(Math.floor(score), MAX_STAGE));
}

// Linear ramp from `start` at stage 0 to `cap` at MAX_STAGE, flat after.
function ramp(range, stage) {
  return range.start + ((range.cap - range.start) * stageFor(stage)) / MAX_STAGE;
}

export function scrollSpeedFor(stage) {
  return ramp(DIFFICULTY.scrollSpeed, stage);
}

export function maxGapDeltaFor(stage) {
  return ramp(DIFFICULTY.maxGapDelta, stage);
}
