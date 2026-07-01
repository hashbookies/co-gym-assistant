import { describe, it, expect } from "vitest";
import { migrateLog, migrateLogs, lastExerciseLogFor, lastWeightFor } from "@/lib/logs";
import { CURRENT_LOG_VERSION } from "@/lib/types";
import type { WorkoutLog } from "@/lib/types";

describe("migrateLog", () => {
  it("passes through a current (v2) log and coerces sets", () => {
    const raw = {
      version: 2, id: "l1", workoutId: "w", title: "Full Body A", mode: "normal", date: "2026-01-01T00:00:00Z",
      exercises: [{
        exerciseSlug: "dumbbell-squat", exerciseName: "Dumbbell Squat", plannedSets: 3,
        plannedRepRange: [8, 12], plannedRestSeconds: 90, plannedRpeTarget: 7,
        actualSets: [{ setNumber: 1, reps: 10, weight: 20, weightUnit: "kg", rpe: 7, completed: true }],
        sessionFeel: "good", modified: false,
      }],
    };
    const out = migrateLog(raw)!;
    expect(out.version).toBe(CURRENT_LOG_VERSION);
    expect(out.exercises).toHaveLength(1);
    expect(out.exercises[0].actualSets[0].weightUnit).toBe("kg");
    expect(out.exercises[0].actualSets[0].reps).toBe(10);
    expect(out.exercises[0].status).toBe("completed"); // completed sets + not modified -> derived completed
  });

  it("coerces an invalid status to a derived value", () => {
    const raw = {
      id: "lb", date: "x", mode: "normal",
      exercises: [{ exerciseSlug: "push-up", actualSets: [], sessionFeel: "missed", status: "garbage" }],
    };
    const out = migrateLog(raw)!;
    expect(out.exercises[0].status).toBe("skipped"); // invalid status -> derived from missed feel
  });

  it("migrates a v1 performances log to per-exercise logs", () => {
    const raw = {
      id: "l2", workoutId: "w", title: "Day", mode: "normal", date: "2026-01-02T00:00:00Z",
      performances: [{ slug: "push-up", feel: "hard" }, { slug: "dumbbell-squat", feel: "easy" }],
    };
    const out = migrateLog(raw)!;
    expect(out.version).toBe(CURRENT_LOG_VERSION);
    expect(out.exercises.map((e) => e.exerciseSlug)).toEqual(["push-up", "dumbbell-squat"]);
    expect(out.exercises[0].sessionFeel).toBe("hard");
    expect(out.exercises[0].status).toBe("completed"); // non-missed legacy feel => completed
    expect(out.exercises[0].actualSets).toEqual([]); // v1 had no per-set data
    expect(out.exercises[1].exerciseName).toBe("Dumbbell Squat"); // prettified from slug
  });

  it("maps a legacy 'missed' performance to skipped status", () => {
    const raw = { id: "lm", date: "x", mode: "normal", performances: [{ slug: "push-up", feel: "missed" }] };
    const out = migrateLog(raw)!;
    expect(out.exercises[0].status).toBe("skipped");
    expect(out.exercises[0].sessionFeel).toBe("missed");
  });

  it("migrates a v0 completedSlugs-only log with a neutral feel", () => {
    const raw = { id: "l3", title: "Old", mode: "normal", date: "x", completedSlugs: ["a-b", "c"] };
    const out = migrateLog(raw)!;
    expect(out.exercises).toHaveLength(2);
    expect(out.exercises[0].sessionFeel).toBe("good");
    expect(out.exercises[0].exerciseName).toBe("A B");
  });

  it("returns null for non-object input", () => {
    expect(migrateLog(null)).toBeNull();
    expect(migrateLog(5 as unknown)).toBeNull();
    expect(migrateLog("nope" as unknown)).toBeNull();
  });

  it("keeps the envelope (empty exercises) for an object with no recognizable shape", () => {
    const out = migrateLog({ id: "z", date: "x" })!;
    expect(out).not.toBeNull();
    expect(out.exercises).toEqual([]);
  });
});

