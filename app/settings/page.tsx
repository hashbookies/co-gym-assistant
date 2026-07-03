"use client";

import { useEffect, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import Disclaimer from "@/components/Disclaimer";
import { loadSettings, saveSettings, DEFAULT_SETTINGS, loadLogs, saveLogs } from "@/lib/storage";
import { buildExportBundle, parseImportBundle, mergeLogs } from "@/lib/backup";
import { MotionPage, PopIn } from "@/components/motion";
import { SkeletonStack } from "@/components/Skeleton";
import { DumbbellIcon, GearIcon, CheckCircleIcon, DownloadIcon, UploadIcon, AlertIcon } from "@/components/icons";
import type { Settings, WorkoutLog } from "@/lib/types";

export default function SettingsPage() {
  const [s, setS] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImport, setPendingImport] = useState<WorkoutLog[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    setS(loadSettings());
    setReady(true);
  }, []);

  function update(patch: Partial<Settings>) {
    setS((prev) => ({ ...prev, ...patch }));
    setSaved(false);
  }
  function save() {
    const result = saveSettings(s);
    if (!result.ok) {
      setSettingsError(result.error);
      setSaved(false);
      return;
    }
    setSettingsError(null);
    setSaved(true);
  }

  function exportLogs() {
    try {
      const bundle = buildExportBundle(loadLogs());
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cogym-logs-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportError(null);
    } catch {
      setExportError("Could not export logs. Please try again.");
    }
  }

  function pickImportFile() {
    setImportError(null);
    setImportResult(null);
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;
    setImportError(null);
    setImportResult(null);
    setPendingImport(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const logs = parseImportBundle(parsed);
      if (!logs) {
        setImportError("That file doesn't look like a Co-Gym Assistant logs export.");
        return;
      }
      if (logs.length === 0) {
        setImportError("That file has no workout logs in it.");
        return;
      }
      setPendingImport(logs);
    } catch {
      setImportError("Couldn't read that file — make sure it's valid JSON.");
    }
  }

  function applyImport(mode: "merge" | "replace") {
    if (!pendingImport) return;
    const existing = loadLogs();
    const finalLogs = mode === "replace" ? pendingImport : mergeLogs(existing, pendingImport);
    const result = saveLogs(finalLogs);
    if (!result.ok) {
      // Keep pendingImport so the merge/replace choice can be retried
      // without re-picking the file — never claim the import succeeded.
      setImportError("Could not import logs. Please try again or export a backup first.");
      return;
    }
    setImportError(null);
    setImportResult(`Imported ${pendingImport.length} workout${pendingImport.length === 1 ? "" : "s"} — ${finalLogs.length} total now saved.`);
    setPendingImport(null);
  }

  if (!ready) return <MotionPage className="space-y-4"><SkeletonStack /></MotionPage>;

  return (
    <MotionPage className="space-y-4">
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
      {settingsError && (
        <PopIn>
          <p className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            <AlertIcon className="h-3.5 w-3.5 flex-none" /> {settingsError}
          </p>
        </PopIn>
      )}

      <section className="card space-y-3">
        <p className="section-label">Backup</p>
        <p className="text-xs leading-relaxed text-stone-500">
          Everything is stored on this device only — no account, no cloud. Export a backup
          before clearing your browser data, or to move your history to another device.
        </p>
        <div className="flex gap-2">
          <button onClick={exportLogs} className="btn-secondary flex flex-1 items-center justify-center gap-1.5">
            <DownloadIcon className="h-4 w-4" /> Export logs
          </button>
          <button onClick={pickImportFile} className="btn-secondary flex flex-1 items-center justify-center gap-1.5">
            <UploadIcon className="h-4 w-4" /> Import logs
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileSelected} />
        </div>

        {exportError && (
          <PopIn>
            <p className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              <AlertIcon className="h-3.5 w-3.5 flex-none" /> {exportError}
            </p>
          </PopIn>
        )}

        {importError && (
          <PopIn>
            <p className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              <AlertIcon className="h-3.5 w-3.5 flex-none" /> {importError}
            </p>
          </PopIn>
        )}

        {pendingImport && (
          <PopIn className="space-y-2 rounded-xl border border-amber-200/70 bg-amber-50/70 p-3">
            <p className="text-xs font-semibold text-amber-800">
              Found {pendingImport.length} workout{pendingImport.length === 1 ? "" : "s"} in that file. How should it be added?
            </p>
            <div className="flex gap-1.5">
              <button onClick={() => applyImport("merge")} className="btn-secondary flex-1 py-2 text-xs">
                Merge with existing
              </button>
              <button onClick={() => applyImport("replace")} className="flex-1 rounded-lg bg-rose-600 py-2 text-xs font-semibold text-white transition hover:bg-rose-700">
                Replace existing
              </button>
            </div>
            <button onClick={() => setPendingImport(null)} className="w-full text-center text-[11px] font-semibold text-stone-400 hover:text-stone-600">
              Cancel
            </button>
          </PopIn>
        )}

        {importResult && (
          <PopIn>
            <p className="flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700">
              <CheckCircleIcon className="h-3.5 w-3.5" /> {importResult}
            </p>
          </PopIn>
        )}
      </section>

      <Disclaimer />
    </MotionPage>
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
