import pool from "../db.js";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STAGES = [
  "RANCH",
  "AUCTION",
  "BACKGROUNDING",
  "FEEDLOT",
  "PROCESSING",
  "DISTRIBUTION",
];

function isUuid(value) {
  return UUID_V4_REGEX.test(value);
}

function toDominantStage(purchaseStatus) {
  switch ((purchaseStatus || "").toLowerCase()) {
    case "available":
      return "RANCH";
    case "pending":
      return "PROCESSING";
    case "sold":
      return "DISTRIBUTION";
    default:
      return "FEEDLOT";
  }
}

function toStageBreakdown(dominantStage) {
  return STAGES.map((stage) => ({
    stage,
    pct: stage === dominantStage ? 100 : 0,
  }));
}

function toSeason(isoDate) {
  const month = new Date(isoDate).getUTCMonth() + 1;
  return month >= 3 && month <= 8 ? "Spring" : "Fall";
}

function toGeneticsLabel(breedCode) {
  if (!breedCode) return "Mixed";
  return `${breedCode} Select`;
}

function toPoolDto(row) {
  const listingPrice = Number(row.listing_price ?? 0);
  const dominantStage = toDominantStage(row.purchase_status);
  const expectedRevenueUsd = Math.round(listingPrice * 1.18);
  const netExpectedUsd = expectedRevenueUsd - listingPrice;

  return {
    id: row.herd_id,
    herdId: row.herd_id,
    rancherId: row.rancher_id,
    listingPrice,
    purchaseStatus: (row.purchase_status || "available").toLowerCase(),
    poolId: row.pool_id ?? row.herd_id,
    totalSupply: Number(row.total_supply ?? 0),
    contractAddress: row.contract_address ?? "",
    tokenAmount: Number(row.token_amount ?? 0),
    name: row.herd_name ?? `Herd ${row.herd_id.slice(0, 8)}`,
    poolType: "herd",
    cohortLabel: `${toSeason(row.created_at)} ${new Date(row.created_at).getUTCFullYear()}`,
    geneticsLabel: toGeneticsLabel(row.breed_code),
    season: toSeason(row.created_at),
    positionValueUsd: listingPrice,
    backingHerdCount: Number(row.backing_herd_count ?? 0),
    expectedRevenueUsd,
    netExpectedUsd,
    stageBreakdown: toStageBreakdown(dominantStage),
    dominantStage,
    verified: Boolean(row.verified_flag),
    lastUpdateIso: new Date(row.last_updated ?? row.created_at).toISOString(),
  };
}

function buildPortfolioHistory30d(portfolioValueUsd) {
  const points = [];
  const now = new Date();
  const startValue = Math.round(portfolioValueUsd * 0.96);
  const days = 30;

  for (let i = days; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setUTCDate(now.getUTCDate() - i);
    const progress = (days - i) / days;
    const trend = startValue + (portfolioValueUsd - startValue) * progress;
    const wiggle = Math.sin(progress * Math.PI * 3) * portfolioValueUsd * 0.002;
    points.push({
      dateIso: d.toISOString(),
      value: Math.max(0, Math.round(trend + wiggle)),
    });
  }

  return points;
}

function buildLifecycleEventsFromPool(poolDto) {
  const dominantIndex = STAGES.indexOf(poolDto.dominantStage);
  const created = new Date(poolDto.lastUpdateIso);
  created.setUTCDate(created.getUTCDate() - Math.max(dominantIndex + 1, 2) * 12);
  const startMs = created.getTime();
  const endMs = new Date(poolDto.lastUpdateIso).getTime();
  const span = Math.max(endMs - startMs, 3 * 24 * 60 * 60 * 1000);

  const stageNotes = {
    RANCH: `${poolDto.backingHerdCount} head enrolled and tagged.`,
    AUCTION: "Lot entered auction cycle.",
    BACKGROUNDING: "Backgrounding phase started.",
    FEEDLOT: "Feedlot finishing stage in progress.",
    PROCESSING: "Processing initiated at certified plant.",
    DISTRIBUTION: "Distribution logistics started.",
  };

  return STAGES.filter((_, idx) => idx <= dominantIndex).map((stage, idx) => ({
    id: `${poolDto.poolId}-ev-${idx + 1}`,
    poolId: poolDto.poolId,
    stage,
    verified: poolDto.verified,
    timestampIso: new Date(
      startMs + Math.floor((span * idx) / Math.max(dominantIndex, 1)),
    ).toISOString(),
    note: stageNotes[stage],
  }));
}

