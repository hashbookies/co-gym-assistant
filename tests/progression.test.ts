import { describe, it, expect } from "vitest";
import { suggestProgression, canProgress } from "@/lib/progression";
import type { PoolExercise, ExercisePerformance, ReadinessResult, Equipment } from "@/lib/types";

function ex(equipment: Equipment, substitutions: string[] = []): PoolExercise {
  return {
    slug: "x", displayName: "X", sourceId: "0", equipment, category: "Squat",
    movementPattern: "squat", movementPatternConfidence: "high", splitTag: "legs",
    splitTagConfidence: "high", bodyRegion: "lower", primaryMuscle: "quads", secondaryMuscles: [],
    beginnerSuitable: true, difficulty: "beginner", difficultyConfidence: "manual-confirmed",
    homeSuitable: true, requiresAnchor: false, requiresBench: false, requiresPullupBar: false,
    requiresSpecialEquipment: false, requiresDoorSetup: false, canonicalExercise: true,
    duplicateGroup: null, repRange: [8, 12], setRange: [2, 3], restSeconds: 60, rpeTarget: 7,
    timeBased: false, progression: "p", regression: "r", substitutions, lowEnergyFriendly: false,
    jointRiskNotes: "j", safetyNotes: "s", whySelected: "w",
  };
}
const perf = (feel: ExercisePerformance["feel"]): ExercisePerformance => ({ slug: "x", feel });
const readiness = (rec: ReadinessResult["recommendation"]): ReadinessResult =>
  ({ recommendation: rec, redFlags: [], reasons: [], date: new Date().toISOString() });

describe("canProgress gate", () => {
  it("allows progression only on normal readiness", () => {
    expect(canProgress(null)).toBe(true);
    expect(canProgress(readiness("normal"))).toBe(true);
    expect(canProgress(readiness("low-energy"))).toBe(false);
    expect(canProgress(readiness("rest"))).toBe(false);
  });
});

describe("suggestProgression", () => {
  it("establishes a baseline with no history", () => {
    expect(suggestProgression(ex("dumbbell"), undefined).action).toBe("establish");
  });

  it("holds when readiness is not normal, even after an easy session", () => {
    expect(suggestProgression(ex("dumbbell"), perf("easy"), readiness("low-energy")).action).toBe("hold");
    expect(suggestProgression(ex("dumbbell"), perf("easy"), readiness("rest")).action).toBe("hold");
  });

  it("holds after a missed session (incomplete reps / form)", () => {
    expect(suggestProgression(ex("dumbbell"), perf("missed"), readiness("normal")).action).toBe("hold");
  });

  it("adds reps after a hard-but-complete session", () => {
    expect(suggestProgression(ex("dumbbell"), perf("hard"), readiness("normal")).action).toBe("add-reps");
  });

  it("adds weight after an easy loaded session (dumbbell or band)", () => {
    expect(suggestProgression(ex("dumbbell"), perf("easy"), readiness("normal")).action).toBe("add-weight");
    expect(suggestProgression(ex("band"), perf("easy"), readiness("normal")).action).toBe("add-weight");
  });

  it("progresses bodyweight to a harder variation when one exists", () => {
    const s = suggestProgression(ex("bodyweight", ["diamond-push-up"]), perf("easy"), readiness("normal"));
    expect(s.action).toBe("harder-variation");
    expect(s.text).toContain("diamond push up");
  });

  it("adds a set for bodyweight with no harder variation", () => {
    expect(suggestProgression(ex("bodyweight", []), perf("easy"), readiness("normal")).action).toBe("add-set");
  });

  it("never suggests progression actions after a non-normal day", () => {
    const easy = perf("easy");
    for (const rec of ["low-energy", "rest"] as const) {
      const s = suggestProgression(ex("dumbbell"), easy, readiness(rec));
      expect(["hold"]).toContain(s.action);
    }
  });
});
