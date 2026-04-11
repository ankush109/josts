/**
 * @file auth.js
 * @description Express middleware for authentication and role-based access control.
 */

import { verifyToken } from "../lib/jwt.js";

/**
 * Validates the Bearer JWT in the Authorization header.
 * On success, attaches `req.user = { userId, userRole }` for downstream handlers.
 * On failure, responds with 401 before reaching the route handler.
 *
 * @type {import("express").RequestHandler}
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.slice(7); // strip "Bearer "

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * Guards a route so only admin users can proceed.
 * Must be chained AFTER `authMiddleware` so `req.user` is populated.
 *
 * @type {import("express").RequestHandler}
 */
export function adminMiddleware(req, res, next) {
  if (req.user?.userRole !== "admin") {
    return res.status(403).json({ message: "Forbidden: admin access required" });
  }
  next();
}
