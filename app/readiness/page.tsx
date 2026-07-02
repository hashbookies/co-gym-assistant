"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Disclaimer from "@/components/Disclaimer";
import { assessReadiness, recommendationLabel, CLINICIAN_NOTE } from "@/lib/readiness";
import { saveReadiness } from "@/lib/storage";
import { MotionPage, PresenceSwap, PopIn } from "@/components/motion";
import { CheckCircleIcon, AlertIcon, ShieldIcon } from "@/components/icons";
import type { ReadinessAnswers, ReadinessResult } from "@/lib/types";

const DEFAULTS: ReadinessAnswers = {
  nausea: "none", dizziness: false, hydration: "ok", sleep: "ok",
  soreness: "none", energy: "ok", appetite: "ok", injectionDay: false,
};

export default function ReadinessPage() {
  const router = useRouter();
  const [a, setA] = useState<ReadinessAnswers>(DEFAULTS);
  const [result, setResult] = useState<ReadinessResult | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  function set<K extends keyof ReadinessAnswers>(k: K, v: ReadinessAnswers[K]) {
    setA((prev) => ({ ...prev, [k]: v }));
  }

  function submit() {
    const r = assessReadiness(a);
    const saveResult = saveReadiness(r);
    setSaveError(saveResult.ok ? null : "Could not save readiness check. Your browser storage may be full.");
    // Still show the result in memory even if the save failed — the user
    // already answered the questions and should be able to read it.
    setResult(r);
  }

  return (
    <MotionPage className="space-y-5">
      <AppHeader title="Safety Check-In" subtitle="A quick honest check before you train." />

      <PresenceSwap id={!!result}>
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
        <Result
          result={result}
          saveError={saveError}
          onContinue={() => router.push("/generator")}
          onRedo={() => { setResult(null); setSaveError(null); }}
        />
      )}
      </PresenceSwap>
    </MotionPage>
  );
}

function Result({ result, saveError, onContinue, onRedo }: {
  result: ReadinessResult; saveError: string | null; onContinue: () => void; onRedo: () => void;
}) {
  const rest = result.recommendation === "rest";
  const lowEnergy = result.recommendation === "low-energy";
  const tone = rest ? "card-rose" : lowEnergy ? "card-amber" : "card-brand";
  const Icon = rest ? AlertIcon : CheckCircleIcon;
  const iconTone = rest ? "text-rose-600" : lowEnergy ? "text-amber-600" : "text-brand-600";

  return (
    <section className="space-y-4">
      {saveError && (
        <PopIn>
          <p className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            <AlertIcon className="h-3.5 w-3.5 flex-none" /> {saveError}
          </p>
        </PopIn>
      )}
      <div className={tone}>
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${iconTone}`} />
          <p className="section-label">Recommendation</p>
        </div>
        <p className="mt-2 text-xl font-extrabold text-stone-900">{recommendationLabel(result.recommendation)}</p>
        {result.redFlags.length > 0 && (
          <p className="mt-2 text-sm font-medium text-rose-700">Flags: {result.redFlags.join(", ")}</p>
        )}
        {result.reasons.length > 0 && (
          <p className="mt-1 text-sm text-stone-600">Notes: {result.reasons.join(", ")}</p>
        )}
      </div>

      {rest ? (
        <div className="card">
          <p className="font-semibold text-stone-800">Skip hard training today — that&apos;s the right call, not a setback.</p>
          <ul className="mt-3 space-y-1.5 text-sm text-stone-600">
            <li className="flex gap-2"><span className="text-brand-500">·</span> Rest, or a gentle 10–15 min walk</li>
            <li className="flex gap-2"><span className="text-brand-500">·</span> Light mobility or stretching only</li>
            <li className="flex gap-2"><span className="text-brand-500">·</span> Hydrate and eat if you can</li>
          </ul>
          <p className="mt-3 flex items-start gap-1.5 text-xs text-stone-500">
            <ShieldIcon className="mt-0.5 h-3.5 w-3.5 flex-none text-stone-400" />
            {CLINICIAN_NOTE}
          </p>
          <button className="btn-secondary mt-3 w-full" onClick={onRedo}>Re-check</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button className="btn-secondary" onClick={onRedo}>Re-check</button>
          <button className="btn-primary" onClick={onContinue}>
            {lowEnergy ? "Low-energy workout" : "Generate workout"}
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
      <p className="mb-2 text-sm font-semibold text-stone-700">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map(([val, lbl]) => (
          <button key={val} onClick={() => onChange(val)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              value === val ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"
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
    <div className="card flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-stone-700">{label}</p>
      <button onClick={() => onChange(!value)}
        className={`flex-none rounded-full px-4 py-1.5 text-xs font-semibold transition ${value ? "bg-rose-500 text-white" : "bg-stone-100 text-stone-600"}`}>
        {value ? "Yes" : "No"}
      </button>
    </div>
  );
}
