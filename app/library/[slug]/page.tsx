import Link from "next/link";
import { notFound } from "next/navigation";
import { getExerciseBySlug } from "@/lib/data/library";
import { getPoolExercise } from "@/lib/data/pool";
import AppHeader from "@/components/AppHeader";
import ExerciseMedia from "@/components/ExerciseMedia";

export default function ExerciseDetailPage({ params }: { params: { slug: string } }) {
  const ex = getExerciseBySlug(params.slug);
  if (!ex) notFound();

  // If this exercise is in the curated pool, surface its programming.
  const pool = getPoolExercise(params.slug);

  return (
    <div className="space-y-4">
      <Link href="/library" className="text-sm text-brand-700">← Library</Link>
      <AppHeader title={ex.displayName} subtitle={`${ex.equipment} · ${ex.primaryMuscle}`} />

      <ExerciseMedia gif={ex.gifUrl} image={ex.image} alt={`${ex.displayName} demonstration`} />

      <div className="flex flex-wrap gap-1.5">
        <span className="pill capitalize">{ex.movementPattern.replace(/-/g, " ")}</span>
        <span className="pill capitalize">{ex.splitTag}</span>
        <span className="pill capitalize">{ex.bodyRegion}</span>
        <span className="pill capitalize">{ex.difficulty}</span>
        {ex.inGeneratorPool && <span className="pill bg-brand-100 text-brand-700">in generator</span>}
        {ex.requiresAnchor && <span className="pill bg-amber-100 text-amber-700">needs anchor</span>}
      </div>

      {ex.secondaryMuscles.length > 0 && (
        <p className="text-sm text-slate-600">
          <span className="font-semibold">Also works:</span> {ex.secondaryMuscles.join(", ")}
        </p>
      )}

      {pool && (
        <section className="card bg-brand-50/50">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Programming</h2>
          <p className="mt-1 text-sm text-slate-700">
            {pool.setRange[0]}–{pool.setRange[1]} sets · {pool.repRange[0]}–{pool.repRange[1]}
            {pool.timeBased ? "s hold" : " reps"} · rest {pool.restSeconds}s · RPE ≤ {Math.min(pool.rpeTarget, 7)}
          </p>
          <p className="mt-2 text-xs text-slate-600"><span className="font-semibold">Form:</span> {pool.safetyNotes}</p>
          <p className="mt-1 text-xs text-slate-600"><span className="font-semibold">Joints:</span> {pool.jointRiskNotes}</p>
        </section>
      )}

      {ex.instructionStepsEn.length > 0 && (
        <section className="card">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">How to</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
            {ex.instructionStepsEn.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </section>
      )}
    </div>
  );
}
