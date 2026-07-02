// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  loadLogs, addLog, loadSettings, saveSettings, lastExerciseLog, lastWeight, DEFAULT_SETTINGS,
  loadLogById, updateLog, deleteLog, saveLogs,
} from "@/lib/storage";
import { suggestProgression } from "@/lib/progression";
import { CURRENT_LOG_VERSION } from "@/lib/types";
import type { WorkoutLog, PoolExercise } from "@/lib/types";

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

describe("storage: history detail — read/edit/delete by id", () => {
  it("loadLogById finds an existing log and returns undefined for a missing one", () => {
    addLog(v2Log("dumbbell-squat", 10, 25));
    expect(loadLogById("l1")?.exercises[0].exerciseSlug).toBe("dumbbell-squat");
    expect(loadLogById("does-not-exist")).toBeUndefined();
  });

  it("updateLog persists an edit and it survives a fresh load (round-trips through localStorage)", () => {
    addLog(v2Log("dumbbell-squat", 10, 25));
    const log = loadLogById("l1")!;
    const edited: WorkoutLog = {
      ...log,
      exercises: [{ ...log.exercises[0], actualSets: [{ ...log.exercises[0].actualSets[0], weight: 40 }, log.exercises[0].actualSets[1]] }],
    };
    updateLog(edited);

    const reloaded = loadLogById("l1")!;
    expect(reloaded.exercises[0].actualSets[0].weight).toBe(40);
  });

  it("updateLog is a no-op for an id that doesn't exist — never creates a phantom log", () => {
    addLog(v2Log("dumbbell-squat", 10, 25));
    const before = loadLogs();
    updateLog({ ...before[0], id: "ghost" });
    expect(loadLogs()).toHaveLength(1);
    expect(loadLogById("ghost")).toBeUndefined();
  });

  it("editing a log to fewer completed sets than planned auto-downgrades to 'modified', never silently 'completed'", () => {
    addLog(v2Log("dumbbell-squat", 10, 25));
    const log = loadLogById("l1")!;
    const edited: WorkoutLog = {
      ...log,
      exercises: [{ ...log.exercises[0], status: "completed", actualSets: [log.exercises[0].actualSets[0]] }], // only 1 of 2 planned sets
    };
    updateLog(edited);
    expect(loadLogById("l1")!.exercises[0].status).toBe("modified");
  });

  it("deleteLog removes only the targeted log and updates storage immediately", () => {
    addLog(v2Log("dumbbell-squat", 10, 25));
    addLog({ ...v2Log("push-up", 8, 0), id: "l2" });
    expect(loadLogs()).toHaveLength(2);

    deleteLog("l1");
    const remaining = loadLogs();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe("l2");
    expect(loadLogById("l1")).toBeUndefined();
  });

  it("deleteLog for a non-existent id does not delete anything else", () => {
    addLog(v2Log("dumbbell-squat", 10, 25));
    deleteLog("not-a-real-id");
    expect(loadLogs()).toHaveLength(1);
  });

  it("saveLogs overwrites the full list (used by import replace/merge)", () => {
    addLog(v2Log("dumbbell-squat", 10, 25));
    saveLogs([{ ...v2Log("push-up", 8, 0), id: "l9" }]);
    const logs = loadLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].id).toBe("l9");
  });
});

