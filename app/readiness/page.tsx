"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Disclaimer from "@/components/Disclaimer";
import { assessReadiness, recommendationLabel, CLINICIAN_NOTE } from "@/lib/readiness";
import { saveReadiness } from "@/lib/storage";
import type { ReadinessAnswers, ReadinessResult } from "@/lib/types";

const DEFAULTS: ReadinessAnswers = {
  nausea: "none", dizziness: false, hydration: "ok", sleep: "ok",
  soreness: "none", energy: "ok", appetite: "ok", injectionDay: false,
};

export default function ReadinessPage() {
  const router = useRouter();
  const [a, setA] = useState<ReadinessAnswers>(DEFAULTS);
  const [result, setResult] = useState<ReadinessResult | null>(null);

  function set<K extends keyof ReadinessAnswers>(k: K, v: ReadinessAnswers[K]) {
    setA((prev) => ({ ...prev, [k]: v }));
  }

  function submit() {
    const r = assessReadiness(a);
    saveReadiness(r);
    setResult(r);
  }

  return (
    <div className="space-y-5">
      <AppHeader title="Safety Check-In" subtitle="A quick honest check before you train." />

      {!result ? (
        <section className="space-y-3">
          <Choice label="Nausea" value={a.nausea} onChange={(v) => set("nausea", v as ReadinessAnswers["nausea"])}
            options={[["none", "None"], ["mild", "Mild"], ["worse", "Worsening"]]} />
          <Choice label="Energy" value={a.energy} onChange={(v) => set("energy", v as ReadinessAnswers["energy"])}
            options={[["ok", "Okay"], ["low", "Low"], ["very-low", "Very low"]]} />
          <Choice label="Sleep last night" value={a.sleep} onChange={(v) => set("sleep", v as ReadinessAnswers["sleep"])}
            options={[["ok", "Okay"], ["poor", "Poor"], ["very-poor", "Very poor"]]} />
          <Choice label="Soreness" value={a.soreness} onChange={(v) => set("soreness", v as ReadinessAnswers["soreness"])}
            options={[["none", "None"], ["moderate", "Moderate"], ["severe", "Severe"]]} />
          <Choice label="Hydration" value={a.hydration} onChange={(v) => set("hydration", v as ReadinessAnswers["hydration"])}
            options={[["ok", "Hydrated"], ["low", "Behind on fluids"]]} />
          <Choice label="Appetite / fueling" value={a.appetite} onChange={(v) => set("appetite", v as ReadinessAnswers["appetite"])}
            options={[["ok", "Eaten enough"], ["under-fueled", "Under-fueled"]]} />
          <ToggleRow label="Dizzy or lightheaded?" value={a.dizziness} onChange={(v) => set("dizziness", v)} />
          <ToggleRow label="Injection day / post-injection fatigue?" value={a.injectionDay} onChange={(v) => set("injectionDay", v)} />

          <button className="btn-primary w-full" onClick={submit}>See recommendation</button>
          <Disclaimer />
        </section>
      ) : (
        <Result result={result} onContinue={() => router.push("/generator")} onRedo={() => setResult(null)} />
      )}
    </div>
  );
}

function Result({ result, onContinue, onRedo }: { result: ReadinessResult; onContinue: () => void; onRedo: () => void }) {
  const rest = result.recommendation === "rest";
  return (
    <section className="space-y-4">
      <div className={`card ${rest ? "bg-red-50" : result.recommendation === "low-energy" ? "bg-amber-50" : "bg-brand-50"}`}>
        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Recommendation</p>
        <p className="mt-1 text-lg font-bold text-slate-900">{recommendationLabel(result.recommendation)}</p>
        {result.redFlags.length > 0 && (
          <p className="mt-2 text-sm text-red-700">Red flags: {result.redFlags.join(", ")}</p>
        )}
        {result.reasons.length > 0 && (
          <p className="mt-1 text-sm text-slate-600">Notes: {result.reasons.join(", ")}</p>
        )}
      </div>

      {rest ? (
        <div className="card">
          <p className="font-semibold text-slate-800">Skip hard training today.</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-slate-600">
            <li>Rest, or a gentle 10–15 min walk</li>
            <li>Light mobility or stretching only</li>
            <li>Hydrate and eat if you can</li>
          </ul>
          <p className="mt-3 text-xs text-amber-800">{CLINICIAN_NOTE}</p>
          <button className="btn-secondary mt-3 w-full" onClick={onRedo}>Re-check</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-secondary" onClick={onRedo}>Re-check</button>
          <button className="btn-primary" onClick={onContinue}>
            {result.recommendation === "low-energy" ? "Low-energy workout" : "Generate workout"}
          </button>
        </div>
      )}
    </section>
  );
}

function Choice({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][];
}) {
  return (
    <div className="card">
      <p className="mb-2 text-sm font-semibold text-slate-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([val, lbl]) => (
          <button key={val} onClick={() => onChange(val)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              value === val ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"
            }`}>
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="card flex items-center justify-between">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <button onClick={() => onChange(!value)}
        className={`rounded-full px-4 py-1.5 text-xs font-semibold ${value ? "bg-red-500 text-white" : "bg-slate-100 text-slate-600"}`}>
        {value ? "Yes" : "No"}
      </button>
    </div>
  );
}
