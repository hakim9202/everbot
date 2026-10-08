# EverBot — Robot Work Allocation System

Node.js / Next.js implementation of the **Everest Engineering** coding challenge for **EverBot Solutions**.

EverBot assigns a fleet of specialised robots to client work requests measured in **hours per day**. Each robot can be used **at most once per day**, and the combined hours provided must be **≥** the hours requested (exact match is not required).

## Robots

| Type    | Working hours / day | Charging cost / day |
|---------|---------------------|---------------------|
| Bravo   | 3                   | $2                  |
| Charlie | 5                   | $3                  |
| Delta   | 8                   | $4                  |

## What this app does

Four allocation strategies (levels), matching the challenge PDF:

| Level | Name | Behaviour |
|------:|------|-----------|
| **1** | Category distribution | Use **at least one** Bravo, Charlie, and Delta; minimise excess hours |
| **2** | Cost optimisation | Minimise total charging cost; show Level 1 vs Level 2 cost comparison |
| **3** | Standby activation | If active capacity is short, list warehouse standby options and pick the cost-optimised one |
| **4** | Multi-client scaling | Serve multiple clients (highest hours first), deduct inventory, fall back to standby; print utilisation summary |

Surfaces:

- **Terminal CLI** — interactive Levels 1–4 (`npm run cli`)
- **Web UI** — browser control panel for the same strategies
- **JSON API** — `POST /api/allocate` for programmatic use
- **Tests** — Vitest suite covering PDF examples and exact error strings

No database or auth is required; allocation is computed in-process.

## Prerequisites

- **Node.js** 20+ (22 recommended)
- **npm** 10+

## Run locally

```bash
git clone https://github.com/hakim9202/everbot.git
cd everbot
git checkout cursor/robot-work-allocation-cae4   # or main once merged
npm install
```

### Web UI + API

```bash
npm run dev -- -p 43127 -H 127.0.0.1
```

Open [http://127.0.0.1:43127](http://127.0.0.1:43127).

Port **43127** is used by default in docs to avoid clashing with 3000 / 5173 / 8080. Any free port works:

```bash
npm run dev -- -p 4000
```

### Terminal CLI

```bash
npm run cli
```

Follow the prompts: choose level `1`–`4` (or `quit`), enter Bravo / Charlie / Delta counts, then client hours. Level 4 accepts comma- or space-separated hour lists (e.g. `12, 16, 17, 10, 21`).

### Tests

```bash
npm test
```

### Production build (local)

```bash
npm run build
npm start -- -p 43127 -H 127.0.0.1
```

### API example

`POST /api/allocate` with JSON body:

```json
{
  "level": 2,
  "bravo": 2,
  "charlie": 3,
  "delta": 2,
  "hours": 20
}
```

For Level 4, send `"hoursInput": "12, 16, 17, 10, 21"` instead of `"hours"`.

### Verified PDF examples

| Level | Input | Expected |
|------:|-------|----------|
| 1 | B2/C3/D2, 16h | Bravo 1, Charlie 1, Delta 1 |
| 2 | B2/C3/D2, 20h | Charlie 1, Delta 2 → 21h, **$11** (Level 1 cost **$12**) |
| 2 | B2/C2/D3, 6h | Bravo 2 → 6h, **$4** |
| 3 | B1/C1/D1, 21h | Active capacity 16; standby **Charlie × 1 ($3)** |

## Environment variables

None required for local or hosted use. Optional Next.js / host variables:

| Variable | Purpose |
|----------|---------|
| `PORT` | Listen port for `next start` on some hosts (e.g. Render, Railway). App also accepts `npm start -- -p <port>`. |
| `NODE_ENV` | Set to `production` by the host after `npm run build`. |

No API keys, database URLs, or secrets are used by the allocator.

## Host / deploy

This is a standard **Next.js (App Router) Node** app: UI and `/api/allocate` ship together.

### Option A — Vercel

1. Import the GitHub repo (`hakim9202/everbot`) in [Vercel](https://vercel.com).
2. Framework preset: **Next.js** (auto-detected).
3. Build command: `npm run build`  
   Output: Next default (no static export).
4. Install command: `npm install`
5. No environment variables required.
6. Deploy. The site root is the UI; `POST /api/allocate` is available on the same domain.

CLI tip:

```bash
npx vercel
```

### Option B — Generic Node host (Render, Railway, Fly.io, VM, Docker)

Build and run with Node 20+:

```bash
npm ci
npm run build
npm start -- -H 0.0.0.0 -p ${PORT:-43127}
```

Typical host settings:

| Setting | Value |
|---------|--------|
| Build command | `npm ci && npm run build` |
| Start command | `npm start -- -H 0.0.0.0 -p $PORT` |
| Health check | `GET /` |

**Dockerfile example** (optional):

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./
EXPOSE 43127
CMD ["npm", "start", "--", "-H", "0.0.0.0", "-p", "43127"]
```

The terminal CLI is for local/operator use; hosted deployments typically expose only the web UI and API.

## Project layout

```
src/lib/errors.ts         Exact PDF error strings
src/lib/robots.ts         Robot specs and types
src/lib/solver.ts         Bounded brute-force allocator
src/lib/strategies.ts     Levels 1–4
src/app/api/allocate/     JSON API route
src/components/           Web UI
scripts/cli.ts            Terminal CLI
tests/solver.test.ts      PDF compliance tests
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev -- -p 43127` | Dev server (hot reload) |
| `npm run build` | Production build |
| `npm start -- -p 43127` | Serve production build |
| `npm run cli` | Interactive terminal allocator |
| `npm test` | Run Vitest suite |
| `npm run lint` | ESLint |

## License

Built for the Everest Engineering coding challenge (educational / submission use).
