"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { loadLogById, updateLog, deleteLog } from "@/lib/storage";
import { EDITABLE_STATUSES } from "@/lib/logs";
import { recommendationLabel } from "@/lib/readiness";
import { CheckCircleIcon, PencilIcon, TrashIcon, AlertIcon } from "@/components/icons";
import type { WorkoutLog, ExerciseLog, ActualSet, ExerciseStatus, SessionFeel } from "@/lib/types";

const STATUS_LABEL: Record<ExerciseStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  modified: "Modified",
  skipped: "Skipped",
};
const STATUS_PILL: Record<ExerciseStatus, string> = {
  not_started: "pill",
  in_progress: "pill-amber",
  completed: "pill-brand",
  modified: "pill-amber",
  skipped: "pill-rose",
};
const FEELS: { value: SessionFeel; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "good", label: "Good" },
  { value: "hard", label: "Hard" },
  { value: "missed", label: "Missed" },
];

export default function HistoryDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [log, setLog] = useState<WorkoutLog | null | undefined>(undefined); // undefined = still loading
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WorkoutLog | null>(null);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setLog(loadLogById(params.id) ?? null);
  }, [params.id]);

  function startEdit() {
    if (!log) return;
    setDraft(JSON.parse(JSON.stringify(log)) as WorkoutLog);
    setEditing(true);
    setSaved(false);
    setSaveError(null);
  }
  function cancelEdit() {
    setDraft(null);
    setEditing(false);
    setSaveError(null);
  }
  function save() {
    if (!draft) return;
    // Normalizes every exercise so an invalid status/set combo can't be saved silently.
    const result = updateLog(draft);
    if (!result.ok) {
      // Stay in edit mode with the draft intact — never claim the edit was saved.
      setSaveError(result.error);
      return;
    }
    setSaveError(null);
    setLog(loadLogById(draft.id) ?? null); // re-read through the same normalization the reader always applies
    setDraft(null);
    setEditing(false);
    setSaved(true);
  }
  function handleDelete() {
    if (!log) return;
    const when = new Date(log.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    if (!window.confirm(`Delete "${log.title}" (${when})? This can't be undone.`)) return;
    const result = deleteLog(log.id);
    if (!result.ok) {
      // Do not navigate away as if it worked — the log is still there.
      setDeleteError(result.error);
      return;
    }
    router.push("/history");
  }

  function updateExercise(i: number, patch: Partial<ExerciseLog>) {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, exercises: prev.exercises.map((e, idx) => (idx === i ? { ...e, ...patch } : e)) };
    });
  }
  function updateSet(exIdx: number, setIdx: number, patch: Partial<ActualSet>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const exercises = prev.exercises.map((e, idx) => {
        if (idx !== exIdx) return e;
        return { ...e, actualSets: e.actualSets.map((s, si) => (si === setIdx ? { ...s, ...patch } : s)) };
      });
      return { ...prev, exercises };
    });
  }

  if (log === undefined) {
    return <div className="card text-sm text-stone-400">Loading…</div>;
  }
  if (log === null) {
    return (
      <div className="space-y-4">
        <Link href="/history" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">← History</Link>
        <div className="card flex flex-col items-center py-8 text-center">
          <p className="text-sm text-stone-600">This workout log wasn&apos;t found.</p>
          <Link href="/history" className="btn-primary mt-4 w-full">Back to history</Link>
        </div>
      </div>
    );
  }

  const shown = editing && draft ? draft : log;
  const dateLabel = new Date(shown.date).toLocaleString(undefined, {
    weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between gap-2">
        <Link href="/history" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">← History</Link>
        {!editing && (
          <div className="flex flex-none gap-2">
            <button onClick={startEdit} className="btn-secondary flex items-center gap-1 px-3 py-1.5 text-xs">
              <PencilIcon className="h-3.5 w-3.5" /> Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              <TrashIcon className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        )}
      </div>

      {deleteError && (
        <p className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          <AlertIcon className="h-3.5 w-3.5 flex-none" /> {deleteError}
        </p>
      )}

      <AppHeader title={shown.title} subtitle={dateLabel} />

      {saved && !editing && (
        <p className="flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
          <CheckCircleIcon className="h-3.5 w-3.5" /> Changes saved.
        </p>
      )}

      <div className="card-brand">
        <div className="flex items-center justify-between gap-2">
          <span className={`pill ${shown.mode === "low-energy" ? "pill-amber" : "pill-brand"}`}>
            {shown.mode === "low-energy" ? "Low-energy session" : "Normal session"}
          </span>
          <span className="text-xs text-stone-500">
            {shown.exercises.filter((e) => e.status !== "skipped").length}/{shown.exercises.length} movements completed
          </span>
        </div>
      </div>

      {shown.readiness && (
        <section className="card">
          <h2 className="section-label">Readiness at the time</h2>
          <p className="mt-1.5 text-sm font-semibold text-stone-800">{recommendationLabel(shown.readiness.recommendation)}</p>
          {shown.readiness.redFlags.length > 0 && (
            <p className="mt-1 text-xs text-rose-600">Flags: {shown.readiness.redFlags.join(", ")}</p>
          )}
        </section>
      )}

      <div className="space-y-3">
        {shown.exercises.map((ex, i) => (
          <ExerciseDetailCard
            key={`${ex.exerciseSlug}-${i}`}
            exercise={ex}
            editing={editing}
            onChangeExercise={(patch) => updateExercise(i, patch)}
            onChangeSet={(si, patch) => updateSet(i, si, patch)}
          />
        ))}
      </div>

      {editing && (
        <div className="sticky bottom-24 z-10 -mx-4 space-y-2 border-t border-stone-200/80 bg-stone-50/95 px-4 pb-2 pt-3 backdrop-blur">
          {saveError && (
            <p className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              <AlertIcon className="h-3.5 w-3.5 flex-none" /> {saveError}
            </p>
          )}
          <div className="flex gap-2">
            <button onClick={cancelEdit} className="btn-secondary flex-1">Cancel</button>
            <button onClick={save} className="btn-primary flex-1">Save changes</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseDetailCard({
  exercise, editing, onChangeExercise, onChangeSet,
}: {
  exercise: ExerciseLog;
  editing: boolean;
  onChangeExercise: (patch: Partial<ExerciseLog>) => void;
  onChangeSet: (setIndex: number, patch: Partial<ActualSet>) => void;
}) {
  const willDowngradeToModified =
    exercise.status === "completed"
    && (exercise.actualSets.length < exercise.plannedSets || exercise.actualSets.some((s) => !s.completed));

  return (
    <article className="card">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-stone-900">{exercise.exerciseName}</h3>
        {editing ? (
          <div className="segmented flex-none">
            {EDITABLE_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => onChangeExercise({ status: s, modified: s === "modified" })}
                className={`segmented-item ${exercise.status === s ? "segmented-item-active" : ""}`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        ) : (
          <span className={`${STATUS_PILL[exercise.status]} flex-none`}>{STATUS_LABEL[exercise.status]}</span>
        )}
      </div>

      {willDowngradeToModified && (
        <p className="mt-1.5 text-[11px] text-amber-700">
          Fewer than the planned sets are completed — this will save as <span className="font-semibold">Modified</span>.
        </p>
      )}

      <p className="mt-2 text-xs text-stone-500">
        Planned: {exercise.plannedSets} sets · {exercise.plannedRepRange[0]}–{exercise.plannedRepRange[1]} reps
        {" · "}rest {exercise.plannedRestSeconds}s · RPE ≤ {exercise.plannedRpeTarget}
      </p>

      {exercise.status === "skipped" ? (
        <p className="mt-2.5 text-xs text-stone-500">Marked as skipped — no sets recorded.</p>
      ) : exercise.actualSets.length === 0 ? (
        <p className="mt-2.5 text-xs text-stone-500">No per-set data recorded for this exercise.</p>
      ) : (
        <div className="mt-3 space-y-1.5 rounded-xl border border-stone-200/70 bg-stone-50 p-2.5">
          <div className="grid grid-cols-[1.4rem_1fr_1fr_1fr_auto] gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-stone-400">
            <span>#</span><span>reps</span><span>weight</span><span>rpe</span><span>ok</span>
          </div>
          {exercise.actualSets.map((s, i) => (
            <div key={i} className="grid grid-cols-[1.4rem_1fr_1fr_1fr_auto] items-center gap-1.5">
              <span className="text-xs text-stone-500">{s.setNumber}</span>
              {editing ? (
                <>
                  <input
                    type="number" inputMode="numeric" value={s.reps}
                    onChange={(e) => onChangeSet(i, { reps: Number(e.target.value) || 0 })}
                    className="w-full rounded-md border border-stone-300 px-1.5 py-1 text-center text-sm"
                  />
                  <input
                    type="number" inputMode="decimal" value={s.weight}
                    onChange={(e) => onChangeSet(i, { weight: Number(e.target.value) || 0 })}
                    className="w-full rounded-md border border-stone-300 px-1.5 py-1 text-center text-sm"
                  />
                  <input
                    type="number" inputMode="numeric" value={s.rpe}
                    onChange={(e) => onChangeSet(i, { rpe: Number(e.target.value) || 0 })}
                    className="w-full rounded-md border border-stone-300 px-1.5 py-1 text-center text-sm"
                  />
                  <button
                    onClick={() => onChangeSet(i, { completed: !s.completed })}
                    aria-label={s.completed ? "completed" : "missed"}
                    className={`h-7 w-9 rounded-md text-xs font-bold transition ${s.completed ? "bg-brand-100 text-brand-700" : "bg-rose-100 text-rose-600"}`}
                  >
                    {s.completed ? "✓" : "✗"}
                  </button>
                </>
              ) : (
                <>
                  <span className="text-center text-sm text-stone-700">{s.reps}</span>
                  <span className="text-center text-sm text-stone-700">{s.weight} {s.weightUnit}</span>
                  <span className="text-center text-sm text-stone-700">{s.rpe}</span>
                  <span className={`text-center text-xs font-bold ${s.completed ? "text-brand-700" : "text-rose-600"}`}>
                    {s.completed ? "✓" : "✗"}
                  </span>
                </>
              )}
            </div>
          ))}
          {exercise.actualSets.some((s) => s.notes) && !editing && (
            <div className="mt-1.5 space-y-1 border-t border-stone-200/70 pt-1.5">
              {exercise.actualSets.filter((s) => s.notes).map((s, i) => (
                <p key={i} className="text-xs text-stone-500"><span className="font-semibold">Set {s.setNumber}:</span> {s.notes}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {editing && (
        <div className="mt-2.5 space-y-2">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-stone-400">Session feel</p>
            <div className="flex gap-1.5">
              {FEELS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => onChangeExercise({ sessionFeel: f.value })}
                  className={`flex-1 rounded-lg px-1.5 py-1.5 text-xs font-semibold transition ${exercise.sessionFeel === f.value ? "bg-brand-600 text-white" : "border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <input
            value={exercise.modificationNote ?? ""}
            onChange={(e) => onChangeExercise({ modificationNote: e.target.value.trim() === "" ? undefined : e.target.value })}
            placeholder="Note (optional)" maxLength={120}
            className="w-full rounded-md border border-stone-200 bg-white px-2 py-1.5 text-xs"
          />
        </div>
      )}

      {!editing && (exercise.modificationNote || exercise.sessionFeel !== "good") && (
        <p className="mt-2 text-xs text-stone-500">
          {exercise.sessionFeel !== "good" && <span className="capitalize">Felt {exercise.sessionFeel}. </span>}
          {exercise.modificationNote}
        </p>
      )}
    </article>
  );
}
