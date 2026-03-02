import pool from "../db.js";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return UUID_V4_REGEX.test(value);
}

const STAGES = [
  "RANCH",
  "AUCTION",
  "BACKGROUNDING",
  "FEEDLOT",
  "PROCESSING",
  "DISTRIBUTION",
];
// map herd status to a current stage
function getDominantStageFromPurchaseStatus(purchaseStatus) {
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
// we don't have a lifecycle table yet so for now I'm just putting htis here to generate herd metadata
// generate a lifecycle events object by getting the current stage, all stages up to that point,
// spreading timestamps, attatch notes, and return the object like it is formatted in the frontend
function buildLifecycleEvents(herdRow) {
  // create a lifecycle timeline from one herd - keep note of a herds supply chain journey
  const dominantStage = getDominantStageFromPurchaseStatus(herdRow.purchase_status);
  const dominantIndex = STAGES.indexOf(dominantStage);
  const baseTime = new Date(herdRow.created_at || Date.now()).getTime();
  const updateTime = new Date(herdRow.last_updated || Date.now()).getTime();
  const span = Math.max(updateTime - baseTime, 5 * 24 * 60 * 60 * 1000);

  const stageNotes = {
    RANCH: `${herdRow.head_count ?? 0} head enrolled at ranch and tagged.`,
    AUCTION: "Lot entered auction market and sale verified.",
    BACKGROUNDING: "Backgrounding phase started for growth and conditioning.",
    FEEDLOT: "Feedlot finishing phase started.",
    PROCESSING: "Processing began at certified facility.",
    DISTRIBUTION: "Distribution and logistics stage initiated.",
  };

  return STAGES.filter((_, idx) => idx <= dominantIndex).map((stage, idx) => {
    const stepTime = new Date(
      baseTime + Math.floor((span * idx) / Math.max(dominantIndex, 1)),
    ).toISOString();
    // return a json form with data from the events array
    return {
      id: `${herdRow.herd_id}-ev-${idx + 1}`,
      poolId: herdRow.pool_id ?? herdRow.herd_id,
      stage,
      verified: Boolean(herdRow.verified_flag),
      timestampIso: stepTime,
      note: stageNotes[stage],
    };
  });
}

function buildStageBreakdown(herdRow) {
  const dominantStage = getDominantStageFromPurchaseStatus(herdRow.purchase_status);
  return STAGES.map((stage) => ({
    stage,
    pct: stage === dominantStage ? 100 : 0,
  }));
}

function buildBudgetBreakdown(herdRow) {
  const listingPrice = Number(herdRow.listing_price ?? 0);
  const acquisition = Math.round(listingPrice * 0.4);
  const operations = Math.max(listingPrice - acquisition, 0);
  const expectedRevenue = Math.round(listingPrice * 1.38);

  return [
    { label: "Cattle Acquisition", amountUsd: acquisition, category: "cost" },
    { label: "Operating Costs", amountUsd: operations, category: "cost" },
    { label: "Expected Revenue", amountUsd: expectedRevenue, category: "revenue" },
  ];
}

function buildPoolDocuments(poolRow) {
  return [
    {
      title: `${poolRow.herd_name ?? "Herd"} Certificate of Origin`,
      type: "certificate",
      url: "#",
    },
    {
      title: "Health Inspection Report",
      type: "inspection",
      url: "#",
    },
    {
      title: "Ownership Transfer Record",
      type: "transfer",
      url: "#",
    },
  ];
}

async function findPoolOrHerd(poolId) {
  const result = await pool.query(
    `
    SELECT
      h.herd_id,
      h.herd_name,
      h.head_count,
      h.purchase_status,
      h.verified_flag,
      h.listing_price,
      h.created_at,
      h.last_updated,
      tp.pool_id,
      tp.total_supply,
      tp.contract_address
    FROM herds h
    LEFT JOIN token_pools tp ON tp.herd_id = h.herd_id
    WHERE tp.pool_id = $1 OR h.herd_id = $1
    LIMIT 1
    `,
    [poolId],
  );

  return result.rows[0] ?? null;
}

export async function getPools(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        h.*,
        tp.pool_id,
        tp.total_supply,
        tp.contract_address
      FROM herds h
      LEFT JOIN token_pools tp ON tp.herd_id = h.herd_id
      ORDER BY h.created_at DESC
    `);

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Failed to fetch pools:", error);
    return res.status(500).json({ error: "Failed to fetch pools" });
  }
}
// get pool by id
export async function getPoolById(req, res) {
  const { poolId } = req.params;

  if (!isUuid(poolId)) {
    return res.status(400).json({ error: "Invalid poolId format" });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        h.*,
        tp.pool_id,
        tp.total_supply,
        tp.contract_address
      FROM herds h
      LEFT JOIN token_pools tp ON tp.herd_id = h.herd_id
      WHERE tp.pool_id = $1 OR h.herd_id = $1
      LIMIT 1
    `,
      [poolId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Pool not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Failed to fetch pool by id:", error);
    return res.status(500).json({ error: "Failed to fetch pool" });
  }
}

// get cows from pool id
export async function getPoolCows(req, res) {
  const { poolId } = req.params;

  if (!isUuid(poolId)) {
    return res.status(400).json({ error: "Invalid poolId format" });
  }

  try {
    const poolExists = await pool.query(
      `
      SELECT 1
      FROM herds h
      LEFT JOIN token_pools tp ON tp.herd_id = h.herd_id
      WHERE tp.pool_id = $1 OR h.herd_id = $1
      LIMIT 1
      `,
      [poolId],
    );

    if (poolExists.rows.length === 0) {
      return res.status(404).json({ error: "Pool not found" });
    }

    const result = await pool.query(
      `
      SELECT
        a.animal_id AS cow_id,
        a.herd_id,
        a.registration_number,
        a.official_id,
        a.animal_name,
        a.breed_code,
        a.sex_code,
        a.birth_date,
        a.sire_registration_number,
        a.dam_registration_number,
        a.is_genomic_enhanced,
        a.created_at,
        lw.weight_lbs AS latest_weight_lbs,
        lw.weight_date AS latest_weight_date,
        lv.total_value AS latest_total_value,
        lv.valuation_date AS latest_valuation_date,
        COALESCE(ch.verified_flag, false) AS verified_flag
      FROM animals a
      INNER JOIN herds h ON h.herd_id = a.herd_id
      LEFT JOIN token_pools tp ON tp.herd_id = h.herd_id
      LEFT JOIN LATERAL (
        SELECT aw.weight_lbs, aw.weight_date
        FROM animal_weights aw
        WHERE aw.animal_id = a.animal_id
        ORDER BY aw.weight_date DESC, aw.weight_id DESC
        LIMIT 1
      ) lw ON true
      LEFT JOIN LATERAL (
        SELECT cv.total_value, cv.valuation_date
        FROM cow_valuation cv
        WHERE cv.cow_id = a.animal_id
        ORDER BY cv.valuation_date DESC, cv.valuation_id DESC
        LIMIT 1
      ) lv ON true
      LEFT JOIN LATERAL (
        SELECT c.verified_flag
        FROM cow_health c
        WHERE c.cow_id = a.animal_id
        ORDER BY c.created_at DESC, c.health_record_id DESC
        LIMIT 1
      ) ch ON true
      WHERE tp.pool_id = $1 OR h.herd_id = $1
      ORDER BY a.created_at DESC
      `,
      [poolId],
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Failed to fetch pool cows:", error);
    return res.status(500).json({ error: "Failed to fetch pool cows" });
  }
}

export async function getPoolLifecycleEvents(req, res) {
  const { poolId } = req.params;

  if (!isUuid(poolId)) {
    return res.status(400).json({ error: "Invalid poolId format" });
  }

  try {
    const poolRecord = await findPoolOrHerd(poolId);

    if (!poolRecord) {
      return res.status(404).json({ error: "Pool not found" });
    }

    const lifecycleEvents = buildLifecycleEvents(poolRecord);
    return res.status(200).json(lifecycleEvents);
  } catch (error) {
    console.error("Failed to fetch pool lifecycle events:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch pool lifecycle events" });
  }
}

export async function getPoolStageBreakdown(req, res) {
  const { poolId } = req.params;

  if (!isUuid(poolId)) {
    return res.status(400).json({ error: "Invalid poolId format" });
  }

  try {
    const poolRecord = await findPoolOrHerd(poolId);
    if (!poolRecord) {
      return res.status(404).json({ error: "Pool not found" });
    }

    return res.status(200).json(buildStageBreakdown(poolRecord));
  } catch (error) {
    console.error("Failed to fetch pool stage breakdown:", error);
    return res.status(500).json({ error: "Failed to fetch pool stage breakdown" });
  }
}

export async function getPoolBudgetBreakdown(req, res) {
  const { poolId } = req.params;

  if (!isUuid(poolId)) {
    return res.status(400).json({ error: "Invalid poolId format" });
  }

  try {
    const poolRecord = await findPoolOrHerd(poolId);
    if (!poolRecord) {
      return res.status(404).json({ error: "Pool not found" });
    }

    return res.status(200).json(buildBudgetBreakdown(poolRecord));
  } catch (error) {
    console.error("Failed to fetch pool budget breakdown:", error);
    return res.status(500).json({ error: "Failed to fetch pool budget breakdown" });
  }
}

export async function getPoolDocuments(req, res) {
  const { poolId } = req.params;

  if (!isUuid(poolId)) {
    return res.status(400).json({ error: "Invalid poolId format" });
  }

  try {
    const poolRecord = await findPoolOrHerd(poolId);
    if (!poolRecord) {
      return res.status(404).json({ error: "Pool not found" });
    }

    return res.status(200).json(buildPoolDocuments(poolRecord));
  } catch (error) {
    console.error("Failed to fetch pool documents:", error);
    return res.status(500).json({ error: "Failed to fetch pool documents" });
  }
}

export async function getPoolOwnership(req, res) {
  const { poolId } = req.params;

  if (!isUuid(poolId)) {
    return res.status(400).json({ error: "Invalid poolId format" });
  }

  try {
    const poolRecord = await findPoolOrHerd(poolId);
    if (!poolRecord) {
      return res.status(404).json({ error: "Pool not found" });
    }

    if (!poolRecord.pool_id) {
      return res.status(200).json([]);
    }

    const result = await pool.query(
      `
      SELECT
        o.ownership_id,
        o.user_id,
        u.email,
        u.wallet_address,
        o.token_amount,
        o.acquired_at
      FROM ownership o
      INNER JOIN users u ON u.user_id = o.user_id
      WHERE o.pool_id = $1
      ORDER BY o.token_amount DESC, o.acquired_at DESC
      `,
      [poolRecord.pool_id],
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Failed to fetch pool ownership:", error);
    return res.status(500).json({ error: "Failed to fetch pool ownership" });
  }
}

export async function getPoolTransactions(req, res) {
  const { poolId } = req.params;

  if (!isUuid(poolId)) {
    return res.status(400).json({ error: "Invalid poolId format" });
  }

  try {
    const poolRecord = await findPoolOrHerd(poolId);
    if (!poolRecord) {
      return res.status(404).json({ error: "Pool not found" });
    }

    if (!poolRecord.pool_id) {
      return res.status(200).json([]);
    }

    const result = await pool.query(
      `
      SELECT
        t.transaction_id,
        t.user_id,
        u.email,
        t.type,
        t.amount,
        t.status,
        t.blockchain_tx_hash,
        t.created_at
      FROM transactions t
      INNER JOIN users u ON u.user_id = t.user_id
      WHERE t.pool_id = $1
      ORDER BY t.created_at DESC
      `,
      [poolRecord.pool_id],
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Failed to fetch pool transactions:", error);
    return res.status(500).json({ error: "Failed to fetch pool transactions" });
  }
}
