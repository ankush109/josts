/**
 * @file logger.js
 * @description Structured logger with environment-aware formatting.
 *
 * - Production / NODE_ENV=production → newline-delimited JSON (machine-readable,
 *   works with Datadog, CloudWatch, etc.)
 * - Development (default) → colored, human-readable lines in the terminal
 *
 * Supports child loggers so a per-request context (requestId, userId) can be
 * attached once and carried through every log call for that request:
 *
 *   const reqLogger = logger.child({ requestId: "abc-123", userId: "u1" });
 *   reqLogger.info("Report created", { reportId: "r1" });
 *   // → [INFO] 12:34:56.789 Report created  requestId=abc-123 userId=u1 reportId=r1
 *
 * Env vars:
 *   LOG_LEVEL   — minimum level to emit (debug | info | warn | error). Default: info.
 *   NODE_ENV    — "production" switches to JSON output.
 */

import crypto from "crypto";

// ─── Level ordering ───────────────────────────────────────────────────────────

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info;
const IS_PROD = process.env.NODE_ENV === "production";

// ─── Terminal colors (dev only) ───────────────────────────────────────────────

const C = {
  reset:  "\x1b[0m",
  dim:    "\x1b[2m",
  debug:  "\x1b[36m",   // cyan
  info:   "\x1b[32m",   // green
  warn:   "\x1b[33m",   // yellow
  error:  "\x1b[31m",   // red
  bold:   "\x1b[1m",
};

const LEVEL_COLORS = {
  debug: C.debug,
  info:  C.info,
  warn:  C.warn,
  error: C.error,
};

// ─── Serialisers ─────────────────────────────────────────────────────────────

/**
 * Converts an Error to a plain object so it serialises cleanly.
 * @param {Error} err
 */
function serializeError(err) {
  return {
    name:    err.name,
    message: err.message,
    stack:   err.stack,
    ...(err.code     !== undefined && { code:       err.code }),
    ...(err.statusCode !== undefined && { statusCode: err.statusCode }),
  };
}

/**
 * Flattens a metadata object into "key=value key2=value2" pairs for dev output.
 * @param {object} obj
 * @param {string} [prefix]
 * @returns {string}
 */
function flattenMeta(obj, prefix = "") {
  if (!obj || typeof obj !== "object") return "";
  return Object.entries(obj)
    .map(([k, v]) => {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === "object" && !(v instanceof Error)) {
        return flattenMeta(v, key);
      }
      return `${C.dim}${key}${C.reset}=${C.bold}${v}${C.reset}`;
    })
    .join("  ");
}

// ─── Core emit ────────────────────────────────────────────────────────────────

/**
 * Emits a single log entry.
 *
 * @param {"debug"|"info"|"warn"|"error"} level
 * @param {string} message
 * @param {object|Error|undefined} meta
 * @param {object} context - Persistent fields from a child logger.
 */
function emit(level, message, meta, context = {}) {
  if (LEVELS[level] < MIN_LEVEL) return;

  // Normalise meta — treat Error objects specially
  const metaObj =
    meta instanceof Error
      ? { error: serializeError(meta) }
      : meta && typeof meta === "object"
      ? meta
      : meta !== undefined
      ? { value: meta }
      : {};

  const fields = { ...context, ...metaObj };

  if (IS_PROD) {
    // ── JSON output ──────────────────────────────────────────────────────────
    const entry = {
      ts:      new Date().toISOString(),
      level,
      message,
      ...fields,
    };
    const line = JSON.stringify(entry);
    if (level === "error" || level === "warn") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  } else {
    // ── Pretty output ────────────────────────────────────────────────────────
    const time  = new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
    const color = LEVEL_COLORS[level];
    const tag   = `${color}${level.toUpperCase().padEnd(5)}${C.reset}`;
    const flat  = flattenMeta(fields);
    const line  = `${C.dim}${time}${C.reset}  ${tag}  ${message}${flat ? "  " + flat : ""}`;

    if (level === "error" || level === "warn") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  }
}

// ─── Logger factory ───────────────────────────────────────────────────────────

/**
 * Creates a logger (or child logger) with optional persistent context fields.
 *
 * @param {object} [context={}] - Fields included in every log call on this instance.
 * @returns {Logger}
 */
function createLogger(context = {}) {
  return {
    /** @param {string} msg @param {object} [meta] */
    debug: (msg, meta) => emit("debug", msg, meta, context),
    /** @param {string} msg @param {object} [meta] */
    info:  (msg, meta) => emit("info",  msg, meta, context),
    /** @param {string} msg @param {object} [meta] */
    warn:  (msg, meta) => emit("warn",  msg, meta, context),
    /** @param {string} msg @param {Error|object} [meta] */
    error: (msg, meta) => emit("error", msg, meta, context),

    /**
     * Returns a new logger that merges `fields` into every log line.
     * Use this to attach request-scoped context (requestId, userId, etc.).
     *
     * @param {object} fields
     * @returns {Logger}
     *
     * @example
     * const reqLog = logger.child({ requestId: req.id, userId: req.user?.userId });
     * reqLog.info("Calibration report created", { reportId });
     */
    child: (fields) => createLogger({ ...context, ...fields }),
  };
}

const logger = createLogger();
export default logger;
