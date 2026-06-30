import { describe, it, expect } from "vitest";
import { mulberry32, hashSeed, pickOne } from "@/lib/rng";

describe("rng", () => {
  it("mulberry32 is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("mulberry32 produces values in [0,1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("different seeds produce different sequences", () => {
    const a = mulberry32(1)();
    const b = mulberry32(2)();
    expect(a).not.toEqual(b);
  });

  it("hashSeed is stable and differs by input", () => {
    expect(hashSeed("user|normal|0")).toEqual(hashSeed("user|normal|0"));
    expect(hashSeed("user|normal|0")).not.toEqual(hashSeed("user|normal|1"));
  });

  it("pickOne is deterministic given the same rng state", () => {
    const items = ["a", "b", "c", "d", "e"];
    expect(pickOne(items, mulberry32(99))).toEqual(pickOne(items, mulberry32(99)));
    expect(pickOne([], mulberry32(1))).toBeUndefined();
  });
});
