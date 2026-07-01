import { describe, it, expect } from "vitest";
import { suggestProgression, canProgress } from "@/lib/progression";
import { makeNotStartedLog, appendPlannedSet, finishAsModified } from "@/lib/logs";
import type {
  PoolExercise, ExerciseLog, ExercisePrescription, ActualSet, ReadinessResult, Equipment, SessionFeel,
} from "@/lib/types";

function ex(equipment: Equipment, substitutions: string[] = []): PoolExercise {
  return {
    slug: "x", displayName: "X", sourceId: "0", equipment, category: "Squat",
    image: "", gif: "",
    movementPattern: "squat", movementPatternConfidence: "high", splitTag: "legs",
    splitTagConfidence: "high", bodyRegion: "lower", primaryMuscle: "quads", secondaryMuscles: [],
    beginnerSuitable: true, difficulty: "beginner", difficultyConfidence: "manual-confirmed",
    homeSuitable: true, requiresAnchor: false, requiresBench: false, requiresPullupBar: false,
    requiresSpecialEquipment: false, requiresDoorSetup: false, canonicalExercise: true,
    duplicateGroup: null, repRange: [8, 12], setRange: [3, 3], restSeconds: 60, rpeTarget: 7,
    timeBased: false, progression: "p", regression: "r", substitutions, lowEnergyFriendly: false,
    jointRiskNotes: "j", safetyNotes: "s", whySelected: "w",
  };
}
const set = (reps: number, rpe = 7, completed = true): ActualSet =>
  ({ setNumber: 1, reps, weight: 20, weightUnit: "lb", rpe, completed });
function log(
  actualSets: ActualSet[],
  sessionFeel: SessionFeel = "good",
  status: ExerciseLog["status"] = "completed",
): ExerciseLog {
  return {
    exerciseSlug: "x", exerciseName: "X", status, plannedSets: actualSets.length, plannedRepRange: [8, 12],
    plannedRestSeconds: 60, plannedRpeTarget: 7, actualSets, sessionFeel, modified: status === "modified",
  };
}
const readiness = (rec: ReadinessResult["recommendation"]): ReadinessResult =>
  ({ recommendation: rec, redFlags: [], reasons: [], date: new Date().toISOString() });
const topSets = [set(12), set(12), set(12)];

describe("canProgress gate", () => {
  it("allows progression only on normal readiness", () => {
    expect(canProgress(null)).toBe(true);
    expect(canProgress(readiness("normal"))).toBe(true);
    expect(canProgress(readiness("low-energy"))).toBe(false);
    expect(canProgress(readiness("rest"))).toBe(false);
  });
});

describe("suggestProgression (per-set)", () => {
  it("establishes a baseline with no history", () => {
    expect(suggestProgression(ex("dumbbell"), undefined).action).toBe("establish");
  });

  it("holds when readiness is not normal, even after a top-range session", () => {
    expect(suggestProgression(ex("dumbbell"), log(topSets), readiness("low-energy")).action).toBe("hold");
    expect(suggestProgression(ex("dumbbell"), log(topSets), readiness("rest")).action).toBe("hold");
  });

  it("holds after a missed set", () => {
    const sets = [set(12), set(8, 7, false), set(12)];
    expect(suggestProgression(ex("dumbbell"), log(sets), readiness("normal")).action).toBe("hold");
  });

  it("holds after a skipped or not-started exercise", () => {
    expect(suggestProgression(ex("dumbbell"), log([], "missed", "skipped"), readiness("normal")).action).toBe("hold");
    expect(suggestProgression(ex("dumbbell"), log([], "good", "not_started"), readiness("normal")).action).toBe("hold");
  });

  it("holds after a high-RPE session", () => {
    const sets = [set(12, 9), set(12, 9), set(12, 9)];
    expect(suggestProgression(ex("dumbbell"), log(sets), readiness("normal")).action).toBe("hold");
  });

  it("suggests adding reps when below the top of the range", () => {
    const sets = [set(9), set(9), set(8)];
    const s = suggestProgression(ex("dumbbell"), log(sets), readiness("normal"));
    expect(s.action).toBe("add-reps");
  });

  it("suggests increasing weight after a top-of-range loaded session", () => {
    expect(suggestProgression(ex("dumbbell"), log(topSets), readiness("normal")).action).toBe("add-weight");
    expect(suggestProgression(ex("band"), log(topSets), readiness("normal")).action).toBe("add-weight");
  });

  it("bodyweight progression never suggests adding weight", () => {
    const withSubs = suggestProgression(ex("bodyweight", ["diamond-push-up"]), log(topSets), readiness("normal"));
    expect(withSubs.action).not.toBe("add-weight");
    expect(withSubs.action).toBe("harder-variation");

    const noSubs = suggestProgression(ex("bodyweight", []), log(topSets), readiness("normal"));
    expect(noSubs.action).not.toBe("add-weight");
    expect(noSubs.action).toBe("add-set");
  });
});

