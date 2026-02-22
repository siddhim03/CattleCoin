# CattleCoin — Frontend

React + TypeScript investor dashboard for the CattleCoin cattle tokenization platform.

---

## Running for Development

```bash
# From the FrontEnd directory
npm install
npm run dev
```

Open **http://localhost:5173** — redirects to `/investor` automatically.

> No backend API server is required. All data is served from `src/lib/mock.ts`.

### Other commands

```bash
npm run build      # Production build (outputs to dist/)
npm run preview    # Preview the production build locally
npm run lint       # Run ESLint
```

---

## Routes

| Path | Page | Description |
|------|------|-------------|
| `/investor` | Dashboard | Portfolio value KPIs, 30-day chart, recent lifecycle events, top 5 herds |
| `/investor/holdings` | Holdings | Searchable, filterable, sortable table of all herds |
| `/investor/holdings/:id` | Herd Detail | Supply chain stepper, pipeline bar, budget breakdown, valuation chart, cattle table |
| `/investor/cows/:cowId` | Cow Detail | Animal details, valuation scores, weight history, health records, EPDs |
| `/rancher` | Rancher | Data entry form (not yet wired to API) |

---

## Project Structure

```
src/
├── components/
│   ├── charts/
│   │   └── LineChartCard.tsx       Recharts line chart wrapper
│   ├── common/
│   │   ├── KpiCard.tsx             Metric card with optional trend indicator
│   │   ├── StageBadge.tsx          Supply chain stage badge
│   │   └── VerifiedBadge.tsx       Verified/unverified indicator
│   ├── layout/
│   │   └── AppShell.tsx            Sidebar + header + page outlet
│   ├── lifecycle/
│   │   └── SupplyChainStepper.tsx  6-step supply chain progress
│   ├── pool/
│   │   ├── BudgetBreakdown.tsx     Cost/revenue bar chart
│   │   └── PipelineBar.tsx         Stage percentage segmented bar
│   ├── tables/
│   │   ├── CowsTable.tsx           Sortable cattle records table
│   │   └── PoolsTable.tsx          Sortable herd/lot table
│   └── ui/                         shadcn/ui primitives
├── lib/
│   ├── types.ts                    All TypeScript type definitions
│   ├── mock.ts                     Mock herds, cows, weights, EPDs, health, valuations
│   ├── api.ts                      Async API layer (TODO: swap mock for real fetch)
│   └── utils.ts                    formatUsd, formatWeight, formatDate, etc.
├── pages/
│   ├── Dashboard.tsx
│   ├── Holdings.tsx
│   ├── PoolDetail.tsx
│   ├── CowDetail.tsx
│   └── Rancher.tsx
├── App.tsx                         React Router route definitions
├── main.tsx                        Entry point
└── index.css                       Tailwind v4 + design tokens
```

---

## Data Model

Types are defined in `src/lib/types.ts` and mirror the backend database schema.

### Key types

**`Pool`** — combined view of Herd + TokenPool + Ownership for the investor:
- `id` / `herdId` — herd identifier (e.g. `HERD-001`)
- `poolId` — ERC-20 token contract identifier
- `contractAddress` — on-chain contract address
- `totalSupply` — total tokens issued for this herd
- `tokenAmount` — tokens held by the investor
- `listingPrice` — herd listing price (from `Herd.listing_price`)
- `purchaseStatus` — `"available"` | `"pending"` | `"sold"`

**`Cow`** — individual animal record:
- `cowId` — string identifier (e.g. `COW-1-001`)
- `herdId` — parent herd
- `registrationNumber` — breed association registration number
- `officialId` — USDA 15-digit EID
- `breedCode` — breed code (AN, HH, WA, etc.)
- `sexCode` — `B` (Bull) | `C` (Calf) | `H` (Heifer) | `S` (Steer)
- `birthDate`, `sireRegistrationNumber`, `damRegistrationNumber`
- `isGenomicEnhanced` — whether EPD data is available
- `weightLbs` — latest recorded weight
- `health` — `"On Track"` | `"Watch"` | `"Issue"`
- `totalValue` — latest valuation total

**`CowDetailData`** — full response for a single cow:
- `cow` — base cow record
- `weights` — array of `CowWeight` (birth → weaning → yearling → sale)
- `epds` — array of `CowEPD` (BW, WW, YW, CW, MARB, REA traits)
- `healthRecords` — array of `CowHealthRecord` (vaccines + programs)
- `valuations` — array of `CowValuation` (genetics/health/weight/cert scores)

---

## Mock Data

All mock data is in `src/lib/mock.ts`:

- **8 herds** (`HERD-001` through `HERD-008`) across all 6 supply chain stages
- **~266 cattle** generated per herd with realistic registration numbers, EIDs, and lineage
- **Weight records** — birth, weaning, yearling, and sale weights per cow
- **Health records** — 1–3 vaccination/program records per cow (NHTC, IMI Global, GlobalG.A.P.)
- **EPD records** — 6 genetic trait EPDs for genomic-enhanced animals
- **Valuation snapshots** — 1–2 historical valuations per cow with component scores
- **33 lifecycle events** narrating each herd's journey through the supply chain
- **30-day valuation time series** generated procedurally per herd and portfolio

---

## Connecting to a Real API

All API calls live in `src/lib/api.ts`. Each function has a `// TODO: replace with fetch(...)` comment. Replace the mock bodies with real `fetch()` calls:

| Function | Planned Endpoint | Returns |
|----------|-----------------|---------|
| `getPortfolio()` | `GET /api/portfolio` | `PortfolioSummary` |
| `getPools()` | `GET /api/pools` | `Pool[]` |
| `getPoolById(id)` | `GET /api/pools/:id` | `PoolDetail \| null` |
| `getPoolCows(id)` | `GET /api/pools/:id/cows` | `Cow[]` |
| `getCowById(cowId)` | `GET /api/cows/:cowId` | `CowDetailData \| null` |

---

## Tech Stack

| Library | Purpose |
|---------|---------|
| React 19 + TypeScript | UI framework |
| Vite | Build tool + dev server |
| React Router v7 | Client-side routing |
| Tailwind CSS v4 | Utility-first styling |
| shadcn/ui (Radix) | Accessible component primitives |
| Recharts | Line charts |
| Lucide React | Icons |
