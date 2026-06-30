"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Disclaimer from "@/components/Disclaimer";
import WorkoutView from "@/components/WorkoutView";
import { getPool } from "@/lib/data/pool";
import { generateWorkout } from "@/lib/generator";
import { loadSettings, saveCurrentWorkout, loadReadiness, nextDayIndex } from "@/lib/storage";
import type { Workout, WorkoutMode } from "@/lib/types";

export default function GeneratorPage() {
  const router = useRouter();
  const [mode, setMode] = useState<WorkoutMode>("normal");
  const [dayIndex, setDayIndex] = useState(0);
  const [preview, setPreview] = useState<Workout | null>(null);

  // Seed defaults from the last readiness result and the rotating day index.
  useEffect(() => {
    const r = loadReadiness();
    if (r && r.recommendation === "low-energy") setMode("low-energy");
    setDayIndex(nextDayIndex());
  }, []);

  const settings = useMemo(() => loadSettings(), []);

  function build() {
    const w = generateWorkout(getPool(), settings, { mode, dayIndex, seed: "user" });
    setPreview(w);
  }

  function setAsToday() {
    if (!preview) return;
    saveCurrentWorkout(preview);
    router.push("/today");
  }

  return (
    <div className="space-y-5">
      <AppHeader title="Workout Generator" subtitle="Uses only the curated, equipment-clean pool." />

      <section className="card space-y-4">
        <div>
          <p className="mb-1.5 text-sm font-semibold text-slate-700">Intensity</p>
          <div className="grid grid-cols-2 gap-2">
            <Toggle active={mode === "normal"} onClick={() => setMode("normal")}>Normal (RPE ≤ 7)</Toggle>
            <Toggle active={mode === "low-energy"} onClick={() => setMode("low-energy")}>Low energy (RPE 5–6)</Toggle>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-semibold text-slate-700">Day in 3-day cycle</p>
          <div className="grid grid-cols-3 gap-2">
            {["A · Squat", "B · Hinge", "C · Lunge"].map((label, i) => (
              <Toggle key={i} active={dayIndex === i} onClick={() => setDayIndex(i)}>{label}</Toggle>
            ))}
          </div>
        </div>

        <button className="btn-primary w-full" onClick={build}>Generate workout</button>
      </section>

      {preview && (
        <>
          <WorkoutView workout={preview} />
          <button className="btn-primary w-full" onClick={setAsToday}>Set as today&apos;s workout</button>
        </>
      )}

      <Disclaimer />
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
        active ? "bg-brand-600 text-white" : "border border-slate-300 bg-white text-slate-600"
      }`}
    >
      {children}
    </button>
  );
}
