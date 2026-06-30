// Curated generator pool — the ONLY source the workout generator may use.
// 65 manually reviewed, equipment-clean exercises (data/mvp-pool.json).
import poolJson from "@/data/mvp-pool.json";
import type { PoolExercise } from "@/lib/types";

export const MVP_POOL = poolJson as unknown as PoolExercise[];

export function getPool(): PoolExercise[] {
  return MVP_POOL;
}

export function getPoolExercise(slug: string): PoolExercise | undefined {
  return MVP_POOL.find((e) => e.slug === slug);
}

/** All distinct curation categories present in the pool. */
export function poolCategories(): string[] {
  return Array.from(new Set(MVP_POOL.map((e) => e.category)));
}
