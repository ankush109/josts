/**
 * Minimal structured logger.
 *
 * Every line is a JSON object so logs can be ingested by any log aggregator
 * (Datadog, CloudWatch, Logtail, etc.) without extra parsing.
 *
 * Usage:
 *   import logger from "./lib/logger.js";
 *   const log = logger("calibration");
 *   log.info("uploaded PDF", { s3Key, reportId });
 *   log.error("job failed", { jobId, err });
 */

/** @typedef {"info"|"warn"|"error"|"debug"} LogLevel */

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? LEVELS.info;

/**
 * Writes one structured log line to stdout (info/debug) or stderr (warn/error).
 *
 * @param {LogLevel} level
 * @param {string}   context - Module / component name shown in every line.
 * @param {string}   message
 * @param {object}   [meta]  - Any extra key-value pairs to include.
 */
function write(level, context, message, meta = {}) {
  if (LEVELS[level] < MIN_LEVEL) return;

  const line = JSON.stringify({
    ts:      new Date().toISOString(),
    level,
    context,
    message,
    ...meta,
  });

  if (level === "error" || level === "warn") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

/**
 * Creates a logger bound to a specific context label.
 *
 * @param {string} context - e.g. `"calibration"`, `"dispatch"`, `"s3"`.
 * @returns {{ info, warn, error, debug }}
 */
export default function logger(context) {
  return {
    /** @param {string} message @param {object} [meta] */
    info:  (message, meta) => write("info",  context, message, meta),
    /** @param {string} message @param {object} [meta] */
    warn:  (message, meta) => write("warn",  context, message, meta),
    /** @param {string} message @param {object} [meta] */
    error: (message, meta) => write("error", context, message, meta),
    /** @param {string} message @param {object} [meta] */
    debug: (message, meta) => write("debug", context, message, meta),
  };
}
