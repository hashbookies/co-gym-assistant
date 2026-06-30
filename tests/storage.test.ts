// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  loadLogs, addLog, loadSettings, saveSettings, lastExerciseLog, lastWeight, DEFAULT_SETTINGS,
} from "@/lib/storage";
import { CURRENT_LOG_VERSION } from "@/lib/types";
import type { WorkoutLog } from "@/lib/types";

const LOGS_KEY = "cogym.logs";

function v2Log(slug: string, reps: number, weight: number): WorkoutLog {
  return {
    version: CURRENT_LOG_VERSION, id: "l1", workoutId: "w", title: "Full Body A",
    mode: "normal", date: new Date().toISOString(),
    exercises: [{
      exerciseSlug: slug, exerciseName: "X", status: "completed", plannedSets: 2, plannedRepRange: [8, 12],
      plannedRestSeconds: 60, plannedRpeTarget: 7,
      actualSets: [
        { setNumber: 1, reps, weight, weightUnit: "lb", rpe: 7, completed: true },
        { setNumber: 2, reps, weight, weightUnit: "lb", rpe: 8, completed: true },
      ],
      sessionFeel: "good", modified: false,
    }],
  };
}

beforeEach(() => window.localStorage.clear());

describe("storage: settings", () => {
  it("returns defaults including weightUnit when nothing is stored", () => {
    expect(loadSettings().weightUnit).toBe("lb");
    expect(loadSettings()).toMatchObject(DEFAULT_SETTINGS);
  });
  it("round-trips a changed weight unit", () => {
    saveSettings({ ...DEFAULT_SETTINGS, weightUnit: "kg" });
    expect(loadSettings().weightUnit).toBe("kg");
  });
});

describe("storage: logs safety + per-set round-trip", () => {
  it("returns [] when no logs are stored", () => {
    expect(loadLogs()).toEqual([]);
  });

  it("does not crash on corrupt JSON and returns []", () => {
    window.localStorage.setItem(LOGS_KEY, "{not valid json");
    expect(loadLogs()).toEqual([]);
  });

  it("does not crash when logs is a non-array value", () => {
    window.localStorage.setItem(LOGS_KEY, JSON.stringify({ nope: true }));
    expect(loadLogs()).toEqual([]);
  });

  it("migrates an old v1 log found in storage", () => {
    window.localStorage.setItem(LOGS_KEY, JSON.stringify([
      { id: "old", title: "Old", mode: "normal", date: "x", performances: [{ slug: "push-up", feel: "hard" }] },
    ]));
    const logs = loadLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].version).toBe(CURRENT_LOG_VERSION);
    expect(logs[0].exercises[0].exerciseSlug).toBe("push-up");
  });

  it("addLog stores a versioned v2 log and preserves per-set data", () => {
    addLog(v2Log("dumbbell-squat", 10, 25));
    const logs = loadLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].version).toBe(CURRENT_LOG_VERSION);
    expect(logs[0].exercises[0].status).toBe("completed");
    expect(logs[0].exercises[0].actualSets).toHaveLength(2);
    expect(logs[0].exercises[0].actualSets[0].reps).toBe(10);
  });

  it("history lookups work through storage", () => {
    addLog(v2Log("dumbbell-squat", 10, 25));
    expect(lastExerciseLog("dumbbell-squat")?.exerciseSlug).toBe("dumbbell-squat");
    expect(lastWeight("dumbbell-squat")).toBe(25);
    expect(lastExerciseLog("missing")).toBeUndefined();
  });
});
