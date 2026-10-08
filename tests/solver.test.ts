import { describe, expect, it } from "vitest";
import { ERRORS } from "../src/lib/errors";
import { solveAllocation } from "../src/lib/solver";
import {
  parseClientsInput,
  parseInventory,
  runLevel1,
  runLevel2,
  runLevel3,
  runLevel4,
  singleTypeStandbyOptions,
} from "../src/lib/strategies";
import { inventoryCapacity, type Inventory } from "../src/lib/robots";

const sample: Inventory = { Bravo: 2, Charlie: 3, Delta: 2 };

describe("PDF Level 1 — Category Distribution", () => {
  it("16h with B2/C3/D2 → B1+C1+D1 exact fit", () => {
    const res = runLevel1(sample, 16);
    expect(res.isValid).toBe(true);
    expect(res.bravo).toBe(1);
    expect(res.charlie).toBe(1);
    expect(res.delta).toBe(1);
    expect(res.totalHours).toBe(16);
    expect(res.totalCost).toBe(9);
  });

  it("20h requires all three categories → $12 (vs L2 $11)", () => {
    const res = runLevel1(sample, 20);
    expect(res.isValid).toBe(true);
    expect(res.bravo).toBeGreaterThanOrEqual(1);
    expect(res.charlie).toBeGreaterThanOrEqual(1);
    expect(res.delta).toBeGreaterThanOrEqual(1);
    expect(res.totalHours).toBeGreaterThanOrEqual(20);
    expect(res.totalCost).toBe(12);
    expect(res.bravo).toBe(1);
    expect(res.charlie).toBe(2);
    expect(res.delta).toBe(1);
  });

  it("fails with each-category error when a type is missing", () => {
    const res = runLevel1({ Bravo: 5, Charlie: 0, Delta: 5 }, 10);
    expect(res.isValid).toBe(false);
    expect(res.error).toBe(ERRORS.eachCategory);
  });
});

describe("PDF Level 2 — Cost Optimised", () => {
  it("Example 1: 20h → Charlie 1 + Delta 2 = $11", () => {
    const res = runLevel2(sample, 20);
    expect(res.isValid).toBe(true);
    expect(res.bravo).toBe(0);
    expect(res.charlie).toBe(1);
    expect(res.delta).toBe(2);
    expect(res.totalHours).toBe(21);
    expect(res.totalCost).toBe(11);
  });

  it("Example 2: 6h with B2/C2/D3 → Bravo 2 = $4", () => {
    const res = runLevel2({ Bravo: 2, Charlie: 2, Delta: 3 }, 6);
    expect(res.isValid).toBe(true);
    expect(res.bravo).toBe(2);
    expect(res.charlie).toBe(0);
    expect(res.delta).toBe(0);
    expect(res.totalHours).toBe(6);
    expect(res.totalCost).toBe(4);
  });

  it("L1 vs L2 comparison matches PDF ($12 vs $11, diff $1)", () => {
    const l1 = runLevel1(sample, 20);
    const l2 = runLevel2(sample, 20);
    expect(l1.totalCost).toBe(12);
    expect(l2.totalCost).toBe(11);
    expect(l1.totalCost - l2.totalCost).toBe(1);
  });
});

describe("PDF Level 3 — Standby Activation", () => {
  it("Example: B1/C1/D1 capacity 16, request 21 → Charlie×1 at $3", () => {
    const inv: Inventory = { Bravo: 1, Charlie: 1, Delta: 1 };
    const r = runLevel3(inv, 21);
    expect(r.maxActive).toBe(16);
    expect(r.deficit).toBe(5);
    expect(r.sufficient).toBe(false);
    expect(r.standby?.isValid).toBe(true);
    expect(r.standby?.charlie).toBe(1);
    expect(r.standby?.bravo).toBe(0);
    expect(r.standby?.delta).toBe(0);
    expect(r.standby?.totalCost).toBe(3);

    const opts = r.standbyOptions;
    expect(opts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "Bravo", count: 2, cost: 4 }),
        expect.objectContaining({ type: "Charlie", count: 1, cost: 3 }),
        expect.objectContaining({ type: "Delta", count: 1, cost: 4 }),
      ])
    );
  });

  it("single-type options for deficit 5 match PDF", () => {
    const opts = singleTypeStandbyOptions(5);
    expect(opts.find((o) => o.type === "Charlie")).toMatchObject({
      count: 1,
      cost: 3,
    });
    expect(opts.find((o) => o.type === "Bravo")).toMatchObject({
      count: 2,
      cost: 4,
    });
    expect(opts.find((o) => o.type === "Delta")).toMatchObject({
      count: 1,
      cost: 4,
    });
  });

  it("sufficient capacity → no standby", () => {
    const r = runLevel3(sample, 10);
    expect(r.sufficient).toBe(true);
    expect(r.deficit).toBe(0);
    expect(r.standby).toBeNull();
  });
});

describe("PDF Level 4 — Multi-Client", () => {
  it("prioritises highest hours first", () => {
    const r = runLevel4(sample, [12, 16, 17]);
    expect(r.allocations).toHaveLength(3);
    expect(r.allocations[0].hours).toBe(17);
    expect(r.allocations.map((a) => a.hours)).toEqual([17, 16, 12]);
  });

  it("parses comma and space separated client hours", () => {
    expect(parseClientsInput("12,16,17,10,21")).toEqual([12, 16, 17, 10, 21]);
    expect(parseClientsInput("12 16 17 10 21")).toEqual([12, 16, 17, 10, 21]);
    expect(parseClientsInput("20")).toEqual([20]);
  });
});

describe("PDF Error Handling", () => {
  it("zero robots", () => {
    const res = solveAllocation(10, { Bravo: 0, Charlie: 0, Delta: 0 }, "cost");
    expect(res.isValid).toBe(false);
    expect(res.error).toBe(ERRORS.zeroRobots);
  });

  it("invalid hours", () => {
    const res = solveAllocation(-5, { Bravo: 1, Charlie: 0, Delta: 0 }, "cost");
    expect(res.isValid).toBe(false);
    expect(res.error).toBe(ERRORS.invalidHours);
  });

  it("insufficient capacity (Level 2/cost)", () => {
    const res = solveAllocation(100, { Bravo: 1, Charlie: 0, Delta: 0 }, "cost");
    expect(res.isValid).toBe(false);
    expect(res.error).toBe(ERRORS.insufficientCapacity);
  });

  it("impossible Level 1 each-category", () => {
    const res = solveAllocation(
      100,
      { Bravo: 1, Charlie: 1, Delta: 1 },
      "hours",
      { requireAllCategories: true }
    );
    expect(res.isValid).toBe(false);
    expect(res.error).toBe(ERRORS.eachCategory);
  });
});

describe("parsing & capacity", () => {
  it("rejects bad client input", () => {
    expect(() => parseClientsInput("abc")).toThrow(/Invalid input/);
  });

  it("rejects negative inventory", () => {
    expect(() => parseInventory(-1, 2, 3)).toThrow(/non-negative/);
  });

  it("computes capacity", () => {
    expect(inventoryCapacity(sample)).toBe(37);
    expect(inventoryCapacity({ Bravo: 1, Charlie: 1, Delta: 1 })).toBe(16);
  });
});
