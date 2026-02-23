import type {
  Pool,
  Cow,
  CowWeight,
  CowEPD,
  CowHealthRecord,
  CowValuation,
  Document,
  LifecycleEvent,
  SeriesPoint,
  BudgetItem,
  Stage,
  SexCode,
} from "./types";

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function dateAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function generateSeries(
  days: number,
  base: number,
  volatility: number,
): SeriesPoint[] {
  const points: SeriesPoint[] = [];
  let value = base;
  for (let i = days; i >= 0; i--) {
    value += (Math.random() - 0.45) * volatility;
    value = Math.max(value * 0.95, value);
    points.push({ dateIso: daysAgo(i), value: Math.round(value) });
  }
  return points;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Pools / Herds ─────────────────────────────────────────────────────────────
// Combines Herd + TokenPool + Ownership data for investor view.
// All herds are herd/lot investments (ERC-20).
// Investors buy into entire lots; individual cattle are tracked per Cow table.

export const POOLS: Pool[] = [
  {
    id: "HERD-001",
    herdId: "HERD-001",
    rancherId: "usr-rancher-01",
    listingPrice: 198_000,
    purchaseStatus: "available",
    poolId: "POOL-TKN-001",
    totalSupply: 20,
    contractAddress: "0x1A2b3C4d5E6f7a8B9c0D1e2F3a4B5c6D7e8F9a01",
    tokenAmount: 20,
    name: "Angus Prime Lot A",
    poolType: "herd",
    cohortLabel: "Fall 2025 — Angus",
    geneticsLabel: "Angus AI Select",
    season: "Fall",
    positionValueUsd: 248_000,
    backingHerdCount: 32,
    expectedRevenueUsd: 276_000,
    netExpectedUsd: 78_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 100 },
      { stage: "PROCESSING", pct: 0 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "FEEDLOT",
    verified: true,
    lastUpdateIso: daysAgo(1),
  },
  {
    id: "HERD-002",
    herdId: "HERD-002",
    rancherId: "usr-rancher-02",
    listingPrice: 128_000,
    purchaseStatus: "available",
    poolId: "POOL-TKN-002",
    totalSupply: 20,
    contractAddress: "0x2B3c4D5e6F7a8b9C0d1E2f3A4b5C6d7E8f9a0B02",
    tokenAmount: 20,
    name: "Hereford Select Lot B",
    poolType: "herd",
    cohortLabel: "Spring 2025 — Hereford",
    geneticsLabel: "Hereford Registered",
    season: "Spring",
    positionValueUsd: 156_000,
    backingHerdCount: 28,
    expectedRevenueUsd: 172_000,
    netExpectedUsd: 44_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 100 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 0 },
      { stage: "PROCESSING", pct: 0 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "RANCH",
    verified: true,
    lastUpdateIso: daysAgo(2),
  },
  {
    id: "HERD-003",
    herdId: "HERD-003",
    rancherId: "usr-rancher-01",
    listingPrice: 420_000,
    purchaseStatus: "pending",
    poolId: "POOL-TKN-003",
    totalSupply: 20,
    contractAddress: "0x3C4d5E6f7A8b9c0D1e2F3a4B5c6D7e8F9a0b1C03",
    tokenAmount: 20,
    name: "Wagyu Cross Lot C",
    poolType: "herd",
    cohortLabel: "Fall 2024 — Wagyu",
    geneticsLabel: "Wagyu F1 Cross",
    season: "Fall",
    positionValueUsd: 512_000,
    backingHerdCount: 45,
    expectedRevenueUsd: 580_000,
    netExpectedUsd: 160_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 0 },
      { stage: "PROCESSING", pct: 100 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "PROCESSING",
    verified: true,
    lastUpdateIso: daysAgo(0),
  },
  {
    id: "HERD-004",
    herdId: "HERD-004",
    rancherId: "usr-rancher-03",
    listingPrice: 144_000,
    purchaseStatus: "available",
    poolId: "POOL-TKN-004",
    totalSupply: 20,
    contractAddress: "0x4D5e6F7a8B9c0d1E2f3A4b5C6d7E8f9A0b1c2D04",
    tokenAmount: 20,
    name: "Brahman Mix Lot D",
    poolType: "herd",
    cohortLabel: "Fall 2025 — Brahman",
    geneticsLabel: "Brahman AI Select",
    season: "Fall",
    positionValueUsd: 178_000,
    backingHerdCount: 24,
    expectedRevenueUsd: 198_000,
    netExpectedUsd: 54_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 100 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 0 },
      { stage: "PROCESSING", pct: 0 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "AUCTION",
    verified: false,
    lastUpdateIso: daysAgo(3),
  },
  {
    id: "HERD-005",
    herdId: "HERD-005",
    rancherId: "usr-rancher-02",
    listingPrice: 310_000,
    purchaseStatus: "sold",
    poolId: "POOL-TKN-005",
    totalSupply: 20,
    contractAddress: "0x5E6f7A8b9C0d1e2F3a4B5c6D7e8F9a0B1c2d3E05",
    tokenAmount: 20,
    name: "Black Angus Lot E",
    poolType: "herd",
    cohortLabel: "Spring 2025 — Black Angus",
    geneticsLabel: "Black Angus Premium AI",
    season: "Spring",
    positionValueUsd: 385_000,
    backingHerdCount: 38,
    expectedRevenueUsd: 420_000,
    netExpectedUsd: 110_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 0 },
      { stage: "PROCESSING", pct: 0 },
      { stage: "DISTRIBUTION", pct: 100 },
    ],
    dominantStage: "DISTRIBUTION",
    verified: true,
    lastUpdateIso: daysAgo(1),
  },
  {
    id: "HERD-006",
    herdId: "HERD-006",
    rancherId: "usr-rancher-03",
    listingPrice: 218_000,
    purchaseStatus: "available",
    poolId: "POOL-TKN-006",
    totalSupply: 20,
    contractAddress: "0x6F7a8B9c0D1e2f3A4b5C6d7E8f9A0b1C2d3e4F06",
    tokenAmount: 20,
    name: "Charolais Lot F",
    poolType: "herd",
    cohortLabel: "Fall 2025 — Charolais",
    geneticsLabel: "Charolais Fullblood",
    season: "Fall",
    positionValueUsd: 265_000,
    backingHerdCount: 35,
    expectedRevenueUsd: 292_000,
    netExpectedUsd: 74_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 100 },
      { stage: "PROCESSING", pct: 0 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "FEEDLOT",
    verified: true,
    lastUpdateIso: daysAgo(2),
  },
  {
    id: "HERD-007",
    herdId: "HERD-007",
    rancherId: "usr-rancher-01",
    listingPrice: 116_000,
    purchaseStatus: "available",
    poolId: "POOL-TKN-007",
    totalSupply: 20,
    contractAddress: "0x7A8b9C0d1E2f3a4B5c6D7e8F9a0B1c2D3e4f5A07",
    tokenAmount: 20,
    name: "Simmental Lot G",
    poolType: "herd",
    cohortLabel: "Spring 2026 — Simmental",
    geneticsLabel: "Simmental Registered AI",
    season: "Spring",
    positionValueUsd: 142_000,
    backingHerdCount: 22,
    expectedRevenueUsd: 158_000,
    netExpectedUsd: 42_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 100 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 0 },
      { stage: "PROCESSING", pct: 0 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "RANCH",
    verified: true,
    lastUpdateIso: daysAgo(5),
  },
  {
    id: "HERD-008",
    herdId: "HERD-008",
    rancherId: "usr-rancher-02",
    listingPrice: 365_000,
    purchaseStatus: "pending",
    poolId: "POOL-TKN-008",
    totalSupply: 20,
    contractAddress: "0x8B9c0D1e2F3a4b5C6d7E8f9A0b1C2d3E4f5a6B08",
    tokenAmount: 20,
    name: "Red Angus Premium Lot H",
    poolType: "herd",
    cohortLabel: "Spring 2025 — Red Angus",
    geneticsLabel: "Red Angus AI Elite",
    season: "Spring",
    positionValueUsd: 445_000,
    backingHerdCount: 42,
    expectedRevenueUsd: 495_000,
    netExpectedUsd: 130_000,
    stageBreakdown: [
      { stage: "RANCH", pct: 0 },
      { stage: "AUCTION", pct: 0 },
      { stage: "BACKGROUNDING", pct: 0 },
      { stage: "FEEDLOT", pct: 0 },
      { stage: "PROCESSING", pct: 100 },
      { stage: "DISTRIBUTION", pct: 0 },
    ],
    dominantStage: "PROCESSING",
    verified: true,
    lastUpdateIso: daysAgo(0),
  },
];

