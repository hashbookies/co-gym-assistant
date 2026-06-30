import { describe, it, expect } from "vitest";
import { generateWorkout, generateWeek } from "@/lib/generator";
import { getPool } from "@/lib/data/pool";
import { DEFAULT_SETTINGS } from "@/lib/storage";
import type { Settings, Workout } from "@/lib/types";

const POOL = getPool();
const POOL_SLUGS = new Set(POOL.map((e) => e.slug));
const S: Settings = DEFAULT_SETTINGS;
const allRx = (w: Workout) => [...w.warmup, ...w.main];

describe("generator: source integrity", () => {
  it("only ever emits exercises from the curated MVP pool", () => {
    for (const dayIndex of [0, 1, 2]) {
      const w = generateWorkout(POOL, S, { dayIndex, seed: "user" });
      for (const p of allRx(w)) expect(POOL_SLUGS.has(p.slug)).toBe(true);
    }
  });

  it("never emits an equipment-gated exercise by default", () => {
    for (const mode of ["normal", "low-energy"] as const) {
      for (const dayIndex of [0, 1, 2]) {
        const w = generateWorkout(POOL, S, { mode, dayIndex, seed: "user" });
        for (const p of allRx(w)) {
          const src = POOL.find((e) => e.slug === p.slug)!;
          expect(src.requiresAnchor).toBe(false);
          expect(src.requiresBench).toBe(false);
          expect(src.requiresPullupBar).toBe(false);
          expect(src.requiresDoorSetup).toBe(false);
          expect(src.requiresSpecialEquipment).toBe(false);
        }
      }
    }
  });

  it("substitutions resolve to real curated pool slugs", () => {
    const w = generateWorkout(POOL, S, { dayIndex: 0, seed: "user" });
    for (const p of w.main) {
      for (const sub of p.substitutions) expect(POOL_SLUGS.has(sub)).toBe(true);
    }
  });

  it("every prescription exposes slug + media URLs for workout cards", () => {
    const w = generateWorkout(POOL, S, { dayIndex: 0, seed: "user" });
    for (const p of allRx(w)) {
      expect(typeof p.slug).toBe("string");
      expect(p.image).toMatch(/^\/images\//);
      expect(p.gif).toMatch(/^\/videos\//);
    }
  });
});

describe("generator: intensity rules", () => {
  it("normal workouts never exceed RPE 7", () => {
    for (const dayIndex of [0, 1, 2]) {
      const w = generateWorkout(POOL, S, { mode: "normal", dayIndex, seed: "user" });
      for (const p of allRx(w)) expect(p.rpe).toBeLessThanOrEqual(7);
    }
  });

  it("low-energy main work uses RPE 5–6 only", () => {
    for (const dayIndex of [0, 1, 2]) {
      const w = generateWorkout(POOL, S, { mode: "low-energy", dayIndex, seed: "user" });
      for (const p of w.main) {
        expect(p.rpe).toBeGreaterThanOrEqual(5);
        expect(p.rpe).toBeLessThanOrEqual(6);
      }
    }
  });

  it("low-energy uses only lowEnergyFriendly exercises", () => {
    for (const dayIndex of [0, 1, 2]) {
      const w = generateWorkout(POOL, S, { mode: "low-energy", dayIndex, seed: "user" });
      for (const p of w.main) {
        const src = POOL.find((e) => e.slug === p.slug)!;
        expect(src.lowEnergyFriendly).toBe(true);
      }
    }
  });

  it("low-energy is shorter and capped at 2 sets", () => {
    const w = generateWorkout(POOL, S, { mode: "low-energy", dayIndex: 0, seed: "user" });
    expect(w.main.length).toBeLessThanOrEqual(4);
    for (const p of w.main) expect(p.sets[1]).toBeLessThanOrEqual(2);
  });

  it("never programs to failure (RPE strictly below 10)", () => {
    const w = generateWorkout(POOL, S, { dayIndex: 1, seed: "user" });
    for (const p of allRx(w)) expect(p.rpe).toBeLessThan(10);
  });
});

describe("generator: 3-day emphasis rotation", () => {
  it("Day A/B/C lead with squat / hinge / lunge", () => {
    const week = generateWeek(POOL, S, "user");
    expect(week[0].emphasis).toBe("Squat");
    expect(week[1].emphasis).toBe("Hinge");
    expect(week[2].emphasis).toBe("Lunge");
    expect(week[0].main[0].movementPattern).toBe("squat");
    expect(week[1].main[0].movementPattern).toBe("hinge");
    expect(week[2].main[0].movementPattern).toBe("lunge");
  });

  it("the same hard leg pattern never lands on back-to-back days", () => {
    const week = generateWeek(POOL, S, "user");
    expect(week[0].emphasis).not.toBe(week[1].emphasis);
    expect(week[1].emphasis).not.toBe(week[2].emphasis);
  });
});

describe("generator: balance", () => {
  it("each normal day covers legs, push, pull, and core/mobility", () => {
    for (const dayIndex of [0, 1, 2]) {
      const w = generateWorkout(POOL, S, { dayIndex, seed: "user" });
      const splits = new Set(w.main.map((p) => p.slug).map((s) => POOL.find((e) => e.slug === s)!.splitTag));
      expect(splits.has("legs")).toBe(true);
      expect(splits.has("push")).toBe(true);
      expect(splits.has("pull")).toBe(true);
      const hasCore = splits.has("core");
      const hasMobility = w.warmup.some((p) => p.movementPattern === "mobility");
      expect(hasCore || hasMobility).toBe(true);
    }
  });

  it("includes a warm-up", () => {
    const w = generateWorkout(POOL, S, { dayIndex: 0, seed: "user" });
    expect(w.warmup.length).toBeGreaterThan(0);
  });

  it("session length scales the number of main exercises", () => {
    const short = generateWorkout(POOL, { ...S, durationMin: 20 }, { dayIndex: 0, seed: "user" });
    const long = generateWorkout(POOL, { ...S, durationMin: 60 }, { dayIndex: 0, seed: "user" });
    expect(long.main.length).toBeGreaterThan(short.main.length);
  });
});

describe("generator: determinism", () => {
  it("same seed + inputs => identical exercise selection", () => {
    const a = generateWorkout(POOL, S, { dayIndex: 2, seed: "abc" });
    const b = generateWorkout(POOL, S, { dayIndex: 2, seed: "abc" });
    expect(a.main.map((p) => p.slug)).toEqual(b.main.map((p) => p.slug));
    expect(a.warmup.map((p) => p.slug)).toEqual(b.warmup.map((p) => p.slug));
  });

  it("different seeds can produce different (still valid) workouts", () => {
    const variants = new Set<string>();
    for (const seed of ["s1", "s2", "s3", "s4", "s5"]) {
      const w = generateWorkout(POOL, S, { dayIndex: 0, seed });
      // still valid: leads with squat, all from pool
      expect(w.main[0].movementPattern).toBe("squat");
      expect(w.main.every((p) => POOL_SLUGS.has(p.slug))).toBe(true);
      variants.add(w.main.map((p) => p.slug).join("|"));
    }
    expect(variants.size).toBeGreaterThan(1);
  });
});

describe("generator: respects disabled equipment", () => {
  it("excludes dumbbell exercises when dumbbells are disabled", () => {
    const settings: Settings = { ...S, equipment: { ...S.equipment, dumbbell: false } };
    for (const dayIndex of [0, 1, 2]) {
      const w = generateWorkout(POOL, settings, { dayIndex, seed: "user" });
      for (const p of allRx(w)) expect(p.equipment).not.toBe("dumbbell");
    }
  });
});
