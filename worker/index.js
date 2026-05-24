import dotenv from "dotenv";
dotenv.config({ path: new URL(".env", import.meta.url).pathname });

import { connectDB } from "./db/connection.js";
import "./db/models/user.js"; // register User model referenced by other models
import { redis } from "./lib/redis.js";
import { QUEUE_NAME } from "./config.js";
import { handleReportJob } from "./jobs/report.js";
import { handleCalibrationJob } from "./jobs/calibration.js";
import logger from "./lib/logger.js";

const log = logger("worker");

// ─── Job dispatch table ───────────────────────────────────────────────────────

/** @type {Record<string, (reportId: string) => Promise<void>>} */
const JOB_HANDLERS = {
  report:      handleReportJob,
  calibration: handleCalibrationJob,
};

// ─── Dispatcher ───────────────────────────────────────────────────────────────

/**
 * Parses a raw Redis job payload and routes it to the correct handler.
 * Unknown job types are logged and skipped without throwing.
 *
 * @param {string} rawJob - JSON string popped from the Redis queue.
 * @returns {Promise<void>}
 */
async function dispatch(rawJob) {
  const { jobId, reportId, type = "report" } = JSON.parse(rawJob);

  const handler = JOB_HANDLERS[type];
  if (!handler) {
    log.warn("unknown job type — skipping", { jobId, type });
    return;
  }

  log.info("dispatching job", { jobId, type, reportId });

  try {
    await handler(reportId);
  } catch (err) {
    log.error("job failed", { jobId, type, reportId, error: err.message, stack: err.stack });
    await markJobFailed(type, reportId, err).catch((markErr) =>
      log.error("failed to mark job as failed in DB", { jobId, reportId, error: markErr.message })
    );
  }
}

/**
 * Persists a failure marker so the server's sync regenerate poll can
 * detect failure (and the UI can show a Retry button).
 *
 * @param {string} type
 * @param {string} reportId
 * @param {Error} err
 */
async function markJobFailed(type, reportId, err) {
  const message = (err?.message ?? "PDF generation failed").slice(0, 500);
  if (type === "calibration") {
    const { default: Calibration } = await import("./db/models/calibration.js");
    await Calibration.updateOne(
      { _id: reportId },
      { $set: { pdfFailedAt: new Date(), pdfError: message } },
    );
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

/**
 * Connects to the database then blocks on the Redis queue indefinitely,
 * dispatching each job as it arrives.
 *
 * @returns {Promise<never>}
 */
async function runWorker() {
  await connectDB();
  log.info("started", { queue: QUEUE_NAME, pid: process.pid, logLevel: process.env.LOG_LEVEL ?? "info" });

  while (true) {
    const [, rawJob] = await redis.brpop(QUEUE_NAME, 0);
    await dispatch(rawJob);
  }
}

runWorker();
