// Pure progressive-overload logic (Phase 3). Decides the next-session
// suggestion from the last per-set ExerciseLog + current readiness.
//
// Progress ONLY when the last session was completed well AND readiness is clear.
// Loaded lifts (dumbbell/band): reps first, then a SMALL weight bump once the
// top of the rep range is reached. Bodyweight: reps / tempo / range / harder
// variation / extra set — never "add weight".

import type {
  PoolExercise, ExerciseLog, ProgressionSuggestion, ReadinessResult,
} from "@/lib/types";

const HIGH_RPE = 9; // at/above this last time => too hard to progress

export function canProgress(readiness?: ReadinessResult | null): boolean {
  return !readiness || readiness.recommendation === "normal";
}

const isLoaded = (ex: PoolExercise) => ex.equipment === "dumbbell" || ex.equipment === "band";

function loadedWeightSuggestion(ex: PoolExercise): ProgressionSuggestion {
  const how = ex.equipment === "dumbbell"
    ? "step up to the next dumbbell"
    : "use a stronger band (or shorten it)";
  return {
    action: "add-weight",
    text: `All sets hit ${ex.repRange[1]} reps — ${how} and drop back toward ${ex.repRange[0]} reps. Small jump only.`,
  };
}

function bodyweightProgressSuggestion(ex: PoolExercise): ProgressionSuggestion {
  if (ex.substitutions.length > 0) {
    return {
      action: "harder-variation",
      text: `Top of the range reached — progress to a harder variation (e.g. ${ex.substitutions[0].replace(/-/g, " ")}), or add a set / slow the tempo.`,
    };
  }
  return {
    action: "add-set",
    text: "Top of the range reached — add a set, slow the tempo (3s lowering), or increase range of motion.",
  };
}

function addRepsSuggestion(ex: PoolExercise, sameWeight: boolean): ProgressionSuggestion {
  return {
    action: "add-reps",
    text: `${sameWeight ? "Keep the same weight and add" : "Add"} 1–2 reps toward ${ex.repRange[1]} before progressing further.`,
  };
}

/** Suggest the next step for one exercise from its last logged session. */
export function suggestProgression(
  exercise: PoolExercise,
  last: ExerciseLog | undefined,
  readiness?: ReadinessResult | null,
): ProgressionSuggestion {
  if (!last) {
    return { action: "establish", text: "First time — log your sets to start tracking progress." };
  }

  // Readiness gate: never push on a non-normal day.
  if (!canProgress(readiness)) {
    return { action: "hold", text: "Hold today — your readiness check suggests taking it easier. Keep the same weight and reps." };
  }

  // Skipped / never-logged / still-in-progress sessions carry no completion
  // signal — hold. "in_progress" specifically means the exercise was never
  // actually finished, so it must never be read as a strong session.
  if (last.status === "skipped" || last.status === "not_started" || last.status === "in_progress") {
    return { action: "hold", text: "Last session wasn't finished — repeat the same target when you're ready, with good form." };
  }

  const sets = last.actualSets;
  const top = exercise.repRange[1];

  // -------- Rich path: we have per-set data --------
  if (sets.length > 0) {
    const anyMissed = sets.some((s) => !s.completed) || last.sessionFeel === "missed";
    if (anyMissed) {
      return { action: "hold", text: "A set was missed last time — repeat the same weight and aim to complete every set with good form." };
    }

    // "modified" is a deliberate finish, but it can carry fewer sets than
    // planned (e.g. "Finish as modified" partway through) — be conservative
    // and only progress from it once the full planned volume is actually there.
    if (last.status === "modified" && sets.length < last.plannedSets) {
      return { action: "hold", text: "Only part of the planned sets were logged last time — repeat the same target and aim to complete every set." };
    }

    const completed = sets.filter((s) => s.completed);
    const maxRpe = completed.reduce((m, s) => Math.max(m, s.rpe || 0), 0);
    if (maxRpe >= HIGH_RPE) {
      return { action: "hold", text: "RPE was very high last time — keep the same weight and reps until it feels more controlled." };
    }

    const allHitTop = completed.length === sets.length && completed.every((s) => s.reps >= top);
    if (allHitTop) {
      return isLoaded(exercise) ? loadedWeightSuggestion(exercise) : bodyweightProgressSuggestion(exercise);
    }

    // Completed but below the top of the range -> build reps at the same weight.
    return addRepsSuggestion(exercise, /* sameWeight */ true);
  }

  // -------- Sparse path: migrated / quick-logged, only sessionFeel --------
  switch (last.sessionFeel) {
    case "missed":
      return { action: "hold", text: "Last session was incomplete — repeat the same target and focus on full reps with good form." };
    case "hard":
      return addRepsSuggestion(exercise, true);
    case "good":
      return addRepsSuggestion(exercise, false);
    case "easy":
    default:
      return isLoaded(exercise) ? loadedWeightSuggestion(exercise) : bodyweightProgressSuggestion(exercise);
  }
}