describe("migrateLog: in_progress status migration safety", () => {
  it("a legacy saved log with explicit status 'modified' and fewer sets than planned STAYS 'modified' — never reinterpreted as in_progress", () => {
    // A saved history entry is, by definition, a terminal/finished session —
    // even if it only has 1 of 3 planned sets recorded (e.g. "Finish as
    // modified" partway through, or an older build's partial-completion bug).
    const raw = {
      id: "lp", date: "x", mode: "normal",
      exercises: [{
        exerciseSlug: "dumbbell-squat", plannedSets: 3, status: "modified",
        actualSets: [{ setNumber: 1, reps: 10, weight: 20, weightUnit: "lb", rpe: 7, completed: true }],
        sessionFeel: "good", modified: true,
      }],
    };
    const out = migrateLog(raw)!;
    expect(out.exercises[0].status).toBe("modified");
    expect(out.exercises[0].actualSets).toHaveLength(1);
  });

  it("an explicit 'in_progress' status validates through migration without crashing (defensive — should never actually be saved)", () => {
    const raw = {
      id: "lip", date: "x", mode: "normal",
      exercises: [{
        exerciseSlug: "dumbbell-squat", plannedSets: 3, status: "in_progress",
        actualSets: [{ setNumber: 1, reps: 10, weight: 20, weightUnit: "lb", rpe: 7, completed: true }],
        sessionFeel: "good", modified: false,
      }],
    };
    expect(() => migrateLog(raw)).not.toThrow();
    const out = migrateLog(raw)!;
    expect(out.exercises[0].status).toBe("in_progress");
  });

  it("old fully-completed and skipped logs are unaffected by the new status", () => {
    const completedRaw = {
      id: "lc", date: "x", mode: "normal",
      exercises: [{
        exerciseSlug: "push-up", plannedSets: 3, status: "completed",
        actualSets: [1, 2, 3].map((n) => ({ setNumber: n, reps: 10, weight: 0, weightUnit: "lb", rpe: 7, completed: true })),
        sessionFeel: "good", modified: false,
      }],
    };
    expect(migrateLog(completedRaw)!.exercises[0].status).toBe("completed");

    const skippedRaw = {
      id: "ls", date: "x", mode: "normal",
      exercises: [{ exerciseSlug: "push-up", plannedSets: 3, status: "skipped", actualSets: [], sessionFeel: "missed", modified: false }],
    };
    expect(migrateLog(skippedRaw)!.exercises[0].status).toBe("skipped");
  });
});

describe("migrateLogs", () => {
  it("returns [] for non-array / corrupt top-level values", () => {
    expect(migrateLogs(null)).toEqual([]);
    expect(migrateLogs(undefined)).toEqual([]);
    expect(migrateLogs("{bad json")).toEqual([]);
    expect(migrateLogs({})).toEqual([]);
  });

  it("skips unrecoverable entries but keeps valid ones", () => {
    const out = migrateLogs([null, 5, "x", { performances: [{ slug: "push-up", feel: "easy" }] }]);
    expect(out).toHaveLength(1);
    expect(out[0].exercises[0].exerciseSlug).toBe("push-up");
  });
});

describe("history lookups", () => {
  const mkLog = (slug: string, reps: number, weight: number, date: string): WorkoutLog => ({
    version: 2, id: date, workoutId: "w", title: "t", mode: "normal", date,
    exercises: [{
      exerciseSlug: slug, exerciseName: slug, status: "completed", plannedSets: 1, plannedRepRange: [8, 12],
      plannedRestSeconds: 60, plannedRpeTarget: 7,
      actualSets: [{ setNumber: 1, reps, weight, weightUnit: "lb", rpe: 7, completed: true }],
      sessionFeel: "good", modified: false,
    }],
  });

  it("lastExerciseLogFor finds the newest matching exercise (newest-first order)", () => {
    const logs = [mkLog("dumbbell-squat", 10, 30, "2026-02-02"), mkLog("dumbbell-squat", 8, 20, "2026-01-01")];
    const found = lastExerciseLogFor(logs, "dumbbell-squat");
    expect(found?.actualSets[0].weight).toBe(30);
    expect(lastExerciseLogFor(logs, "missing")).toBeUndefined();
  });

  it("lastWeightFor returns the heaviest completed weight from the latest log", () => {
    const logs = [mkLog("dumbbell-squat", 10, 35, "2026-02-02")];
    expect(lastWeightFor(logs, "dumbbell-squat")).toBe(35);
    expect(lastWeightFor(logs, "missing")).toBeUndefined();
  });
});
