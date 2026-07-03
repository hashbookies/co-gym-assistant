"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getMediaCandidates } from "@/lib/media";
import type { LibraryCard, Equipment, SplitTag } from "@/lib/types";

const EQUIPMENT: (Equipment | "all")[] = ["all", "dumbbell", "bodyweight", "band"];
const SPLITS: (SplitTag | "all")[] = ["all", "legs", "push", "pull", "core"];

export default function LibraryBrowser({ exercises }: { exercises: LibraryCard[] }) {
  const [q, setQ] = useState("");
  const [equip, setEquip] = useState<Equipment | "all">("all");
  const [split, setSplit] = useState<SplitTag | "all">("all");
  const [generatorOnly, setGeneratorOnly] = useState(false);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return exercises.filter((e) => {
      if (equip !== "all" && e.equipment !== equip) return false;
      if (split !== "all" && e.splitTag !== split) return false;
      if (generatorOnly && !e.inGeneratorPool) return false;
      if (needle && !`${e.displayName} ${e.primaryMuscle}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [exercises, q, equip, split, generatorOnly]);

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search exercises or muscles…"
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm shadow-sm placeholder:text-stone-400"
      />

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {EQUIPMENT.map((opt) => (
          <Chip key={opt} active={equip === opt} onClick={() => setEquip(opt)}>{opt}</Chip>
        ))}
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {SPLITS.map((opt) => (
          <Chip key={opt} active={split === opt} onClick={() => setSplit(opt)}>{opt}</Chip>
        ))}
        <Chip active={generatorOnly} onClick={() => setGeneratorOnly((v) => !v)}>in generator</Chip>
      </div>

      <p className="section-label">{filtered.length} results</p>

      <ul className="space-y-2">
        {filtered.slice(0, 200).map((e) => (
          <li key={e.slug}>
            <Link href={`/library/${e.slug}`} className="card flex items-center justify-between gap-3 transition hover:border-brand-200 hover:shadow-lifted">
              <div className="flex min-w-0 items-center gap-3">
                <ExerciseThumb src={e.thumb} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-stone-900">{e.displayName}</p>
                  <p className="mt-0.5 truncate text-xs text-stone-500 capitalize">
                    {e.equipment} · {e.primaryMuscle} · {e.difficulty}
                  </p>
                </div>
              </div>
              <div className="flex flex-none flex-col items-end gap-1">
                {e.inGeneratorPool && <span className="pill-brand">generator</span>}
                {e.requiresAnchor && <span className="pill-amber">needs anchor</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {filtered.length > 200 && (
        <p className="text-center text-xs text-stone-400">Showing first 200 — refine your search.</p>
      )}
    </div>
  );
}

function ExerciseThumb({ src }: { src: string }) {
  const candidates = getMediaCandidates(src, "image");
  const [index, setIndex] = useState(0);
  const failed = index >= candidates.length;

  if (failed || candidates.length === 0) {
    return <div className="h-12 w-12 flex-none rounded-xl border border-stone-100 bg-stone-100" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={candidates[index]} alt="" loading="lazy" width={48} height={48}
      className="h-12 w-12 flex-none rounded-xl border border-stone-100 bg-stone-100 object-cover"
      onError={() => setIndex((prev) => prev + 1)} />
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition ${
        active ? "border-brand-600 bg-brand-600 text-white" : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
      }`}
    >
      {children}
    </button>
  );
}
