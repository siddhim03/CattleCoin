import pool from "../db.js";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value) {
  return UUID_V4_REGEX.test(value);
}

export async function getUserOwnership(req, res) {
  const { userId } = req.params;

  if (!isUuid(userId)) {
    return res.status(400).json({ error: "Invalid userId format" });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        o.ownership_id,
        o.user_id,
        o.pool_id,
        o.token_amount,
        o.acquired_at,
        h.herd_id,
        h.herd_name,
        h.purchase_status
      FROM ownership o
      LEFT JOIN token_pools tp ON tp.pool_id = o.pool_id
      LEFT JOIN herds h ON h.herd_id = tp.herd_id
      WHERE o.user_id = $1
      ORDER BY o.acquired_at DESC
      `,
      [userId],
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Failed to fetch user ownership:", error);
    return res.status(500).json({ error: "Failed to fetch user ownership" });
  }
}

export async function getUserTransactions(req, res) {
  const { userId } = req.params;

  if (!isUuid(userId)) {
    return res.status(400).json({ error: "Invalid userId format" });
  }

  try {
    const result = await pool.query(
      `
      SELECT
        t.transaction_id,
        t.user_id,
        t.pool_id,
        t.type,
        t.amount,
        t.status,
        t.blockchain_tx_hash,
        t.created_at,
        h.herd_id,
        h.herd_name
      FROM transactions t
      LEFT JOIN token_pools tp ON tp.pool_id = t.pool_id
      LEFT JOIN herds h ON h.herd_id = tp.herd_id
      WHERE t.user_id = $1
      ORDER BY t.created_at DESC
      `,
      [userId],
    );

    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Failed to fetch user transactions:", error);
    return res.status(500).json({ error: "Failed to fetch user transactions" });
  }
}
