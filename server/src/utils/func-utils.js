import crypto from "crypto";
import Redis from "ioredis";
const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

export const pushPdfJobToRedis = async ({ reportId, action, type = "report" }) => {
  const jobId = crypto.randomUUID();

  await redis.lpush(
    "pdf_jobs",
    JSON.stringify({
      jobId,
      reportId,
      action, // "create" | "edit"
      type,   // "report" | "calibration"
    })
  );

  console.log(`📝 Job pushed to Redis: ${jobId} for report ${reportId}`);
  return jobId;
};
