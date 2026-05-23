/**
 * @file presence.service.js
 * @description Tracks which users are currently active and which report
 * (if any) they're looking at. Backed by Redis with a 60-second TTL —
 * if the client stops pinging, the entry naturally expires.
 *
 * Key layout:
 *   presence:user:<userId>      → JSON { name, email, route, reportId?, lastSeen }
 *                                  TTL = TTL_SECONDS
 *   presence:report:<reportId>  → Set of userId strings
 *                                  TTL = TTL_SECONDS (refreshed on every heartbeat)
 *
 * The report-viewers set is reconstructed each heartbeat rather than
 * maintained perfectly — keeping it eventually consistent avoids the
 * complexity of cleaning up on disconnect.
 */

import { redis } from "../lib/redis.js";
import User from "../models/User.js";

export const TTL_SECONDS = 60;

const userKey   = (userId)   => `presence:user:${userId}`;
const reportKey = (reportId) => `presence:report:${reportId}`;

/**
 * Records a heartbeat for the given user.
 *
 * @param {object} params
 * @param {string} params.userId   - Authenticated user id.
 * @param {string} [params.route]  - Current client route (e.g. "/calibration?id=…")
 * @param {string} [params.reportId] - Currently-viewed report id, if any.
 */
export async function recordHeartbeat({ userId, route = "", reportId = null }) {
  if (!userId) return;
  const user = await User.findById(userId).select("name email").lean();
  if (!user) return;

  const payload = {
    userId,
    name:     user.name,
    email:    user.email,
    route,
    reportId,
    lastSeen: new Date().toISOString(),
  };

  const pipe = redis.multi();
  pipe.set(userKey(userId), JSON.stringify(payload), "EX", TTL_SECONDS);

  if (reportId) {
    pipe.sadd(reportKey(reportId), userId);
    pipe.expire(reportKey(reportId), TTL_SECONDS);
  }

  await pipe.exec();
}

/**
 * Lists all active users (those who pinged within TTL_SECONDS).
 *
 * @returns {Promise<Array<{userId, name, email, route, reportId, lastSeen}>>}
 */
export async function listActiveUsers() {
  const keys = await scanKeys("presence:user:*");
  if (keys.length === 0) return [];
  const raw = await redis.mget(...keys);
  return raw
    .filter(Boolean)
    .map((s) => {
      try { return JSON.parse(s); } catch { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => (b.lastSeen > a.lastSeen ? 1 : -1));
}

/**
 * Lists user-summaries for a given report's current viewers.
 *
 * Filters via active-user entries so a stale set-member doesn't show up
 * after its user TTL expired.
 *
 * @param {string} reportId
 */
export async function listReportViewers(reportId) {
  const userIds = await redis.smembers(reportKey(reportId));
  if (userIds.length === 0) return [];

  const userKeys = userIds.map(userKey);
  const raw = await redis.mget(...userKeys);

  return raw
    .map((s) => {
      try { return s ? JSON.parse(s) : null; } catch { return null; }
    })
    .filter((u) => u && u.reportId === reportId);
}

/**
 * Removes a user's presence entries (e.g. on logout).
 */
export async function clearUserPresence(userId) {
  if (!userId) return;
  await redis.del(userKey(userId));
}

// ── helpers ────────────────────────────────────────────────────────────────

async function scanKeys(pattern) {
  const keys = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = next;
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
}
