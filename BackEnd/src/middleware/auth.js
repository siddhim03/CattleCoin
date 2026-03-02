import { verifyAuthToken } from "../lib/auth.js";

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token.trim();
}

export function requireAuth(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.auth = {
    userId: payload.sub,
    role: payload.role,
    email: payload.email,
  };
  return next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth?.role) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json({ error: "Forbidden for this role" });
    }

    return next();
  };
}
