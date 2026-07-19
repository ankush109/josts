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
import { cn } from "@/lib/utils";
import { useSyncQueue } from "../hooks/useSyncQueue";
import { useOnlineStatus } from "../hooks/useOnlineStatus";

export default function SyncIndicator() {
  const online = useOnlineStatus();
  const { syncNow, running, pendingCount } = useSyncQueue();

  if (online && pendingCount === 0) return null;

  const label = !online
    ? (pendingCount > 0 ? `${pendingCount} pending` : "Offline")
    : `${pendingCount} pending`;

  return (
    <div className="hidden sm:flex items-center gap-1.5 mr-1 shrink-0" aria-live="polite">
      {/* Status chip — icon + count, no wrapping */}
      <span
        className={cn(
          "inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium whitespace-nowrap",
          !online
            ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        )}
        title={label}
      >
        {!online ? (
          <CloudOff className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <Cloud className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="tabular-nums">{pendingCount || (!online ? "!" : "")}</span>
      </span>

      {/* Sync button — icon only, tighter footprint */}
      {online && pendingCount > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => syncNow()}
          disabled={running}
          className="h-7 w-7 p-0 shrink-0"
          title={running ? "Syncing…" : "Sync now"}
          aria-label={running ? "Syncing…" : "Sync now"}
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </div>
  );
}
