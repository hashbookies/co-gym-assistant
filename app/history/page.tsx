"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { loadLogs } from "@/lib/storage";
import { MotionPage, AnimatedCard } from "@/components/motion";
import { SkeletonList } from "@/components/Skeleton";
import { ChartIcon, DumbbellIcon } from "@/components/icons";
import type { WorkoutLog } from "@/lib/types";

export default function HistoryPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLogs(loadLogs());
    setReady(true);
  }, []);

  return (
    <MotionPage className="space-y-4">
      <AppHeader
        title="History"
        subtitle={ready ? (logs.length ? `${logs.length} workout${logs.length === 1 ? "" : "s"} logged` : "Your logged workouts will show up here") : undefined}
      />

      {!ready ? (
        <SkeletonList />
      ) : logs.length === 0 ? (
        <div className="card flex flex-col items-center py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
            <ChartIcon className="h-5 w-5 text-brand-600" />
          </div>
          <p className="mt-3 font-semibold text-stone-900">No workouts logged yet</p>
          <p className="mt-1 text-sm text-stone-600">Complete your first guided workout to start building history.</p>
          <Link href="/generator" className="btn-primary mt-4 w-full">Generate workout</Link>
          <Link href="/today" className="btn-secondary mt-2 w-full">Go to Today</Link>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {logs.map((l, i) => {
            const total = l.exercises.length;
            const done = l.exercises.filter((e) => e.status !== "skipped").length;
            return (
              <li key={l.id}>
                <AnimatedCard index={i} interactive>
                <Link href={`/history/${l.id}`} className="card block transition active:scale-[0.99]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-brand-50">
                      <DumbbellIcon className="h-4 w-4 text-brand-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-stone-900">{l.title}</p>
                        <span className={`pill flex-none ${l.mode === "low-energy" ? "pill-amber" : "pill-brand"}`}>
                          {l.mode === "low-energy" ? "low energy" : "normal"}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-stone-500">
                        {new Date(l.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        {" · "}{done}/{total} movements completed
                      </p>
                    </div>
                  </div>
                </Link>
                </AnimatedCard>
              </li>
            );
          })}
        </ul>
      )}
    </MotionPage>
  );
}
