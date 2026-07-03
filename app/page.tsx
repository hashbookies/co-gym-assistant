"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import Disclaimer from "@/components/Disclaimer";
import { loadReadiness, loadCurrentWorkout } from "@/lib/storage";
import { recommendationLabel } from "@/lib/readiness";
import { ShieldIcon, DumbbellIcon, BookIcon, ChartIcon } from "@/components/icons";
import { SkeletonStack } from "@/components/Skeleton";
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
  const readinessCardTone =
    readinessFresh && readiness!.recommendation === "rest" ? "card-rose"
    : readinessFresh && readiness!.recommendation === "low-energy" ? "card-amber"
    : readinessFresh ? "card-brand"
    : "card";

  return (
    <div className="space-y-6">
      <AppHeader title="Today" subtitle="Train safely, stay consistent." />

      {!ready ? (
        <SkeletonStack />
      ) : (
        <>
          {/* Readiness status */}
          <section className={readinessCardTone}>
            <div className="flex items-center gap-2">
              <ShieldIcon className="h-4 w-4 text-brand-600" />
              <h2 className="section-label">Readiness</h2>
            </div>
            {readinessFresh ? (
              <>
                <p className="mt-2 text-lg font-bold text-stone-900">
                  {recommendationLabel(readiness!.recommendation)}
                </p>
                {readiness!.redFlags.length > 0 && (
                  <p className="mt-1 text-xs text-rose-600">Flags: {readiness!.redFlags.join(", ")}</p>
                )}
                <Link href="/readiness" className="btn-secondary mt-4 w-full">Re-check readiness</Link>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-stone-600">
                  Check how you feel before training. We&apos;ll route you to the right session.
                </p>
                <Link href="/readiness" className="btn-primary mt-4 w-full">Start safety check-in</Link>
              </>
            )}
          </section>

          {/* Current / start workout */}
          <section className="card">
            <div className="flex items-center gap-2">
              <DumbbellIcon className="h-4 w-4 text-brand-600" />
              <h2 className="section-label">Workout</h2>
            </div>
            {current ? (
              <>
                <p className="mt-2 text-lg font-bold text-stone-900">{current.title}</p>
                <p className="text-sm text-stone-500">
                  {current.main.length} movements · {current.mode === "low-energy" ? "low energy" : "beginner"}
                </p>
                <Link href="/today" className="btn-primary mt-4 w-full">Open today&apos;s workout</Link>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-stone-600">
                  No workout generated yet — takes about 10 seconds to build one.
                </p>
                <Link href="/generator" className="btn-primary mt-4 w-full">Generate a workout</Link>
              </>
            )}
          </section>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/library" className="btn-secondary">
              <BookIcon className="h-4 w-4" /> Library
            </Link>
            <Link href="/history" className="btn-secondary">
              <ChartIcon className="h-4 w-4" /> History
            </Link>
          </div>

          <Disclaimer />
        </>
      )}
    </div>
  );
}
