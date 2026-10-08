"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROBOT_SPECS, type AllocationResult, type Inventory } from "@/lib/robots";
import type {
  ClientAllocation,
  Level4Summary,
  StandbyOption,
} from "@/lib/strategies";
import { Bot, Loader2, Warehouse, Zap } from "lucide-react";

type Level = 1 | 2 | 3 | 4;

interface ApiResponse {
  status: string;
  error?: string;
  level?: number;
  requested?: number;
  allocation?: AllocationResult;
  level1?: AllocationResult;
  level2?: AllocationResult;
  level1Cost?: number | null;
  level2Cost?: number | null;
  costDifference?: number | null;
  insight?: string | null;
  maxActive?: number;
  deficit?: number;
  sufficient?: boolean;
  standby?: AllocationResult | null;
  standbyOptions?: StandbyOption[];
  inventory?: Inventory;
  allocations?: ClientAllocation[];
  summary?: Level4Summary;
}

const LEVELS: { id: Level; title: string; blurb: string }[] = [
  {
    id: 1,
    title: "Category distribution",
    blurb: "Require all three types; minimise excess hours.",
  },
  {
    id: 2,
    title: "Cost optimisation",
    blurb: "Cheapest daily charge that still meets hours.",
  },
  {
    id: 3,
    title: "Standby activation",
    blurb: "Pull warehouse robots only when capacity falls short.",
  },
  {
    id: 4,
    title: "Multi-client scaling",
    blurb: "Serve largest requests first; deduct inventory as you go.",
  },
];

function AssignmentList({ res }: { res: AllocationResult }) {
  const rows = [
    res.bravo > 0 && { name: "Bravo", count: res.bravo },
    res.charlie > 0 && { name: "Charlie", count: res.charlie },
    res.delta > 0 && { name: "Delta", count: res.delta },
  ].filter(Boolean) as { name: string; count: number }[];

  if (!rows.length) return <p className="text-slate-400">None</p>;

  return (
    <ul className="space-y-1 font-mono text-sm">
      {rows.map((r) => (
        <li key={r.name} className="flex justify-between gap-4">
          <span className="text-cyan-300">{r.name}</span>
          <span className="text-slate-100">{r.count}</span>
        </li>
      ))}
    </ul>
  );
}

