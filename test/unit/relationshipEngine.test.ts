import { describe, it, expect } from "vitest";
import { distributeChildren, sampleDistinct } from "../../src/generation/relationshipEngine";

describe("distributeChildren", () => {
  it("returns an empty list when there are no parents", () => {
    expect(distributeChildren([], 50, { min: 1, max: 5 })).toEqual([]);
  });

  it("returns an empty list when requestedCount is zero or negative", () => {
    expect(distributeChildren(["a", "b"], 0, { min: 1, max: 5 })).toEqual([]);
    expect(distributeChildren(["a", "b"], -5, { min: 1, max: 5 })).toEqual([]);
  });

  it("gives every parent at least min and at most max children", () => {
    const parents = Array.from({ length: 10 }, (_, i) => `p${i}`);
    const assignments = distributeChildren(parents, 30, { min: 2, max: 5 });

    const counts = new Map<string, number>();
    for (const parentId of assignments) {
      counts.set(parentId, (counts.get(parentId) ?? 0) + 1);
    }
    for (const parentId of parents) {
      const count = counts.get(parentId) ?? 0;
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(5);
    }
  });

  it("matches the requested total when it's within the feasible range", () => {
    const parents = Array.from({ length: 10 }, (_, i) => `p${i}`);
    const assignments = distributeChildren(parents, 30, { min: 2, max: 5 });
    expect(assignments.length).toBe(30);
  });

  it("clamps to the max feasible total when the request exceeds max*parents", () => {
    const parents = ["a", "b"];
    const assignments = distributeChildren(parents, 1000, { min: 1, max: 3 });
    expect(assignments.length).toBe(6); // 2 parents * max 3
  });

  it("clamps to the min feasible total when the request is below min*parents", () => {
    const parents = Array.from({ length: 5 }, (_, i) => `p${i}`);
    const assignments = distributeChildren(parents, 1, { min: 2, max: 5 });
    expect(assignments.length).toBe(10); // 5 parents * min 2
  });

  it("handles a fixed ratio (min === max) exactly", () => {
    const parents = ["a", "b", "c"];
    const assignments = distributeChildren(parents, 100, { min: 4, max: 4 });
    expect(assignments.length).toBe(12);
    const counts = new Map<string, number>();
    for (const parentId of assignments) counts.set(parentId, (counts.get(parentId) ?? 0) + 1);
    for (const parentId of parents) expect(counts.get(parentId)).toBe(4);
  });

  it("only produces parent ids that were given as input", () => {
    const parents = ["x", "y", "z"];
    const assignments = distributeChildren(parents, 20, { min: 1, max: 10 });
    for (const parentId of assignments) {
      expect(parents).toContain(parentId);
    }
  });
});

describe("sampleDistinct", () => {
  it("returns distinct items with no duplicates", () => {
    const pool = ["a", "b", "c", "d", "e"];
    const sample = sampleDistinct(pool, 3);
    expect(sample.length).toBe(3);
    expect(new Set(sample).size).toBe(3);
    for (const item of sample) expect(pool).toContain(item);
  });

  it("clamps count to the pool size", () => {
    const pool = ["a", "b"];
    const sample = sampleDistinct(pool, 10);
    expect(sample.length).toBe(2);
    expect(new Set(sample)).toEqual(new Set(pool));
  });

  it("returns an empty array for a zero or negative count", () => {
    expect(sampleDistinct(["a", "b"], 0)).toEqual([]);
    expect(sampleDistinct(["a", "b"], -1)).toEqual([]);
  });
});
