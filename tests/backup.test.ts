import { describe, it, expect } from "vitest";
import { buildExportBundle, parseImportBundle, mergeLogs, EXPORT_FORMAT_VERSION } from "@/lib/backup";
import { CURRENT_LOG_VERSION } from "@/lib/types";
import type { WorkoutLog } from "@/lib/types";

function log(id: string, date: string): WorkoutLog {
  return {
    version: CURRENT_LOG_VERSION, id, workoutId: "w", title: "T", mode: "normal", date,
    exercises: [{
      exerciseSlug: "x", exerciseName: "X", status: "completed", plannedSets: 1,
      plannedRepRange: [8, 12], plannedRestSeconds: 60, plannedRpeTarget: 7,
      actualSets: [{ setNumber: 1, reps: 10, weight: 20, weightUnit: "lb", rpe: 7, completed: true }],
      sessionFeel: "good", modified: false,
    }],
  };
}

describe("buildExportBundle", () => {
  it("includes format/app version metadata and an exportedAt timestamp", () => {
    const bundle = buildExportBundle([log("a", "2026-01-01")], "2026-06-01T12:00:00.000Z");
    expect(bundle.exportVersion).toBe(EXPORT_FORMAT_VERSION);
    expect(bundle.appLogVersion).toBe(CURRENT_LOG_VERSION);
    expect(bundle.exportedAt).toBe("2026-06-01T12:00:00.000Z");
    expect(bundle.logs).toHaveLength(1);
  });

  it("defaults exportedAt to now when not given", () => {
    const bundle = buildExportBundle([]);
    expect(() => new Date(bundle.exportedAt).toISOString()).not.toThrow();
  });
});

describe("parseImportBundle: accepts valid shapes, rejects everything else", () => {
  it("accepts a bare array of logs", () => {
    const out = parseImportBundle([log("a", "2026-01-01")]);
    expect(out).toHaveLength(1);
    expect(out![0].id).toBe("a");
  });

  it("accepts a wrapped bundle object with a logs array", () => {
    const bundle = buildExportBundle([log("a", "2026-01-01"), log("b", "2026-01-02")]);
    const out = parseImportBundle(bundle);
    expect(out).toHaveLength(2);
  });

  it("rejects a plain object with no logs array", () => {
    expect(parseImportBundle({ foo: "bar" })).toBeNull();
  });

  it("rejects primitives and null without crashing", () => {
    expect(parseImportBundle(null)).toBeNull();
    expect(parseImportBundle(undefined)).toBeNull();
    expect(parseImportBundle("just a string")).toBeNull();
    expect(parseImportBundle(42)).toBeNull();
    expect(parseImportBundle(true)).toBeNull();
  });

  it("recovers individual malformed entries via the same migrator, never crashing on partial corruption", () => {
    const out = parseImportBundle([log("a", "2026-01-01"), null, 5, "garbage", { completedSlugs: ["push-up"] }]);
    expect(out).not.toBeNull();
    // The valid v2 log, plus the recovered v0-style completedSlugs entry — nulls/primitives dropped.
    expect(out!.length).toBe(2);
  });

  it("an empty array is valid (an intentionally empty export)", () => {
    expect(parseImportBundle([])).toEqual([]);
  });
});

describe("mergeLogs", () => {
  it("combines two disjoint sets and sorts newest-first by date", () => {
    const existing = [log("a", "2026-01-01")];
    const incoming = [log("b", "2026-03-01")];
    const out = mergeLogs(existing, incoming);
    expect(out.map((l) => l.id)).toEqual(["b", "a"]);
  });

  it("on an id collision, the incoming (imported) log wins", () => {
    const existing = [{ ...log("a", "2026-01-01"), title: "Old title" }];
    const incoming = [{ ...log("a", "2026-01-01"), title: "New title" }];
    const out = mergeLogs(existing, incoming);
    expect(out).toHaveLength(1);
    expect(out[0].title).toBe("New title");
  });

  it("importing nothing leaves existing logs untouched", () => {
    const existing = [log("a", "2026-01-01"), log("b", "2026-01-02")];
    expect(mergeLogs(existing, [])).toHaveLength(2);
  });
});
