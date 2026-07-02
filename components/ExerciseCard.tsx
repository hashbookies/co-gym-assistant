import type { ExercisePrescription } from "@/lib/types";
import ExerciseMedia from "@/components/ExerciseMedia";
import { estimateWorkSeconds } from "@/lib/timing";

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
 * `hint` is an optional progressive-overload suggestion for next time.
 * `isWarmup` shortens the guidance timer; the `isActiveDemo`/`onRequestStart`/
 * `onRequestStop` trio lets a parent (WorkoutView) enforce one running
 * demo/timer at a time across all cards. */
export default function ExerciseCard({
  p,
  hint,
  isWarmup = false,
  isActiveDemo,
  onRequestStart,
  onRequestStop,
  footer,
}: {
  p: ExercisePrescription;
  hint?: string;
  isWarmup?: boolean;
  isActiveDemo?: boolean;
  onRequestStart?: () => void;
  onRequestStop?: () => void;
  footer?: React.ReactNode;
}) {
  const durationSeconds = estimateWorkSeconds(p, { isWarmup });
  return (
    <article className="card" data-testid={`exercise-card-${p.slug}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-stone-900">{p.displayName}</h3>
        <span className="pill flex-none capitalize">{p.difficulty}</span>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1.5">
        <span className="pill capitalize">{p.equipment}</span>
        <span className="pill capitalize">{p.movementPattern.replace(/-/g, " ")}</span>
        <span className="pill capitalize">{p.primaryMuscle}</span>
      </div>

      {hint && (
        <p className="mt-2.5 rounded-lg border border-brand-100 bg-brand-50 px-2.5 py-1.5 text-xs leading-snug text-brand-700">
          <span className="font-semibold">Next:</span> {hint}
        </p>
      )}

      {(p.image || p.gif) && (
        <div className="mt-3">
          <ExerciseMedia
            gif={p.gif || undefined}
            image={p.image || undefined}
            alt={`${p.displayName} demo`}
            mode="lazyDemo"
            durationSeconds={durationSeconds}
            isActive={isActiveDemo}
            onRequestStart={onRequestStart}
            onRequestStop={onRequestStop}
            showLogPrompt={!isWarmup}
          />
        </div>
      )}

      <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
        <Stat label="Sets" value={setsLabel(p)} />
        <Stat label="Reps" value={repsLabel(p)} />
        <Stat label="Rest" value={`${p.restSeconds}s`} />
        <Stat label="RPE" value={`≤ ${p.rpe}`} />
      </dl>

      <div className="mt-3 space-y-1.5 rounded-xl bg-stone-50 p-3 text-xs leading-relaxed">
        <p className="text-stone-600"><span className="font-semibold text-stone-700">Form:</span> {p.safetyNotes}</p>
        <p className="text-stone-600"><span className="font-semibold text-stone-700">Joints:</span> {p.jointRiskNotes}</p>
        <p className="text-stone-600"><span className="font-semibold text-stone-700">Easier:</span> {p.regression}</p>
        {p.substitutions.length > 0 && (
          <p className="text-stone-500">
            <span className="font-semibold text-stone-700">Swaps:</span>{" "}
            {p.substitutions.map((s) => s.replace(/-/g, " ")).join(", ")}
          </p>
        )}
      </div>

      {footer && (
        <div className="mt-3 border-t border-stone-200/70 pt-3">
          {footer}
        </div>
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-stone-200/70 bg-stone-50 py-1.5">
      <dt className="font-mono text-[10px] uppercase tracking-[0.1em] text-stone-400">{label}</dt>
      <dd className="text-sm font-semibold text-stone-800">{value}</dd>
    </div>
  );
}