// ── Breed Codes by Herd ───────────────────────────────────────────────────────

const BREED_CODES_BY_HERD: Record<string, string> = {
  "HERD-001": "AN",
  "HERD-002": "HH",
  "HERD-003": "WA",
  "HERD-004": "BR",
  "HERD-005": "BA",
  "HERD-006": "CH",
  "HERD-007": "SM",
  "HERD-008": "RA",
};

const BREED_NAMES_BY_CODE: Record<string, string> = {
  AN: "Angus",
  HH: "Hereford",
  WA: "Wagyu F1",
  BR: "Brahman",
  BA: "Black Angus",
  CH: "Charolais",
  SM: "Simmental",
  RA: "Red Angus",
};

// ── Location Codes by Stage ───────────────────────────────────────────────────

const LOCATION_CODES: Record<Stage, string[]> = {
  RANCH: ["RCH-MT-01", "RCH-WY-02", "RCH-OR-03", "RCH-TX-04"],
  AUCTION: ["AUC-TX-AMR", "AUC-CO-REG", "AUC-IA-MID"],
  BACKGROUNDING: ["BGD-KS-01", "BGD-NE-PR", "BGD-OK-HP"],
  FEEDLOT: ["FDL-TX-07", "FDL-TX-12", "FDL-NE-03", "FDL-IA-VLY"],
  PROCESSING: ["PRC-NE-PM", "PRC-IA-VP", "PRC-KS-42"],
  DISTRIBUTION: ["DST-KS-CCH", "DST-IL-MID", "DST-AZ-SW"],
};

