import Redis from "ioredis";

/**
 * Shared Redis client.
 * `brpop` blocks until a job arrives, so a single persistent connection is
 * preferred over creating one per job.
 */
export const redis = new Redis({
  host:     process.env.REDIS_HOST ?? "127.0.0.1",
  port:     Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD,
  tls:     true,
  lazyConnect:          true,
  enableReadyCheck:     true,
  maxRetriesPerRequest: 3,
});