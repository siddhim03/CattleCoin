import pool from "../db.js";

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ALLOWED_PURCHASE_STATUSES = new Set(["available", "pending", "sold"]);

function isUuid(value) {
  return UUID_V4_REGEX.test(value);
}

export async function patchHerd(req, res) {
  const { herdId } = req.params;
  const { listingPrice, purchaseStatus, verifiedFlag, herdName, headCount } = req.body || {};

  if (!isUuid(herdId)) {
    return res.status(400).json({ error: "Invalid herdId format" });
  }

  const updates = [];
  const values = [];

  if (listingPrice !== undefined) {
    const parsed = Number(listingPrice);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return res.status(400).json({ error: "listingPrice must be a non-negative number" });
    }
    updates.push(`listing_price = $${values.length + 1}`);
    values.push(parsed);
  }

  if (purchaseStatus !== undefined) {
    const normalized = String(purchaseStatus).toLowerCase();
    if (!ALLOWED_PURCHASE_STATUSES.has(normalized)) {
      return res
        .status(400)
        .json({ error: "purchaseStatus must be one of: available, pending, sold" });
    }
    updates.push(`purchase_status = $${values.length + 1}`);
    values.push(normalized);
  }

  if (verifiedFlag !== undefined) {
    if (typeof verifiedFlag !== "boolean") {
      return res.status(400).json({ error: "verifiedFlag must be boolean" });
    }
    updates.push(`verified_flag = $${values.length + 1}`);
    values.push(verifiedFlag);
  }

  if (herdName !== undefined) {
    if (typeof herdName !== "string" || herdName.trim().length === 0) {
      return res.status(400).json({ error: "herdName must be a non-empty string" });
    }
    updates.push(`herd_name = $${values.length + 1}`);
    values.push(herdName.trim());
  }

  if (headCount !== undefined) {
    const parsed = Number.parseInt(headCount, 10);
    if (Number.isNaN(parsed) || parsed < 20) {
      return res.status(400).json({ error: "headCount must be an integer >= 20" });
    }
    updates.push(`head_count = $${values.length + 1}`);
    values.push(parsed);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No updatable fields provided" });
  }

  updates.push("last_updated = CURRENT_TIMESTAMP");
  values.push(herdId);

  try {
    const result = await pool.query(
      `
      UPDATE herds
      SET ${updates.join(", ")}
      WHERE herd_id = $${values.length}
      RETURNING *
      `,
      values,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Herd not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Failed to patch herd:", error);
    return res.status(500).json({ error: "Failed to patch herd" });
  }
}
