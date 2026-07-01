"use client";

import { useEffect, useRef, useState } from "react";
import type { ExercisePrescription, ActualSet, ExerciseLog, SessionFeel, WeightUnit } from "@/lib/types";
import { makeNotStartedLog, makeSkippedLog, plannedSetsFor, appendPlannedSet, finishAsModified } from "@/lib/logs";
import { completedSetCount, nextSetNumber, isExerciseComplete, recommendRest } from "@/lib/session-flow";
import RestTimer from "@/components/RestTimer";
import { CheckCircleIcon } from "@/components/icons";

const FEELS: { value: SessionFeel; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "good", label: "Good" },
  { value: "hard", label: "Hard" },
  { value: "missed", label: "Missed" },
];

const STATUS_LABEL: Record<ExerciseLog["status"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Logged as planned",
  modified: "Finished (modified)",
  skipped: "Skipped",
};

/**
 * Honest per-exercise logger. Nothing is recorded as completed until the user
 * explicitly taps "Log set as planned" (logs exactly the next planned set),
 * edits sets ("Edit sets"), or "Skip". The default state is not_started with
 * NO completed sets, so a workout can never be finished with fabricated
 * completions. "in_progress" (some but not all planned sets logged) is
 * explicitly NON-terminal and never satisfies workout completion on its own —
 * only "completed", "modified" (via "Edit sets" or "Finish as modified"), or
 * "skipped" do.
 */