export function AllocatorApp() {
  const [level, setLevel] = useState<Level>(2);
  const [bravo, setBravo] = useState("2");
  const [charlie, setCharlie] = useState("3");
  const [delta, setDelta] = useState("2");
  const [hours, setHours] = useState("20");
  const [hoursInput, setHoursInput] = useState("12, 16, 17, 10, 21");
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function allocate() {
    setError(null);
    startTransition(async () => {
      try {
        const payload =
          level === 4
            ? {
                level,
                bravo: Number(bravo),
                charlie: Number(charlie),
                delta: Number(delta),
                hoursInput,
              }
            : {
                level,
                bravo: Number(bravo),
                charlie: Number(charlie),
                delta: Number(delta),
                hours: Number(hours),
              };

        const res = await fetch("/api/allocate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as ApiResponse;
        if (!res.ok || data.status === "error") {
          setResult(data);
          setError(data.error || "Allocation failed.");
          return;
        }
        setResult(data);
      } catch {
        setError("Network error — could not reach the allocation API.");
        setResult(null);
      }
    });
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-400/90">
            Fleet control
          </p>
          <h2 className="font-display text-3xl text-slate-50 sm:text-4xl">
            Allocate work across Bravo, Charlie &amp; Delta
          </h2>
          <p className="max-w-xl text-slate-400">
            Enter active inventory and client hours. The solver searches bounded
            combinations to meet demand with the strategy you pick.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setLevel(l.id);
                setResult(null);
                setError(null);
              }}
              className={`rounded-lg border px-3 py-3 text-left transition ${
                level === l.id
                  ? "border-cyan-400/70 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]"
                  : "border-slate-700 bg-slate-900/40 hover:border-slate-500"
              }`}
            >
              <div className="font-mono text-xs text-cyan-300">Level {l.id}</div>
              <div className="mt-1 font-medium text-slate-100">{l.title}</div>
              <div className="mt-1 text-xs text-slate-400">{l.blurb}</div>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
            <Warehouse className="h-4 w-4 text-cyan-400" />
            Active inventory
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {(
              [
                ["Bravo", bravo, setBravo, ROBOT_SPECS.Bravo],
                ["Charlie", charlie, setCharlie, ROBOT_SPECS.Charlie],
                ["Delta", delta, setDelta, ROBOT_SPECS.Delta],
              ] as const
            ).map(([name, value, setter, spec]) => (
              <label key={name} className="space-y-1.5">
                <span className="flex items-baseline justify-between text-xs text-slate-400">
                  <span className="font-medium text-slate-200">{name}</span>
                  <span className="font-mono">
                    {spec.hours}h · ${spec.cost}
                  </span>
                </span>
                <Input
                  inputMode="numeric"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  aria-label={`${name} count`}
                />
              </label>
            ))}
          </div>

          <div className="mt-4 space-y-1.5">
            {level === 4 ? (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-200">
                  Client hours (comma or space separated)
                </span>
                <Input
                  value={hoursInput}
                  onChange={(e) => setHoursInput(e.target.value)}
                  placeholder="12, 16, 17, 10, 21"
                />
              </label>
            ) : (
              <label className="block space-y-1.5">
                <span className="text-xs font-medium text-slate-200">
                  Client work hours
                </span>
                <Input
                  inputMode="numeric"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                />
              </label>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={allocate} disabled={pending} size="lg">
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Run Level {level}
            </Button>
            <p className="text-xs text-slate-500">
              Robots are single-use per day. Hours provided must meet or exceed
              the request.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-700/80 bg-gradient-to-b from-slate-900/80 to-slate-950/90 p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5 text-cyan-400" />
          <h3 className="font-display text-xl text-slate-50">Result</h3>
        </div>

        {pending && (
          <p className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Computing allocation…
          </p>
        )}

        {!pending && !result && !error && (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/40 px-4 py-10 text-center text-sm text-slate-500">
            No run yet. Pick a level and allocate to see assignments, cost, and
            utilisation.
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-3 text-sm text-rose-200"
          >
            {error}
          </div>
        )}

        {!pending && result && result.status === "success" && level === 1 && result.allocation && (
          <div className="space-y-4 animate-in">
            <p className="font-mono text-xs uppercase tracking-wider text-cyan-400">
              Level 1 · Category distribution
            </p>
            <AssignmentList res={result.allocation} />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Hours provided</dt>
                <dd className="font-mono text-lg text-slate-100">
                  {result.allocation.totalHours}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Requested</dt>
                <dd className="font-mono text-lg text-slate-100">
                  {result.requested}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Charging cost</dt>
                <dd className="font-mono text-lg text-slate-100">
                  ${result.allocation.totalCost}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Excess</dt>
                <dd className="font-mono text-lg text-slate-100">
                  {(result.allocation.totalHours ?? 0) - (result.requested ?? 0)}h
                </dd>
              </div>
            </dl>
          </div>
        )}

        {!pending && result && result.status === "success" && level === 2 && result.level2 && (
          <div className="space-y-4 animate-in">
            <p className="font-mono text-xs uppercase tracking-wider text-cyan-400">
              Level 2 · Cost optimised
            </p>
            <AssignmentList res={result.level2} />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Hours provided</dt>
                <dd className="font-mono text-lg text-slate-100">
                  {result.level2.totalHours}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Total charging cost</dt>
                <dd className="font-mono text-lg text-emerald-300">
                  ${result.level2.totalCost}
                </dd>
              </div>
            </dl>
            {result.level1 && result.costDifference != null && (
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm">
                <p className="mb-2 font-medium text-slate-200">
                  Level 1 vs Level 2
                </p>
                <ul className="space-y-1 font-mono text-xs text-slate-300">
                  <li>Level 1 cost: ${result.level1Cost}</li>
                  <li>Level 2 cost: ${result.level2Cost}</li>
                  <li>Difference: ${result.costDifference}</li>
                </ul>
                {result.insight && (
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {result.insight}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!pending && result && result.status === "success" && level === 3 && (
          <div className="space-y-4 animate-in">
            <p className="font-mono text-xs uppercase tracking-wider text-cyan-400">
              Level 3 · Standby activation
            </p>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">Active robot capacity</dt>
                <dd className="font-mono text-lg text-slate-100">
                  {result.maxActive} hours
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Client work requested</dt>
                <dd className="font-mono text-lg text-slate-100">
                  {result.requested} hours
                </dd>
              </div>
            </dl>
            {result.inventory && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-300">
                  Active robots
                </p>
                <ul className="font-mono text-sm text-slate-200">
                  {result.inventory.Bravo > 0 && (
                    <li>Bravo: {result.inventory.Bravo}</li>
                  )}
                  {result.inventory.Charlie > 0 && (
                    <li>Charlie: {result.inventory.Charlie}</li>
                  )}
                  {result.inventory.Delta > 0 && (
                    <li>Delta: {result.inventory.Delta}</li>
                  )}
                </ul>
              </div>
            )}
            {result.sufficient ? (
              <p className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200">
                Sufficient active capacity. No standby robots needed.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
                  Deficit: {result.deficit} hours. Activating standby robots…
                </p>
                {result.standbyOptions && result.standbyOptions.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-300">
                      Additional standby robots required
                    </p>
                    <ul className="space-y-1 font-mono text-sm text-slate-300">
                      {result.standbyOptions.map((opt, i) => (
                        <li key={opt.type}>
                          {i > 0 && (
                            <span className="mr-1 text-slate-500">or</span>
                          )}
                          {opt.type}: {opt.count} - cost ${opt.cost}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.standby?.isValid && (
                  <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-3 py-2">
                    <p className="text-xs font-medium text-cyan-300">
                      Cost-optimised standby
                    </p>
                    <AssignmentList res={result.standby} />
                    <p className="mt-1 font-mono text-sm text-slate-300">
                      ${result.standby.totalCost}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!pending && result && result.status === "success" && level === 4 && result.allocations && (
          <div className="space-y-4 animate-in">
            <p className="font-mono text-xs uppercase tracking-wider text-cyan-400">
              Level 4 · Multi-client
            </p>
            <ul className="max-h-56 space-y-2 overflow-y-auto pr-1 text-sm">
              {result.allocations.map((a) => (
                <li
                  key={`${a.client}-${a.hours}`}
                  className="rounded-md border border-slate-700/80 bg-slate-950/50 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-100">
                      Client {a.client} · {a.hours}h
                    </span>
                    <span
                      className={`font-mono text-xs ${
                        a.status === "allocated"
                          ? "text-emerald-300"
                          : a.status === "standby_required"
                            ? "text-amber-300"
                            : "text-rose-300"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>
                  {a.assigned && (
                    <p className="mt-1 font-mono text-xs text-slate-400">
                      B{a.assigned.bravo} C{a.assigned.charlie} D
                      {a.assigned.delta} · ${a.assigned.totalCost}
                    </p>
                  )}
                  {a.standby && (
                    <p className="mt-1 font-mono text-xs text-amber-200/80">
                      Standby B{a.standby.bravo} C{a.standby.charlie} D
                      {a.standby.delta}
                    </p>
                  )}
                  {a.error && (
                    <p className="mt-1 text-xs text-rose-300">{a.error}</p>
                  )}
                </li>
              ))}
            </ul>
            {result.summary && (
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm">
                <p className="mb-2 font-medium text-slate-200">Summary</p>
                <ul className="space-y-1 font-mono text-xs text-slate-300">
                  <li>
                    Robots used: B{result.summary.totalRobotsUsed.Bravo} C
                    {result.summary.totalRobotsUsed.Charlie} D
                    {result.summary.totalRobotsUsed.Delta}
                  </li>
                  <li>Total cost: ${result.summary.totalCost}</li>
                  <li>Requested hours: {result.summary.totalRequestedHours}</li>
                  <li>Avg utilisation: {result.summary.avgUtilisation}%</li>
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
