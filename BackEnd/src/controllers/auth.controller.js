import pool from "../db.js";
import {
  getDefaultRouteForRole,
  hashPassword,
  issueAuthToken,
  verifyPassword,
} from "../lib/auth.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGISTERABLE_ROLES = new Set(["investor", "rancher"]);

function sanitizeUser(userRow) {
  return {
    userId: userRow.user_id,
    role: userRow.role,
    email: userRow.email,
    walletAddress: userRow.wallet_address,
    createdAt: userRow.created_at,
  };
}

export async function register(req, res) {
  const { email, password, role, walletAddress } = req.body || {};

  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: "Valid email is required" });
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  if (!role || !REGISTERABLE_ROLES.has(role)) {
    return res.status(400).json({ error: "Role must be investor or rancher" });
  }

  try {
    const existing = await pool.query(
      "SELECT user_id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
      [email],
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await hashPassword(password);
    const inserted = await pool.query(
      `
      INSERT INTO users (role, email, password_hash, wallet_address)
      VALUES ($1::user_role, $2, $3, $4)
      RETURNING user_id, role, email, wallet_address, created_at
      `,
      [role, email.toLowerCase(), passwordHash, walletAddress ?? null],
    );

    const user = sanitizeUser(inserted.rows[0]);
    const token = issueAuthToken({
      userId: user.userId,
      role: user.role,
      email: user.email,
    });

    return res.status(201).json({
      token,
      user,
      defaultRoute: getDefaultRouteForRole(user.role),
    });
  } catch (error) {
    console.error("Failed to register user:", error);
    return res.status(500).json({ error: "Failed to register user" });
  }
}

export async function login(req, res) {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const userResult = await pool.query(
      `
      SELECT user_id, role, email, wallet_address, created_at, password_hash
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [email],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const userRow = userResult.rows[0];
    const passwordOk = await verifyPassword(password, userRow.password_hash);
    if (!passwordOk) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = sanitizeUser(userRow);
    const token = issueAuthToken({
      userId: user.userId,
      role: user.role,
      email: user.email,
    });

    return res.status(200).json({
      token,
      user,
      defaultRoute: getDefaultRouteForRole(user.role),
    });
  } catch (error) {
    console.error("Failed to login user:", error);
    return res.status(500).json({ error: "Failed to login user" });
  }
}

export async function me(req, res) {
  try {
    const userResult = await pool.query(
      `
      SELECT user_id, role, email, wallet_address, created_at
      FROM users
      WHERE user_id = $1
      LIMIT 1
      `,
      [req.auth.userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = sanitizeUser(userResult.rows[0]);
    return res.status(200).json({
      user,
      defaultRoute: getDefaultRouteForRole(user.role),
    });
  } catch (error) {
    console.error("Failed to fetch current user:", error);
    return res.status(500).json({ error: "Failed to fetch current user" });
  }
}

export async function investorPortal(req, res) {
  return res.status(200).json({
    ok: true,
    role: req.auth.role,
    portal: "investor",
    route: "/investor/dashboard",
  });
}

export async function rancherPortal(req, res) {
  return res.status(200).json({
    ok: true,
    role: req.auth.role,
    portal: "rancher",
    route: "/rancher",
  });
}
