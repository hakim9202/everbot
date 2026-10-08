# Robot Work Allocation System

Node.js implementation of the **Everest Engineering** EverBot coding challenge (terminal + web).

Allocate **Bravo**, **Charlie**, and **Delta** robots across four strategies.

| Robot   | Hours/day | Daily cost |
|---------|-----------|------------|
| Bravo   | 3         | $2         |
| Charlie | 5         | $3         |
| Delta   | 8         | $4         |

| Level | Strategy | Rule |
|------:|----------|------|
| 1 | Category distribution | ≥1 of each type; minimise excess hours |
| 2 | Cost optimisation | Minimise charging cost; compare to Level 1 |
| 3 | Standby activation | Warehouse robots for capacity deficit (cost-optimal) |
| 4 | Multi-client scaling | Highest hours first; sequential inventory deduction |

## Run locally

```bash
npm install

# Web UI + API (uncommon port)
npm run dev -- -p 43127

# Terminal CLI (PDF primary surface)
npm run cli

# Tests (PDF examples + exact error strings)
npm test
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

### API

`POST /api/allocate`

```json
{ "level": 2, "bravo": 2, "charlie": 3, "delta": 2, "hours": 20 }
```

Level 4: use `"hoursInput": "12, 16, 17, 10, 21"` instead of `hours`.

## PDF examples (verified in tests)

- **L1** B2/C3/D2 @ 16h → B1+C1+D1  
- **L2** B2/C3/D2 @ 20h → C1+D2, **$11** (L1 would be **$12**)  
- **L2** B2/C2/D3 @ 6h → B2, **$4**  
- **L3** B1/C1/D1 @ 21h → capacity 16, standby **Charlie×1 ($3)**

## Layout

```
src/lib/errors.ts       # Exact PDF error strings
src/lib/robots.ts       # Specs & types
src/lib/solver.ts       # Bounded allocator
src/lib/strategies.ts   # Levels 1–4
src/app/api/allocate/   # JSON API
src/components/         # Web UI
scripts/cli.ts          # Terminal CLI
tests/solver.test.ts
```
