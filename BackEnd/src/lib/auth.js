import crypto from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(crypto.scrypt);

const AUTH_SECRET = process.env.AUTH_SECRET || "dev_auth_secret_change_me";
const TOKEN_TTL_SECONDS = Number(process.env.AUTH_TOKEN_TTL_SECONDS || 60 * 60 * 12);

const PASSWORD_HASH_PREFIX = "scrypt";
const SCRYPT_KEYLEN = 64;

function base64UrlEncode(value) {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function signTokenPayload(payloadB64) {
  return base64UrlEncode(
    crypto.createHmac("sha256", AUTH_SECRET).update(payloadB64).digest(),
  );
}

export async function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scryptAsync(plainPassword, salt, SCRYPT_KEYLEN);
  return `${PASSWORD_HASH_PREFIX}$${salt}$${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(plainPassword, storedHash) {
  if (!storedHash || typeof storedHash !== "string") return false;

  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== PASSWORD_HASH_PREFIX) {
    return false;
  }

  const [, salt, expectedHex] = parts;
  const expectedBuffer = Buffer.from(expectedHex, "hex");
  const derived = await scryptAsync(plainPassword, salt, expectedBuffer.length);
  const derivedBuffer = Buffer.from(derived);

  if (derivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(derivedBuffer, expectedBuffer);
}

export function issueAuthToken({ userId, role, email }) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    role,
    email,
    iat: nowSeconds,
    exp: nowSeconds + TOKEN_TTL_SECONDS,
  };

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signTokenPayload(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifyAuthToken(token) {
  if (!token || typeof token !== "string") return null;

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expectedSig = signTokenPayload(payloadB64);
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf8"));
  } catch {
    return null;
  }

  if (!payload?.sub || !payload?.role || !payload?.exp) return null;
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp <= nowSeconds) return null;

  return payload;
}

export function getDefaultRouteForRole(role) {
  if (role === "rancher") return "/rancher";
  if (role === "investor") return "/investor/dashboard";
  if (role === "admin") return "/admin";
  return "/";
}
