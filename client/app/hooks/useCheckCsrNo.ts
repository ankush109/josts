"use client";

import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/api-client";
import { EP_CHECK_CSR_NO } from "@/lib/endpoints";
import { useOnlineStatus } from "./useOnlineStatus";
import { isLocalId } from "../lib/offline-drafts";

export type CsrCheckState = "idle" | "checking" | "available" | "taken" | "skipped";

/**
 * Debounced server-side CSR No uniqueness check.
 *
 * - Returns "skipped" when offline or when the id is a local-only draft —
 *   the server can't be reached, or there's no way to exclude the current doc.
 * - Returns "taken" if another report already uses this CSR.
 * - `excludeReportId` lets edit mode ignore its own document.
 */
export function useCheckCsrNo(csrNo: string, excludeReportId?: string | null) {
  const [state, setState] = useState<CsrCheckState>("idle");
  const online = useOnlineStatus();
  const lastQueried = useRef<string>("");

  useEffect(() => {
    const trimmed = csrNo.trim();
    if (!trimmed) {
      setState("idle");
      return;
    }
    if (!online) {
      setState("skipped");
      return;
    }
    setState("checking");
    const exclude =
      excludeReportId && !isLocalId(excludeReportId) ? excludeReportId : undefined;
    const handle = setTimeout(async () => {
      const queryKey = `${trimmed}|${exclude ?? ""}`;
      lastQueried.current = queryKey;
      try {
        const { data } = await authClient.get<{ exists: boolean }>(EP_CHECK_CSR_NO(), {
          params: { csrNo: trimmed, excludeId: exclude },
        });
        if (lastQueried.current !== queryKey) return;
        setState(data.exists ? "taken" : "available");
      } catch {
        if (lastQueried.current !== queryKey) return;
        setState("skipped");
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [csrNo, excludeReportId, online]);

  return state;
}
