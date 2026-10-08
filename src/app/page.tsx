import { AllocatorApp } from "@/components/allocator-app";
import { ROBOT_SPECS } from "@/lib/robots";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(15,118,110,0.18),_transparent_45%),linear-gradient(160deg,#020617_0%,#0f172a_45%,#020617_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(148,163,184,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.35)_1px,transparent_1px)] [background-size:48px_48px]"
      />

      <header className="relative z-10 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="font-display text-2xl font-semibold tracking-tight text-slate-50 sm:text-3xl">
              EverBot
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-cyan-400/90">
              Robot work allocation
            </p>
          </div>
          <div className="hidden gap-4 font-mono text-xs text-slate-400 sm:flex">
            {Object.values(ROBOT_SPECS).map((r) => (
              <span key={r.name}>
                {r.name} {r.hours}h/${r.cost}
              </span>
            ))}
          </div>
        </div>
      </header>

      <main className="relative z-10 px-4 py-10 sm:px-6 sm:py-14">
        <AllocatorApp />
      </main>

      <footer className="relative z-10 border-t border-slate-800/80 px-4 py-6 text-center text-xs text-slate-500 sm:px-6">
        Everest Engineering coding challenge · Node.js / Next.js · Levels 1–4
      </footer>
    </div>
  );
}
