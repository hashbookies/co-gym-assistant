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
      <Link href="/library" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">← Library</Link>
      <AppHeader title={ex.displayName} subtitle={`${ex.equipment} · ${ex.primaryMuscle}`} />

      <div className="overflow-hidden rounded-2xl border border-stone-200/80 shadow-card">
        <ExerciseMedia gif={ex.gifUrl} image={ex.image} alt={`${ex.displayName} demonstration`} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="pill capitalize">{ex.movementPattern.replace(/-/g, " ")}</span>
        <span className="pill capitalize">{ex.splitTag}</span>
        <span className="pill capitalize">{ex.bodyRegion}</span>
        <span className="pill capitalize">{ex.difficulty}</span>
        {ex.inGeneratorPool && <span className="pill-brand">in generator</span>}
        {ex.requiresAnchor && <span className="pill-amber">needs anchor</span>}
      </div>

      {ex.secondaryMuscles.length > 0 && (
        <p className="text-sm text-stone-600">
          <span className="font-semibold text-stone-700">Also works:</span> {ex.secondaryMuscles.join(", ")}
        </p>
      )}

      {pool && (
        <section className="card-brand">
          <h2 className="section-label">Programming</h2>
          <p className="mt-1.5 text-sm font-semibold text-stone-800">
            {pool.setRange[0]}–{pool.setRange[1]} sets · {pool.repRange[0]}–{pool.repRange[1]}
            {pool.timeBased ? "s hold" : " reps"} · rest {pool.restSeconds}s · RPE ≤ {Math.min(pool.rpeTarget, 7)}
          </p>
          <p className="mt-2 text-xs text-stone-600"><span className="font-semibold">Form:</span> {pool.safetyNotes}</p>
          <p className="mt-1 text-xs text-stone-600"><span className="font-semibold">Joints:</span> {pool.jointRiskNotes}</p>
        </section>
      )}

      {ex.instructionStepsEn.length > 0 && (
        <section className="card">
          <h2 className="section-label">How to</h2>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-stone-700">
            {ex.instructionStepsEn.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </section>
      )}
    </div>
  );
}
