"use client";

/**
 * @fileoverview Reads offline-only drafts from IndexedDB and projects them
 * into the `ReportListItem` shape used by the calibration table.
 *
 * Excludes drafts that have already been synced (have a `serverId`) — those
 * appear in the server-side list and would otherwise be duplicated.
 *
 * The returned items carry a `__local: true` marker so the table can render
 * a "Local • will sync" badge and disable server-only actions.
 */

import { useCallback, useEffect, useState } from "react";
import { listDrafts, deleteDraft, type OfflineDraft } from "../lib/offline-drafts";
import { subscribeToSyncQueue } from "./useSyncQueue";

export type LocalReportListItem = {
  _id: string;                 // localId (used as React key + edit-URL path)
  formatNo: string;
  status: "draft";
  createdBy: { _id: string; name: string; email: string };
  instrumentCount: number;
  instruments: { make: string; modelType: string }[];
  signatures: Record<string, never>;
  filePaths: string[];
  customerName: string;
  createdAt: string;
  updatedAt: string;
  __local: true;
  __syncError?: string | null;
};

function draftToReportItem(d: OfflineDraft): LocalReportListItem {
  const p = (d.payload ?? {}) as {
    csrNo?:        string;
    customerName?: string;
    createdBy?:    string;
    instruments?:  Array<{ make?: string; modelType?: string }>;
  };
  const instruments = (p.instruments ?? []).map((i) => ({
    make:      i.make ?? "",
    modelType: i.modelType ?? "",
  }));
  return {
    _id:             d.localId,
    formatNo:        "",
    status:          "draft",
    createdBy:       { _id: p.createdBy ?? "", name: "You (offline)", email: "" },
    instrumentCount: instruments.length,
    instruments,
    signatures:      {},
    filePaths:       [],
    customerName:    p.customerName ?? "",
    createdAt:       d.lastModified,
    updatedAt:       d.lastModified,
    __local:         true,
    __syncError:     d.lastSyncError ?? null,
  };
}

export function useLocalDraftReports() {
  const [items, setItems]       = useState<LocalReportListItem[]>([]);
  const [loading, setLoading]   = useState(true);

  const refresh = useCallback(async () => {
    const drafts = await listDrafts();
    // Only show drafts that haven't been synced yet — synced ones are in
    // the server-side list.
    const pending = drafts.filter((d) => d.serverId === null);
    setItems(pending.map(draftToReportItem));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const onStorage = () => refresh();
    const unsubscribe = subscribeToSyncQueue(refresh);
    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
      window.addEventListener("focus",   onStorage);
    }
    return () => {
      unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("focus",   onStorage);
      }
    };
  }, [refresh]);

  const remove = useCallback(async (localId: string) => {
    await deleteDraft(localId);
    await refresh();
  }, [refresh]);

  return { items, loading, refresh, remove };
}
