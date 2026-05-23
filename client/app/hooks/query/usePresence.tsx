"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import {
  EP_PRESENCE_HEARTBEAT,
  EP_PRESENCE_ACTIVE,
  EP_PRESENCE_REPORT_VIEWERS,
  EP_PRESENCE_LEAVE,
} from "@/lib/endpoints";

export interface PresenceUser {
  userId:   string;
  name:     string;
  email:    string;
  route:    string;
  reportId: string | null;
  lastSeen: string;
}

const HEARTBEAT_MS = 30_000;

/**
 * Pings the server every 30 seconds so this user shows as "active".
 * Pass a `reportId` to register as currently viewing that report.
 */
export function usePresenceHeartbeat({
  enabled  = true,
  route    = "",
  reportId = null,
}: {
  enabled?:  boolean;
  route?:    string;
  reportId?: string | null;
}) {
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const ping = async () => {
      try {
        await authClient.post(EP_PRESENCE_HEARTBEAT(), { route, reportId });
      } catch { /* swallow — presence is non-critical */ }
    };

    ping();
    const id = setInterval(() => { if (!cancelled) ping(); }, HEARTBEAT_MS);

    return () => {
      cancelled = true;
      clearInterval(id);
      authClient.post(EP_PRESENCE_LEAVE()).catch(() => {});
    };
  }, [enabled, route, reportId]);
}

export function useActiveUsers(refetchIntervalMs = 15_000) {
  return useQuery({
    queryKey: ["presence", "active"],
    queryFn: async () => {
      const res = await authClient.get<{ users: PresenceUser[] }>(EP_PRESENCE_ACTIVE());
      return res.data.users;
    },
    refetchInterval: refetchIntervalMs,
    staleTime: 5_000,
  });
}

export function useReportViewers(reportId: string | null | undefined, refetchIntervalMs = 15_000) {
  return useQuery({
    queryKey: ["presence", "report", reportId],
    enabled:  !!reportId,
    queryFn:  async () => {
      const res = await authClient.get<{ viewers: PresenceUser[] }>(
        EP_PRESENCE_REPORT_VIEWERS(reportId!),
      );
      return res.data.viewers;
    },
    refetchInterval: refetchIntervalMs,
    staleTime: 5_000,
  });
}
