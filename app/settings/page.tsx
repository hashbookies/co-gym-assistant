"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import Disclaimer from "@/components/Disclaimer";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/storage";
import { DumbbellIcon, GearIcon, CheckCircleIcon } from "@/components/icons";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setS(loadSettings());
    setReady(true);
  }, []);

  function update(patch: Partial<Settings>) {
    setS((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  }
  function save() {
    saveSettings(s);
    setSaved(true);
  }

  if (!ready) return <div className="card text-sm text-stone-400">Loading…</div>;

  return (
    <div className="space-y-4">
      <AppHeader title="Settings" subtitle="Your equipment and training preferences." />

      <section className="card space-y-3">
        <div className="flex items-center gap-2">
          <DumbbellIcon className="h-4 w-4 text-brand-600" />
          <p className="section-label">Equipment</p>
        </div>
        <SwitchRow label="Dumbbells" value={s.equipment.dumbbell}
          onChange={(v) => update({ equipment: { ...s.equipment, dumbbell: v } })} />
        <SwitchRow label="Resistance bands (handles)" value={s.equipment.band}
          onChange={(v) => update({ equipment: { ...s.equipment, band: v } })} />
        <SwitchRow label="Bodyweight" value={s.equipment.bodyweight}
          onChange={(v) => update({ equipment: { ...s.equipment, bodyweight: v } })} />
      </section>

      <section className="card space-y-3">
        <p className="section-label">Advanced equipment</p>
        <p className="text-xs leading-relaxed text-stone-500">
          Off by default. Enabling these unlocks exercises that need them — the generator
          excludes anchor/bench/bar exercises unless turned on here.
        </p>
        <SwitchRow label="Door / over-door anchor" value={s.hasDoorAnchor}
          onChange={(v) => update({ hasDoorAnchor: v })} />
        <SwitchRow label="Bench" value={s.hasBench} onChange={(v) => update({ hasBench: v })} />
        <SwitchRow label="Pull-up bar" value={s.hasPullupBar} onChange={(v) => update({ hasPullupBar: v })} />
      </section>

      <section className="card space-y-4">
        <div className="flex items-center gap-2">
          <GearIcon className="h-4 w-4 text-brand-600" />
          <p className="section-label">Training</p>
        </div>
        <NumberRow label="Training days / week" value={s.trainingDays} min={2} max={5}
          onChange={(v) => update({ trainingDays: v })} />
        <div>
          <p className="mb-1.5 text-sm font-semibold text-stone-700">Session length</p>
          <div className="segmented">
            {[20, 30, 45, 60].map((d) => (
              <button key={d} onClick={() => update({ durationMin: d })}
                className={`segmented-item ${s.durationMin === d ? "segmented-item-active" : ""}`}>
                {d}m
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-stone-700">Default weight unit</p>
          <div className="segmented">
            {(["lb", "kg"] as const).map((u) => (
              <button key={u} onClick={() => update({ weightUnit: u })}
                className={`segmented-item uppercase ${s.weightUnit === u ? "segmented-item-active" : ""}`}>
                {u}
              </button>
            ))}
          </div>
        </div>
      </section>

      <button className="btn-primary w-full" onClick={save}>
        {saved ? <><CheckCircleIcon className="h-4 w-4" /> Saved</> : "Save settings"}
      </button>
      <Disclaimer />
    </div>
  );
}

function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-stone-700">{label}</span>
      <button onClick={() => onChange(!value)}
        className={`relative h-6 w-11 flex-none rounded-full transition ${value ? "bg-brand-600" : "bg-stone-300"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${value ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function NumberRow({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-stone-700">{label}</span>
      <div className="flex items-center gap-3">
        <button className="btn-secondary px-3 py-1" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <span className="w-6 text-center font-semibold">{value}</span>
        <button className="btn-secondary px-3 py-1" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  );
}
