import type { ExercisePrescription } from "@/lib/types";

function repsLabel(p: ExercisePrescription): string {
  const [a, b] = p.reps;
  const unit = p.timeBased ? "s hold" : " reps";
  return a === b ? `${a}${unit}` : `${a}–${b}${unit}`;
}
function setsLabel(p: ExercisePrescription): string {
  const [a, b] = p.sets;
  return a === b ? `${a} sets` : `${a}–${b} sets`;
}

/** Prescription card used inside a workout. Shows the user-facing fields only.
 * `hint` is an optional progressive-overload suggestion for next time. */
export default function ExerciseCard({ p, hint }: { p: ExercisePrescription; hint?: string }) {
  return (
    <article className="card">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{p.displayName}</h3>
        <span className="pill capitalize">{p.difficulty}</span>
      </div>

      {hint && (
        <p className="mt-2 rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs text-brand-700">
          <span className="font-semibold">Next:</span> {hint}
        </p>
      )}

      <div className="mt-1 flex flex-wrap gap-1.5">
        <span className="pill capitalize">{p.equipment}</span>
        <span className="pill capitalize">{p.movementPattern.replace(/-/g, " ")}</span>
        <span className="pill capitalize">{p.primaryMuscle}</span>
      </div>

      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        <Stat label="Sets" value={setsLabel(p)} />
        <Stat label="Reps" value={repsLabel(p)} />
        <Stat label="Rest" value={`${p.restSeconds}s`} />
        <Stat label="RPE" value={`≤ ${p.rpe}`} />
      </dl>

      <div className="mt-3 space-y-1.5 text-xs leading-snug">
        <p className="text-slate-600"><span className="font-semibold text-slate-700">Form:</span> {p.safetyNotes}</p>
        <p className="text-slate-600"><span className="font-semibold text-slate-700">Joints:</span> {p.jointRiskNotes}</p>
        <p className="text-slate-600"><span className="font-semibold text-slate-700">Easier:</span> {p.regression}</p>
        {p.substitutions.length > 0 && (
          <p className="text-slate-500">
            <span className="font-semibold text-slate-700">Swaps:</span>{" "}
            {p.substitutions.map((s) => s.replace(/-/g, " ")).join(", ")}
          </p>
        )}
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-1.5">
      <dt className="text-[10px] uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