// ── Sire/Dam registration prefixes per breed ──────────────────────────────────

const SIRE_PREFIXES: Record<string, string> = {
  AN: "AAA", HH: "AHA", WA: "AWA", BR: "ABA",
  BA: "AAA", CH: "ACH", SM: "ASA", RA: "AAA",
};

// ── Cow Generation ────────────────────────────────────────────────────────────

function generateCowsForPool(pool: Pool): Cow[] {
  const cows: Cow[] = [];
  const breedCode = BREED_CODES_BY_HERD[pool.herdId] ?? "AN";
  const sexOptions: SexCode[] = ["S", "S", "S", "S", "H", "H", "C"];
  const healthOptions: Array<"On Track" | "Watch"> = [
    "On Track", "On Track", "On Track", "On Track", "Watch",
  ];
  const sirePrefix = SIRE_PREFIXES[breedCode] ?? "AAA";

  const baseCost = pool.listingPrice / pool.backingHerdCount;
  const baseRevenue = pool.expectedRevenueUsd / pool.backingHerdCount;
  const herdNum = pool.herdId.replace("HERD-", "");

  for (let i = 0; i < pool.backingHerdCount; i++) {
    const cowNum = String(i + 1).padStart(3, "0");
    const cowId = `COW-${herdNum}-${cowNum}`;
    const regNum = `${breedCode}${herdNum}${cowNum}`;
    const birthDaysAgo = 180 + Math.floor(Math.random() * 540);

    cows.push({
      cowId,
      herdId: pool.herdId,
      registrationNumber: regNum,
      officialId: `840${herdNum}${cowNum.padStart(9, "0")}`,
      animalName: `${BREED_NAMES_BY_CODE[breedCode] ?? breedCode} ${herdNum}-${cowNum}`,
      breedCode,
      sexCode: pick(sexOptions),
      birthDate: dateAgo(birthDaysAgo),
      sireRegistrationNumber: `${sirePrefix}${Math.floor(100000 + Math.random() * 900000)}`,
      damRegistrationNumber: `${sirePrefix}${Math.floor(100000 + Math.random() * 900000)}`,
      isGenomicEnhanced: Math.random() > 0.4,
      createdAt: daysAgo(birthDaysAgo - 5),

      // Derived/computed
      stage: pool.dominantStage,
      weightLbs: 600 + Math.floor(Math.random() * 800),
      health: pick(healthOptions),
      daysInStage: 3 + Math.floor(Math.random() * 45),
      costToDateUsd: Math.round(baseCost * (0.7 + Math.random() * 0.6)),
      totalValue: Math.round(baseRevenue * (0.85 + Math.random() * 0.3)),
      verified: pool.verified || Math.random() > 0.3,
    });
  }

  return cows;
}

