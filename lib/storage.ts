// localStorage persistence for MVP (no backend yet). All access is SSR-guarded.

import type { Settings, Workout, WorkoutLog, ReadinessResult, ExerciseLog } from "@/lib/types";
import { CURRENT_LOG_VERSION } from "@/lib/types";
import { migrateLogs, lastExerciseLogFor, lastWeightFor } from "@/lib/logs";

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

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / privacy mode — ignore in MVP */
  }
}

// Settings
export const loadSettings = (): Settings => ({ ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) });
export const saveSettings = (s: Settings): void => write(KEYS.settings, s);

// Current workout (the one shown on Today)
export const loadCurrentWorkout = (): Workout | null => read<Workout | null>(KEYS.currentWorkout, null);
export const saveCurrentWorkout = (w: Workout | null): void => write(KEYS.currentWorkout, w);

// Logs — read through the migrator so old shapes never crash the app.
export function loadLogs(): WorkoutLog[] {
  return migrateLogs(read<unknown>(KEYS.logs, []));
}
export function addLog(log: WorkoutLog): WorkoutLog[] {
  const logs = [{ ...log, version: CURRENT_LOG_VERSION }, ...loadLogs()];
  write(KEYS.logs, logs);
  return logs;
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
export const saveReadiness = (r: ReadinessResult | null): void => write(KEYS.readiness, r);

/** Day index for the next session, rotating 0->1->2 across completed logs. */
export function nextDayIndex(): number {
  return loadLogs().length % 3;
}
