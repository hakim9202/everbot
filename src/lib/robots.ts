/** Robot fleet specifications for the Everest Engineering challenge. */

export type RobotName = "Bravo" | "Charlie" | "Delta";

export interface RobotSpec {
  name: RobotName;
  hours: number;
  cost: number;
}

export const ROBOT_SPECS: Record<RobotName, RobotSpec> = {
  Bravo: { name: "Bravo", hours: 3, cost: 2 },
  Charlie: { name: "Charlie", hours: 5, cost: 3 },
  Delta: { name: "Delta", hours: 8, cost: 4 },
};

export const ROBOT_NAMES: RobotName[] = ["Bravo", "Charlie", "Delta"];

export interface Inventory {
  Bravo: number;
  Charlie: number;
  Delta: number;
}

export interface AllocationResult {
  bravo: number;
  charlie: number;
  delta: number;
  totalHours: number;
  totalCost: number;
  isValid: boolean;
  error?: string;
}

export function emptyAllocation(error?: string): AllocationResult {
  return {
    bravo: 0,
    charlie: 0,
    delta: 0,
    totalHours: 0,
    totalCost: 0,
    isValid: !error,
    error,
  };
}

export function inventoryCapacity(inv: Inventory): number {
  return (
    inv.Bravo * ROBOT_SPECS.Bravo.hours +
    inv.Charlie * ROBOT_SPECS.Charlie.hours +
    inv.Delta * ROBOT_SPECS.Delta.hours
  );
}

export function formatAssignment(res: AllocationResult): string {
  if (!res.isValid) return "";
  const parts: string[] = [];
  if (res.bravo > 0) parts.push(`Bravo: ${res.bravo}`);
  if (res.charlie > 0) parts.push(`Charlie: ${res.charlie}`);
  if (res.delta > 0) parts.push(`Delta: ${res.delta}`);
  return parts.length ? parts.join(", ") : "None";
}
