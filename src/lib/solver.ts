import { ERRORS } from "./errors";
import {
  AllocationResult,
  Inventory,
  ROBOT_SPECS,
  emptyAllocation,
} from "./robots";

export type Objective = "hours" | "cost";

export interface SolveOptions {
  /**
   * Level 1: require ≥1 Bravo, ≥1 Charlie, and ≥1 Delta.
   * Matches PDF “include multiple categories” + Impossible Allocation error.
   */
  requireAllCategories?: boolean;
}

/**
 * Bounded brute-force allocation solver.
 * - hours + requireAllCategories: Level 1 — all three types, minimise excess
 * - cost: Levels 2–4 — minimise charging cost, then minimise excess
 */
export function solveAllocation(
  requested: number,
  inventory: Inventory,
  objective: Objective = "cost",
  options: SolveOptions = {}
): AllocationResult {
  if (objective !== "hours" && objective !== "cost") {
    throw new Error(`Unknown objective: '${objective}'. Must be 'hours' or 'cost'.`);
  }

  const requireAll = options.requireAllCategories === true;

  if (requested <= 0) {
    return emptyAllocation(ERRORS.invalidHours);
  }

  if (inventory.Bravo + inventory.Charlie + inventory.Delta === 0) {
    return emptyAllocation(ERRORS.zeroRobots);
  }

  if (
    requireAll &&
    (inventory.Bravo < 1 || inventory.Charlie < 1 || inventory.Delta < 1)
  ) {
    return emptyAllocation(ERRORS.eachCategory);
  }

  const maxB = Math.min(
    inventory.Bravo,
    Math.floor(requested / ROBOT_SPECS.Bravo.hours) + 2
  );
  const maxC = Math.min(
    inventory.Charlie,
    Math.floor(requested / ROBOT_SPECS.Charlie.hours) + 2
  );
  const maxD = Math.min(
    inventory.Delta,
    Math.floor(requested / ROBOT_SPECS.Delta.hours) + 2
  );

  const minB = requireAll ? 1 : 0;
  const minC = requireAll ? 1 : 0;
  const minD = requireAll ? 1 : 0;

  let best: AllocationResult | null = null;
  let bestExcess = Infinity;
  let bestTypes = -1;

  for (let b = minB; b <= maxB; b++) {
    for (let c = minC; c <= maxC; c++) {
      for (let d = minD; d <= maxD; d++) {
        if (b === 0 && c === 0 && d === 0) continue;

        const hrs =
          b * ROBOT_SPECS.Bravo.hours +
          c * ROBOT_SPECS.Charlie.hours +
          d * ROBOT_SPECS.Delta.hours;
        if (hrs < requested) continue;

        const cost =
          b * ROBOT_SPECS.Bravo.cost +
          c * ROBOT_SPECS.Charlie.cost +
          d * ROBOT_SPECS.Delta.cost;
        const excess = hrs - requested;
        const types = (b > 0 ? 1 : 0) + (c > 0 ? 1 : 0) + (d > 0 ? 1 : 0);

        const cand: AllocationResult = {
          bravo: b,
          charlie: c,
          delta: d,
          totalHours: hrs,
          totalCost: cost,
          isValid: true,
        };

        if (!best) {
          best = cand;
          bestExcess = excess;
          bestTypes = types;
          continue;
        }

        if (objective === "hours") {
          // Minimise excess; tie-break by maximising category count
          if (
            excess < bestExcess ||
            (excess === bestExcess && types > bestTypes)
          ) {
            best = cand;
            bestExcess = excess;
            bestTypes = types;
          }
        } else if (
          cost < best.totalCost ||
          (cost === best.totalCost && excess < bestExcess)
        ) {
          best = cand;
          bestExcess = excess;
          bestTypes = types;
        }
      }
    }
  }

  if (!best) {
    return emptyAllocation(
      requireAll ? ERRORS.eachCategory : ERRORS.insufficientCapacity
    );
  }

  return best;
}