export const COWS: Cow[] = POOLS.flatMap(generateCowsForPool);

// ── CowWeights ────────────────────────────────────────────────────────────────

function generateWeightsForCow(cow: Cow): CowWeight[] {
  const locationCodes = LOCATION_CODES[cow.stage];
  const weights: CowWeight[] = [];
  const weightTypes: Array<{ type: "birth" | "weaning" | "yearling" | "sale"; daysOld: number }> = [
    { type: "birth", daysOld: 0 },
    { type: "weaning", daysOld: 205 },
    { type: "yearling", daysOld: 365 },
    { type: "sale", daysOld: 550 },
  ];

  const birthDaysAgo = Math.round(
    (new Date().getTime() - new Date(cow.birthDate).getTime()) / 86400000
  );

  const idBase = parseInt(cow.cowId.replace(/\D/g, "")) * 10;
  let lastWeight = 80 + Math.floor(Math.random() * 20);

  for (let idx = 0; idx < weightTypes.length; idx++) {
    const wt = weightTypes[idx];
    if (wt.daysOld > birthDaysAgo) break;
    const prevDays = idx === 0 ? 0 : weightTypes[idx - 1].daysOld;
    const gainPerDay = 2.0 + Math.random() * 1.5;
    if (wt.type !== "birth") {
      lastWeight = Math.round(lastWeight + gainPerDay * (wt.daysOld - prevDays));
    }
    weights.push({
      weightId: idBase + idx,
      cowId: cow.cowId,
      weightDate: dateAgo(birthDaysAgo - wt.daysOld),
      weightLbs: lastWeight,
      weightType: wt.type,
      locationCode: pick(locationCodes),
    });
  }

  return weights;
}

export const COW_WEIGHTS: CowWeight[] = COWS.flatMap(generateWeightsForCow);

// ── CowEPDs ───────────────────────────────────────────────────────────────────

const EPD_TRAITS: Array<{ code: string }> = [
  { code: "BW" },
  { code: "WW" },
  { code: "YW" },
  { code: "CW" },
  { code: "MARB" },
  { code: "REA" },
];

function generateEPDsForCow(cow: Cow, idx: number): CowEPD[] {
  return EPD_TRAITS.map((trait, tIdx) => ({
    cowEpdId: idx * 100 + tIdx,
    cowId: cow.cowId,
    traitCode: trait.code,
    epdValue: parseFloat((Math.random() * 30 - 5).toFixed(2)),
    accuracy: parseFloat((0.3 + Math.random() * 0.65).toFixed(2)),
    percentileRank: Math.floor(Math.random() * 100),
    evaluationDate: dateAgo(60 + Math.floor(Math.random() * 120)),
  }));
}

export const COW_EPDS: CowEPD[] = COWS.flatMap((cow, idx) =>
  cow.isGenomicEnhanced ? generateEPDsForCow(cow, idx) : []
);

// ── CowHealthRecords ──────────────────────────────────────────────────────────

const VACCINE_PROGRAMS: Array<{
  vaccine: string;
  program: string;
  certPrefix: string;
}> = [
  { vaccine: "IBR-BVD Modified Live", program: "NHTC", certPrefix: "NHTC" },
  { vaccine: "7-Way Clostridial", program: "IMI Global", certPrefix: "IMG" },
  { vaccine: "Mannheimia Haemolytica", program: "NHTC", certPrefix: "NHTC" },
  { vaccine: "Bovine Respiratory Syncytial Virus", program: "GlobalG.A.P.", certPrefix: "GGAP" },
];

function generateHealthRecordsForCow(cow: Cow, idx: number): CowHealthRecord[] {
  const count = 1 + Math.floor(Math.random() * 3);
  return VACCINE_PROGRAMS.slice(0, count).map((prog, pIdx) => ({
    healthRecordId: idx * 10 + pIdx,
    cowId: cow.cowId,
    vaccineName: prog.vaccine,
    administrationDate: dateAgo(30 + pIdx * 45 + Math.floor(Math.random() * 20)),
    healthProgramName: prog.program,
    certificationNumber: `${prog.certPrefix}-${idx.toString().padStart(4, "0")}-${pIdx}`,
    verifiedFlag: cow.verified,
  }));
}

