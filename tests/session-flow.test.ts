import { describe, it, expect } from "vitest";
import {
  completedSetCount, remainingSets, nextSetNumber, isExerciseComplete, recommendRest,
} from "@/lib/session-flow";
import type { ExerciseLog, ActualSet, ExerciseStatus } from "@/lib/types";

const set = (completed: boolean): ActualSet =>
  ({ setNumber: 1, reps: 10, weight: 20, weightUnit: "lb", rpe: 7, completed });

function log(overrides: Partial<ExerciseLog> = {}): ExerciseLog {
  return {
    exerciseSlug: "x", exerciseName: "X", status: "not_started",
    plannedSets: 3, plannedRepRange: [8, 12], plannedRestSeconds: 45, plannedRpeTarget: 7,
    actualSets: [], sessionFeel: "good", modified: false,
    ...overrides,
  };
}

describe("session-flow: completedSetCount", () => {
  it("derives the count from actualSets, not a separate counter", () => {
    const l = log({ status: "in_progress", actualSets: [set(true), set(false), set(true)] });
    expect(completedSetCount(l)).toBe(2);
  });
  it("is 0 for an empty actualSets array", () => {
    expect(completedSetCount(log({ status: "not_started" }))).toBe(0);
  });
});

describe("session-flow: nextSetNumber", () => {
  it("is set 1 when nothing is completed yet", () => {
    const l = log({ status: "in_progress", actualSets: [] });
    expect(nextSetNumber(l)).toBe(1);
  });
  it("is completedCount + 1 with sets remaining", () => {
    const l = log({ status: "in_progress", actualSets: [set(true)] });
    expect(nextSetNumber(l)).toBe(2);
  });
  it("clamps to the last planned set once everything is done (never overshoots)", () => {
    const l = log({ status: "completed", actualSets: [set(true), set(true), set(true)] });
    expect(nextSetNumber(l)).toBe(3);
  });
});

describe("session-flow: isExerciseComplete", () => {
  it("is true only for status 'completed'", () => {
    const l = log({ status: "completed", actualSets: [set(true), set(true), set(true)] });
    expect(isExerciseComplete(l)).toBe(true);
  });
  it("is false for 'in_progress', even with sets logged", () => {
    const l = log({ status: "in_progress", actualSets: [set(true), set(true)] });
    expect(isExerciseComplete(l)).toBe(false);
  });
  it("is false for 'modified' — that's a distinct terminal state, not 'complete'", () => {
    const l = log({ status: "modified", actualSets: [set(true), set(true), set(true)] });
    expect(isExerciseComplete(l)).toBe(false);
  });
  it("is false for not_started and skipped, regardless of actualSets", () => {
    expect(isExerciseComplete(log({ status: "not_started" }))).toBe(false);
    expect(isExerciseComplete(log({ status: "skipped" }))).toBe(false);
  });
});

describe("session-flow: remainingSets", () => {
  it("1 completed of 3 planned, in_progress, leaves 2 remaining", () => {
    const l = log({ status: "in_progress", plannedSets: 3, actualSets: [set(true)] });
    expect(remainingSets(l)).toBe(2);
  });
  it("is 0 once skipped, even with no actualSets recorded", () => {
    expect(remainingSets(log({ status: "skipped" }))).toBe(0);
  });
  it("is 0 for not_started", () => {
    expect(remainingSets(log({ status: "not_started" }))).toBe(0);
  });
  it("is 0 for a terminal 'modified' log, even with fewer sets than planned", () => {
    // "modified" is terminal (e.g. via "Finish as modified") — nothing more
    // is being guided toward, regardless of how many sets were logged.
    const l = log({ status: "modified", plannedSets: 3, actualSets: [set(true)] });
    expect(remainingSets(l)).toBe(0);
  });
  it("is 0 for 'completed' (all planned sets are already done by definition)", () => {
    const l = log({ status: "completed", plannedSets: 3, actualSets: [set(true), set(true), set(true)] });
    expect(remainingSets(l)).toBe(0);
  });
});

describe("session-flow: recommendRest", () => {
  it("recommends rest while 'in_progress' with sets remaining", () => {
    const l = log({ status: "in_progress", plannedSets: 3, actualSets: [set(true)] });
    expect(recommendRest(l)).toBe(true);
  });
  it("does not recommend rest when the exercise is skipped", () => {
    const l = log({ status: "skipped" });
    expect(recommendRest(l)).toBe(false);
  });
  it("does not recommend rest once the exercise is complete", () => {
    const l = log({ status: "completed", plannedSets: 3, actualSets: [set(true), set(true), set(true)] });
    expect(recommendRest(l)).toBe(false);
  });
  it("does not recommend rest when nothing has been logged yet", () => {
    const l = log({ status: "not_started" });
    expect(recommendRest(l)).toBe(false);
  });
  it("does not recommend rest for a terminal 'modified' log — it's finished, not in progress", () => {
    const l = log({ status: "modified", plannedSets: 3, actualSets: [set(true)] });
    expect(recommendRest(l)).toBe(false);
  });
});

describe("session-flow: every ExerciseStatus is handled without throwing", () => {
  const statuses: ExerciseStatus[] = ["not_started", "in_progress", "completed", "modified", "skipped"];
  it.each(statuses)("status=%s", (status) => {
    const l = log({ status, actualSets: status === "not_started" || status === "skipped" ? [] : [set(true)] });
    expect(() => {
      completedSetCount(l); remainingSets(l); nextSetNumber(l); isExerciseComplete(l); recommendRest(l);
    }).not.toThrow();
  });
});
