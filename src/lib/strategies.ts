import { ERRORS } from "./errors";
import {
  AllocationResult,
  Inventory,
  inventoryCapacity,
  ROBOT_NAMES,
  ROBOT_SPECS,
  type RobotName,
} from "./robots";
import { solveAllocation } from "./solver";

const WAREHOUSE_POOL: Inventory = { Bravo: 50, Charlie: 50, Delta: 50 };
const LARGE_WAREHOUSE: Inventory = { Bravo: 100, Charlie: 100, Delta: 100 };

export function runLevel1(
  inventory: Inventory,
  requested: number
): AllocationResult {
  if (requested <= 0) {
    throw new Error(ERRORS.invalidHours);
  }
  // PDF Level 1: include multiple categories — require ≥1 of each type
  return solveAllocation(requested, inventory, "hours", {
    requireAllCategories: true,
  });
}

export function runLevel2(
  inventory: Inventory,
  requested: number
): AllocationResult {
  if (requested <= 0) {
    throw new Error(ERRORS.invalidHours);
  }
  return solveAllocation(requested, inventory, "cost");
}

/** Single-type standby option as shown in the PDF Level 3 example. */
export interface StandbyOption {
  type: RobotName;
  count: number;
  hours: number;
  cost: number;
}

export interface Level3Result {
  maxActive: number;
  deficit: number;
  standby: AllocationResult | null;
  standbyOptions: StandbyOption[];
  sufficient: boolean;
}

/**
 * Build PDF-style single-type standby options for a deficit
 * (e.g. deficit 5 → Bravo×2 $4 | Charlie×1 $3 | Delta×1 $4).
 */
export function singleTypeStandbyOptions(deficit: number): StandbyOption[] {
  if (deficit <= 0) return [];
  return ROBOT_NAMES.map((type) => {
    const spec = ROBOT_SPECS[type];
    const count = Math.ceil(deficit / spec.hours);
    return {
      type,
      count,
      hours: count * spec.hours,
      cost: count * spec.cost,
    };
  }).sort((a, b) => a.cost - b.cost || a.hours - b.hours);
}

export function runLevel3(
  inventory: Inventory,
  requested: number
): Level3Result {
  if (requested <= 0) {
    throw new Error(ERRORS.invalidHours);
  }

  const maxActive = inventoryCapacity(inventory);
  const deficit = Math.max(0, requested - maxActive);

  if (deficit === 0) {
    return {
      maxActive,
      deficit: 0,
      standby: null,
      standbyOptions: [],
      sufficient: true,
    };
  }

  const standbyOptions = singleTypeStandbyOptions(deficit);
  // Cost-optimised pick among single-type options (PDF: Charlie for 5h deficit)
  const bestOption = standbyOptions[0];
  const standby = solveAllocation(deficit, WAREHOUSE_POOL, "cost");

  // Prefer the PDF single-type cost winner when it matches solver cost
  let selected = standby;
  if (bestOption && (!standby.isValid || bestOption.cost <= standby.totalCost)) {
    selected = {
      bravo: bestOption.type === "Bravo" ? bestOption.count : 0,
      charlie: bestOption.type === "Charlie" ? bestOption.count : 0,
      delta: bestOption.type === "Delta" ? bestOption.count : 0,
      totalHours: bestOption.hours,
      totalCost: bestOption.cost,
      isValid: true,
    };
  }

  return {
    maxActive,
    deficit,
    standby: selected.isValid ? selected : standby,
    standbyOptions,
    sufficient: false,
  };
}

export type ClientStatus = "allocated" | "standby_required" | "impossible";

export interface ClientAllocation {
  client: number;
  hours: number;
  status: ClientStatus;
  assigned?: AllocationResult;
  standby?: AllocationResult;
  error?: string;
}

export interface Level4Summary {
  totalRobotsUsed: Inventory;
  totalCost: number;
  totalRequestedHours: number;
  avgUtilisation: number;
  efficiencyMetrics: Record<string, number>;
}

export interface Level4Result {
  allocations: ClientAllocation[];
  summary: Level4Summary;
}

