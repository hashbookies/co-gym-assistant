// Pure progressive-overload logic. Decides the next-session suggestion from the
// last performance + current readiness. Progress ONLY when the last session was
// completed well AND readiness is clear — never push after red/caution days.

import type {
  PoolExercise, ExercisePerformance, ProgressionSuggestion, ReadinessResult,
} from "@/lib/types";

/**
 * May the user progress at all today? False after any non-normal readiness
 * (nausea, dizziness, poor sleep, severe soreness, dehydration, under-fueling,
 * injection-day fatigue all route readiness away from "normal").
 */
export function canProgress(readiness?: ReadinessResult | null): boolean {
  return !readiness || readiness.recommendation === "normal";
}

/**
 * Suggest the next step for one exercise.
 * Order of progression (CLAUDE.md): add reps -> add weight -> add set /
 * harder variation. Holds when reps weren't completed, form broke, or readiness
 * isn't clear.
 */
export function suggestProgression(
  exercise: PoolExercise,
  lastPerf: ExercisePerformance | undefined,
  readiness?: ReadinessResult | null,
): ProgressionSuggestion {
  if (!lastPerf) {
    return { action: "establish", text: "First time — log how it felt to start tracking progress." };
  }

  // Readiness gate: never progress on a non-normal day.
  if (!canProgress(readiness)) {
    return { action: "hold", text: "Hold today — your readiness check suggests taking it easier. Keep the same target." };
  }

  // Missed reps or form breakdown -> repeat the same target.
  if (lastPerf.feel === "missed") {
    return { action: "hold", text: "Repeat the same target and focus on completing all reps with good form. Regress if it stays hard." };
  }

  // All reps but tough -> add reps within the range before adding load.
  if (lastPerf.feel === "hard") {
    return { action: "add-reps", text: `Add 1–2 reps (toward ${exercise.repRange[1]}) before adding load.` };
  }

  // Comfortable + all reps -> progress load/difficulty.
  if (exercise.equipment === "dumbbell") {
    return { action: "add-weight", text: "Felt easy — step up to the next dumbbell and drop back toward the lower rep range." };
  }
  if (exercise.equipment === "band") {
    return { action: "add-weight", text: "Felt easy — use a stronger band (or shorten it) for more tension." };
  }
  // Bodyweight: prefer a harder variation if one is offered, else add a set / slow tempo.
  if (exercise.substitutions.length > 0) {
    const harder = exercise.substitutions[0].replace(/-/g, " ");
    return { action: "harder-variation", text: `Felt easy — progress to a harder variation (e.g. ${harder}) or add a set.` };
  }
  return { action: "add-set", text: "Felt easy — add one set, or slow the tempo (3s lowering)." };
}
