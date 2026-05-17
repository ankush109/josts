"use client";

/**
 * @fileoverview Sync queue: replays offline draft writes to the server.
 *
 * Two pieces:
 *   1. `runSyncNow()` — module-level, idempotent. Walks dirty drafts in
 *      IndexedDB and replays them (POST for `isNew`, PUT otherwise). Stops
 *      on 401. Returns a `SyncResult`.
 *   2. `useSyncQueue()` — React hook that exposes `{ syncNow, running,
 *      pendingCount, refresh }` as live state. Subscribes to module-level
 *      changes so multiple consumers re-render together.
 *
 * The auto-sync trigger (on `online` event) lives in `SyncQueueRunner`,
 * NOT in this hook — that way you can call `useSyncQueue` from any number
 * of components without each one re-triggering syncs on mount.
 */

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import {
  EP_CREATE_CALIBRATION_REPORT,
  EP_UPDATE_CALIBRATION_REPORT,
} from "@/lib/endpoints";
import { CALIBRATION_REPORTS_KEY } from "./query/useCalibrationReport";
import {
  listDirtyDrafts,
  markDraftSynced,
  markDraftFailed,
  type OfflineDraft,
} from "../lib/offline-drafts";

function extractErrorMessage(err: unknown): string {
  const e = err as { response?: { status?: number; data?: { message?: string; error?: string } }; message?: string };
  const status = e?.response?.status;
  const serverMsg = e?.response?.data?.message ?? e?.response?.data?.error;
  if (serverMsg) return status ? `${serverMsg} (${status})` : serverMsg;
  if (status) return `Server returned ${status}`;
  return e?.message ?? "Unknown error";
}

export type SyncResult = {
  attempted: number;
  succeeded: number;
  failed:    number;
  errors:    Array<{ localId: string; error: string }>;
};

// ─── Module-level singleton state ─────────────────────────────────────────
let inFlight = false;
let runningState = false;
let pendingState = 0;
type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { for (const l of listeners) l(); }
function setRunning(v: boolean)  { runningState = v; notify(); }
function setPending(v: number)   { pendingState = v; notify(); }

/** Subscribe to sync-state notifications (pending count, running, draft sync attempts). */
export function subscribeToSyncQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export async function refreshPendingCount(): Promise<void> {
  const dirty = await listDirtyDrafts();
  setPending(dirty.length);
}

/**
 * Old offline payloads (saved before the empty-string ObjectId fix) carry
 * `refStandard.equipmentId: ""` which Mongoose can't cast. Coerce to null so
 * the server accepts them.
 */
function sanitizePayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const p = payload as { instruments?: Array<{ refStandard?: { equipmentId?: unknown } }> };
  if (Array.isArray(p.instruments)) {
    for (const inst of p.instruments) {
      if (inst?.refStandard && inst.refStandard.equipmentId === "") {
        inst.refStandard.equipmentId = null;
      }
    }
  }
  return payload;
}

async function syncOne(draft: OfflineDraft): Promise<{ serverId: string }> {
  const body = sanitizePayload(draft.payload);
  if (draft.isNew || !draft.serverId) {
    const { data } = await authClient.post(EP_CREATE_CALIBRATION_REPORT(), body);
    const serverId = (data as { _id?: string; id?: string })?._id
                    ?? (data as { _id?: string; id?: string })?.id
                    ?? "";
    if (!serverId) throw new Error("Server did not return an _id");
    return { serverId };
  }
  await authClient.put(EP_UPDATE_CALIBRATION_REPORT(draft.serverId), body);
  return { serverId: draft.serverId };
}

/**
 * Singleton sync runner. Safe to call concurrently — concurrent calls
 * return immediately with attempted=0.
 */
export async function runSyncNow(): Promise<SyncResult> {
  if (inFlight) {
    return { attempted: 0, succeeded: 0, failed: 0, errors: [] };
  }
  inFlight = true;
  setRunning(true);

  const result: SyncResult = { attempted: 0, succeeded: 0, failed: 0, errors: [] };
  try {
    const dirty = await listDirtyDrafts();
    for (const draft of dirty) {
      result.attempted++;
      try {
        const { serverId } = await syncOne(draft);
        await markDraftSynced(draft.localId, serverId);
        result.succeeded++;
      } catch (err) {
        result.failed++;
        const msg = extractErrorMessage(err);
        result.errors.push({ localId: draft.localId, error: msg });
        await markDraftFailed(draft.localId, msg);
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 401) break;
      }
    }
  } finally {
    await refreshPendingCount();
    setRunning(false);
    inFlight = false;
  }
  return result;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useSyncQueue() {
  const queryClient  = useQueryClient();

  // Subscribe to module-level state changes so each consumer re-renders.
  const [, forceRender] = useState(0);
  useEffect(() => {
    const l: Listener = () => forceRender((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  // Each consumer triggers an initial pending-count refresh on mount so the
  // displayed count is accurate even if no sync has happened yet.
  useEffect(() => { refreshPendingCount(); }, []);

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    const res = await runSyncNow();
    if (res.succeeded > 0) {
      queryClient.invalidateQueries({ queryKey: [CALIBRATION_REPORTS_KEY] });
    }
    return res;
  }, [queryClient]);

  return {
    syncNow,
    running:      runningState,
    pendingCount: pendingState,
    refresh:      refreshPendingCount,
  };
}
