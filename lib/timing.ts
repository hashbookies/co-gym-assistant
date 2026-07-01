// Pure workout-guidance timer estimation. No browser APIs here — safe to run
// in tests or on the server. Audio/interval concerns live in the components
// that use this (lib/sound.ts, components/ExerciseMedia.tsx).
//
// This is guidance only, not medically prescriptive: a rough per-set pacing
// timer, not a prescribed rep tempo.

export interface TimingInput {
  reps: [number, number] | undefined;
  timeBased: boolean;
  movementPattern?: string;
}

export interface TimingOptions {
  isWarmup?: boolean;
}

const SECONDS_PER_REP = 4;
export const MIN_WORK_SECONDS = 15;
export const MAX_WORK_SECONDS = 90;
const MOBILITY_DEFAULT_SECONDS = 35;
const WARMUP_MAX_SECONDS = 30;

function clamp(seconds: number): number {
  return Math.min(MAX_WORK_SECONDS, Math.max(MIN_WORK_SECONDS, seconds));
}

/**
 * Estimate a guidance-only work duration for one exercise, always within
 * [MIN_WORK_SECONDS, MAX_WORK_SECONDS].
 *
 *  - Rep-based: ~4s per rep, targeting the (floored) midpoint of the rep range.
 *  - Hold/time-based (`timeBased`): the rep range IS the hold time in seconds —
 *    use the midpoint directly.
 *  - Mobility/stretch (`movementPattern === "mobility"`, not time-based): rep
 *    counts aren't meaningful, so use a gentle flat default.
 *  - Malformed/missing rep data: fall back to the same gentle default rather
 *    than producing 0 or NaN.
 */
export function estimateWorkSeconds(ex: TimingInput, opts: TimingOptions = {}): number {
  const [lo, hi] = Array.isArray(ex.reps) ? ex.reps : [undefined, undefined];
  const validRange = typeof lo === "number" && typeof hi === "number" && Number.isFinite(lo) && Number.isFinite(hi) && hi > 0;

  let seconds: number;
  if (ex.movementPattern === "mobility" && !ex.timeBased) {
    seconds = MOBILITY_DEFAULT_SECONDS;
  } else if (ex.timeBased) {
    seconds = validRange ? Math.floor((lo! + hi!) / 2) : MOBILITY_DEFAULT_SECONDS;
  } else if (validRange) {
    const targetReps = Math.floor((lo! + hi!) / 2);
    seconds = targetReps * SECONDS_PER_REP;
  } else {
    seconds = MOBILITY_DEFAULT_SECONDS;
  }

  if (opts.isWarmup) seconds = Math.min(seconds, WARMUP_MAX_SECONDS);
  return clamp(seconds);
}

/** mm:ss for the countdown display. */
export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
