/**
 * @file jwt.js
 * @description Thin wrappers around jsonwebtoken for signing and verifying
 * access tokens. All token configuration lives here — change expiry or
 * algorithm in one place without touching auth logic.
 */

import jwt from "jsonwebtoken";

/** Token lifetime. Change to e.g. "1d" for shorter-lived tokens. */
const EXPIRES_IN = "7d";

/**
 * Signs a JWT access token with the application secret.
 *
 * @param {{ userId: string, userRole: string }} payload - Claims to embed.
 * @returns {string} Signed JWT string.
 */
export function signToken(payload) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: EXPIRES_IN });
}

/**
 * Verifies a JWT and returns its decoded payload.
 * Throws a `JsonWebTokenError` or `TokenExpiredError` if invalid.
 *
 * @param {string} token - Raw JWT string (without "Bearer " prefix).
 * @returns {{ userId: string, userRole: string, iat: number, exp: number }}
 */
export function verifyToken(token) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return jwt.verify(token, process.env.JWT_SECRET);
}
