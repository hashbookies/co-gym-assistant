"use client";

import { useState } from "react";
import type { Workout, SessionFeel, ExercisePerformance } from "@/lib/types";
import ExerciseCard from "@/components/ExerciseCard";

const FEELS: { value: SessionFeel; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "hard", label: "Hard" },
  { value: "missed", label: "Missed reps" },
];

export default function WorkoutView({
  workout,
  hints,
  onComplete,
}: {
  workout: Workout;
  hints?: Record<string, string>;
  onComplete?: (w: Workout, performances: ExercisePerformance[]) => void;
}) {
  const logging = !!onComplete;
  const [feel, setFeel] = useState<Record<string, SessionFeel>>({});

  function complete() {
    const performances: ExercisePerformance[] = workout.main
      .filter((m) => feel[m.slug])
      .map((m) => ({ slug: m.slug, feel: feel[m.slug] }));
    onComplete?.(workout, performances);
  }

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
                <div className="flex gap-2 px-1">
                  {FEELS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => setFeel((prev) => ({ ...prev, [p.slug]: f.value }))}
                      className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${
                        feel[p.slug] === f.value ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {logging && (
        <button className="btn-primary w-full" onClick={complete}>
          Mark workout complete
        </button>
      )}
    </div>
  );
}