export default function ExerciseLogger({
  prescription,
  weightUnit,
  defaultWeight = 0,
  onChange,
  isResting = false,
  onRequestRestStart,
  onRequestRestStop,
  onStartNextSet,
  onMoveToNext,
}: {
  prescription: ExercisePrescription;
  weightUnit: WeightUnit;
  defaultWeight?: number;
  onChange: (log: ExerciseLog) => void;
  /** Whether THIS exercise's rest timer is the one currently active (parent enforces one timer at a time). */
  isResting?: boolean;
  onRequestRestStart?: () => void;
  onRequestRestStop?: () => void;
  /** Start the guided work timer for this exercise's next set. */
  onStartNextSet?: () => void;
  /** Scroll/focus to the next main-work exercise once this one is fully logged. */
  onMoveToNext?: () => void;
}) {
  const [log, setLog] = useState<ExerciseLog>(() => makeNotStartedLog(prescription));
  const repUnit = prescription.timeBased ? "sec" : "reps";
  // Whether the detailed per-set editor is shown. This is purely a UI display
  // choice, not exercise-log data — the log itself (status/actualSets) stays
  // the single source of truth whichever way sets get logged.
  const [editing, setEditing] = useState(false);

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

  // Guided rest: whenever the completed-set count goes UP and sets remain,
  // offer the rest timer. Derived only from completedSetCount(log) — no
  // separate "sets done" counter is kept anywhere.
  const prevCompletedRef = useRef(completedSetCount(log));
  useEffect(() => {
    const count = completedSetCount(log);
    const prev = prevCompletedRef.current;
    prevCompletedRef.current = count;
    if (count > prev && recommendRest(log)) onRequestRestStart?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log]);

  // Any action that wholesale-replaces actualSets must also clear in-progress
  // drafts, or a stale typed string would mask the newly reset numeric value.
  const logNextSetAsPlanned = () => {
    setDrafts({});
    setLog((prev) => appendPlannedSet(prev, prescription, weightUnit, defaultWeight));
  };
  // The user intentionally stops an in-progress exercise early. Preserves
  // exactly the sets already logged — never fabricates the rest — and stops
  // any running rest timer since there's no "next set" being guided toward.
  const finishNowAsModified = () => {
    setDrafts({});
    setLog((prev) => finishAsModified(prev, prescription));
    onRequestRestStop?.();
  };
  const skip = () => { setDrafts({}); setLog(makeSkippedLog(prescription)); };
  const reset = () => { setDrafts({}); setEditing(false); setLog(makeNotStartedLog(prescription)); };
  const startEditing = () => {
    setEditing(true);
    setLog((prev) => {
      const target = Math.max(1, prescription.sets[1]);
      // Preserve whatever's already logged (whether from quick-log taps or a
      // prior edit) and only fill in the still-missing rows — never discard
      // sets the user already recorded.
      const filler = prev.actualSets.length < target
        ? plannedSetsFor(prescription, weightUnit, defaultWeight).slice(prev.actualSets.length)
        : [];
      return {
        ...prev,
        status: "modified",
        modified: true,
        actualSets: [...prev.actualSets, ...filler],
      };
    });
  };

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
    : log.status === "in_progress" ? "pill-amber"
    : log.status === "skipped" ? "pill-rose"
    : "pill";

  // Whether there's still at least one un-logged planned set — true for a
  // fresh not_started log, or one that's actively in_progress.
  const stillNeedsSets = log.status === "not_started" || log.status === "in_progress";
  const isTerminal = log.status === "completed" || log.status === "modified";

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

      {/* Primary actions: quick-log the next set, jump into detailed editing, or skip. */}
      {!editing && log.status !== "skipped" && stillNeedsSets && (
        <div className="mt-2.5 grid grid-cols-3 gap-1.5">
          <button onClick={logNextSetAsPlanned} className="rounded-lg bg-brand-600 px-1.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-700">Log set as planned</button>
          <button onClick={startEditing} className="rounded-lg border border-stone-300 bg-white px-1.5 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50">Edit sets</button>
          <button onClick={skip} className="rounded-lg border border-stone-300 bg-white px-1.5 py-2 text-xs font-semibold text-stone-500 transition hover:bg-stone-50">Skip</button>
        </div>
      )}

      {/* Terminal (completed/modified) and the user isn't in the detailed editor — offer to adjust or skip. */}
      {!editing && isTerminal && (
        <div className="mt-2.5 flex gap-1.5">
          <button onClick={startEditing} className="flex-1 rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50">Adjust sets</button>
          <button onClick={skip} className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-500 transition hover:bg-stone-50">Skip</button>
        </div>
      )}

      {log.status === "skipped" && (
        <p className="mt-2.5 text-xs text-stone-500">Marked as not done — won&apos;t affect your progression.</p>
      )}

      {/* Per-set editor — only once the user has explicitly chosen to edit. */}
      {editing && (
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

      {editing && (
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

      {/* Guided rest / next-set flow — guidance only, never auto-logs. */}
      {isExerciseComplete(log) && (
        <div className="mt-3 rounded-xl bg-brand-50 p-2.5 text-center">
          <p className="flex items-center justify-center gap-1 text-xs font-semibold text-brand-700">
            <CheckCircleIcon className="h-3.5 w-3.5" /> Exercise complete
          </p>
          {onMoveToNext && (
            <button onClick={onMoveToNext} className="btn-primary mt-2 w-full py-2 text-xs">
              Move to next exercise
            </button>
          )}
        </div>
      )}

      {recommendRest(log) && (
        <div className="mt-3">
          <p className="text-center text-[11px] text-stone-500">Set {completedSetCount(log)} logged</p>
          <p className="mb-1.5 text-center text-[11px] text-stone-500">
            Next set: {nextSetNumber(log)} of {log.plannedSets}
          </p>
          <RestTimer
            seconds={prescription.restSeconds}
            isActive={isResting}
            onRequestStart={() => onRequestRestStart?.()}
            onRequestStop={() => onRequestRestStop?.()}
            onStartNextSet={() => { onRequestRestStop?.(); onStartNextSet?.(); }}
          />
          <button onClick={finishNowAsModified} className="mt-2 w-full text-center text-[11px] font-semibold text-stone-400 hover:text-stone-600">
            Finish as modified
          </button>
        </div>
      )}

      {!editing && log.status === "modified" && (
        <div className="mt-3 rounded-xl bg-amber-50 p-2.5 text-center">
          <p className="text-xs font-semibold text-amber-800">Exercise finished as modified</p>
          {onMoveToNext && (
            <button onClick={onMoveToNext} className="btn-primary mt-2 w-full py-2 text-xs">
              Move to next exercise
            </button>
          )}
        </div>
      )}
    </div>
  );
}
