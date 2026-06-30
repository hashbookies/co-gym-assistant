"use client";

import { useRef, useState } from "react";
import type { Workout, ExerciseLog, WeightUnit } from "@/lib/types";
import ExerciseCard from "@/components/ExerciseCard";
import ExerciseLogger from "@/components/ExerciseLogger";
import { pendingExercises } from "@/lib/logs";

export default function WorkoutView({
  workout,
  hints,
  weightUnit = "lb",
  lastWeightBySlug,
  onComplete,
}: {
  workout: Workout;
  hints?: Record<string, string>;
  weightUnit?: WeightUnit;
  lastWeightBySlug?: Record<string, number | undefined>;
  onComplete?: (w: Workout, exercises: ExerciseLog[]) => void;
}) {
  const logging = !!onComplete;
  // Full per-set logs live in a ref (no re-render on keystrokes); only the
  // logged/not-logged STATUS is mirrored into state to gate completion.
  const logsRef = useRef<Record<string, ExerciseLog>>({});
  const [statuses, setStatuses] = useState<Record<string, ExerciseLog["status"]>>({});

  const mainSlugs = workout.main.map((m) => m.slug);
  const pending = pendingExercises(mainSlugs, logsRef.current);
  const allLogged = pending.length === 0;

  function handleChange(slug: string, log: ExerciseLog) {
    logsRef.current[slug] = log;
    setStatuses((prev) => (prev[slug] === log.status ? prev : { ...prev, [slug]: log.status }));
  }

  function complete() {
    if (!allLogged) return; // hard gate — never complete with not_started exercises
    const exercises = workout.main.map((m) => logsRef.current[m.slug]).filter((x): x is ExerciseLog => !!x);
    onComplete?.(workout, exercises);
  }

  const pendingNames = workout.main.filter((m) => pending.includes(m.slug)).map((m) => m.displayName);

  return (
    <div className="space-y-5">
      <div className="card bg-brand-50/60">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
          {workout.mode === "low-energy" ? "Low-energy session" : `Day ${workout.dayIndex + 1} · ${workout.emphasis}`}
        </p>
        <h2 className="mt-0.5 text-lg font-bold text-slate-900">{workout.title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {workout.warmup.length} warm-up · {workout.main.length} main movements · no failure training
        </p>
      </div>

      {workout.warmup.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Warm-up</h3>
          <div className="space-y-3">
            {workout.warmup.map((p) => <ExerciseCard key={`w-${p.slug}`} p={p} />)}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Main work</h3>
        <div className="space-y-3">
          {workout.main.map((p) => (
            <div key={`m-${p.slug}`} className="space-y-2">
              <ExerciseCard p={p} hint={hints?.[p.slug]} />
              {logging && (
                <ExerciseLogger
                  prescription={p}
                  weightUnit={weightUnit}
                  defaultWeight={lastWeightBySlug?.[p.slug] ?? 0}
                  onChange={(log) => handleChange(p.slug, log)}
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {logging && (
        <div className="space-y-2">
          {!allLogged && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Log or skip each exercise to finish. Still to do: {pendingNames.join(", ")}.
            </p>
          )}
          <button
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
            onClick={complete}
            disabled={!allLogged}
          >
            {allLogged ? "Mark workout complete" : `${pending.length} exercise${pending.length === 1 ? "" : "s"} left to log`}
          </button>
        </div>
      )}
    </div>
  );
}
