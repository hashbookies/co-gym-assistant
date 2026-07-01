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

  // Numeric fields (reps/weight/rpe) hold a raw in-progress string here while
  // the user is editing, so clearing a field shows blank instead of jumping to
  // "0". The canonical numeric ActualSet value is only ever updated with a
  // valid, non-negative parsed number — never NaN — either live as soon as the
  // draft parses, or finalized to 0 on blur if it never became valid.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  type NumericField = "reps" | "weight" | "rpe";
  const draftKey = (i: number, field: NumericField) => `${i}-${field}`;

  // Emit on mount and whenever the log changes. onChange is kept stable by the
  // parent (ref-based), so this does not loop.
  useEffect(() => {
    onChange(log);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log]);

  // Any action that wholesale-replaces actualSets must also clear in-progress
  // drafts, or a stale typed string would mask the newly reset numeric value.
  const logAsPlanned = () => { setDrafts({}); setLog(makePlannedLog(prescription, weightUnit, defaultWeight)); };
  const skip = () => { setDrafts({}); setLog(makeSkippedLog(prescription)); };
  const reset = () => { setDrafts({}); setLog(makeNotStartedLog(prescription)); };
  const startEditing = () =>
    setLog((prev) => ({
      ...prev,
      status: "modified",
      modified: true,
      actualSets: prev.actualSets.length ? prev.actualSets : plannedSetsFor(prescription, weightUnit, defaultWeight),
    }));

  const patchSet = (i: number, patch: Partial<ActualSet>) =>
    setLog((prev) => ({
      ...prev,
      status: "modified",
      modified: true,
      actualSets: prev.actualSets.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    }));

  // Displayed value: the raw draft string while editing, else the canonical number.
  const fieldValue = (i: number, field: NumericField, canonical: number) => {
    const key = draftKey(i, field);
    return key in drafts ? drafts[key] : String(canonical);
  };
  // Every keystroke: keep the draft string as-is (so an empty field stays empty),
  // and only push a live update to the saved set once the text parses to a valid,
  // non-negative number — never write NaN.
  const handleFieldChange = (i: number, field: NumericField, raw: string) => {
    setDrafts((prev) => ({ ...prev, [draftKey(i, field)]: raw }));
    const n = parseFloat(raw);
    if (raw.trim() !== "" && Number.isFinite(n) && n >= 0) {
      patchSet(i, { [field]: n } as Partial<ActualSet>);
    }
  };
  // On blur: finalize. An empty/invalid draft becomes 0 (never NaN); the draft
  // is then cleared so the input reflects the canonical stored value again.
  const handleFieldBlur = (i: number, field: NumericField) => {
    const key = draftKey(i, field);
    if (!(key in drafts)) return;
    const raw = drafts[key];
    const n = parseFloat(raw);
    const finalValue = raw.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : 0;
    patchSet(i, { [field]: finalValue } as Partial<ActualSet>);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };
  const setFeel = (f: SessionFeel) => setLog((prev) => ({ ...prev, sessionFeel: f }));
  const setNote = (n: string) => setLog((prev) => ({ ...prev, modificationNote: n.trim() || undefined }));
  const quickFill = () => {
    setDrafts({});
    setLog((prev) => ({ ...prev, status: "modified", modified: true, actualSets: plannedSetsFor(prescription, weightUnit, defaultWeight) }));
  };

  const statusPillClass =
    log.status === "completed" ? "pill-brand"
    : log.status === "modified" ? "pill-amber"
    : log.status === "skipped" ? "pill-rose"
    : "pill";

  return (
    <div data-testid={`exercise-logger-${prescription.slug}`}>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
        Log this exercise
      </p>
      <div className="flex items-center justify-between">
        <span className={statusPillClass}>{STATUS_LABEL[log.status]}</span>
        {log.status !== "not_started" && (
          <button onClick={reset} className="text-xs font-semibold text-stone-400 hover:text-stone-600">Reset</button>
        )}
      </div>

      {/* Primary actions */}
      {log.status === "not_started" && (
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          <button onClick={logAsPlanned} className="rounded-lg bg-brand-600 px-1.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-700">Log as planned</button>
          <button onClick={startEditing} className="rounded-lg border border-stone-300 bg-white px-1.5 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50">Edit sets</button>
          <button onClick={skip} className="rounded-lg border border-stone-300 bg-white px-1.5 py-2 text-xs font-semibold text-stone-500 transition hover:bg-stone-50">Skip</button>
        </div>
      )}

      {log.status === "completed" && (
        <div className="mt-2.5 flex gap-1.5">
          <button onClick={startEditing} className="flex-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50">Adjust sets</button>
          <button onClick={skip} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-500 transition hover:bg-stone-50">Skip</button>
        </div>
      )}

      {log.status === "skipped" && (
        <p className="mt-2.5 text-xs text-stone-500">Marked as not done — won&apos;t affect your progression.</p>
      )}

      {/* Per-set editor (modified) */}
      {log.status === "modified" && (
        <div className="mt-3 space-y-2 rounded-xl border border-stone-200/70 bg-stone-50 p-2.5">
          <div className="grid grid-cols-[1.4rem_1fr_1fr_1fr_auto] gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
            <span>#</span><span>{repUnit}</span><span>wt ({weightUnit})</span><span>rpe</span><span>ok</span>
          </div>
          {log.actualSets.map((s, i) => (
            <div key={i} className="grid grid-cols-[1.4rem_1fr_1fr_1fr_auto] items-center gap-1.5">
              <span className="text-xs text-stone-500">{s.setNumber}</span>
              <input inputMode="numeric" value={fieldValue(i, "reps", s.reps)}
                onChange={(e) => handleFieldChange(i, "reps", e.target.value)}
                onBlur={() => handleFieldBlur(i, "reps")}
                className="w-full rounded-md border border-stone-300 px-1.5 py-1 text-center text-sm" />
              <input inputMode="decimal" value={fieldValue(i, "weight", s.weight)}
                onChange={(e) => handleFieldChange(i, "weight", e.target.value)}
                onBlur={() => handleFieldBlur(i, "weight")}
                className="w-full rounded-md border border-stone-300 px-1.5 py-1 text-center text-sm" />
              <input inputMode="numeric" value={fieldValue(i, "rpe", s.rpe)}
                onChange={(e) => handleFieldChange(i, "rpe", e.target.value)}
                onBlur={() => handleFieldBlur(i, "rpe")}
                className="w-full rounded-md border border-stone-300 px-1.5 py-1 text-center text-sm" />
              <button onClick={() => patchSet(i, { completed: !s.completed })}
                aria-label={s.completed ? "completed" : "missed"}
                className={`h-7 w-9 rounded-md text-xs font-bold transition ${s.completed ? "bg-brand-100 text-brand-700" : "bg-rose-100 text-rose-600"}`}>
                {s.completed ? "✓" : "✗"}
              </button>
            </div>
          ))}
          <button onClick={quickFill} className="text-xs font-semibold text-stone-500 hover:text-stone-700">
            Reset to planned ({prescription.sets[1]}×{prescription.reps[1]} {repUnit})
          </button>
        </div>
      )}

      {log.status === "modified" && (
        <div className="mt-2.5 space-y-2">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">How did it feel?</p>
            <div className="flex gap-1.5">
              {FEELS.map((f) => (
                <button key={f.value} onClick={() => setFeel(f.value)}
                  className={`flex-1 rounded-lg px-1.5 py-1.5 text-xs font-semibold transition ${log.sessionFeel === f.value ? "bg-brand-600 text-white" : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <input value={log.modificationNote ?? ""} onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)" maxLength={120}
            className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs" />
        </div>
      )}
    </div>
  );
}
