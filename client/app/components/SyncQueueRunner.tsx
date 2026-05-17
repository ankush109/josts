"use client";

/**
 * @fileoverview Mounts the sync trigger at the app root.
 *
 * This is the SINGLE place where the auto-sync effect runs — on mount and
 * on every offline→online transition. Other components consume sync state
 * via `useSyncQueue()` without re-triggering the effect.
 *
 * Renders nothing.
 */

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { runSyncNow, refreshPendingCount } from "../hooks/useSyncQueue";
import { useOnlineStatus } from "../hooks/useOnlineStatus";
import { CALIBRATION_REPORTS_KEY } from "../hooks/query/useCalibrationReport";

export default function SyncQueueRunner() {
  const online      = useOnlineStatus();
  const queryClient = useQueryClient();

  useEffect(() => {
    refreshPendingCount();
    if (!online) return;

    let cancelled = false;
    (async () => {
      const res = await runSyncNow();
      if (cancelled) return;
      if (res.succeeded > 0) {
        queryClient.invalidateQueries({ queryKey: [CALIBRATION_REPORTS_KEY] });
        toast.success(
          res.succeeded === 1
            ? "1 draft synced"
            : `${res.succeeded} drafts synced`,
        );
      }
      if (res.failed > 0) {
        const firstErr = res.errors[0]?.error;
        const heading =
          res.failed === 1
            ? "1 draft failed to sync"
            : `${res.failed} drafts failed to sync`;
        toast.error(firstErr ? `${heading}: ${firstErr}` : heading);
      }
    })();
    return () => { cancelled = true; };
  }, [online, queryClient]);

  return null;
}
