/**
 * @file errorHandler.js
 * @description Global Express error-handling middleware.
 *
 * Attach this LAST in server.js (after all routes) so it catches any
 * error passed via `next(err)` or thrown inside async handlers.
 *
 * Uses `req.log` (the per-request child logger set by requestLogger) so
 * every error line automatically carries the `requestId` for correlation.
 */

import logger from "../lib/logger.js";

/**
 * Normalises all unhandled errors into a consistent JSON response.
 *
 * Handles:
 *   - Mongoose duplicate-key errors  (code 11000) → 409
 *   - Mongoose validation errors                   → 400
 *   - JWT errors                                   → 401
 *   - Custom errors with `statusCode`              → that status
 *   - Everything else                              → 500
 *
 * The raw error message is never sent to the client for 500s in production.
 *
 * @type {import("express").ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Use per-request child logger (carries requestId) if available
  const log = req.log ?? logger;

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue ?? {})[0] ?? "field";
    log.warn("Duplicate key error", { field, collection: err.keyValue });
    return res.status(409).json({ message: `Duplicate value for ${field}` });
  }

  // Mongoose validation
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    log.warn("Mongoose validation failed", { errors: messages });
    return res.status(400).json({ message: "Validation failed", errors: messages });
  }

  // JWT
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    log.warn("JWT error", { type: err.name });
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  // Determine status code
  const status = err.status ?? err.statusCode ?? 500;

  if (status >= 500) {
    // Full stack trace for server errors
    log.error(`Unhandled error on ${req.method} ${req.originalUrl}`, err);
  } else {
    // Operational errors (4xx) — just the message, no stack
    log.warn(`Client error on ${req.method} ${req.originalUrl}`, {
      status,
      message: err.message,
    });
  }

  const message =
    process.env.NODE_ENV === "production" && status === 500
      ? "Internal server error"
      : (err.message ?? "Internal server error");

  res.status(status).json({ message });
}
