"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Disclaimer from "@/components/Disclaimer";
import WorkoutView from "@/components/WorkoutView";
import { getPool } from "@/lib/data/pool";
import { generateWorkout } from "@/lib/generator";
import { loadSettings, saveCurrentWorkout, loadReadiness, nextDayIndex } from "@/lib/storage";
import { BoltIcon } from "@/components/icons";
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
    <div className="space-y-5 pb-4">
      <AppHeader title="Workout Generator" subtitle="Uses only the curated, equipment-clean pool." />

      <section className="card space-y-4">
        <div>
          <p className="section-label mb-2">Intensity</p>
          <div className="segmented">
            <Segment active={mode === "normal"} onClick={() => setMode("normal")}>Normal · RPE ≤ 7</Segment>
            <Segment active={mode === "low-energy"} onClick={() => setMode("low-energy")}>Low energy · RPE 5–6</Segment>
          </div>
        </div>

        <div>
          <p className="section-label mb-2">Day in 3-day cycle</p>
          <div className="segmented">
            {["A · Squat", "B · Hinge", "C · Lunge"].map((label, i) => (
              <Segment key={i} active={dayIndex === i} onClick={() => setDayIndex(i)}>{label}</Segment>
            ))}
          </div>
        </div>

        <button className="btn-primary w-full" onClick={build}>
          <BoltIcon className="h-4 w-4" /> Generate workout
        </button>
      </section>

      {preview && (
        <>
          <WorkoutView workout={preview} />
          <div className="sticky bottom-24 z-10 -mx-4 border-t border-stone-200/80 bg-stone-50/90 px-4 pb-2 pt-3 backdrop-blur">
            <button className="btn-primary w-full shadow-lifted" onClick={setAsToday}>
              Set as today&apos;s workout
            </button>
          </div>
        </>
      )}

      <Disclaimer />
    </div>
  );
}

function Segment({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`segmented-item ${active ? "segmented-item-active" : ""}`}>
      {children}
    </button>
  );
}
