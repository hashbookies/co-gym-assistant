import { describe, it, expect } from "vitest";
import { assessReadiness, CLINICIAN_NOTE } from "@/lib/readiness";
import type { ReadinessAnswers } from "@/lib/types";

const CLEAR: ReadinessAnswers = {
  nausea: "none", dizziness: false, hydration: "ok", sleep: "ok",
  soreness: "none", energy: "ok", appetite: "ok", injectionDay: false,
};
const ans = (o: Partial<ReadinessAnswers>): ReadinessAnswers => ({ ...CLEAR, ...o });

describe("readiness routing", () => {
  it("dizziness routes to rest (red flag)", () => {
    const r = assessReadiness(ans({ dizziness: true }));
    expect(r.recommendation).toBe("rest");
    expect(r.redFlags).toContain("Dizziness");
  });

  it("worsening nausea routes away from a normal workout", () => {
    const r = assessReadiness(ans({ nausea: "worse" }));
    expect(r.recommendation).not.toBe("normal");
    expect(r.recommendation).toBe("rest");
  });

  it("dehydration routes away from a hard workout", () => {
    const r = assessReadiness(ans({ hydration: "low" }));
    expect(r.recommendation).not.toBe("normal");
  });

  it("very poor sleep routes to low-energy or rest", () => {
    const r = assessReadiness(ans({ sleep: "very-poor" }));
    expect(["low-energy", "rest"]).toContain(r.recommendation);
  });

  it("severe soreness routes away from a hard workout", () => {
    const r = assessReadiness(ans({ soreness: "severe" }));
    expect(r.recommendation).not.toBe("normal");
  });

  it("low energy routes to low-energy", () => {
    const r = assessReadiness(ans({ energy: "low" }));
    expect(r.recommendation).toBe("low-energy");
  });

  it("very low energy is a red flag (rest)", () => {
    const r = assessReadiness(ans({ energy: "very-low" }));
    expect(r.recommendation).toBe("rest");
  });

  it("under-fueling routes away from a hard workout", () => {
    const r = assessReadiness(ans({ appetite: "under-fueled" }));
    expect(r.recommendation).toBe("rest");
  });

  it("injection-day fatigue does NOT produce a hard (normal) workout", () => {
    const r = assessReadiness(ans({ injectionDay: true }));
    expect(r.recommendation).not.toBe("normal");
    expect(r.recommendation).toBe("low-energy");
  });

  it("all-clear routes to a normal workout", () => {
    const r = assessReadiness(CLEAR);
    expect(r.recommendation).toBe("normal");
    expect(r.redFlags).toHaveLength(0);
  });

  it("a clinician disclaimer is available when red flags are present", () => {
    const r = assessReadiness(ans({ dizziness: true }));
    expect(r.redFlags.length).toBeGreaterThan(0);
    expect(typeof CLINICIAN_NOTE).toBe("string");
    expect(CLINICIAN_NOTE.toLowerCase()).toContain("clinician");
  });

  it("mild cautions (mild nausea) downgrade to low-energy, not normal", () => {
    const r = assessReadiness(ans({ nausea: "mild" }));
    expect(r.recommendation).toBe("low-energy");
  });
});
