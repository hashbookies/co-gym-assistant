"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import Disclaimer from "@/components/Disclaimer";
import WorkoutView from "@/components/WorkoutView";
import { loadCurrentWorkout, saveCurrentWorkout, addLog, lastPerformance, loadReadiness } from "@/lib/storage";
import { getPoolExercise } from "@/lib/data/pool";
import { suggestProgression } from "@/lib/progression";
import type { Workout, ExercisePerformance } from "@/lib/types";

export default function TodayPage() {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [hints, setHints] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const w = loadCurrentWorkout();
    setWorkout(w);
    if (w) {
      const readiness = loadReadiness();
      const h: Record<string, string> = {};
      for (const m of w.main) {
        const ex = getPoolExercise(m.slug);
        if (!ex) continue;
        const sug = suggestProgression(ex, lastPerformance(m.slug), readiness);
        if (sug.action !== "establish") h[m.slug] = sug.text;
      }
      setHints(h);
    }
    setReady(true);
  }, []);

  function complete(w: Workout, performances: ExercisePerformance[]) {
    addLog({
      id: `log_${Date.now()}`,
      workoutId: w.id,
      title: w.title,
      mode: w.mode,
      date: new Date().toISOString(),
      completedSlugs: performances.map((p) => p.slug),
      performances,
    });
    saveCurrentWorkout(null);
    setDone(true);
  }

  return (
    <div className="space-y-5">
      <AppHeader title="Today's Workout" subtitle="Beginner-friendly · RPE-capped · no failure sets." />

      {!ready ? (
        <div className="card text-sm text-slate-400">Loading…</div>
      ) : done ? (
        <div className="card text-center">
          <p className="text-2xl">✅</p>
          <p className="mt-1 font-semibold text-slate-800">Logged. Nice work.</p>
          <p className="mt-1 text-sm text-slate-500">Recovery or a walk on your next day.</p>
          <Link href="/" className="btn-primary mt-4 w-full">Back to Today</Link>
        </div>
      ) : workout ? (
        <>
          <WorkoutView workout={workout} hints={hints} onComplete={complete} />
          <Disclaimer />
        </>
      ) : (
        <div className="card">
          <p className="text-sm text-slate-600">No workout set for today.</p>
          <Link href="/generator" className="btn-primary mt-3 w-full">Generate one</Link>
        </div>
      )}
    </div>
  );
}
