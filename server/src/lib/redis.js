/**
 * @file redis.js
 * @description Redis client and job-queue helpers.
 *
 * The PDF worker process consumes jobs from the `pdf_jobs` list.
 * Only producers (server) live here; the worker has its own connection.
 *
 * Configuration via environment variables:
 *   REDIS_HOST (default: 127.0.0.1)
 *   REDIS_PORT (default: 6379)
 */

import crypto from "crypto";
import Redis  from "ioredis";
import logger from "./logger.js";

const redis = new Redis({
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
  lazyConnect:         true,
  enableReadyCheck:    true,
  maxRetriesPerRequest: 3,
});

redis.on("error", (err) => logger.error("Redis client error", err));
redis.on("connect", ()  => logger.info("Redis connected"));

/**
 * Pushes a PDF generation job onto the `pdf_jobs` Redis list.
 * The worker will pick it up and generate the PDF, storing the result
 * back in S3 and updating the report's filePaths array.
 *
 * @param {object} params
 * @param {string} params.reportId - MongoDB ObjectId of the report.
 * @param {"create"|"edit"} params.action - Whether this is a new or updated report.
 * @param {"report"|"calibration"} [params.type="report"] - Report collection type.
 * @returns {Promise<string>} The generated job ID (UUID).
 */
export async function pushPdfJobToRedis({ reportId, action, type = "report" }) {
  const jobId = crypto.randomUUID();

  await redis.lpush(
    "pdf_jobs",
    JSON.stringify({ jobId, reportId, action, type })
  );

  logger.info("PDF job queued", { jobId, reportId, action, type });
  return jobId;
}

export default redis;
