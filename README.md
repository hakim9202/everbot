# Robot Work Allocation System

Node.js / Next.js implementation of the **Everest Engineering** robot work allocation challenge.

Allocate **Bravo**, **Charlie**, and **Delta** robots to client work-hour requests across four strategies:

| Level | Strategy | Goal |
|------:|----------|------|
| 1 | Category distribution | Minimise excess hours; prefer multi-type fleets |
| 2 | Cost optimisation | Minimise daily charging cost; compare to Level 1 |
| 3 | Standby activation | Deploy warehouse robots only when active capacity is short |
| 4 | Multi-client scaling | Serve largest requests first; deduct inventory sequentially |

## Robot specs

| Robot   | Hours/day | Daily cost |
|---------|-----------|------------|
| Bravo   | 3         | $2         |
| Charlie | 5         | $3         |
| Delta   | 8         | $4         |

Constraints: each robot is used at most once per day; assigned hours must be ≥ requested hours.

## Run locally

```bash
npm install
npm run dev -- -p 43127
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev -- -p 43127` | Dev server on port 43127 |
| `npm run build` | Production build |
| `npm start -- -p 43127` | Serve production build |
| `npm test` | Vitest unit tests (PDF examples + error strings) |
| `npm run lint` | ESLint |

### API

`POST /api/allocate`

```json
{
  "level": 2,
  "bravo": 2,
  "charlie": 3,
  "delta": 2,
  "hours": 20
}
```

For Level 4, send `"hoursInput": "12, 16, 17, 10, 21"` instead of `hours`.

## Project layout

```
src/lib/robots.ts       # Specs & types
src/lib/solver.ts       # Bounded brute-force allocator
src/lib/strategies.ts   # Levels 1–4
src/app/api/allocate/   # JSON API
src/components/         # UI
tests/solver.test.ts    # Spec compliance tests
```

## Example (Level 2 PDF case)

Inventory `B:2 C:3 D:2`, request `20` hours → **Charlie: 1, Delta: 2**, 21 hours, **$11** (Level 1 would cost $12 for the diversity-preferring mix).
