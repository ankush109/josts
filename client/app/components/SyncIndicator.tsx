"use client";

/**
 * @fileoverview Navbar widget showing pending-sync count + manual Sync Now button.
 *
 * Renders nothing when there are no pending drafts and we're online — keeps
 * the navbar clean during the normal at-office workflow. Becomes visible:
 *   - when 1+ drafts are waiting to sync (any connection state)
 *   - when offline (so the engineer knows the queue is paused)
 */

import { Cloud, CloudOff, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSyncQueue } from "../hooks/useSyncQueue";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export default function SyncIndicator() {
  const online = useOnlineStatus();
  const { syncNow, running, pendingCount } = useSyncQueue();

  if (online && pendingCount === 0) return null;

  return (
    <div className="hidden sm:flex items-center gap-2 mr-2">
      <div
        className="flex items-center gap-1.5 text-xs text-muted-foreground"
        aria-live="polite"
      >
        {!online ? (
          <>
            <CloudOff className="h-3.5 w-3.5 text-amber-500" />
            <span>{pendingCount > 0 ? `${pendingCount} pending` : "Offline"}</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <Cloud className="h-3.5 w-3.5" />
            <span>{pendingCount} pending</span>
          </>
        ) : null}
      </div>

      {online && pendingCount > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => syncNow()}
          disabled={running}
          className="h-7 gap-1.5 text-xs"
        >
          {running ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {running ? "Syncing…" : "Sync now"}
        </Button>
      )}
    </div>
  );
}
