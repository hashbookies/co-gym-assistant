"use client";

import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import Disclaimer from "@/components/Disclaimer";
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from "@/lib/storage";
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

  if (!ready) return <div className="card text-sm text-slate-400">Loading…</div>;

  return (
    <div className="space-y-4">
      <AppHeader title="Settings" subtitle="Your equipment and training preferences." />

      <section className="card space-y-3">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Equipment</p>
        <SwitchRow label="Dumbbells" value={s.equipment.dumbbell}
          onChange={(v) => update({ equipment: { ...s.equipment, dumbbell: v } })} />
        <SwitchRow label="Resistance bands (handles)" value={s.equipment.band}
          onChange={(v) => update({ equipment: { ...s.equipment, band: v } })} />
        <SwitchRow label="Bodyweight" value={s.equipment.bodyweight}
          onChange={(v) => update({ equipment: { ...s.equipment, bodyweight: v } })} />
      </section>

      <section className="card space-y-3">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Advanced equipment</p>
        <p className="text-xs text-slate-500">
          Off by default. Enabling these unlocks exercises that need them — the generator
          excludes anchor/bench/bar exercises unless turned on here.
        </p>
        <SwitchRow label="Door / over-door anchor" value={s.hasDoorAnchor}
          onChange={(v) => update({ hasDoorAnchor: v })} />
        <SwitchRow label="Bench" value={s.hasBench} onChange={(v) => update({ hasBench: v })} />
        <SwitchRow label="Pull-up bar" value={s.hasPullupBar} onChange={(v) => update({ hasPullupBar: v })} />
      </section>

      <section className="card space-y-3">
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Training</p>
        <NumberRow label="Training days / week" value={s.trainingDays} min={2} max={5}
          onChange={(v) => update({ trainingDays: v })} />
        <div>
          <p className="mb-1.5 text-sm font-semibold text-slate-700">Session length</p>
          <div className="grid grid-cols-4 gap-2">
            {[20, 30, 45, 60].map((d) => (
              <button key={d} onClick={() => update({ durationMin: d })}
                className={`rounded-lg px-2 py-2 text-xs font-semibold ${
                  s.durationMin === d ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                {d}m
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-slate-700">Default weight unit</p>
          <div className="grid grid-cols-2 gap-2">
            {(["lb", "kg"] as const).map((u) => (
              <button key={u} onClick={() => update({ weightUnit: u })}
                className={`rounded-lg px-2 py-2 text-xs font-semibold uppercase ${
                  s.weightUnit === u ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                {u}
              </button>
            ))}
          </div>
        </div>
      </section>

      <button className="btn-primary w-full" onClick={save}>{saved ? "Saved ✓" : "Save settings"}</button>
      <Disclaimer />
    </div>
  );
}

function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-700">{label}</span>
      <button onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition ${value ? "bg-brand-600" : "bg-slate-300"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${value ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function NumberRow({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-700">{label}</span>
      <div className="flex items-center gap-3">
        <button className="btn-secondary px-3 py-1" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <span className="w-6 text-center font-semibold">{value}</span>
        <button className="btn-secondary px-3 py-1" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  );
}
