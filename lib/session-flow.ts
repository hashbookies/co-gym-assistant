// Pure derivation of the guided rest/next-set flow from existing logging
// state. No new source of truth: everything here is read straight from an
// ExerciseLog's plannedSets/actualSets/status — the same fields the honest
// per-set logger (lib/logs.ts) already owns. Nothing here writes a log.

import type { ExerciseLog } from "@/lib/types";

/** Number of sets marked completed in the current log. */
export function completedSetCount(log: ExerciseLog): number {
  return log.actualSets.filter((s) => s.completed).length;
}

/**
 * Sets still left to do. Only meaningful while "in_progress" — every other
 * status is terminal-or-not-started, so there's nothing left to guide toward.
 */
export function remainingSets(log: ExerciseLog): number {
  if (log.status !== "in_progress") return 0;
  return Math.max(0, log.plannedSets - completedSetCount(log));
}

/** 1-indexed set the user should do next (clamped to at least set 1). */
export function nextSetNumber(log: ExerciseLog): number {
  const total = Math.max(log.plannedSets, 1);
  return Math.min(completedSetCount(log) + 1, total);
}

/** True once every planned set has been logged exactly as planned. */
export function isExerciseComplete(log: ExerciseLog): boolean {
  return log.status === "completed";
}

/**
 * Whether the guided rest timer should be offered right now: the exercise is
 * actively "in_progress" (at least one set logged via the quick-log path,
 * more remain). Never true for "modified" — that's a terminal, intentionally
 * finished state that gets its own "finished as modified" summary instead.
 */
export function recommendRest(log: ExerciseLog): boolean {
  return log.status === "in_progress";
}