export const COW_HEALTH_RECORDS: CowHealthRecord[] = COWS.flatMap(
  (cow, idx) => generateHealthRecordsForCow(cow, idx)
);

// ── CowValuations ─────────────────────────────────────────────────────────────

function generateValuationsForCow(cow: Cow, idx: number): CowValuation[] {
  const count = 1 + Math.floor(Math.random() * 2);
  return Array.from({ length: count }, (_, vIdx) => {
    const geneticsScore = parseFloat((50 + Math.random() * 50).toFixed(2));
    const healthScore = cow.verified
      ? parseFloat((70 + Math.random() * 30).toFixed(2))
      : parseFloat((30 + Math.random() * 40).toFixed(2));
    const weightScore = parseFloat((40 + Math.random() * 60).toFixed(2));
    const certScore = cow.verified
      ? parseFloat((60 + Math.random() * 40).toFixed(2))
      : parseFloat((20 + Math.random() * 30).toFixed(2));
    const progress = count > 1 ? vIdx / (count - 1) : 1;
    const totalValue = Math.round(cow.totalValue * (0.85 + progress * 0.15));
    return {
      valuationId: idx * 10 + vIdx,
      cowId: cow.cowId,
      valuationDate: daysAgo(30 * (count - vIdx)),
      geneticsScore,
      healthScore,
      weightScore,
      certificationScore: certScore,
      totalValue,
      valuationMethodVersion: "v1.2",
    };
  });
}

export const COW_VALUATIONS: CowValuation[] = COWS.flatMap(
  (cow, idx) => generateValuationsForCow(cow, idx)
);

// ── Lifecycle Events ──────────────────────────────────────────────────────────

