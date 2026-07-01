"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import Disclaimer from "@/components/Disclaimer";
import WorkoutView from "@/components/WorkoutView";
import {
  loadCurrentWorkout, saveCurrentWorkout, addLog, lastExerciseLog, lastWeight,
  loadReadiness, loadSettings,
} from "@/lib/storage";
import { getPoolExercise } from "@/lib/data/pool";
import { suggestProgression } from "@/lib/progression";
import { CURRENT_LOG_VERSION } from "@/lib/types";
import { CheckCircleIcon, DumbbellIcon } from "@/components/icons";
import type { Workout, ExerciseLog, WeightUnit } from "@/lib/types";

export default function TodayPage() {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [hints, setHints] = useState<Record<string, string>>({});
  const [lastWeights, setLastWeights] = useState<Record<string, number | undefined>>({});
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("lb");
  const [ready, setReady] = useState(false);
  const [summary, setSummary] = useState<{ completed: number; total: number } | null>(null);

  useEffect(() => {
    const w = loadCurrentWorkout();
    setWorkout(w);
    setWeightUnit(loadSettings().weightUnit);
    if (w) {
      const readiness = loadReadiness();
      const h: Record<string, string> = {};
      const lw: Record<string, number | undefined> = {};
      for (const m of w.main) {
        const ex = getPoolExercise(m.slug);
        if (!ex) continue;
        const sug = suggestProgression(ex, lastExerciseLog(m.slug), readiness);
        if (sug.action !== "establish") h[m.slug] = sug.text;
        lw[m.slug] = lastWeight(m.slug);
      }
      setHints(h);
      setLastWeights(lw);
    }
    setReady(true);
  }, []);

  function complete(w: Workout, exercises: ExerciseLog[]) {
    addLog({
      version: CURRENT_LOG_VERSION,
      id: `log_${Date.now()}`,
      workoutId: w.id,
      title: w.title,
      mode: w.mode,
      date: new Date().toISOString(),
      exercises,
    });
    saveCurrentWorkout(null);
    setSummary({
      completed: exercises.filter((e) => e.status !== "skipped").length,
      total: exercises.length,
    });
  }

  return (
    <div className="space-y-5">
      <AppHeader title="Today's Workout" subtitle="Beginner-friendly · RPE-capped · no failure sets." />

      {!ready ? (
        <div className="card text-sm text-stone-400">Loading…</div>
      ) : summary ? (
        <div className="card-brand flex flex-col items-center py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
            <CheckCircleIcon className="h-7 w-7 text-brand-700" />
          </div>
          <p className="mt-3 text-lg font-bold text-stone-900">Logged. Nice work.</p>
          <p className="mt-1 text-sm text-stone-600">
            {summary.completed}/{summary.total} movements completed today.
          </p>
          <p className="mt-1 text-sm text-stone-500">Recovery or a walk on your next day.</p>
          <Link href="/" className="btn-primary mt-5 w-full">Back to Today</Link>
        </div>
      ) : workout ? (
        <>
          <WorkoutView
            workout={workout}
            hints={hints}
            weightUnit={weightUnit}
            lastWeightBySlug={lastWeights}
            onComplete={complete}
          />
          <Disclaimer />
        </>
      ) : (
        <div className="card flex flex-col items-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
            <DumbbellIcon className="h-5 w-5 text-stone-400" />
          </div>
          <p className="mt-3 text-sm text-stone-600">No workout set for today.</p>
          <Link href="/generator" className="btn-primary mt-4 w-full">Generate one</Link>
        </div>
      )}
    </div>
  );
}
