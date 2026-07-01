import { describe, it, expect } from "vitest";
import { estimateWorkSeconds, formatCountdown, MIN_WORK_SECONDS, MAX_WORK_SECONDS } from "@/lib/timing";

describe("estimateWorkSeconds: rep-based", () => {
  it("8-12 reps -> 40s (10 target reps x 4s tempo)", () => {
    expect(estimateWorkSeconds({ reps: [8, 12], timeBased: false })).toBe(40);
  });
  it("12-15 reps -> 52s (13 target reps x 4s tempo)", () => {
    expect(estimateWorkSeconds({ reps: [12, 15], timeBased: false })).toBe(52);
  });
});

describe("estimateWorkSeconds: hold/time-based", () => {
  it("20-40s hold -> 30s (midpoint)", () => {
    expect(estimateWorkSeconds({ reps: [20, 40], timeBased: true })).toBe(30);
  });
  it("20-45s hold -> about 30-35s", () => {
    const s = estimateWorkSeconds({ reps: [20, 45], timeBased: true });
    expect(s).toBeGreaterThanOrEqual(30);
    expect(s).toBeLessThanOrEqual(35);
  });
});

describe("estimateWorkSeconds: min/max caps", () => {
  it("never goes below the minimum", () => {
    expect(estimateWorkSeconds({ reps: [1, 2], timeBased: false })).toBe(MIN_WORK_SECONDS);
  });
  it("never exceeds the maximum", () => {
    expect(estimateWorkSeconds({ reps: [40, 50], timeBased: false })).toBe(MAX_WORK_SECONDS);
  });
});

describe("estimateWorkSeconds: mobility/stretch default", () => {
  it("uses a gentle flat default regardless of the (meaningless) rep count", () => {
    const s = estimateWorkSeconds({ reps: [1, 1], timeBased: false, movementPattern: "mobility" });
    expect(s).toBeGreaterThanOrEqual(30);
    expect(s).toBeLessThanOrEqual(45);
  });
});

describe("estimateWorkSeconds: unknown/malformed rep data", () => {
  it("falls back to a safe finite default instead of 0 or NaN", () => {
    const zeroRange = estimateWorkSeconds({ reps: [0, 0], timeBased: false });
    const missing = estimateWorkSeconds({ reps: undefined, timeBased: false });
    for (const s of [zeroRange, missing]) {
      expect(Number.isFinite(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(MIN_WORK_SECONDS);
      expect(s).toBeLessThanOrEqual(MAX_WORK_SECONDS);
    }
  });
});

describe("estimateWorkSeconds: warm-up guidance", () => {
  it("caps warm-up durations shorter than a full working set", () => {
    const s = estimateWorkSeconds({ reps: [15, 20], timeBased: false }, { isWarmup: true });
    expect(s).toBeLessThanOrEqual(30);
  });
});

describe("formatCountdown", () => {
  it("formats seconds as mm:ss", () => {
    expect(formatCountdown(40)).toBe("00:40");
    expect(formatCountdown(5)).toBe("00:05");
    expect(formatCountdown(90)).toBe("01:30");
    expect(formatCountdown(0)).toBe("00:00");
  });
});
