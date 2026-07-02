// Pure local backup (export/import) helpers. No File/DOM APIs here — those
// live in the Settings page, which is the only place that needs a real
// browser file picker/download. Everything here is plain JSON in/out, so
// it's fully unit-testable and never touches localStorage directly.

import { CURRENT_LOG_VERSION } from "@/lib/types";
import type { WorkoutLog } from "@/lib/types";
import { migrateLogs } from "@/lib/logs";

export const EXPORT_FORMAT_VERSION = 1;

export interface LogsExportBundle {
  exportVersion: number;
  exportedAt: string; // ISO
  appLogVersion: number; // CURRENT_LOG_VERSION at export time
  logs: WorkoutLog[];
}

/** Build the exportable JSON bundle for the user's current logs. */
export function buildExportBundle(logs: WorkoutLog[], now: string = new Date().toISOString()): LogsExportBundle {
  return { exportVersion: EXPORT_FORMAT_VERSION, exportedAt: now, appLogVersion: CURRENT_LOG_VERSION, logs };
}

/**
 * Parse + validate an arbitrary imported JSON payload into a safe
 * WorkoutLog[]. Rejects (`null`) any top-level shape that isn't recognizably
 * a logs export — a bare array of logs, or a bundle object with a `logs`
 * array — rather than guessing. Individual malformed entries within a valid
 * top-level shape are still defensively recovered via the same migrator used
 * for normal localStorage reads, so a partially-corrupt file never crashes
 * the import and never loses everything else in it.
 */
export function parseImportBundle(raw: unknown): WorkoutLog[] | null {
  if (Array.isArray(raw)) return migrateLogs(raw);
  if (raw && typeof raw === "object" && Array.isArray((raw as { logs?: unknown }).logs)) {
    return migrateLogs((raw as { logs: unknown[] }).logs);
  }
  return null;
}

/** Merge imported logs into the existing set. On an id collision the
 * imported log wins (it's the one the user just chose to bring in), and the
 * result stays sorted newest-first by date. */
export function mergeLogs(existing: WorkoutLog[], incoming: WorkoutLog[]): WorkoutLog[] {
  const byId = new Map(existing.map((l) => [l.id, l] as const));
  for (const log of incoming) byId.set(log.id, log);
  return Array.from(byId.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
