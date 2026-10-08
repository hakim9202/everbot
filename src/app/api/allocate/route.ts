import { NextRequest, NextResponse } from "next/server";
import {
  parseClientsInput,
  parseInventory,
  runLevel1,
  runLevel2,
  runLevel3,
  runLevel4,
} from "@/lib/strategies";

export const runtime = "nodejs";

interface AllocateBody {
  level: 1 | 2 | 3 | 4;
  bravo: number;
  charlie: number;
  delta: number;
  hours?: number;
  hoursInput?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AllocateBody;
    const level = Number(body.level);

    if (![1, 2, 3, 4].includes(level)) {
      return NextResponse.json(
        { status: "error", error: "Level must be 1, 2, 3, or 4." },
        { status: 400 }
      );
    }

    let inventory;
    try {
      inventory = parseInventory(
        Number(body.bravo),
        Number(body.charlie),
        Number(body.delta)
      );
    } catch (e) {
      return NextResponse.json(
        { status: "error", error: (e as Error).message },
        { status: 400 }
      );
    }

    if (level === 4) {
      let clients: number[];
      try {
        clients = parseClientsInput(String(body.hoursInput ?? ""));
      } catch (e) {
        return NextResponse.json(
          { status: "error", error: (e as Error).message },
          { status: 400 }
        );
      }
      const result = runLevel4(inventory, clients);
      return NextResponse.json({ status: "success", level: 4, ...result });
    }

    const hours = Number(body.hours);
    if (!Number.isInteger(hours) || hours <= 0) {
      return NextResponse.json(
        {
          status: "error",
          error: "Error: Work hours must be a positive integer.",
        }, // PDF Invalid Input
        { status: 400 }
      );
    }

    if (level === 1) {
      const level1 = runLevel1(inventory, hours);
      return NextResponse.json({
        status: level1.isValid ? "success" : "error",
        level: 1,
        requested: hours,
        allocation: level1,
        error: level1.error,
      });
    }

    if (level === 2) {
      const level1 = runLevel1(inventory, hours);
      const level2 = runLevel2(inventory, hours);
      const costDifference =
        level1.isValid && level2.isValid
          ? level1.totalCost - level2.totalCost
          : null;
      const insight =
        costDifference !== null && costDifference > 0
          ? `Level 1 strategy resulted in $${costDifference} additional cost due to mandatory usage of multiple robot categories.`
          : null;

      return NextResponse.json({
        status: level2.isValid ? "success" : "error",
        level: 2,
        requested: hours,
        level1,
        level2,
        level1Cost: level1.isValid ? level1.totalCost : null,
        level2Cost: level2.isValid ? level2.totalCost : null,
        costDifference,
        insight,
        error: level2.error,
      });
    }

    // level 3
    const level3 = runLevel3(inventory, hours);
    return NextResponse.json({
      status: "success",
      level: 3,
      requested: hours,
      inventory,
      ...level3,
    });
  } catch (e) {
    return NextResponse.json(
      { status: "error", error: (e as Error).message || "Unexpected error." },
      { status: 500 }
    );
  }
}
