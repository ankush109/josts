import Redis from "ioredis";

/**
 * Shared Redis client.
 * `brpop` blocks until a job arrives, so a single persistent connection is
 * preferred over creating one per job.
 */
export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});