export function runLevel4(
  inventory: Inventory,
  clientRequests: number[]
): Level4Result {
  if (!clientRequests.length || clientRequests.some((r) => r <= 0)) {
    throw new Error(
      "client_requests must be a non-empty list of positive integers."
    );
  }

  const sorted = [...clientRequests].sort((a, b) => b - a);
  const remaining: Inventory = { ...inventory };
  const totalUsed: Inventory = { Bravo: 0, Charlie: 0, Delta: 0 };
  let totalCost = 0;
  const allocations: ClientAllocation[] = [];

  sorted.forEach((req, index) => {
    const alloc = solveAllocation(req, remaining, "cost");
    if (alloc.isValid) {
      remaining.Bravo -= alloc.bravo;
      remaining.Charlie -= alloc.charlie;
      remaining.Delta -= alloc.delta;
      totalUsed.Bravo += alloc.bravo;
      totalUsed.Charlie += alloc.charlie;
      totalUsed.Delta += alloc.delta;
      totalCost += alloc.totalCost;
      allocations.push({
        client: index + 1,
        hours: req,
        status: "allocated",
        assigned: alloc,
      });
      return;
    }

    const remainingCap = inventoryCapacity(remaining);
    const deficit = req - remainingCap;
    if (deficit > 0) {
      // Use remaining active robots first if any capacity left, then standby for rest
      // PDF: list standby needed to satisfy clients when active insufficient
      const standby = solveAllocation(deficit, LARGE_WAREHOUSE, "cost");
      if (standby.isValid) {
        totalUsed.Bravo += standby.bravo;
        totalUsed.Charlie += standby.charlie;
        totalUsed.Delta += standby.delta;
        totalCost += standby.totalCost;
        allocations.push({
          client: index + 1,
          hours: req,
          status: "standby_required",
          standby,
        });
        return;
      }
    }

    allocations.push({
      client: index + 1,
      hours: req,
      status: "impossible",
      error: alloc.error ?? ERRORS.insufficientCapacity,
    });
  });

  const totalPotential =
    totalUsed.Bravo * ROBOT_SPECS.Bravo.hours +
    totalUsed.Charlie * ROBOT_SPECS.Charlie.hours +
    totalUsed.Delta * ROBOT_SPECS.Delta.hours;
  const totalRequested = clientRequests.reduce((a, b) => a + b, 0);
  const avgUtilisation =
    totalPotential > 0
      ? Math.round((totalRequested / totalPotential) * 1000) / 10
      : 0;

  const calcUtil = (key: keyof Inventory): number => {
    const total = inventory[key];
    const used = totalUsed[key];
    return total > 0 ? Math.round((used / total) * 1000) / 10 : 0;
  };

  return {
    allocations,
    summary: {
      totalRobotsUsed: totalUsed,
      totalCost: Math.round(totalCost * 100) / 100,
      totalRequestedHours: totalRequested,
      avgUtilisation,
      efficiencyMetrics: {
        Bravo: calcUtil("Bravo"),
        Charlie: calcUtil("Charlie"),
        Delta: calcUtil("Delta"),
      },
    },
  };
}

export function parseClientsInput(raw: string): number[] {
  try {
    const clients = raw
      .replace(/,/g, " ")
      .replace(/;/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((x) => {
        const n = Number(x);
        if (!Number.isInteger(n)) throw new Error("non-integer");
        return n;
      });
    if (!clients.length) throw new Error("empty");
    if (clients.some((h) => h <= 0)) throw new Error("non-positive");
    return clients;
  } catch {
    throw new Error(ERRORS.invalidClients);
  }
}

export function parseInventory(
  bravo: number,
  charlie: number,
  delta: number
): Inventory {
  if (
    !Number.isInteger(bravo) ||
    !Number.isInteger(charlie) ||
    !Number.isInteger(delta) ||
    bravo < 0 ||
    charlie < 0 ||
    delta < 0
  ) {
    throw new Error(ERRORS.negativeInventory);
  }
  return { Bravo: bravo, Charlie: charlie, Delta: delta };
}