export const LIFECYCLE_EVENTS: LifecycleEvent[] = [
  // HERD-001 — Angus Prime Lot A (at FEEDLOT)
  { id: "ev-001", poolId: "HERD-001", stage: "RANCH", verified: true, timestampIso: daysAgo(90), note: "32 Angus calves born & tagged at RCH-MT-01." },
  { id: "ev-002", poolId: "HERD-001", stage: "AUCTION", verified: true, timestampIso: daysAgo(65), note: "Lot sold at Amarillo livestock auction." },
  { id: "ev-003", poolId: "HERD-001", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(50), note: "Entire lot entered stocker program for weight gain." },
  { id: "ev-004", poolId: "HERD-001", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(25), note: "Full lot transferred to feedlot for finishing." },
  { id: "ev-005", poolId: "HERD-001", cowId: "COW-1-003", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(2), note: "Weight check — 1,180 lb average, on target." },

  // HERD-002 — Hereford Select Lot B (at RANCH)
  { id: "ev-006", poolId: "HERD-002", stage: "RANCH", verified: true, timestampIso: daysAgo(40), note: "28 Hereford calves born — calving season complete." },
  { id: "ev-007", poolId: "HERD-002", cowId: "COW-2-004", stage: "RANCH", verified: true, timestampIso: daysAgo(5), note: "Vaccination round completed. All 28 head clear." },

  // HERD-003 — Wagyu Cross Lot C (at PROCESSING)
  { id: "ev-008", poolId: "HERD-003", stage: "RANCH", verified: true, timestampIso: daysAgo(150), note: "45 Wagyu F1 cross calves selected from specialty ranch." },
  { id: "ev-009", poolId: "HERD-003", stage: "AUCTION", verified: true, timestampIso: daysAgo(120), note: "Premium auction — top price per head." },
  { id: "ev-010", poolId: "HERD-003", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(100), note: "Special diet backgrounding program for full lot." },
  { id: "ev-011", poolId: "HERD-003", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(70), note: "Entered specialty feedlot — grain-finishing." },
  { id: "ev-012", poolId: "HERD-003", stage: "PROCESSING", verified: true, timestampIso: daysAgo(10), note: "Processing started at certified USDA plant." },
  { id: "ev-013", poolId: "HERD-003", cowId: "COW-3-012", stage: "PROCESSING", verified: true, timestampIso: daysAgo(1), note: "USDA grade: Prime — marbling excellent." },

  // HERD-004 — Brahman Mix Lot D (at AUCTION)
  { id: "ev-014", poolId: "HERD-004", stage: "RANCH", verified: true, timestampIso: daysAgo(60), note: "24 Brahman mix calves raised, grass-fed on pasture." },
  { id: "ev-015", poolId: "HERD-004", stage: "AUCTION", verified: false, timestampIso: daysAgo(12), note: "Lot listed for auction — pending verification." },

  // HERD-005 — Black Angus Lot E (at DISTRIBUTION)
  { id: "ev-016", poolId: "HERD-005", stage: "RANCH", verified: true, timestampIso: daysAgo(180), note: "38 Black Angus raised on premium pasture." },
  { id: "ev-017", poolId: "HERD-005", stage: "AUCTION", verified: true, timestampIso: daysAgo(150), note: "Lot sold to certified buyer." },
  { id: "ev-018", poolId: "HERD-005", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(125), note: "Backgrounding — weight gain program." },
  { id: "ev-019", poolId: "HERD-005", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(90), note: "Grain-finished program started." },
  { id: "ev-020", poolId: "HERD-005", stage: "PROCESSING", verified: true, timestampIso: daysAgo(40), note: "USDA inspected processing." },
  { id: "ev-021", poolId: "HERD-005", stage: "DISTRIBUTION", verified: true, timestampIso: daysAgo(8), note: "Full lot entered cold chain distribution." },
  { id: "ev-022", poolId: "HERD-005", cowId: "COW-5-022", stage: "DISTRIBUTION", verified: true, timestampIso: daysAgo(1), note: "Shipment dispatched to DST-AZ-SW." },

  // HERD-006 — Charolais Lot F (at FEEDLOT)
  { id: "ev-023", poolId: "HERD-006", stage: "RANCH", verified: true, timestampIso: daysAgo(110), note: "35 Charolais calves selected and tagged." },
  { id: "ev-024", poolId: "HERD-006", stage: "AUCTION", verified: true, timestampIso: daysAgo(85), note: "Auction completed — lot sold." },
  { id: "ev-025", poolId: "HERD-006", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(65), note: "Full lot entered stocker field intake." },
  { id: "ev-026", poolId: "HERD-006", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(35), note: "Feedlot finishing started — grain program." },
  { id: "ev-027", poolId: "HERD-006", cowId: "COW-6-008", stage: "FEEDLOT", verified: false, timestampIso: daysAgo(2), note: "Health watch — mild respiratory, treated." },

  // HERD-007 — Simmental Lot G (at RANCH)
  { id: "ev-028", poolId: "HERD-007", stage: "RANCH", verified: true, timestampIso: daysAgo(30), note: "22 Simmental calves on pasture — 4 months to auction." },

  // HERD-008 — Red Angus Premium Lot H (at PROCESSING)
  { id: "ev-029", poolId: "HERD-008", stage: "RANCH", verified: true, timestampIso: daysAgo(140), note: "42 Red Angus premium stock selected." },
  { id: "ev-030", poolId: "HERD-008", stage: "AUCTION", verified: true, timestampIso: daysAgo(115), note: "Sold at Iowa livestock exchange." },
  { id: "ev-031", poolId: "HERD-008", stage: "BACKGROUNDING", verified: true, timestampIso: daysAgo(95), note: "Prairie backgrounding program — full lot." },
  { id: "ev-032", poolId: "HERD-008", stage: "FEEDLOT", verified: true, timestampIso: daysAgo(65), note: "Entered Valley Feedlot — finishing program." },
  { id: "ev-033", poolId: "HERD-008", stage: "PROCESSING", verified: true, timestampIso: daysAgo(10), note: "Processing started at certified plant." },
];

// ── Budget Breakdowns (per herd) ──────────────────────────────────────────────

