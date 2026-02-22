# CattleCoin

A cattle tokenization platform that lets investors buy fractional ERC-20 ownership stakes in livestock herds, track individual cattle through the full supply chain, and view real-time valuations backed by on-chain data.

---

## Monorepo Structure

```
CattleCoin/
├── FrontEnd/              React + TypeScript investor dashboard
├── BackEnd/
│   └── Database/          Postgres schema + Docker setup
├── docker-compose.yml     Starts the local Postgres database
├── erd.html               Entity Relationship Diagram (open in browser)
└── .env.example           Copy to .env and fill in credentials
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| Docker Desktop | latest |

---

## Running the App for Development

### 1 — Start the database

```bash
# From the repo root
docker compose up -d
```

Confirm the container is running:

```bash
docker ps
# should show cattlecoin-db on port 5432
```

Run migrations to apply the schema:

```bash
chmod +x BackEnd/Database/runMigrations.sh
./BackEnd/Database/runMigrations.sh
```

### 2 — Start the frontend

```bash
cd FrontEnd
npm install
npm run dev
```

Open **http://localhost:5173** — you will be redirected to `/investor`.

> The frontend currently runs entirely on mock data. No backend API server is required to use the investor dashboard.

---

## Environment Variables

Copy `.env.example` to `.env` in the repo root:

```bash
cp .env.example .env
```

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | `cattlecoin` | Database name |
| `POSTGRES_USER` | `cattlecoin` | Database user |
| `POSTGRES_PASSWORD` | `cattlecoin` | Database password |

---

## Database

- **Engine**: PostgreSQL 16 via Docker
- **Connection**: `postgresql://cattlecoin:cattlecoin@localhost:5432/cattlecoin`
- **Schema**: See `erd.html` (open in any browser) or `BackEnd/Database/README.md`
- **Migrations**: `BackEnd/Database/migrations/`

See [BackEnd/Database/README.md](BackEnd/Database/README.md) for full database docs.

---

## Frontend

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Charts**: Recharts
- **Router**: React Router v7

See [FrontEnd/README.md](FrontEnd/README.md) for full frontend docs.

---

## Database Schema (ERD Summary)

Open `erd.html` in a browser to view the full interactive diagram. Core tables:

| Table | Description |
|-------|-------------|
| `User` | Investors and ranchers |
| `Herd` | A physical cattle herd owned by a rancher |
| `Cow` | Individual animal records (registration, breed, sex, lineage, genomics) |
| `TokenPool` | ERC-20 token contract — one per Herd |
| `Ownership` | Investor ↔ TokenPool many-to-many (token balances) |
| `Transaction` | On-chain buy/sell/mint/redeem audit log |
| `CowWeights` | Time-series weight records per animal |
| `CowEPDs` | Expected Progeny Differences (genetic trait scores) |
| `CowHealth` | Vaccination and health program records |
| `CowValuation` | Scoring-based valuation snapshots per animal |

---

## Connecting the Frontend to a Real API

All API calls are in `FrontEnd/src/lib/api.ts`. Each function has a `// TODO: replace with fetch(...)` comment:

| Function | Current | Planned Endpoint |
|----------|---------|-----------------|
| `getPortfolio()` | mock aggregation | `GET /api/portfolio` |
| `getPools()` | mock array | `GET /api/pools` |
| `getPoolById(id)` | mock lookup | `GET /api/pools/:id` |
| `getPoolCows(id)` | mock filter | `GET /api/pools/:id/cows` |
| `getCowById(cowId)` | mock lookup | `GET /api/cows/:cowId` |

Return types are defined in `FrontEnd/src/lib/types.ts`.
