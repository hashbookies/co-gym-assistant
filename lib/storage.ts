// localStorage persistence for MVP (no backend yet). All access is SSR-guarded.

import type { Settings, Workout, WorkoutLog, ReadinessResult, ExerciseLog } from "@/lib/types";
import { CURRENT_LOG_VERSION } from "@/lib/types";
import { migrateLogs, lastExerciseLogFor, lastWeightFor, findLog, replaceLog, removeLog } from "@/lib/logs";

const KEYS = {
  settings: "cogym.settings",
  currentWorkout: "cogym.currentWorkout",
  logs: "cogym.logs",
  readiness: "cogym.readiness",
} as const;

export const DEFAULT_SETTINGS: Settings = {
  equipment: { dumbbell: true, band: true, bodyweight: true },
  trainingDays: 3,
  durationMin: 30,
  level: "beginner",
  weightUnit: "lb",
  hasDoorAnchor: false,
  hasBench: false,
  hasPullupBar: false,
};

/**
 * Result of a localStorage write. Editing, deleting, and importing logs are
 * all real data-loss risks now, so a write failure (quota exceeded, private
 * browsing, storage disabled) must never be silently swallowed — every
 * caller gets an explicit `{ ok: false, error }` to show the user instead of
 * quietly pretending the save happened.
 */
export type WriteResult = { ok: true } | { ok: false; error: string };

const QUOTA_ERROR_MESSAGE = "Could not save changes. Your browser storage may be full.";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): WriteResult {
  if (typeof window === "undefined") return { ok: true }; // SSR: nothing to persist yet, not a failure
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch {
    return { ok: false, error: QUOTA_ERROR_MESSAGE };
  }
}

// Settings
export const loadSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) });
export const saveSettings = (s: Settings): WriteResult => write(KEYS.settings, s);

// Current workout (the one shown on Today)
export const loadCurrentWorkout = (): Workout | null => read<Workout | null>(KEYS.currentWorkout, null);
export const saveCurrentWorkout = (w: Workout | null): WriteResult => write(KEYS.currentWorkout, w);

// Logs — read through the migrator so old shapes never crash the app.
export function loadLogs(): WorkoutLog[] {
  return migrateLogs(read<unknown>(KEYS.logs, []));
}
export function addLog(log: WorkoutLog): WriteResult {
  const logs = [{ ...log, version: CURRENT_LOG_VERSION }, ...loadLogs()];
  return write(KEYS.logs, logs);
}

/** A single saved log by id, or undefined if it doesn't exist. */
export function loadLogById(id: string): WorkoutLog | undefined {
  return findLog(loadLogs(), id);
}

/** Persist an edited log (id must already exist). Every exercise is
 * normalized so a dishonest status/actualSets combination can never be
 * silently saved. Reports write failure instead of pretending it saved. */
export function updateLog(updated: WorkoutLog): WriteResult {
  const logs = replaceLog(loadLogs(), updated);
  return write(KEYS.logs, logs);
}

/** Delete one log by id. Reports write failure instead of pretending it deleted. */
export function deleteLog(id: string): WriteResult {
  const logs = removeLog(loadLogs(), id);
  const result = write(KEYS.logs, logs);
  return result.ok ? result : { ok: false, error: "Could not delete this log." };
}

/** Overwrite the entire logs list (used by import replace/merge). */
export function saveLogs(logs: WorkoutLog[]): WriteResult {
  return write(KEYS.logs, logs);
}

/** Most recent per-exercise log for a slug, if any. */
export function lastExerciseLog(slug: string): ExerciseLog | undefined {
  return lastExerciseLogFor(loadLogs(), slug);
}

/** Heaviest completed weight last logged for a slug (for default pre-fill). */
export function lastWeight(slug: string): number | undefined {
  return lastWeightFor(loadLogs(), slug);
}

// Last readiness result
export const loadReadiness = (): ReadinessResult | null => read<ReadinessResult | null>(KEYS.readiness, null);
export const saveReadiness = (r: ReadinessResult | null): WriteResult => write(KEYS.readiness, r);

/** Day index for the next session, rotating 0->1->2 across completed logs. */
export function nextDayIndex(): number {
  return loadLogs().length % 3;
}