describe("suggestProgression (sparse / migrated — sessionFeel only)", () => {
  const empty = (feel: SessionFeel) => log([], feel);
  it("missed -> hold", () => {
    expect(suggestProgression(ex("dumbbell"), empty("missed"), readiness("normal")).action).toBe("hold");
  });
  it("hard -> add reps", () => {
    expect(suggestProgression(ex("dumbbell"), empty("hard"), readiness("normal")).action).toBe("add-reps");
  });
  it("easy + loaded -> add weight; easy + bodyweight -> not weight", () => {
    expect(suggestProgression(ex("dumbbell"), empty("easy"), readiness("normal")).action).toBe("add-weight");
    expect(suggestProgression(ex("bodyweight", []), empty("easy"), readiness("normal")).action).not.toBe("add-weight");
  });
});

describe("suggestProgression reads progressively-built logs ('Log set as planned' taps) correctly", () => {
  const prescription: ExercisePrescription = {
    slug: "x", displayName: "X", equipment: "dumbbell", movementPattern: "squat",
    primaryMuscle: "quads", difficulty: "beginner", image: "", gif: "",
    sets: [3, 3], reps: [8, 12], timeBased: false, restSeconds: 60, rpe: 7,
    substitutions: [], safetyNotes: "s", jointRiskNotes: "j", regression: "r",
  };

  it("a log built one tap at a time (top of range, given weight) suggests add-weight, same as a bulk-logged session", () => {
    let built = makeNotStartedLog(prescription);
    built = appendPlannedSet(built, prescription, "lb", 20);
    built = appendPlannedSet(built, prescription, "lb", 20);
    built = appendPlannedSet(built, prescription, "lb", 20);
    expect(built.status).toBe("completed");
    expect(built.actualSets).toHaveLength(3);

    const bulk = log(topSets); // status "completed", same 3x reps-at-top-of-range shape
    expect(suggestProgression(ex("dumbbell"), built, readiness("normal")))
      .toEqual(suggestProgression(ex("dumbbell"), bulk, readiness("normal")));
    expect(suggestProgression(ex("dumbbell"), built, readiness("normal")).action).toBe("add-weight");
  });

  it("holds for an in_progress log (1 of 3 planned sets tapped) — never reads a partial session as strong", () => {
    let built = makeNotStartedLog(prescription);
    built = appendPlannedSet(built, prescription, "lb", 20); // only 1 of 3 planned sets
    expect(built.status).toBe("in_progress");
    expect(built.actualSets).toHaveLength(1);

    expect(suggestProgression(ex("dumbbell"), built, readiness("normal")).action).toBe("hold");
  });

  it("holds for a 'modified' log finished early with fewer sets than planned (conservative, not a false progress signal)", () => {
    let built = makeNotStartedLog(prescription);
    built = appendPlannedSet(built, prescription, "lb", 20); // 1 of 3 planned sets
    built = finishAsModified(built, prescription); // user stops here, terminal
    expect(built.status).toBe("modified");
    expect(built.actualSets).toHaveLength(1);

    expect(suggestProgression(ex("dumbbell"), built, readiness("normal")).action).toBe("hold");
  });

  it("a 'modified' log that DOES cover every planned set (just via the manual editor) can still progress normally", () => {
    let built = makeNotStartedLog(prescription);
    built = appendPlannedSet(built, prescription, "lb", 20);
    built = appendPlannedSet(built, prescription, "lb", 20);
    built = appendPlannedSet(built, prescription, "lb", 20); // completed, 3 of 3
    built = { ...built, status: "modified", modified: true }; // e.g. user tweaked something via Edit sets
    expect(built.actualSets).toHaveLength(3);

    expect(suggestProgression(ex("dumbbell"), built, readiness("normal")).action).toBe("add-weight");
  });
});
