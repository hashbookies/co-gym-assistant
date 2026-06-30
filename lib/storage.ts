// localStorage persistence for MVP (no backend yet). All access is SSR-guarded.

import type { Settings, Workout, WorkoutLog, ReadinessResult, ExercisePerformance } from "@/lib/types";

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

// Logs
export const loadLogs = (): WorkoutLog[] => read<WorkoutLog[]>(KEYS.logs, []);
export function addLog(log: WorkoutLog): WorkoutLog[] {
  const logs = [log, ...loadLogs()];
  write(KEYS.logs, logs);
  return logs;
}

/** Most recent recorded performance for a given exercise slug, if any. */
export function lastPerformance(slug: string): ExercisePerformance | undefined {
  for (const log of loadLogs()) {
    const p = log.performances?.find((x) => x.slug === slug);
    if (p) return p;
  }
  return undefined;
}

// Last readiness result
export const loadReadiness = (): ReadinessResult | null => read<ReadinessResult | null>(KEYS.readiness, null);
export const saveReadiness = (r: ReadinessResult | null): void => write(KEYS.readiness, r);

/** Day index for the next session, rotating 0->1->2 across completed logs. */
export function nextDayIndex(): number {
  return loadLogs().length % 3;
}
