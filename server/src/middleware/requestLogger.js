/**
 * @file requestLogger.js
 * @description HTTP request/response logging middleware.
 *
 * Attaches a unique `requestId` (UUID) to every incoming request so all
 * log lines for a single request can be correlated in production.
 *
 * What gets logged:
 *   → incoming  method, path, IP, user-agent
 *   ← outgoing  status, duration (ms), content-length, userId (if authenticated)
 *
 * Extra behaviours:
 *   - Slow requests (> SLOW_REQ_MS) are logged at WARN level
 *   - 4xx responses are logged at WARN, 5xx at ERROR, everything else at INFO
 *   - /health endpoint is skipped (too noisy for load-balancer probes)
 *   - `req.log` is set to a child logger carrying { requestId } so any
 *     downstream service/controller can call `req.log.info(...)` and the
 *     line will automatically include the request ID
 *
 * Usage in a controller:
 *   req.log.info("Report created", { reportId: report._id });
 */

import crypto from "crypto";
import logger  from "../lib/logger.js";

/** Requests taking longer than this are flagged as slow. */
const SLOW_REQ_MS = 1000;

/**
 * Extracts the real client IP, respecting common reverse-proxy headers.
 * @param {import("express").Request} req
 * @returns {string}
 */
function getClientIp(req) {
  return (
    (req.headers["x-forwarded-for"] ?? "").split(",")[0].trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

/**
 * Express middleware: assigns a request ID, creates a child logger on `req`,
 * and logs HTTP in/out with timing and status.
 *
 * @type {import("express").RequestHandler}
 */
export function requestLogger(req, res, next) {
  // Skip health-check noise
  if (req.path === "/health") return next();

  const requestId = crypto.randomUUID();
  const startAt   = process.hrtime.bigint();

  // Expose on req so downstream handlers can use it
  req.id  = requestId;
  req.log = logger.child({ requestId });

  // Surface the request ID in the response for client-side correlation
  res.setHeader("X-Request-Id", requestId);

  // Log the incoming request
  req.log.debug("→ incoming request", {
    method:    req.method,
    path:      req.originalUrl,
    ip:        getClientIp(req),
    userAgent: req.headers["user-agent"] ?? "unknown",
  });

  // Log the outgoing response once it finishes
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startAt) / 1e6;
    const status     = res.statusCode;
    const userId     = req.user?.userId ?? null;
    const bytes      = res.getHeader("content-length") ?? "-";

    const meta = {
      method:     req.method,
      path:       req.originalUrl,
      status,
      duration:   `${durationMs.toFixed(1)}ms`,
      bytes,
      ip:         getClientIp(req),
      ...(userId && { userId }),
      ...(durationMs > SLOW_REQ_MS && { slow: true }),
    };

    if (status >= 500) {
      req.log.error("← response", meta);
    } else if (status >= 400 || durationMs > SLOW_REQ_MS) {
      req.log.warn("← response", meta);
    } else {
      req.log.info("← response", meta);
    }
  });

  next();
}
