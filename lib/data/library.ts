// Full exercise library — the 640-exercise tagged pool (data/exercises.tagged.json).
// Used ONLY for browse/search and the detail page, never for generation.
// Imported in server components so the heavy instruction text stays off the
// client list payload (we project a slim card shape for lists).
import libJson from "@/data/exercises.tagged.json";
import { MVP_POOL } from "@/lib/data/pool";
import { toRuntimeMediaPath } from "@/lib/media";
import type { LibraryCard, LibraryExercise } from "@/lib/types";

// Shape of a raw tagged record (only the fields we read).
interface RawTagged {
  id: string;
  slug: string;
  name: string;
  bodyPart: string;
  equipmentRaw: string;
  equipment: string;
  primaryMuscle: string;
  secondaryMuscles: string[];
  instructionsEn: string;
  instructionStepsEn: string[];
  image: string;
  gifUrl: string;
  movementPattern: string;
  splitTag: string;
  bodyRegion: string;
  difficulty: string;
  homeSuitable: boolean;
  lowEnergyFriendly: boolean;
  needsAnchor?: boolean;
}

const RAW = libJson as unknown as RawTagged[];
const POOL_SLUGS = new Set(MVP_POOL.map((e) => e.slug));

// Source paths are relative ("images/0001-x.jpg"); media is served from /public
// at an absolute path. mediaUrl normalizes + guards against a missing value.
function mediaUrl(p: string | undefined, kind: "image" | "video"): string {
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) {
    return p;
  }
  return toRuntimeMediaPath(p, kind);
}

function toCard(r: RawTagged): LibraryCard {
  return {
    slug: r.slug,
    displayName: r.name,
    thumb: mediaUrl(r.image, "image"),
    equipment: r.equipment as LibraryCard["equipment"],
    movementPattern: r.movementPattern as LibraryCard["movementPattern"],
    splitTag: r.splitTag as LibraryCard["splitTag"],
    bodyRegion: r.bodyRegion as LibraryCard["bodyRegion"],
    primaryMuscle: r.primaryMuscle,
    difficulty: r.difficulty as LibraryCard["difficulty"],
    homeSuitable: r.homeSuitable,
    lowEnergyFriendly: r.lowEnergyFriendly,
    inGeneratorPool: POOL_SLUGS.has(r.slug),
    // The tagged library only models needsAnchor; the other gates are curated
    // per-exercise in the MVP pool. For library badging we infer conservatively.
    requiresAnchor: !!r.needsAnchor,
    requiresBench: false,
    requiresPullupBar: false,
    requiresDoorSetup: false,
    requiresSpecialEquipment: false,
  };
}

/** Slim card list for the library browser (home-suitable only, de-duped by slug).
 * The source data has a few duplicate slugs (re-shot variants); we keep the
 * first so list keys stay unique and the UI doesn't show literal duplicates. */
export function getLibrary(): LibraryCard[] {
  const seen = new Set<string>();
  const cards: LibraryCard[] = [];
  for (const r of RAW) {
    if (!r.homeSuitable || seen.has(r.slug)) continue;
    seen.add(r.slug);
    cards.push(toCard(r));
  }
  return cards;
}

/** Full record for the detail page. */
export function getExerciseBySlug(slug: string): LibraryExercise | undefined {
  const r = RAW.find((x) => x.slug === slug);
  if (!r) return undefined;
  return {
    ...toCard(r),
    sourceId: r.id,
    bodyPart: r.bodyPart,
    equipmentRaw: r.equipmentRaw,
    secondaryMuscles: r.secondaryMuscles,
    instructionsEn: r.instructionsEn,
    instructionStepsEn: r.instructionStepsEn,
    image: mediaUrl(r.image, "image"),
    gifUrl: mediaUrl(r.gifUrl, "video"),
  };
}

export function allLibrarySlugs(): string[] {
  return RAW.map((r) => r.slug);
}
