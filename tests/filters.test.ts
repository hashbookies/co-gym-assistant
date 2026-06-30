import { describe, it, expect } from "vitest";
import { isGeneratorEligible, byCategory, lowEnergyOnly, preferBeginner } from "@/lib/filters";
import { DEFAULT_SETTINGS } from "@/lib/storage";
import { getPool } from "@/lib/data/pool";
import { getLibrary } from "@/lib/data/library";
import type { PoolExercise, Settings } from "@/lib/types";

// Minimal valid PoolExercise factory for gate testing.
function ex(overrides: Partial<PoolExercise>): PoolExercise {
  return {
    slug: "x", displayName: "X", sourceId: "0", equipment: "dumbbell", category: "Squat",
    image: "", gif: "",
    movementPattern: "squat", movementPatternConfidence: "high", splitTag: "legs",
    splitTagConfidence: "high", bodyRegion: "lower", primaryMuscle: "quads", secondaryMuscles: [],
    beginnerSuitable: true, difficulty: "beginner", difficultyConfidence: "manual-confirmed",
    homeSuitable: true, requiresAnchor: false, requiresBench: false, requiresPullupBar: false,
    requiresSpecialEquipment: false, requiresDoorSetup: false, canonicalExercise: true,
    duplicateGroup: null, repRange: [8, 12], setRange: [2, 3], restSeconds: 60, rpeTarget: 7,
    timeBased: false, progression: "p", regression: "r", substitutions: [], lowEnergyFriendly: false,
    jointRiskNotes: "j", safetyNotes: "s", whySelected: "w",
    ...overrides,
  };
}

const S: Settings = DEFAULT_SETTINGS;

describe("filters: defaults", () => {
  it("advanced-equipment settings default to false", () => {
    expect(S.hasDoorAnchor).toBe(false);
    expect(S.hasBench).toBe(false);
    expect(S.hasPullupBar).toBe(false);
  });
});

describe("filters: isGeneratorEligible gate exclusion", () => {
  it("excludes requiresAnchor unless door anchor enabled", () => {
    expect(isGeneratorEligible(ex({ requiresAnchor: true }), S)).toBe(false);
    expect(isGeneratorEligible(ex({ requiresAnchor: true }), { ...S, hasDoorAnchor: true })).toBe(true);
  });
  it("excludes requiresDoorSetup unless door anchor enabled", () => {
    expect(isGeneratorEligible(ex({ requiresDoorSetup: true }), S)).toBe(false);
    expect(isGeneratorEligible(ex({ requiresDoorSetup: true }), { ...S, hasDoorAnchor: true })).toBe(true);
  });
  it("excludes requiresBench unless bench enabled", () => {
    expect(isGeneratorEligible(ex({ requiresBench: true }), S)).toBe(false);
    expect(isGeneratorEligible(ex({ requiresBench: true }), { ...S, hasBench: true })).toBe(true);
  });
  it("excludes requiresPullupBar unless pull-up bar enabled", () => {
    expect(isGeneratorEligible(ex({ requiresPullupBar: true }), S)).toBe(false);
    expect(isGeneratorEligible(ex({ requiresPullupBar: true }), { ...S, hasPullupBar: true })).toBe(true);
  });
  it("always excludes requiresSpecialEquipment in MVP", () => {
    expect(isGeneratorEligible(ex({ requiresSpecialEquipment: true }), S)).toBe(false);
    expect(isGeneratorEligible(ex({ requiresSpecialEquipment: true }), { ...S, hasBench: true, hasDoorAnchor: true, hasPullupBar: true })).toBe(false);
  });
});

describe("filters: equipment availability", () => {
  it("respects dumbbell / band / bodyweight toggles", () => {
    expect(isGeneratorEligible(ex({ equipment: "dumbbell" }), { ...S, equipment: { ...S.equipment, dumbbell: false } })).toBe(false);
    expect(isGeneratorEligible(ex({ equipment: "band" }), { ...S, equipment: { ...S.equipment, band: false } })).toBe(false);
    expect(isGeneratorEligible(ex({ equipment: "bodyweight" }), { ...S, equipment: { ...S.equipment, bodyweight: false } })).toBe(false);
  });
  it("allows clean exercises with default settings", () => {
    expect(isGeneratorEligible(ex({}), S)).toBe(true);
  });
});

describe("filters: helpers over the real pool", () => {
  const pool = getPool();
  it("byCategory returns only that category", () => {
    const squats = byCategory(pool, "Squat");
    expect(squats.length).toBeGreaterThan(0);
    expect(squats.every((e) => e.category === "Squat")).toBe(true);
  });
  it("lowEnergyOnly returns only low-energy-friendly", () => {
    expect(lowEnergyOnly(pool).every((e) => e.lowEnergyFriendly)).toBe(true);
  });
  it("preferBeginner falls back to full set when no beginners", () => {
    const noBeginners = [ex({ beginnerSuitable: false, difficulty: "intermediate" })];
    expect(preferBeginner(noBeginners).length).toBe(1);
  });
});

describe("library vs generator pool", () => {
  it("library is much larger than the curated pool and includes non-generator exercises", () => {
    const lib = getLibrary();
    const pool = getPool();
    expect(lib.length).toBeGreaterThan(pool.length);
    expect(lib.some((c) => !c.inGeneratorPool)).toBe(true);
    expect(lib.some((c) => c.inGeneratorPool)).toBe(true);
  });
});
