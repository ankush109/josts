"use client";

/**
 * Operational panels for the admin dashboard:
 *   1. Certificate search — global cert-# / customer / DUC lookup across all reports.
 *   2. Sync queue         — pending offline drafts, failed syncs, retry-all.
 *   3. PDF health         — reports with failed PDF renders + one-click retry.
 *   4. Storage            — browser IndexedDB / cache quota usage.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search, RefreshCw, Loader2, HardDrive, CloudUpload,
  AlertTriangle, CheckCircle2, ExternalLink, Trash2, Play,
  FileWarning, Database,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { useGetCalibrationReports, CALIBRATION_REPORTS_KEY } from "@/app/hooks/query/useCalibrationReport";
import { useLocalDraftReports } from "@/app/hooks/useLocalDraftReports";
import { useSyncQueue, retrySingleDraft } from "@/app/hooks/useSyncQueue";
import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";
import { authClient as AUTH_API } from "@/lib/api-client";
import { EP_REGENERATE_CALIBRATION_PDF } from "@/lib/endpoints";
import type { CalibrationReportApiResponse } from "@/types/calibration";

// ─── Shared card wrapper ────────────────────────────────────────────────────

function Section({
  icon: Icon, title, subtitle, right, children,
}: {
  icon: typeof Search;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="px-4 sm:px-5 py-3.5 border-b border-border flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground truncate">{title}</div>
          {subtitle && (
            <div className="text-[11.5px] text-muted-foreground mt-0.5 truncate">{subtitle}</div>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      <div className="px-4 sm:px-5 py-4">{children}</div>
    </div>
  );
}

// ─── 1. Certificate search ──────────────────────────────────────────────────

function CertificateSearch() {
  const { data, isLoading } = useGetCalibrationReports();
  const [q, setQ] = useState("");
  const reports = data?.items ?? [];

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return reports
      .filter((r) => {
        const cert = String((r as any).csrNo ?? "").toLowerCase();
        const cust = String((r as any).customerName ?? "").toLowerCase();
        const duc  = ((r as any).instruments ?? [])
          .map((i: any) => `${i.make ?? ""} ${i.modelType ?? ""} ${i.nomenclature ?? ""}`)
          .join(" ")
          .toLowerCase();
        return cert.includes(needle) || cust.includes(needle) || duc.includes(needle);
      })
      .slice(0, 20);
  }, [q, reports]);

  return (
    <Section
      icon={Search}
      title="Certificate registry"
      subtitle="Search across all reports by certificate #, customer, or DUC"
      right={
        <span className="font-mono text-[10px] text-muted-foreground">
          {isLoading ? "…" : `${reports.length} total`}
        </span>
      }
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="e.g. JK/190726/F/S/157 or customer name"
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900/40"
        />
      </div>
      {q.trim() && (
        <div className="mt-3 rounded-lg border border-border overflow-hidden">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              No reports match &quot;{q}&quot;
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {results.map((r: any) => (
                <li key={r._id}>
                  <Link
                    href={`/calibration/${r._id}`}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-mono font-semibold text-foreground truncate">
                        {r.csrNo || "—"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {r.customerName || "(no customer)"} · {(r.instruments ?? []).length} instr
                      </div>
                    </div>
                    <StatusPill status={r.status} />
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Section>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "verified"  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
  : status === "submitted" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
  : status === "rejected"  ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  return (
    <span className={`text-[9.5px] font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded ${cls}`}>
      {status}
    </span>
  );
}

// ─── 2. Sync queue ──────────────────────────────────────────────────────────

function SyncQueue() {
  const { items, loading, remove, refresh } = useLocalDraftReports();
  const { syncNow, running, pendingCount } = useSyncQueue();
  const online = useOnlineStatus();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const failed  = items.filter((i) => i.__syncError);
  const pending = items.filter((i) => !i.__syncError);

  async function handleRetryAll() {
    if (!online) {
      toast.error("You are offline");
      return;
    }
    const res = await syncNow();
    if (res.succeeded > 0) toast.success(`Synced ${res.succeeded} draft${res.succeeded === 1 ? "" : "s"}`);
    if (res.failed > 0)    toast.error(`${res.failed} draft${res.failed === 1 ? "" : "s"} still failing`);
    if (res.attempted === 0) toast.info("Nothing to sync");
  }

  async function handleRetryOne(localId: string) {
    if (!online) { toast.error("You are offline"); return; }
    setRetryingId(localId);
    const res = await retrySingleDraft(localId);
    setRetryingId(null);
    if (res.success) toast.success("Draft synced");
    else toast.error(res.error || "Retry failed");
    refresh();
  }

  return (
    <Section
      icon={CloudUpload}
      title="Sync queue"
      subtitle={online ? "Online" : "Offline — changes are queued locally"}
      right={
        <button
          onClick={handleRetryAll}
          disabled={running || !online || items.length === 0}
          className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-semibold transition-colors"
        >
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Sync now
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-2 mb-3">
        <MiniStat label="TOTAL"   value={items.length} />
        <MiniStat label="PENDING" value={pending.length} tone={pending.length > 0 ? "info" : "neutral"} />
        <MiniStat label="FAILED"  value={failed.length}  tone={failed.length > 0 ? "err" : "neutral"} />
      </div>
      {loading ? (
        <div className="py-6 text-center text-xs text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          <CheckCircle2 className="h-5 w-5 mx-auto mb-1.5 text-emerald-500" />
          All local drafts synced
        </div>
      ) : (
        <ul className="rounded-lg border border-border divide-y divide-border overflow-hidden">
          {items.slice(0, 12).map((item) => (
            <li key={item._id} className="px-3 py-2.5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-medium text-foreground truncate">
                  {item.__syncError ? (
                    <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                  ) : (
                    <Loader2 className="h-3 w-3 text-blue-500 shrink-0 animate-spin" />
                  )}
                  <span className="truncate">
                    {item.customerName || "(untitled draft)"}
                  </span>
                </div>
                <div className="text-[10.5px] text-muted-foreground mt-0.5 font-mono truncate">
                  {item.__syncError
                    ? item.__syncError
                    : `${item.instrumentCount} instr · updated ${new Date(item.updatedAt).toLocaleString("en-IN")}`}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleRetryOne(item._id)}
                  disabled={retryingId === item._id || !online}
                  className="p-1.5 rounded-md hover:bg-accent disabled:opacity-40 text-blue-600 dark:text-blue-400"
                  title="Retry this draft"
                >
                  {retryingId === item._id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <RefreshCw className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("Delete this local draft? This cannot be undone.")) return;
                    await remove(item._id);
                    toast.success("Local draft deleted");
                  }}
                  className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500"
                  title="Delete local draft"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {items.length > 12 && (
        <div className="mt-2 text-[10.5px] text-muted-foreground text-center font-mono">
          + {items.length - 12} more
        </div>
      )}
      {pendingCount > 0 && (
        <div className="mt-3 text-[10.5px] text-muted-foreground font-mono">
          {pendingCount} draft{pendingCount === 1 ? "" : "s"} awaiting sync
        </div>
      )}
    </Section>
  );
}

// ─── 3. PDF health ──────────────────────────────────────────────────────────

function PdfHealth() {
  const { data, isLoading, refetch } = useGetCalibrationReports();
  const queryClient = useQueryClient();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const reports = (data?.items ?? []) as CalibrationReportApiResponse[];
  const failed  = reports.filter((r: any) => r.pdfFailedAt && r.status !== "draft");
  const pending = reports.filter((r: any) =>
    r.status !== "draft" && !r.pdfFailedAt && (!r.filePaths || r.filePaths.length === 0),
  );

  async function handleRetry(id: string) {
    setRetryingId(id);
    try {
      await AUTH_API.post(EP_REGENERATE_CALIBRATION_PDF(id), undefined, { timeout: 120_000 });
      toast.success("PDF regeneration started");
      queryClient.invalidateQueries({ queryKey: [CALIBRATION_REPORTS_KEY] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to trigger regeneration");
    } finally {
      setRetryingId(null);
    }
  }

  async function handleRetryAll() {
    if (failed.length === 0) return;
    if (!confirm(`Retry PDF generation for ${failed.length} failed report${failed.length === 1 ? "" : "s"}?`)) return;
    let ok = 0, err = 0;
    for (const r of failed) {
      try {
        await AUTH_API.post(EP_REGENERATE_CALIBRATION_PDF((r as any)._id), undefined, { timeout: 120_000 });
        ok++;
      } catch { err++; }
    }
    queryClient.invalidateQueries({ queryKey: [CALIBRATION_REPORTS_KEY] });
    if (ok > 0) toast.success(`Requeued ${ok} PDF${ok === 1 ? "" : "s"}`);
    if (err > 0) toast.error(`${err} could not be requeued`);
  }

  return (
    <Section
      icon={FileWarning}
      title="PDF health"
      subtitle={
        failed.length > 0
          ? `${failed.length} failed render${failed.length === 1 ? "" : "s"}`
          : "All rendered PDFs are healthy"
      }
      right={
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="p-1.5 rounded-md hover:bg-accent text-muted-foreground disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleRetryAll}
            disabled={failed.length === 0}
            className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-semibold transition-colors"
          >
            <Play className="h-3 w-3" />
            Retry all
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-2 mb-3">
        <MiniStat label="TOTAL"   value={reports.length} />
        <MiniStat label="PENDING" value={pending.length} tone={pending.length > 0 ? "info" : "neutral"} />
        <MiniStat label="FAILED"  value={failed.length}  tone={failed.length > 0 ? "err" : "neutral"} />
      </div>
      {isLoading ? (
        <div className="py-6 text-center text-xs text-muted-foreground">Loading…</div>
      ) : failed.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          <CheckCircle2 className="h-5 w-5 mx-auto mb-1.5 text-emerald-500" />
          No failed renders
        </div>
      ) : (
        <ul className="rounded-lg border border-border divide-y divide-border overflow-hidden">
          {failed.slice(0, 12).map((r: any) => (
            <li key={r._id} className="px-3 py-2.5 flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/calibration/${r._id}`}
                  className="text-xs font-mono font-semibold text-foreground hover:text-blue-600 truncate block"
                >
                  {r.csrNo || r._id}
                </Link>
                <div className="text-[10.5px] text-red-600 dark:text-red-400 mt-0.5 truncate">
                  {r.pdfError || "PDF generation failed"}
                </div>
              </div>
              <button
                onClick={() => handleRetry(r._id)}
                disabled={retryingId === r._id}
                className="inline-flex items-center gap-1 px-2 h-7 rounded-md border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-[10.5px] font-mono font-semibold hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-40 shrink-0"
              >
                {retryingId === r._id
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <RefreshCw className="h-3 w-3" />}
                RETRY
              </button>
            </li>
          ))}
        </ul>
      )}
      {failed.length > 12 && (
        <div className="mt-2 text-[10.5px] text-muted-foreground text-center font-mono">
          + {failed.length - 12} more
        </div>
      )}
    </Section>
  );
}

// ─── 4. Storage ─────────────────────────────────────────────────────────────

function StorageUsage() {
  const [state, setState] = useState<{
    usage?: number; quota?: number; supported: boolean;
    breakdown?: Record<string, number>;
  }>({ supported: false });

  const refresh = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
      setState({ supported: false });
      return;
    }
    const est = await navigator.storage.estimate();
    setState({
      supported: true,
      usage: est.usage,
      quota: est.quota,
      breakdown: (est as any).usageDetails as Record<string, number> | undefined,
    });
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const pct = state.quota && state.usage != null
    ? Math.min(100, (state.usage / state.quota) * 100)
    : 0;

  return (
    <Section
      icon={Database}
      title="Browser storage"
      subtitle="IndexedDB + Cache API quota used by this device"
      right={
        <button
          onClick={refresh}
          className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      }
    >
      {!state.supported ? (
        <div className="py-6 text-center text-xs text-muted-foreground">
          <HardDrive className="h-5 w-5 mx-auto mb-1.5" />
          Browser storage API not available
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-xl font-semibold text-foreground tabular-nums">
              {formatBytes(state.usage ?? 0)}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              of {formatBytes(state.quota ?? 0)}
            </span>
            <span className={`ml-auto text-[11px] font-mono font-semibold ${
              pct > 75 ? "text-red-600" : pct > 50 ? "text-amber-600" : "text-muted-foreground"
            }`}>
              {pct.toFixed(1)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all ${
                pct > 75 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-blue-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {state.breakdown && Object.keys(state.breakdown).length > 0 && (
            <div className="mt-4 space-y-1.5">
              {Object.entries(state.breakdown)
                .sort(([, a], [, b]) => b - a)
                .map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-muted-foreground uppercase tracking-wide">{key}</span>
                    <span className="text-foreground tabular-nums">{formatBytes(val)}</span>
                  </div>
                ))}
            </div>
          )}
          {pct > 75 && (
            <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 px-3 py-2 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Storage over 75% — the browser may evict cached data. Consider clearing old local drafts.
              </span>
            </div>
          )}
        </>
      )}
    </Section>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

// ─── MiniStat ───────────────────────────────────────────────────────────────

function MiniStat({
  label, value, tone = "neutral",
}: {
  label: string; value: number | string; tone?: "neutral" | "info" | "err" | "ok";
}) {
  const color =
    tone === "err"  ? "text-red-600 dark:text-red-400"
  : tone === "info" ? "text-blue-600 dark:text-blue-400"
  : tone === "ok"   ? "text-emerald-600 dark:text-emerald-400"
  : "text-foreground";
  return (
    <div className="rounded-lg border border-border px-2.5 py-2 text-center">
      <div className={`text-base font-semibold tabular-nums ${color}`}>{value}</div>
      <div className="text-[9.5px] font-mono uppercase tracking-widest text-muted-foreground mt-0.5">
        {label}
      </div>
    </div>
  );
}

// ─── Panel entrypoint ───────────────────────────────────────────────────────

export default function OpsPanel() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <CertificateSearch />
      <SyncQueue />
      <PdfHealth />
      <StorageUsage />
    </div>
  );
}
