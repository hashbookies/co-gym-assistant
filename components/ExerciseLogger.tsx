"use client";

import { useEffect, useState } from "react";
import type { ExercisePrescription, ActualSet, ExerciseLog, SessionFeel, WeightUnit } from "@/lib/types";
import { makeNotStartedLog, makePlannedLog, makeSkippedLog, plannedSetsFor } from "@/lib/logs";

const FEELS: { value: SessionFeel; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "good", label: "Good" },
  { value: "hard", label: "Hard" },
  { value: "missed", label: "Missed" },
];

const STATUS_LABEL: Record<ExerciseLog["status"], string> = {
  not_started: "Not started",
  completed: "Logged as planned",
  modified: "Logged (modified)",
  skipped: "Skipped",
};

/**
 * Honest per-exercise logger. Nothing is recorded as completed until the user
 * explicitly taps "Log as planned", edits sets ("Edit sets" → modified), or
 * "Skip". The default state is not_started with NO completed sets, so a workout
 * can never be finished with fabricated completions.
 */
export default function ExerciseLogger({
  prescription,
  weightUnit,
  defaultWeight = 0,
  onChange,
}: {
  prescription: ExercisePrescription;
  weightUnit: WeightUnit;
  defaultWeight?: number;
  onChange: (log: ExerciseLog) => void;
}) {
  const [log, setLog] = useState<ExerciseLog>(() => makeNotStartedLog(prescription));
  const repUnit = prescription.timeBased ? "sec" : "reps";

  // Emit on mount and whenever the log changes. onChange is kept stable by the
  // parent (ref-based), so this does not loop.
  useEffect(() => {
    onChange(log);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log]);

  const logAsPlanned = () => setLog(makePlannedLog(prescription, weightUnit, defaultWeight));
  const skip = () => setLog(makeSkippedLog(prescription));
  const reset = () => setLog(makeNotStartedLog(prescription));
  const startEditing = () =>
    setLog((prev) => ({
      ...prev,
      status: "modified",
      modified: true,
      actualSets: prev.actualSets.length ? prev.actualSets : plannedSetsFor(prescription, weightUnit, defaultWeight),
    }));

  const num = (v: string) => {
    const n = parseFloat(v);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const patchSet = (i: number, patch: Partial<ActualSet>) =>
    setLog((prev) => ({
      ...prev,
      status: "modified",
      modified: true,
      actualSets: prev.actualSets.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));
  const setFeel = (f: SessionFeel) => setLog((prev) => ({ ...prev, sessionFeel: f }));
  const setNote = (n: string) => setLog((prev) => ({ ...prev, modificationNote: n.trim() || undefined }));
  const quickFill = () =>
    setLog((prev) => ({ ...prev, status: "modified", modified: true, actualSets: plannedSetsFor(prescription, weightUnit, defaultWeight) }));

  const statusTone =
    log.status === "completed" ? "bg-brand-100 text-brand-700"
    : log.status === "modified" ? "bg-amber-100 text-amber-700"
    : log.status === "skipped" ? "bg-red-100 text-red-600"
    : "bg-slate-100 text-slate-500";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <span className={`pill ${statusTone}`}>{STATUS_LABEL[log.status]}</span>
        {log.status !== "not_started" && (
          <button onClick={reset} className="text-xs font-semibold text-slate-400">Reset</button>
        )}
      </div>

      {/* Primary actions */}
      {log.status === "not_started" && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <button onClick={logAsPlanned} className="rounded-lg bg-brand-600 py-2 text-xs font-semibold text-white">Log as planned</button>
          <button onClick={startEditing} className="rounded-lg border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-700">Edit sets</button>
          <button onClick={skip} className="rounded-lg border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-500">Skip</button>
        </div>
      )}

      {log.status === "completed" && (
        <div className="mt-2 flex gap-1.5">
          <button onClick={startEditing} className="flex-1 rounded-lg border border-slate-300 bg-white py-1.5 text-xs font-semibold text-slate-700">Adjust sets</button>
          <button onClick={skip} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500">Skip</button>
        </div>
      )}

      {log.status === "skipped" && (
        <p className="mt-2 text-xs text-slate-500">Marked as not done — won&apos;t affect your progression.</p>
      )}

      {/* Per-set editor (modified) */}
      {log.status === "modified" && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-[1.4rem_1fr_1fr_1fr_auto] gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            <span>#</span><span>{repUnit}</span><span>wt ({weightUnit})</span><span>rpe</span><span>ok</span>
          </div>
          {log.actualSets.map((s, i) => (
            <div key={i} className="grid grid-cols-[1.4rem_1fr_1fr_1fr_auto] items-center gap-1.5">
              <span className="text-xs text-slate-500">{s.setNumber}</span>
              <input inputMode="numeric" value={s.reps} onChange={(e) => patchSet(i, { reps: num(e.target.value) })}
                className="w-full rounded-md border border-slate-300 px-1.5 py-1 text-center text-sm" />
              <input inputMode="decimal" value={s.weight} onChange={(e) => patchSet(i, { weight: num(e.target.value) })}
                className="w-full rounded-md border border-slate-300 px-1.5 py-1 text-center text-sm" />
              <input inputMode="numeric" value={s.rpe} onChange={(e) => patchSet(i, { rpe: num(e.target.value) })}
                className="w-full rounded-md border border-slate-300 px-1.5 py-1 text-center text-sm" />
              <button onClick={() => patchSet(i, { completed: !s.completed })}
                aria-label={s.completed ? "completed" : "missed"}
                className={`h-7 w-9 rounded-md text-xs font-bold ${s.completed ? "bg-brand-100 text-brand-700" : "bg-red-100 text-red-600"}`}>
                {s.completed ? "✓" : "✗"}
              </button>
            </div>
          ))}
          <button onClick={quickFill} className="text-xs font-semibold text-slate-500">
            Reset to planned ({prescription.sets[1]}×{prescription.reps[1]} {repUnit})
          </button>

          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">How did it feel?</p>
            <div className="flex gap-1.5">
              {FEELS.map((f) => (
                <button key={f.value} onClick={() => setFeel(f.value)}
                  className={`flex-1 rounded-lg py-1.5 text-xs font-semibold ${log.sessionFeel === f.value ? "bg-brand-600 text-white" : "bg-white text-slate-600 border border-slate-200"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <input value={log.modificationNote ?? ""} onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)" maxLength={120}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs" />
        </div>
      )}
    </div>
  );
}
