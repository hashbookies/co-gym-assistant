"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import Disclaimer from "@/components/Disclaimer";
import { loadReadiness, loadCurrentWorkout } from "@/lib/storage";
import { recommendationLabel } from "@/lib/readiness";
import type { ReadinessResult, Workout } from "@/lib/types";

// Dashboard = today-first. Minimal: readiness status + start-workout CTA.
export default function DashboardPage() {
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [current, setCurrent] = useState<Workout | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReadiness(loadReadiness());
    setCurrent(loadCurrentWorkout());
    setReady(true);
  }, []);

  const isToday = (iso?: string) =>
    iso ? new Date(iso).toDateString() === new Date().toDateString() : false;
  const readinessFresh = readiness && isToday(readiness.date);

  return (
    <div className="space-y-5">
      <AppHeader title="Today" subtitle="Train safely, stay consistent." />

      {!ready ? (
        <div className="card text-sm text-slate-400">Loading…</div>
      ) : (
        <>
          {/* Readiness status */}
          <section className="card">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Readiness</h2>
            {readinessFresh ? (
              <>
                <p className="mt-1 font-semibold text-slate-800">
                  {recommendationLabel(readiness!.recommendation)}
                </p>
                {readiness!.redFlags.length > 0 && (
                  <p className="mt-1 text-xs text-red-600">Flags: {readiness!.redFlags.join(", ")}</p>
                )}
                <Link href="/readiness" className="btn-secondary mt-3 w-full">Re-check readiness</Link>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-600">
                  Check how you feel before training. We&apos;ll route you to the right session.
                </p>
                <Link href="/readiness" className="btn-primary mt-3 w-full">Start safety check-in</Link>
              </>
            )}
          </section>

          {/* Current / start workout */}
          <section className="card">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Workout</h2>
            {current ? (
              <>
                <p className="mt-1 font-semibold text-slate-800">{current.title}</p>
                <p className="text-xs text-slate-500">
                  {current.main.length} movements · {current.mode === "low-energy" ? "low energy" : "beginner"}
                </p>
                <Link href="/today" className="btn-primary mt-3 w-full">Open today&apos;s workout</Link>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-slate-600">No workout generated yet.</p>
                <Link href="/generator" className="btn-primary mt-3 w-full">Generate a workout</Link>
              </>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/library" className="btn-secondary">Browse library</Link>
            <Link href="/history" className="btn-secondary">View history</Link>
          </div>

          <Disclaimer />
        </>
      )}
    </div>
  );
}
