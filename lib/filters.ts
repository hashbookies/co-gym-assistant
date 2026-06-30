// Pure, testable filters over the curated pool. The generator-eligibility rule
// is the safety-critical one: any exercise that needs equipment the user hasn't
// explicitly enabled is excluded from default generator output.

import type { PoolExercise, Settings } from "@/lib/types";

/**
 * Is this exercise allowed in the DEFAULT generator output for these settings?
 * Equipment gates (anchor/bench/pull-up bar/door/special) are excluded unless
 * the user has opted in via settings. The MVP pool ships with all gates false,
 * but this enforces the rule defensively for any future data.
 */
export function isGeneratorEligible(ex: PoolExercise, settings: Settings): boolean {
  if (ex.requiresAnchor && !settings.hasDoorAnchor) return false;
  if (ex.requiresDoorSetup && !settings.hasDoorAnchor) return false;
  if (ex.requiresBench && !settings.hasBench) return false;
  if (ex.requiresPullupBar && !settings.hasPullupBar) return false;
  if (ex.requiresSpecialEquipment) return false; // never auto-included in MVP

  // Equipment availability from settings.
  if (ex.equipment === "dumbbell" && !settings.equipment.dumbbell) return false;
  if (ex.equipment === "band" && !settings.equipment.band) return false;
  if (ex.equipment === "bodyweight" && !settings.equipment.bodyweight) return false;

  return ex.homeSuitable;
}

export function byCategory(pool: PoolExercise[], category: string): PoolExercise[] {
  return pool.filter((e) => e.category === category);
}

export function lowEnergyOnly(pool: PoolExercise[]): PoolExercise[] {
  return pool.filter((e) => e.lowEnergyFriendly);
}

export function excludeAdvanced(pool: PoolExercise[]): PoolExercise[] {
  return pool.filter((e) => e.difficulty !== "advanced");
}

/** Prefer beginner-suitable exercises, but fall back to the full set. */
export function preferBeginner(pool: PoolExercise[]): PoolExercise[] {
  const beginner = pool.filter((e) => e.beginnerSuitable);
  return beginner.length ? beginner : pool;
}
