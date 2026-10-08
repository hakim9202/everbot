import {
  AllocationResult,
  Inventory,
  ROBOT_SPECS,
  emptyAllocation,
} from "./robots";

export type Objective = "hours" | "cost";

/**
 * Bounded brute-force allocation solver.
 * - hours: minimise excess, then maximise category diversity (Level 1)
 * - cost: minimise charging cost, then minimise excess (Levels 2–4)
 */
export function solveAllocation(
  requested: number,
  inventory: Inventory,
  objective: Objective = "cost"
): AllocationResult {
  if (objective !== "hours" && objective !== "cost") {
    throw new Error(`Unknown objective: '${objective}'. Must be 'hours' or 'cost'.`);
  }

  if (requested <= 0) {
    return emptyAllocation("Error: Work hours must be a positive integer.");
  }

  if (inventory.Bravo + inventory.Charlie + inventory.Delta === 0) {
    return emptyAllocation("Error: No robots available for assignment.");
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

  let best: AllocationResult | null = null;
  let bestExcess = Infinity;
  let bestTypes = -1;

  for (let b = 0; b <= maxB; b++) {
    for (let c = 0; c <= maxC; c++) {
      for (let d = 0; d <= maxD; d++) {
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
      "Error: Unable to allocate at least one robot from each category with the available inventory."
    );
  }

  return best;
}
