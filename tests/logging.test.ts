import { describe, it, expect } from "vitest";
import {
  makeNotStartedLog, makePlannedLog, makeSkippedLog, isExerciseLogged, pendingExercises,
} from "@/lib/logs";
import type { ExercisePrescription, ExerciseLog } from "@/lib/types";

function presc(overrides: Partial<ExercisePrescription> = {}): ExercisePrescription {
  return {
    slug: "x", displayName: "X", equipment: "dumbbell", movementPattern: "squat",
    primaryMuscle: "quads", difficulty: "beginner", sets: [3, 3], reps: [8, 12],
    timeBased: false, restSeconds: 60, rpe: 7, substitutions: [],
    safetyNotes: "s", jointRiskNotes: "j", regression: "r", ...overrides,
  };
}

describe("honest logging: initial state", () => {
  it("a new exercise log starts not_started with NO completed sets", () => {
    const log = makeNotStartedLog(presc());
    expect(log.status).toBe("not_started");
    expect(log.actualSets).toEqual([]);
  });
});

describe("honest logging: explicit actions", () => {
  it("'Log as planned' creates completed sets only when invoked", () => {
    const log = makePlannedLog(presc({ sets: [3, 3], reps: [8, 12] }), "lb", 25);
    expect(log.status).toBe("completed");
    expect(log.actualSets).toHaveLength(3);
    expect(log.actualSets.every((s) => s.completed)).toBe(true);
    expect(log.actualSets[0].reps).toBe(12); // top of range
    expect(log.actualSets[0].weight).toBe(25);
    expect(log.actualSets[0].weightUnit).toBe("lb");
  });

  it("'Skip' records a skipped/missed exercise with no completed sets", () => {
    const log = makeSkippedLog(presc());
    expect(log.status).toBe("skipped");
    expect(log.sessionFeel).toBe("missed");
    expect(log.actualSets).toEqual([]);
  });
});

describe("honest logging: completion gate", () => {
  const notStarted = makeNotStartedLog(presc({ slug: "a" }));
  const planned = makePlannedLog(presc({ slug: "b" }), "lb", 10);
  const skipped = makeSkippedLog(presc({ slug: "c" }));

  it("isExerciseLogged is false only for not_started", () => {
    expect(isExerciseLogged(notStarted)).toBe(false);
    expect(isExerciseLogged(undefined)).toBe(false);
    expect(isExerciseLogged(planned)).toBe(true);
    expect(isExerciseLogged(skipped)).toBe(true); // skipping counts as an explicit decision
  });

  it("completing with untouched exercises is blocked (pending list non-empty)", () => {
    const logs: Record<string, ExerciseLog> = { a: notStarted, b: planned };
    // 'a' is not_started and 'c' is missing entirely -> both pending.
    expect(pendingExercises(["a", "b", "c"], logs)).toEqual(["a", "c"]);
  });

  it("a fully logged/skipped workout has no pending exercises", () => {
    const logs: Record<string, ExerciseLog> = { b: planned, c: skipped };
    expect(pendingExercises(["b", "c"], logs)).toEqual([]);
  });
});
