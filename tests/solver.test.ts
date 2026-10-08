import { describe, expect, it } from "vitest";
import { solveAllocation } from "../src/lib/solver";
import {
  parseClientsInput,
  parseInventory,
  runLevel1,
  runLevel2,
  runLevel3,
  runLevel4,
} from "../src/lib/strategies";
import { inventoryCapacity, type Inventory } from "../src/lib/robots";

const sample: Inventory = { Bravo: 2, Charlie: 3, Delta: 2 };

describe("solveAllocation", () => {
  it("Level 1: 16h exact fit prefers category diversity", () => {
    const res = solveAllocation(16, sample, "hours");
    expect(res.isValid).toBe(true);
    expect(res.bravo).toBe(1);
    expect(res.charlie).toBe(1);
    expect(res.delta).toBe(1);
    expect(res.totalHours).toBe(16);
    expect(res.totalCost).toBe(9);
  });

  it("Level 1: 20h minimises excess then maximises types ($12)", () => {
    const res = solveAllocation(20, sample, "hours");
    expect(res.isValid).toBe(true);
    expect(res.bravo).toBe(1);
    expect(res.charlie).toBe(2);
    expect(res.delta).toBe(1);
    expect(res.totalHours).toBe(21);
    expect(res.totalCost).toBe(12);
  });

  it("Level 2 PDF example: 20h → C1 + D2 = $11", () => {
    const res = solveAllocation(20, sample, "cost");
    expect(res.isValid).toBe(true);
    expect(res.charlie).toBe(1);
    expect(res.delta).toBe(2);
    expect(res.bravo).toBe(0);
    expect(res.totalHours).toBe(21);
    expect(res.totalCost).toBe(11);
  });

  it("returns exact error for zero inventory", () => {
    const res = solveAllocation(10, { Bravo: 0, Charlie: 0, Delta: 0 }, "cost");
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Error: No robots available for assignment.");
  });

  it("returns exact error for non-positive hours", () => {
    const res = solveAllocation(-5, { Bravo: 1, Charlie: 0, Delta: 0 }, "cost");
    expect(res.isValid).toBe(false);
    expect(res.error).toBe("Error: Work hours must be a positive integer.");
  });

  it("returns exact error when allocation is impossible", () => {
    const res = solveAllocation(100, { Bravo: 1, Charlie: 0, Delta: 0 }, "cost");
    expect(res.isValid).toBe(false);
    expect(res.error).toBe(
      "Error: Unable to allocate at least one robot from each category with the available inventory."
    );
  });
});

describe("strategies", () => {
  it("Level 2 costs no more than Level 1 for the PDF sample", () => {
    const l1 = runLevel1(sample, 20);
    const l2 = runLevel2(sample, 20);
    expect(l1.totalCost).toBe(12);
    expect(l2.totalCost).toBe(11);
    expect(l2.totalCost).toBeLessThanOrEqual(l1.totalCost);
  });

  it("Level 3 detects sufficient capacity", () => {
    const r = runLevel3(sample, 10);
    expect(r.sufficient).toBe(true);
    expect(r.deficit).toBe(0);
    expect(r.standby).toBeNull();
  });

  it("Level 3 activates standby on deficit", () => {
    const r = runLevel3(sample, 100);
    expect(r.sufficient).toBe(false);
    expect(r.deficit).toBeGreaterThan(0);
    expect(r.standby?.isValid).toBe(true);
  });

  it("Level 4 processes clients in priority order", () => {
    const r = runLevel4(sample, [12, 16, 17]);
    expect(r.allocations).toHaveLength(3);
    expect(r.allocations[0].hours).toBe(17);
    for (const a of r.allocations) {
      expect(["allocated", "standby_required", "impossible"]).toContain(
        a.status
      );
    }
  });
});

describe("parsing & capacity", () => {
  it("parses mixed client delimiters", () => {
    expect(parseClientsInput("12, 16 17;10")).toEqual([12, 16, 17, 10]);
  });

  it("rejects bad client input", () => {
    expect(() => parseClientsInput("abc")).toThrow(/Invalid input/);
  });

  it("rejects negative inventory", () => {
    expect(() => parseInventory(-1, 2, 3)).toThrow(/non-negative/);
  });

  it("computes capacity", () => {
    expect(inventoryCapacity(sample)).toBe(37);
  });
});
