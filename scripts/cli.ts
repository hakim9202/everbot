#!/usr/bin/env npx tsx
/**
 * Terminal CLI for the Robot Work Allocation System (PDF primary surface).
 * Usage: npm run cli
 */
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import {
  parseClientsInput,
  parseInventory,
  runLevel1,
  runLevel2,
  runLevel3,
  runLevel4,
} from "../src/lib/strategies";
import type { AllocationResult, Inventory } from "../src/lib/robots";

const rl = readline.createInterface({ input, output });

function printAssignment(res: AllocationResult) {
  if (res.bravo > 0) console.log(`Bravo: ${res.bravo}`);
  if (res.charlie > 0) console.log(`Charlie: ${res.charlie}`);
  if (res.delta > 0) console.log(`Delta: ${res.delta}`);
}

async function readInventory(): Promise<Inventory> {
  const b = Number(await rl.question("Bravo: "));
  const c = Number(await rl.question("Charlie: "));
  const d = Number(await rl.question("Delta: "));
  return parseInventory(b, c, d);
}

async function main() {
  console.log("EverBot Solutions - Robot Work Allocation System");
  console.log("Type 'quit' to exit.\n");

  while (true) {
    const cmd = (
      await rl.question("Select Level [1/2/3/4/quit]: ")
    )
      .trim()
      .toLowerCase();
    if (cmd === "quit") {
      console.log("Exiting.");
      break;
    }
    if (!["1", "2", "3", "4"].includes(cmd)) {
      console.error("Please select 1, 2, 3, 4, or quit.");
      continue;
    }

    try {
      console.log("Enter number of robots available:");
      const inv = await readInventory();

      if (cmd === "4") {
        const raw = await rl.question(
          "Client working hours (comma/space separated): "
        );
        const clients = parseClientsInput(raw);
        const result = runLevel4(inv, clients);
        console.log("\n" + "=".repeat(50));
        console.log("LEVEL 4: Multi-Client Allocation");
        for (const a of result.allocations) {
          const mark =
            a.status === "allocated"
              ? "OK"
              : a.status === "standby_required"
                ? "STANDBY"
                : "FAIL";
          let detail = "";
          if (a.assigned) {
            detail = ` B${a.assigned.bravo} C${a.assigned.charlie} D${a.assigned.delta}`;
          } else if (a.standby) {
            detail = ` standby B${a.standby.bravo} C${a.standby.charlie} D${a.standby.delta}`;
          } else if (a.error) {
            detail = ` ${a.error}`;
          }
          console.log(`Client ${a.client} (${a.hours}h): [${mark}]${detail}`);
        }
        const s = result.summary;
        console.log("\nALLOCATION SUMMARY");
        console.log(
          `Total Robots Used: Bravo=${s.totalRobotsUsed.Bravo}, Charlie=${s.totalRobotsUsed.Charlie}, Delta=${s.totalRobotsUsed.Delta}`
        );
        console.log(`Total Charging Cost: $${s.totalCost}`);
        console.log(`Avg Robot Utilisation: ${s.avgUtilisation}%`);
        console.log("=".repeat(50) + "\n");
        continue;
      }

      const hours = Number(await rl.question("Enter client work hours: "));
      if (!Number.isInteger(hours) || hours <= 0) {
        console.error("Error: Work hours must be a positive integer.");
        continue;
      }

      console.log("\n" + "=".repeat(50));

      if (cmd === "1") {
        const result = runLevel1(inv, hours);
        console.log("LEVEL 1: Category Distribution Strategy");
        if (!result.isValid) {
          console.error(result.error);
        } else {
          console.log("Robot Assignment");
          printAssignment(result);
          console.log(`Total Work Hours Provided: ${result.totalHours}`);
          console.log(`Client Work Hours Requested: ${hours}`);
        }
      } else if (cmd === "2") {
        const l1 = runLevel1(inv, hours);
        const l2 = runLevel2(inv, hours);
        console.log("LEVEL 2: Cost Optimised Allocation");
        if (!l2.isValid) {
          console.error(l2.error);
        } else {
          console.log("Cost Optimized Allocation");
          printAssignment(l2);
          console.log(`Total Hours Provided: ${l2.totalHours}`);
          console.log(`Total Charging Cost: $${l2.totalCost}`);
          if (l1.isValid) {
            const diff = l1.totalCost - l2.totalCost;
            console.log("\nLevel 1 vs Level 2 Comparison");
            console.log(`Level 1 Cost: $${l1.totalCost}`);
            console.log(`Level 2 Cost: $${l2.totalCost}`);
            console.log(`Cost Difference: $${diff}`);
            if (diff > 0) {
              console.log(
                `Insight:\nLevel 1 strategy resulted in $${diff} additional cost due to mandatory usage of multiple robot categories.`
              );
            }
          }
        }
      } else if (cmd === "3") {
        const result = runLevel3(inv, hours);
        console.log("LEVEL 3: Standby Activation Strategy");
        console.log(`Active Robot Capacity: ${result.maxActive} hours`);
        console.log(`Client Work Requested: ${hours} hours`);
        console.log("\nActive robots:");
        if (inv.Bravo > 0) console.log(`Bravo: ${inv.Bravo}`);
        if (inv.Charlie > 0) console.log(`Charlie: ${inv.Charlie}`);
        if (inv.Delta > 0) console.log(`Delta: ${inv.Delta}`);
        if (result.sufficient) {
          console.log("\nSufficient active capacity. No standby robots needed.");
        } else {
          console.log("\nAdditional Standby Robots Required:");
          result.standbyOptions.forEach((opt, i) => {
            if (i > 0) console.log("or");
            console.log(`${opt.type}: ${opt.count} - cost $${opt.cost}`);
          });
          if (result.standby?.isValid) {
            console.log("\nCost-optimised standby:");
            printAssignment(result.standby);
          }
        }
      }

      console.log("=".repeat(50) + "\n");
    } catch (e) {
      console.error(String((e as Error).message || e));
    }
  }

  rl.close();
}

main();