describe("storage: progression still reads correctly after a log is edited", () => {
  const ex: PoolExercise = {
    slug: "dumbbell-squat", displayName: "Dumbbell Squat", sourceId: "0", equipment: "dumbbell", category: "Squat",
    image: "", gif: "", movementPattern: "squat", movementPatternConfidence: "high", splitTag: "legs",
    splitTagConfidence: "high", bodyRegion: "lower", primaryMuscle: "quads", secondaryMuscles: [],
    beginnerSuitable: true, difficulty: "beginner", difficultyConfidence: "manual-confirmed",
    homeSuitable: true, requiresAnchor: false, requiresBench: false, requiresPullupBar: false,
    requiresSpecialEquipment: false, requiresDoorSetup: false, canonicalExercise: true,
    duplicateGroup: null, repRange: [8, 12], setRange: [2, 2], restSeconds: 60, rpeTarget: 7,
    timeBased: false, progression: "p", regression: "r", substitutions: [], lowEnergyFriendly: false,
    jointRiskNotes: "j", safetyNotes: "s", whySelected: "w",
  };

  it("progression reflects an edited historical log, not the stale original", () => {
    addLog(v2Log("dumbbell-squat", 12, 20)); // top of range -> would suggest add-weight
    expect(suggestProgression(ex, lastExerciseLog("dumbbell-squat"), { recommendation: "normal", redFlags: [], reasons: [], date: "x" }).action)
      .toBe("add-weight");

    // Edit that same log down to below-range reps.
    const log = loadLogById("l1")!;
    const edited: WorkoutLog = {
      ...log,
      exercises: [{
        ...log.exercises[0],
        actualSets: log.exercises[0].actualSets.map((s) => ({ ...s, reps: 8 })),
      }],
    };
    updateLog(edited);

    expect(suggestProgression(ex, lastExerciseLog("dumbbell-squat"), { recommendation: "normal", redFlags: [], reasons: [], date: "x" }).action)
      .toBe("add-reps");
  });
});

describe("storage: write failures are reported, never silently swallowed", () => {
  afterEach(() => vi.restoreAllMocks());

  function makeSetItemThrow() {
    return vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError: the quota has been exceeded", "QuotaExceededError");
    });
  }

  it("a successful write reports { ok: true }", () => {
    expect(saveSettings(DEFAULT_SETTINGS)).toEqual({ ok: true });
    expect(addLog(v2Log("dumbbell-squat", 10, 25))).toEqual({ ok: true });
  });

  it("addLog reports failure (not a thrown exception) when localStorage.setItem throws", () => {
    makeSetItemThrow();
    const result = addLog(v2Log("dumbbell-squat", 10, 25));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/storage may be full/i);
    // Nothing was actually persisted — the failed write must not silently "succeed".
    expect(window.localStorage.getItem(LOGS_KEY)).toBeNull();
  });

  it("updateLog reports failure when the write fails, without pretending the edit landed", () => {
    addLog(v2Log("dumbbell-squat", 10, 25)); // succeeds first, so there's something to edit
    const log = loadLogById("l1")!;

    makeSetItemThrow();
    const result = updateLog({ ...log, title: "Renamed" });
    expect(result.ok).toBe(false);
    // The original, un-renamed log is still what's actually stored.
    expect(loadLogById("l1")!.title).toBe("Full Body A");
  });

  it("deleteLog reports failure with delete-specific copy when the write fails, without pretending the delete landed", () => {
    addLog(v2Log("dumbbell-squat", 10, 25));

    makeSetItemThrow();
    const result = deleteLog("l1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Could not delete this log.");
    // The log is still there — the caller must not navigate away as if it worked.
    expect(loadLogById("l1")).toBeDefined();
  });

  it("saveLogs (the import replace/merge path) reports failure and does not overwrite the existing logs", () => {
    addLog(v2Log("dumbbell-squat", 10, 25));

    makeSetItemThrow();
    const result = saveLogs([{ ...v2Log("push-up", 8, 0), id: "l9" }]);
    expect(result.ok).toBe(false);
    // The pre-import logs are still exactly what's stored — the "import" never actually happened.
    expect(loadLogs().map((l) => l.id)).toEqual(["l1"]);
  });

  it("saveSettings reports failure without pretending the settings were saved", () => {
    makeSetItemThrow();
    const result = saveSettings({ ...DEFAULT_SETTINGS, weightUnit: "kg" });
    expect(result.ok).toBe(false);
    expect(loadSettings().weightUnit).toBe("lb"); // unchanged — the write never actually landed
  });
});
