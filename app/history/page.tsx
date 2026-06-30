"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppHeader from "@/components/AppHeader";
import { loadLogs } from "@/lib/storage";
import type { WorkoutLog } from "@/lib/types";

export default function HistoryPage() {
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLogs(loadLogs());
    setReady(true);
  }, []);

  return (
    <div className="space-y-4">
      <AppHeader title="History" subtitle={ready ? `${logs.length} workouts logged` : undefined} />

      {!ready ? (
        <div className="card text-sm text-slate-400">Loading…</div>
      ) : logs.length === 0 ? (
        <div className="card">
          <p className="text-sm text-slate-600">No workouts logged yet.</p>
          <Link href="/generator" className="btn-primary mt-3 w-full">Generate your first workout</Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {logs.map((l) => (
            <li key={l.id} className="card">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-900">{l.title}</p>
                <span className="pill capitalize">{l.mode === "low-energy" ? "low energy" : "normal"}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">
                {new Date(l.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                {" · "}{l.exercises.length} movements
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
