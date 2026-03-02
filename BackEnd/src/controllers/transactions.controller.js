import pool from "../db.js";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_TYPES = new Set(["buy", "sell", "mint", "redeem"]);
const APPLY_OWNERSHIP_STATUSES = new Set(["completed", "confirmed", "success", "settled"]);

function isUuid(value) {
  return UUID_V4_REGEX.test(value);
}

function normalizeStatus(status) {
  if (!status) return "completed";
  return String(status).trim().toLowerCase();
}

function shouldApplyOwnership(status) {
  return APPLY_OWNERSHIP_STATUSES.has(status);
}

async function resolvePoolId(inputPoolId, client) {
  const result = await client.query(
    `
    SELECT tp.pool_id
    FROM token_pools tp
    LEFT JOIN herds h ON h.herd_id = tp.herd_id
    WHERE tp.pool_id = $1 OR h.herd_id = $1
    LIMIT 1
    `,
    [inputPoolId],
  );

  return result.rows[0]?.pool_id ?? null;
}

export async function createTransaction(req, res) {
  const {
    userId,
    poolId,
    type,
    amount,
    status,
    blockchainTxHash,
  } = req.body || {};

  if (!isUuid(userId)) {
    return res.status(400).json({ error: "Invalid userId format" });
  }
  if (!isUuid(poolId)) {
    return res.status(400).json({ error: "Invalid poolId format" });
  }

  const normalizedType = String(type || "").toLowerCase();
  if (!ALLOWED_TYPES.has(normalizedType)) {
    return res.status(400).json({ error: "type must be one of: buy, sell, mint, redeem" });
  }

  const numericAmount = Number(amount);
  if (!Number.isInteger(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: "amount must be a positive integer" });
  }

  const normalizedStatus = normalizeStatus(status);
  const applyOwnershipUpdate = shouldApplyOwnership(normalizedStatus);
  const tokenDelta = normalizedType === "buy" || normalizedType === "mint"
    ? numericAmount
    : -numericAmount;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `SELECT user_id FROM users WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "User not found" });
    }

    const resolvedPoolId = await resolvePoolId(poolId, client);
    if (!resolvedPoolId) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Pool not found" });
    }

    const insertedTx = await client.query(
      `
      INSERT INTO transactions (
        user_id,
        pool_id,
        type,
        amount,
        status,
        blockchain_tx_hash
      )
      VALUES ($1, $2, $3::transaction_type, $4, $5, $6)
      RETURNING *
      `,
      [
        userId,
        resolvedPoolId,
        normalizedType,
        numericAmount,
        normalizedStatus,
        blockchainTxHash ?? null,
      ],
    );

    let ownershipRow = null;
    if (applyOwnershipUpdate) {
      const ownershipResult = await client.query(
        `
        SELECT ownership_id, token_amount
        FROM ownership
        WHERE user_id = $1 AND pool_id = $2
        LIMIT 1
        FOR UPDATE
        `,
        [userId, resolvedPoolId],
      );

      if (ownershipResult.rows.length === 0) {
        if (tokenDelta < 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Insufficient tokens for transaction" });
        }

        const insertedOwnership = await client.query(
          `
          INSERT INTO ownership (user_id, pool_id, token_amount)
          VALUES ($1, $2, $3)
          RETURNING *
          `,
          [userId, resolvedPoolId, tokenDelta],
        );
        ownershipRow = insertedOwnership.rows[0];
      } else {
        const currentTokens = Number(ownershipResult.rows[0].token_amount);
        const updatedTokens = currentTokens + tokenDelta;

        if (updatedTokens < 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({ error: "Insufficient tokens for transaction" });
        }

        const updatedOwnership = await client.query(
          `
          UPDATE ownership
          SET token_amount = $1
          WHERE ownership_id = $2
          RETURNING *
          `,
          [updatedTokens, ownershipResult.rows[0].ownership_id],
        );
        ownershipRow = updatedOwnership.rows[0];
      }
    }

    await client.query("COMMIT");
    return res.status(201).json({
      transaction: insertedTx.rows[0],
      ownershipUpdated: applyOwnershipUpdate,
      ownership: ownershipRow,
      tokenDelta,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to create transaction:", error);
    return res.status(500).json({ error: "Failed to create transaction" });
  } finally {
    client.release();
  }
}