const BUDGET_DATA: Record<string, BudgetItem[]> = {
  "HERD-001": [
    { label: "Cattle Acquisition", amountUsd: 72_000, category: "cost" },
    { label: "Operating Costs", amountUsd: 126_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 276_000, category: "revenue" },
  ],
  "HERD-002": [
    { label: "Cattle Acquisition", amountUsd: 56_000, category: "cost" },
    { label: "Operating Costs", amountUsd: 72_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 172_000, category: "revenue" },
  ],
  "HERD-003": [
    { label: "Cattle Acquisition", amountUsd: 165_000, category: "cost" },
    { label: "Operating Costs", amountUsd: 255_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 580_000, category: "revenue" },
  ],
  "HERD-004": [
    { label: "Cattle Acquisition", amountUsd: 48_000, category: "cost" },
    { label: "Operating Costs", amountUsd: 96_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 198_000, category: "revenue" },
  ],
  "HERD-005": [
    { label: "Cattle Acquisition", amountUsd: 112_000, category: "cost" },
    { label: "Operating Costs", amountUsd: 198_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 420_000, category: "revenue" },
  ],
  "HERD-006": [
    { label: "Cattle Acquisition", amountUsd: 72_000, category: "cost" },
    { label: "Operating Costs", amountUsd: 146_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 292_000, category: "revenue" },
  ],
  "HERD-007": [
    { label: "Cattle Acquisition", amountUsd: 46_000, category: "cost" },
    { label: "Operating Costs", amountUsd: 70_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 158_000, category: "revenue" },
  ],
  "HERD-008": [
    { label: "Cattle Acquisition", amountUsd: 135_000, category: "cost" },
    { label: "Operating Costs", amountUsd: 230_000, category: "cost" },
    { label: "Expected Revenue", amountUsd: 495_000, category: "revenue" },
  ],
};

// ── Documents (per herd) ──────────────────────────────────────────────────────

const HERD_DOCUMENTS: Document[] = [
  { title: "Certificate of Origin", type: "certificate", url: "#" },
  { title: "Health Inspection Report", type: "inspection", url: "#" },
  { title: "Ownership Transfer Record", type: "transfer", url: "#" },
  { title: "USDA Grade Certificate", type: "grade", url: "#" },
  { title: "Livestock Insurance Policy", type: "insurance", url: "#" },
];

export function getPoolDocuments(pool: Pool): Document[] {
  const count = 3 + (parseInt(pool.herdId.replace(/\D/g, "")) % 3);
  return HERD_DOCUMENTS.slice(0, Math.min(count, HERD_DOCUMENTS.length));
}

// ── Builders ──────────────────────────────────────────────────────────────────

export function buildPoolBudget(herdId: string): BudgetItem[] {
  return BUDGET_DATA[herdId] ?? BUDGET_DATA["HERD-001"];
}

export function buildPoolHistory(pool: Pool): SeriesPoint[] {
  return generateSeries(30, pool.positionValueUsd * 0.95, pool.positionValueUsd * 0.008);
}

export function buildPortfolioHistory(): SeriesPoint[] {
  const totalBase = POOLS.reduce((s, p) => s + p.positionValueUsd, 0);
  return generateSeries(30, totalBase * 0.97, totalBase * 0.003);
}

export function getRecentEvents(count: number): LifecycleEvent[] {
  return [...LIFECYCLE_EVENTS]
    .sort(
      (a, b) =>
        new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime(),
    )
    .slice(0, count);
}

export function getPoolEvents(herdId: string): LifecycleEvent[] {
  return LIFECYCLE_EVENTS.filter((e) => e.poolId === herdId).sort(
    (a, b) =>
      new Date(a.timestampIso).getTime() - new Date(b.timestampIso).getTime(),
  );
}

export function getPoolCows(herdId: string): Cow[] {
  return COWS.filter((c) => c.herdId === herdId);
}

export function getCowWeights(cowId: string): CowWeight[] {
  return COW_WEIGHTS.filter((w) => w.cowId === cowId).sort(
    (a, b) => new Date(a.weightDate).getTime() - new Date(b.weightDate).getTime()
  );
}

export function getCowEPDs(cowId: string): CowEPD[] {
  return COW_EPDS.filter((e) => e.cowId === cowId);
}

export function getCowHealthRecords(cowId: string): CowHealthRecord[] {
  return COW_HEALTH_RECORDS.filter((h) => h.cowId === cowId).sort(
    (a, b) => new Date(b.administrationDate).getTime() - new Date(a.administrationDate).getTime()
  );
}

export function getCowValuations(cowId: string): CowValuation[] {
  return COW_VALUATIONS.filter((v) => v.cowId === cowId).sort(
    (a, b) => new Date(a.valuationDate).getTime() - new Date(b.valuationDate).getTime()
  );
}