async function fetchPortfolioPools(userId) {
  const userIdParam = userId ?? null;
  const result = await pool.query(
    `
    SELECT
      h.herd_id,
      h.rancher_id,
      h.listing_price,
      h.purchase_status,
      h.herd_name,
      h.head_count,
      h.verified_flag,
      h.last_updated,
      h.created_at,
      tp.pool_id,
      tp.total_supply,
      tp.contract_address,
      COALESCE(own.token_amount, 0) AS token_amount,
      COALESCE(a_stats.backing_herd_count, h.head_count, 0) AS backing_herd_count,
      breed.breed_code
    FROM herds h
    LEFT JOIN token_pools tp ON tp.herd_id = h.herd_id
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(o.token_amount), 0) AS token_amount
      FROM ownership o
      WHERE o.pool_id = tp.pool_id
        AND ($1::uuid IS NULL OR o.user_id = $1::uuid)
    ) own ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS backing_herd_count
      FROM animals a_count
      WHERE a_count.herd_id = h.herd_id
    ) a_stats ON true
    LEFT JOIN LATERAL (
      SELECT a_breed.breed_code
      FROM animals a_breed
      WHERE a_breed.herd_id = h.herd_id
        AND a_breed.breed_code IS NOT NULL
      GROUP BY a_breed.breed_code
      ORDER BY COUNT(*) DESC, a_breed.breed_code ASC
      LIMIT 1
    ) breed ON true
    ORDER BY h.created_at DESC
    `,
    [userIdParam],
  );

  return result.rows.map(toPoolDto);
}

function parseLimit(rawLimit, fallback) {
  const parsed = Number.parseInt(rawLimit, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 100);
}

export async function getPortfolio(req, res) {
  const { userId } = req.query;

  if (userId && !isUuid(userId)) {
    return res.status(400).json({ error: "Invalid userId format" });
  }

  try {
    const pools = await fetchPortfolioPools(userId);
    const portfolioValueUsd = pools.reduce((sum, p) => sum + p.positionValueUsd, 0);
    const history30d = buildPortfolioHistory30d(portfolioValueUsd);
    const first = history30d[0]?.value ?? portfolioValueUsd;
    const last = history30d[history30d.length - 1]?.value ?? portfolioValueUsd;
    const change30dPct = first === 0 ? 0 : Number((((last - first) / first) * 100).toFixed(1));
    const avgRisk =
      pools.length === 0
        ? 0
        : Math.round(
            pools.reduce((sum, p) => sum + (p.netExpectedUsd / Math.max(p.listingPrice, 1)) * 100, 0) /
              pools.length,
          );
    const topPools = [...pools]
      .sort((a, b) => b.positionValueUsd - a.positionValueUsd)
      .slice(0, 5);
    const recentEvents = pools
      .flatMap((p) => buildLifecycleEventsFromPool(p))
      .sort((a, b) => new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime())
      .slice(0, 8);

    return res.status(200).json({
      asOfIso: new Date().toISOString(),
      portfolioValueUsd,
      change30dPct,
      poolsHeld: pools.length,
      avgRisk,
      history30d,
      recentEvents,
      topPools,
    });
  } catch (error) {
    console.error("Failed to fetch portfolio summary:", error);
    return res.status(500).json({ error: "Failed to fetch portfolio summary" });
  }
}

export async function getPortfolioTopPools(req, res) {
  const { userId, limit } = req.query;

  if (userId && !isUuid(userId)) {
    return res.status(400).json({ error: "Invalid userId format" });
  }

  try {
    const pools = await fetchPortfolioPools(userId);
    const resultLimit = parseLimit(limit, 5);
    const topPools = pools
      .sort((a, b) => b.positionValueUsd - a.positionValueUsd)
      .slice(0, resultLimit);

    return res.status(200).json(topPools);
  } catch (error) {
    console.error("Failed to fetch portfolio top pools:", error);
    return res.status(500).json({ error: "Failed to fetch portfolio top pools" });
  }
}

export async function getPortfolioRecentEvents(req, res) {
  const { userId, limit } = req.query;

  if (userId && !isUuid(userId)) {
    return res.status(400).json({ error: "Invalid userId format" });
  }

  try {
    const pools = await fetchPortfolioPools(userId);
    const resultLimit = parseLimit(limit, 8);
    const events = pools
      .flatMap((p) => buildLifecycleEventsFromPool(p))
      .sort((a, b) => new Date(b.timestampIso).getTime() - new Date(a.timestampIso).getTime())
      .slice(0, resultLimit);

    return res.status(200).json(events);
  } catch (error) {
    console.error("Failed to fetch portfolio recent events:", error);
    return res.status(500).json({ error: "Failed to fetch portfolio recent events" });
  }
}
