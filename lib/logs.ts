// Pure workout-log helpers: migration of old log shapes + history lookups.
// No localStorage here so everything is unit-testable.

import {
  CURRENT_LOG_VERSION,
} from "@/lib/types";
import type {
  WorkoutLog, ExerciseLog, ActualSet, SessionFeel, WeightUnit, ExerciseStatus,
  ExercisePrescription,
} from "@/lib/types";

function prettifySlug(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const STATUSES: ExerciseStatus[] = ["not_started", "in_progress", "completed", "modified", "skipped"];
function asStatus(v: unknown, fallback: ExerciseStatus): ExerciseStatus {
  return typeof v === "string" && (STATUSES as string[]).includes(v) ? (v as ExerciseStatus) : fallback;
}

/** Terminal statuses satisfy the workout completion gate; in_progress does not. */
const TERMINAL_STATUSES: ExerciseStatus[] = ["completed", "modified", "skipped"];

// ---------------------------------------------------------------------------
// Pure log builders — the single source of truth for honest logging state.
// Nothing is "completed" unless one of the explicit builders says so.
// ---------------------------------------------------------------------------

/** Planned set values, used only as editable suggestions (not auto-saved). */
export function plannedSetsFor(p: ExercisePrescription, unit: WeightUnit, weight: number): ActualSet[] {
  const count = Math.max(1, p.sets[1]);
  return Array.from({ length: count }, (_, i) => ({
    setNumber: i + 1,
    reps: p.reps[1],
    weight,
    weightUnit: unit,
    rpe: p.rpe,
    completed: true,
  }));
}

function baseFromPrescription(p: ExercisePrescription) {
  return {
    exerciseSlug: p.slug,
    exerciseName: p.displayName,
    plannedSets: Math.max(1, p.sets[1]),
    plannedRepRange: p.reps,
    plannedRestSeconds: p.restSeconds,
    plannedRpeTarget: p.rpe,
  };
}

/** Initial state: nothing logged, nothing counted. */
export function makeNotStartedLog(p: ExercisePrescription): ExerciseLog {
  return { ...baseFromPrescription(p), status: "not_started", actualSets: [], sessionFeel: "good", modified: false };
}

/** "Log as planned" — explicit confirmation that the planned work was done
 * for every set at once. Retained for callers that still want a one-shot
 * bulk log (e.g. tests, migrations); the primary guided UI now uses
 * `appendPlannedSet` to build the same result up one set at a time. */
export function makePlannedLog(p: ExercisePrescription, unit: WeightUnit, weight: number): ExerciseLog {
  return {
    ...baseFromPrescription(p), status: "completed",
    actualSets: plannedSetsFor(p, unit, weight), sessionFeel: "good", modified: false,
  };
}

/**
 * "Log set as planned" — the primary quick-log path. Appends exactly one
 * more set (planned reps/RPE, given weight) onto whatever's already logged,
 * so the guided rest timer has a real "more sets remain" moment to react to
 * between taps. Status becomes "in_progress" — an explicitly NON-terminal
 * state — while sets remain, and "completed" once the last planned set is
 * appended (identical in shape to `makePlannedLog`). Never sets "modified":
 * that status is reserved for an exercise the user has intentionally
 * finished with changes (see `finishAsModified`). A no-op once every planned
 * set is already logged.
 */
export function appendPlannedSet(
  log: ExerciseLog, p: ExercisePrescription, unit: WeightUnit, weight: number,
): ExerciseLog {
  const plannedSets = Math.max(1, p.sets[1]);
  if (log.actualSets.length >= plannedSets) return log;
  const setNumber = log.actualSets.length + 1;
  const newSet: ActualSet = { setNumber, reps: p.reps[1], weight, weightUnit: unit, rpe: p.rpe, completed: true };
  const actualSets = [...log.actualSets, newSet];
  const status: ExerciseStatus = actualSets.length >= plannedSets ? "completed" : "in_progress";
  return {
    ...log,
    ...baseFromPrescription(p),
    status,
    actualSets,
    modified: false,
  };
}

/**
 * "Finish as modified" — the user intentionally stops logging an in-progress
 * exercise early (or otherwise wants to finalize it as-is). Preserves
 * whatever sets are already logged exactly as they are; never fabricates
 * additional sets to fill out the plan. Terminal: satisfies the workout
 * completion gate.
 */
export function finishAsModified(log: ExerciseLog, p: ExercisePrescription): ExerciseLog {
  return { ...log, ...baseFromPrescription(p), status: "modified", modified: true };
}

/** "Skip exercise" — recorded as not done. */
export function makeSkippedLog(p: ExercisePrescription): ExerciseLog {
  return { ...baseFromPrescription(p), status: "skipped", actualSets: [], sessionFeel: "missed", modified: false };
}

/** An exercise counts toward workout completion once it reaches a terminal
 * status (completed/modified/skipped) — "in_progress" does NOT count yet. */
export function isExerciseLogged(log?: ExerciseLog | null): boolean {
  return !!log && TERMINAL_STATUSES.includes(log.status);
}

/** Main slugs that still need an explicit log/skip before the workout can finish. */
export function pendingExercises(mainSlugs: string[], logsBySlug: Record<string, ExerciseLog>): string[] {
  return mainSlugs.filter((s) => !isExerciseLogged(logsBySlug[s]));
}

const FEELS: SessionFeel[] = ["easy", "good", "hard", "missed"];
function asFeel(v: unknown, fallback: SessionFeel): SessionFeel {
  return typeof v === "string" && (FEELS as string[]).includes(v) ? (v as SessionFeel) : fallback;
}

function asUnit(v: unknown): WeightUnit {
  return v === "kg" ? "kg" : "lb";
}

/** Build an ExerciseLog from a legacy v1 performance ({ slug, feel, weight? }). */
function exerciseLogFromLegacyPerf(p: any): ExerciseLog | null {
  if (!p || typeof p.slug !== "string") return null;
  const feel = asFeel(p.feel, "good");
  return {
    exerciseSlug: p.slug,
    exerciseName: typeof p.exerciseName === "string" ? p.exerciseName : prettifySlug(p.slug),
    // Legacy logs were already-finished sessions: a "missed" feel maps to skipped,
    // anything else is treated as completed.
    status: feel === "missed" ? "skipped" : "completed",
    plannedSets: 0,
    plannedRepRange: [0, 0],
    plannedRestSeconds: 0,
    plannedRpeTarget: 0,
    actualSets: [], // v1 had no per-set data
    sessionFeel: feel,
    modified: false,
  };
}

/** Coerce an arbitrary object into a valid ActualSet (defensive). */
function asActualSet(s: any, index: number): ActualSet {
  return {
    setNumber: Number.isFinite(s?.setNumber) ? s.setNumber : index + 1,
    reps: Number.isFinite(s?.reps) ? s.reps : 0,
    weight: Number.isFinite(s?.weight) ? s.weight : 0,
    weightUnit: asUnit(s?.weightUnit),
    rpe: Number.isFinite(s?.rpe) ? s.rpe : 0,
    completed: s?.completed !== false,
    notes: typeof s?.notes === "string" ? s.notes : undefined,
  };
}

function asExerciseLog(e: any): ExerciseLog | null {
  if (!e || typeof e.exerciseSlug !== "string") return null;
  const sets = Array.isArray(e.actualSets) ? e.actualSets.map(asActualSet) : [];
  const feel = asFeel(e.sessionFeel, "good");
  // Derive a status when one isn't stored (logs written before this field).
  const derived: ExerciseStatus =
    sets.some((s: ActualSet) => s.completed) ? (e.modified === true ? "modified" : "completed")
    : feel === "missed" ? "skipped"
    : "completed";
  return {
    exerciseSlug: e.exerciseSlug,
    exerciseName: typeof e.exerciseName === "string" ? e.exerciseName : prettifySlug(e.exerciseSlug),
    status: asStatus(e.status, derived),
    plannedSets: Number.isFinite(e.plannedSets) ? e.plannedSets : 0,
    plannedRepRange: Array.isArray(e.plannedRepRange) ? [e.plannedRepRange[0] ?? 0, e.plannedRepRange[1] ?? 0] : [0, 0],
    plannedRestSeconds: Number.isFinite(e.plannedRestSeconds) ? e.plannedRestSeconds : 0,
    plannedRpeTarget: Number.isFinite(e.plannedRpeTarget) ? e.plannedRpeTarget : 0,
    actualSets: sets,
    sessionFeel: feel,
    modified: e.modified === true,
    modificationNote: typeof e.modificationNote === "string" ? e.modificationNote : undefined,
  };
}

/**
 * Migrate a single raw log (any historical shape) into a current WorkoutLog.
 * Returns null if the record is too corrupt to recover.
 */
export function migrateLog(raw: any): WorkoutLog | null {
  if (!raw || typeof raw !== "object") return null;

  const base = {
    id: typeof raw.id === "string" ? raw.id : `log_${Math.random().toString(36).slice(2)}`,
    workoutId: typeof raw.workoutId === "string" ? raw.workoutId : "",
    title: typeof raw.title === "string" ? raw.title : "Workout",
    mode: raw.mode === "low-energy" ? "low-energy" : "normal",
    date: typeof raw.date === "string" ? raw.date : new Date(0).toISOString(),
    note: typeof raw.note === "string" ? raw.note : undefined,
  } as const;

  // Already current shape.
  if (Array.isArray(raw.exercises)) {
    const exercises = raw.exercises.map(asExerciseLog).filter((x: ExerciseLog | null): x is ExerciseLog => !!x);
    return { version: CURRENT_LOG_VERSION, ...base, exercises };
  }

  // v1: performances array.
  if (Array.isArray(raw.performances)) {
    const exercises = raw.performances
      .map(exerciseLogFromLegacyPerf)
      .filter((x: ExerciseLog | null): x is ExerciseLog => !!x);
    return { version: CURRENT_LOG_VERSION, ...base, exercises };
  }

  // v0: only completedSlugs.
  if (Array.isArray(raw.completedSlugs)) {
    const exercises = raw.completedSlugs
      .filter((s: unknown) => typeof s === "string")
      .map((slug: string) => exerciseLogFromLegacyPerf({ slug, feel: "good" }))
      .filter((x: ExerciseLog | null): x is ExerciseLog => !!x);
    return { version: CURRENT_LOG_VERSION, ...base, exercises };
  }

  // Nothing recoverable beyond the envelope.
  return { version: CURRENT_LOG_VERSION, ...base, exercises: [] };
}

/** Migrate an arbitrary stored value into a clean WorkoutLog[]. Never throws. */
export function migrateLogs(raw: unknown): WorkoutLog[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(migrateLog).filter((x): x is WorkoutLog => !!x);
}

/** Most recent ExerciseLog for a slug across logs (assumes newest-first order). */
export function lastExerciseLogFor(logs: WorkoutLog[], slug: string): ExerciseLog | undefined {
  for (const log of logs) {
    const found = log.exercises?.find((e) => e.exerciseSlug === slug);
    if (found) return found;
  }
  return undefined;
}

/** The heaviest completed weight recorded for a slug (for default pre-fill). */
export function lastWeightFor(logs: WorkoutLog[], slug: string): number | undefined {
  const log = lastExerciseLogFor(logs, slug);
  if (!log) return undefined;
  const weights = log.actualSets.filter((s) => s.completed).map((s) => s.weight);
  return weights.length ? Math.max(...weights) : undefined;
}
