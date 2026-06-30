// Pure, deterministic 3-day full-body workout generator.
// HARD RULE: only ever reads the curated MVP pool passed in (data/mvp-pool.json).
// No randomness leaks in beyond the seeded rng, so it is fully testable.

import type {
  PoolExercise, Settings, Workout, WorkoutMode, ExercisePrescription,
} from "@/lib/types";
import { isGeneratorEligible, byCategory, lowEnergyOnly, excludeAdvanced, preferBeginner } from "@/lib/filters";
import { mulberry32, hashSeed, pickOne } from "@/lib/rng";

const RPE_CAP_NORMAL = 7;
const RPE_LOW_ENERGY = 5;

// 3-day template. Primary leg pattern rotates squat -> hinge -> lunge so the
// same hard emphasis never lands on back-to-back sessions. Push alternates
// horizontal/vertical. Each day balances legs + push + pull + core (+accessory).
// "warm" slots draw from mobility; "core*" tags pick a different core category.
interface DayTemplate {
  emphasis: string;
  warm: string[]; // categories for warm-up
  main: string[]; // ordered categories; trimmed by duration from the end
}

const DAY_TEMPLATES: DayTemplate[] = [
  {
    emphasis: "Squat",
    warm: ["Mobility/warm-up", "Mobility/warm-up"],
    main: ["Squat", "Horizontal push", "Horizontal pull", "Core anti-extension", "Calves", "Shoulder isolation"],
  },
  {
    emphasis: "Hinge",
    warm: ["Mobility/warm-up", "Mobility/warm-up"],
    main: ["Hinge", "Vertical push", "Lat/back alt", "Glutes", "Core flexion", "Biceps"],
  },
  {
    emphasis: "Lunge",
    warm: ["Mobility/warm-up", "Mobility/warm-up"],
    main: ["Lunge", "Horizontal push", "Horizontal pull", "Core anti-rotation", "Shoulder isolation", "Triceps"],
  },
];

// duration (min) -> number of MAIN exercises (warm-up is separate).
function mainCountForDuration(durationMin: number): number {
  if (durationMin <= 20) return 4;
  if (durationMin <= 30) return 5;
  if (durationMin <= 45) return 6;
  return 7;
}

interface GenerateOptions {
  mode?: WorkoutMode;
  dayIndex?: number; // 0..2
  seed?: string; // stable seed for reproducibility
}

/** Build a prescription from a pool exercise, honoring the workout mode. */
function prescribe(ex: PoolExercise, mode: WorkoutMode): ExercisePrescription {
  const lowE = mode === "low-energy";
  const sets: [number, number] = lowE ? [2, 2] : ex.setRange;
  const rest = lowE ? ex.restSeconds + 30 : ex.restSeconds;
  // RPE: never exceed the cap; low-energy is held at 5–6.
  const rpe = lowE ? Math.min(ex.rpeTarget, RPE_LOW_ENERGY + 1, 6) : Math.min(ex.rpeTarget, RPE_CAP_NORMAL);
  return {
    slug: ex.slug,
    displayName: ex.displayName,
    equipment: ex.equipment,
    movementPattern: ex.movementPattern,
    primaryMuscle: ex.primaryMuscle,
    difficulty: ex.difficulty,
    image: ex.image,
    gif: ex.gif,
    sets,
    reps: ex.repRange,
    timeBased: ex.timeBased,
    restSeconds: rest,
    rpe: lowE ? RPE_LOW_ENERGY : rpe,
    substitutions: ex.substitutions,
    safetyNotes: ex.safetyNotes,
    jointRiskNotes: ex.jointRiskNotes,
    regression: ex.regression,
  };
}

/** Pick one exercise for a category, avoiding already-used slugs. */
function pickForCategory(
  pool: PoolExercise[],
  category: string,
  used: Set<string>,
  rng: () => number,
  lowE: boolean,
): PoolExercise | undefined {
  let candidates = byCategory(pool, category).filter((e) => !used.has(e.slug));
  candidates = excludeAdvanced(candidates);
  if (lowE) candidates = lowEnergyOnly(candidates);
  candidates = preferBeginner(candidates);
  if (candidates.length === 0) {
    // fall back: any unused, eligible exercise from the same split as a safety net
    candidates = byCategory(pool, category).filter((e) => !used.has(e.slug));
    if (lowE) candidates = lowEnergyOnly(candidates);
  }
  return pickOne(candidates, rng);
}

/**
 * Generate a single workout (one day of the 3-day cycle).
 * Only eligible curated exercises are ever considered.
 */
export function generateWorkout(
  pool: PoolExercise[],
  settings: Settings,
  opts: GenerateOptions = {},
): Workout {
  const mode: WorkoutMode = opts.mode ?? "normal";
  const dayIndex = ((opts.dayIndex ?? 0) % 3 + 3) % 3;
  const lowE = mode === "low-energy";
  const seedStr = `${opts.seed ?? "default"}|${mode}|${dayIndex}`;
  const rng = mulberry32(hashSeed(seedStr));

  // Enforce the equipment-clean rule before anything else.
  const eligible = pool.filter((e) => isGeneratorEligible(e, settings));

  const template = DAY_TEMPLATES[dayIndex];
  const used = new Set<string>();

  // Warm-up: 1 (low-energy) or 2 mobility moves.
  const warmCats = lowE ? template.warm.slice(0, 1) : template.warm;
  const warmup: ExercisePrescription[] = [];
  for (const cat of warmCats) {
    const ex = pickForCategory(eligible, cat, used, rng, false);
    if (ex) {
      used.add(ex.slug);
      warmup.push(prescribe(ex, "normal")); // warm-ups stay easy regardless of mode
    }
  }

  // Main work.
  const targetCount = lowE ? 4 : mainCountForDuration(settings.durationMin);
  const main: ExercisePrescription[] = [];

  if (lowE) {
    // Low-energy: a gentle, balanced micro-session (leg, push, pull, core).
    const lowCats = ["Glutes", "Vertical push", "Lat/back alt", "Core anti-extension"];
    for (const cat of lowCats) {
      const ex = pickForCategory(eligible, cat, used, rng, true);
      if (ex) { used.add(ex.slug); main.push(prescribe(ex, "low-energy")); }
    }
  } else {
    const cats = template.main.slice(0, targetCount);
    for (const cat of cats) {
      const ex = pickForCategory(eligible, cat, used, rng, false);
      if (ex) { used.add(ex.slug); main.push(prescribe(ex, "normal")); }
    }
  }

  return {
    id: `w_${seedStr}_${main.map((m) => m.slug).join("-").slice(0, 40)}`,
    title: lowE ? "Low-Energy Session" : `Full Body ${["A", "B", "C"][dayIndex]} — ${template.emphasis}`,
    mode,
    dayIndex,
    emphasis: lowE ? "Low-energy" : template.emphasis,
    warmup,
    main,
    createdAt: new Date().toISOString(),
  };
}

/** Generate the full beginner 3-day week. */
export function generateWeek(pool: PoolExercise[], settings: Settings, seed = "week"): Workout[] {
  return [0, 1, 2].map((dayIndex) =>
    generateWorkout(pool, settings, { mode: "normal", dayIndex, seed }),
  );
}
