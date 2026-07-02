"use client";

import { useRef, useState } from "react";
import type { Workout, ExerciseLog, WeightUnit } from "@/lib/types";
import ExerciseCard from "@/components/ExerciseCard";
import ExerciseLogger from "@/components/ExerciseLogger";
import { AnimatedCard, PopIn } from "@/components/motion";
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

  // Only one exercise demo/timer may run at a time, across warm-up + main.
  // Starting a new card's demo stops whichever one was previously active.
  const [activeMediaKey, setActiveMediaKey] = useState<string | null>(null);
  // Same "one timer at a time" rule extends to the rest timer: starting a
  // work/demo timer cancels any running rest timer and vice versa.
  const [restingSlug, setRestingSlug] = useState<string | null>(null);

  function startWorkTimer(key: string) {
    setActiveMediaKey(key);
    setRestingSlug(null);
  }
  function stopWorkTimer(key: string) {
    setActiveMediaKey((cur) => (cur === key ? null : cur));
  }
  function startRest(slug: string) {
    setRestingSlug(slug);
    setActiveMediaKey(null);
  }
  function stopRest(slug: string) {
    setRestingSlug((cur) => (cur === slug ? null : cur));
  }

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

  return (
    <div className="space-y-5">
      <AnimatedCard index={0}>
        <div className="card-brand">
          <p className="section-label text-brand-700">
            {workout.mode === "low-energy" ? "Low-energy session" : `Day ${workout.dayIndex + 1} · ${workout.emphasis}`}
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-stone-900">{workout.title}</h2>
          <p className="mt-1 text-sm text-stone-600">
            {workout.warmup.length} warm-up · {workout.main.length} main movements · no failure training
          </p>
        </div>
      </AnimatedCard>

      {workout.warmup.length > 0 && (
        <section>
          <h3 className="section-label mb-2">Warm-up</h3>
          <div className="space-y-3">
            {workout.warmup.map((p, i) => {
              const key = `w-${p.slug}`;
              return (
                <AnimatedCard key={key} index={1 + i}>
                  <ExerciseCard
                    p={p}
                    isWarmup
                    isActiveDemo={activeMediaKey === key}
                    onRequestStart={() => startWorkTimer(key)}
                    onRequestStop={() => stopWorkTimer(key)}
                  />
                </AnimatedCard>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h3 className="section-label mb-2">Main work</h3>
        <div className="space-y-3">
          {workout.main.map((p, i) => {
            const key = `m-${p.slug}`;
            const nextSlug = workout.main[i + 1]?.slug;
            return (
              <AnimatedCard key={key} index={1 + workout.warmup.length + i}>
                <ExerciseCard
                  p={p}
                  hint={hints?.[p.slug]}
                  isActiveDemo={activeMediaKey === key}
                  onRequestStart={() => startWorkTimer(key)}
                  onRequestStop={() => stopWorkTimer(key)}
                  footer={
                    logging && (
                      <ExerciseLogger
                        prescription={p}
                        weightUnit={weightUnit}
                        defaultWeight={lastWeightBySlug?.[p.slug] ?? 0}
                        onChange={(log) => handleChange(p.slug, log)}
                        isResting={restingSlug === p.slug}
                        onRequestRestStart={() => startRest(p.slug)}
                        onRequestRestStop={() => stopRest(p.slug)}
                        onStartNextSet={() => startWorkTimer(key)}
                        onMoveToNext={nextSlug ? () => {
                          document
                            .querySelector(`[data-testid="exercise-card-${nextSlug}"]`)
                            ?.scrollIntoView({ behavior: "smooth", block: "start" });
                        } : undefined}
                      />
                    )
                  }
                />
              </AnimatedCard>
            );
          })}
        </div>
      </section>

      {logging && (
        <div className="sticky bottom-24 z-10 -mx-4 space-y-2 border-t border-stone-200/80 bg-stone-50/95 px-4 pb-2 pt-3 backdrop-blur">
          <PopIn id={allLogged}>
            <p className={`text-sm font-semibold ${allLogged ? "text-brand-700" : "text-stone-800"}`}>
              {allLogged ? "Ready to complete workout" : `${pending.length} exercise${pending.length === 1 ? "" : "s"} left to log`}
            </p>
            {!allLogged && (
              <p className="text-xs text-stone-500">Log or skip each main exercise to finish.</p>
            )}
          </PopIn>
          <button
            data-testid="complete-workout-button"
            className="btn-primary w-full shadow-lifted disabled:cursor-not-allowed disabled:opacity-50"
            onClick={complete}
            disabled={!allLogged}
          >
            Mark workout complete
          </button>
        </div>
      )}
    </div>
  );
}
