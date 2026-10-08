import {
  AllocationResult,
  Inventory,
  inventoryCapacity,
  ROBOT_SPECS,
} from "./robots";
import { solveAllocation } from "./solver";

const WAREHOUSE_POOL: Inventory = { Bravo: 50, Charlie: 50, Delta: 50 };
const LARGE_WAREHOUSE: Inventory = { Bravo: 100, Charlie: 100, Delta: 100 };

export function runLevel1(
  inventory: Inventory,
  requested: number
): AllocationResult {
  if (requested <= 0) {
    throw new Error("Requested work hours must be a positive integer.");
  }
  return solveAllocation(requested, inventory, "hours");
}

export function runLevel2(
  inventory: Inventory,
  requested: number
): AllocationResult {
  if (requested <= 0) {
    throw new Error("Requested work hours must be a positive integer.");
  }
  return solveAllocation(requested, inventory, "cost");
}

export interface Level3Result {
  maxActive: number;
  deficit: number;
  standby: AllocationResult | null;
  sufficient: boolean;
}

export function runLevel3(
  inventory: Inventory,
  requested: number
): Level3Result {
  if (requested <= 0) {
    throw new Error("Requested work hours must be a positive integer.");
  }

  const maxActive = inventoryCapacity(inventory);
  const deficit = Math.max(0, requested - maxActive);

  let standby: AllocationResult | null = null;
  if (deficit > 0) {
    standby = solveAllocation(deficit, WAREHOUSE_POOL, "cost");
  }

  return {
    maxActive,
    deficit,
    standby,
    sufficient: deficit === 0,
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
      error: alloc.error,
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
    throw new Error(
      "Invalid input. Please enter positive integers separated by spaces, commas or semicolons."
    );
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
    throw new Error("Robot counts must be non-negative integers.");
  }
  return { Bravo: bravo, Charlie: charlie, Delta: delta };
}
