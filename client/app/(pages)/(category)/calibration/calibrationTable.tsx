"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, FileDown, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  useGetCalibrationReports,
  useVerifyRejectCalibration,
  useGetAuditLog,
} from "@/app/hooks";
import { authClient as AUTH_API } from "@/lib/api-client";
import {
  EP_DELETE_CALIBRATION_REPORT,
  EP_USER_PROFILE,
  EP_REPORT_URL,
  EP_REGENERATE_CALIBRATION_PDF,
  EP_CALIBRATION_REPORT_BY_ID,
} from "@/lib/endpoints";
import { RawExportPreview } from "./_components/RawExportPreview";
import { useAuth } from "@/app/provider/AuthProvider";
import {
  useReopenCalibrationReport,
  useReassignSignatories,
  useBulkVerify,
  useBulkReject,
  useBulkDelete,
} from "@/app/hooks/mutation/(calibration)/useCalibrationAdminActions";
import { useAdminUsers, type AdminUser } from "@/app/hooks/query/useAdminUsers";
import { useLocalDraftReports } from "@/app/hooks/useLocalDraftReports";
import { useSyncQueue, retrySingleDraft } from "@/app/hooks/useSyncQueue";
import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";

import { useThemeTokens, MONO_FF, SANS_FF } from "./_components/theme";
import {
  StatusPill, SectionMarker, PrimaryButton, GhostButton,
  StatFilterBar, Toolbar, BulkActionsBar, Pagination,
  EmptyState, TableSkeleton, FailedPdfsBanner,
} from "./_components/ui";
import {
  PdfCell, RowActionsMenu, CertCell, InstrumentCountCell,
  PersonCell, DateCell, CustomerCell, LocalBadge,
  type ReportRow,
} from "./_components/row";
import { LocalDraftsStrip } from "./_components/LocalDrafts";
import {
  DiscardLocalDialog, DeleteReportDialog, AuditHistoryDialog,
  OnboardingDialog, ReopenDialog, ReassignDialog, BulkConfirmDialog,
} from "./_components/dialogs";

// ─── Main component ───────────────────────────────────────────────────────────

export default function CalibrationReportsTable() {
  const router = useRouter();
  const { t, isDark, mounted } = useThemeTokens();
  const { user, setUser } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data, isLoading, isError, refetch } = useGetCalibrationReports();
  const { mutate: verifyReject } = useVerifyRejectCalibration();
  const queryClient = useQueryClient();

  const { mutate: deleteReport, isPending: isDeleting } = useMutation({
    mutationFn: (reportId: string) => AUTH_API.delete(EP_DELETE_CALIBRATION_REPORT(reportId)),
    onSuccess: () => {
      toast.success("Report deleted");
      setDeleteDialogOpen(false);
      setReportToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["get-calibration-reports"] });
    },
    onError: () => toast.error("Failed to delete report"),
  });

  // ── First-login onboarding ──
  const [sigName, setSigName] = useState("");
  const [isSavingOnboard, setIsSavingOnboard] = useState(false);
  const showOnboarding = !!user && !user.signatureName;

  async function handleOnboardSave() {
    if (!sigName.trim()) return;
    setIsSavingOnboard(true);
    try {
      await AUTH_API.put(EP_USER_PROFILE(), { signatureName: sigName.trim() });
      setUser({ ...user!, signatureName: sigName.trim() });
      toast.success("Welcome! Your profile is set up.");
    } catch {
      toast.error("Failed to save, please try again");
    } finally {
      setIsSavingOnboard(false);
    }
  }

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<ReportRow | null>(null);
  const [viewingPdf, setViewingPdf] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [auditReportId, setAuditReportId] = useState<string | null>(null);
  const { data: auditLog, isLoading: auditLoading } = useGetAuditLog(auditReportId);

  const [discardLocalId, setDiscardLocalId] = useState<string | null>(null);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // ── Admin bulk + admin-action dialogs ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reopenReport, setReopenReport] = useState<ReportRow | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [reassignReport, setReassignReport] = useState<ReportRow | null>(null);
  const [reassignCalibBy, setReassignCalibBy] = useState<string>("");
  const [reassignVerifBy, setReassignVerifBy] = useState<string>("");
  const [bulkRegenerating, setBulkRegenerating] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<null | "verify" | "reject" | "delete">(null);

  const { mutateAsync: reopenMutate, isPending: isReopening } = useReopenCalibrationReport();
  const { mutateAsync: reassignMutate, isPending: isReassigning } = useReassignSignatories();
  const { mutateAsync: bulkVerifyMutate, isPending: isBulkVerifying } = useBulkVerify();
  const { mutateAsync: bulkRejectMutate, isPending: isBulkRejecting } = useBulkReject();
  const { mutateAsync: bulkDeleteMutate, isPending: isBulkDeleting } = useBulkDelete();
  const { data: adminUsers } = useAdminUsers("", "active", { enabled: isAdmin });

  const serverItems = (data?.items ?? []) as unknown as ReportRow[];
  const { items: localItems, remove: removeLocalDraft } = useLocalDraftReports();
  const { syncNow, running: syncRunning } = useSyncQueue();
  const online = useOnlineStatus();

  const allItems: ReportRow[] = serverItems;

  function isPdfFailed(report: ReportRow) {
    if (report.filePaths?.length) return false;
    if (report.status === "draft") return false;
    if (report.pdfFailedAt) return true;
    return Date.now() - new Date(report.createdAt).getTime() > 24 * 60 * 60 * 1000;
  }

  function isPdfPending(report: ReportRow) {
    if (regeneratingId === report._id) return true;
    return report.status !== "draft" && !report.filePaths?.length && !isPdfFailed(report);
  }

  const counts = useMemo(
    () => ({
      total: allItems.length,
      draft: allItems.filter((r) => r.status === "draft").length,
      submitted: allItems.filter((r) => r.status === "submitted").length,
      verified: allItems.filter((r) => r.status === "verified").length,
      rejected: allItems.filter((r) => r.status === "rejected").length,
    }),
    [allItems]
  );

  const processed = useMemo(() => {
    let list = [...allItems];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) =>
        r.certNo?.toLowerCase().includes(q) ||
        r.customerName?.toLowerCase().includes(q) ||
        r.createdBy?.name?.toLowerCase().includes(q) ||
        (r.instruments ?? []).some((i) =>
          (i.nomenclature ?? "").toLowerCase().includes(q) ||
          (i.make ?? "").toLowerCase().includes(q) ||
          (i.modelType ?? "").toLowerCase().includes(q),
        )
      );
    }
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    list.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? diff : -diff;
    });
    return list;
  }, [allItems, searchQuery, statusFilter, sortOrder]);

  const totalPages = Math.ceil(processed.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentRows = processed.slice(startIndex, startIndex + itemsPerPage);

  function onSearch(v: string) { setSearchQuery(v); setCurrentPage(1); }
  function onStatusFilter(v: string) { setStatusFilter(v); setCurrentPage(1); }
  function onItemsPerPage(v: string) { setItemsPerPage(Number(v)); setCurrentPage(1); }
  function onSort() { setSortOrder((s) => (s === "asc" ? "desc" : "asc")); setCurrentPage(1); }

  function confirmDelete(report: ReportRow) { setReportToDelete(report); setDeleteDialogOpen(true); }
  function confirmDiscardLocal(localId: string) { setDiscardLocalId(localId); setDiscardDialogOpen(true); }

  async function handleRetryDraft(e: React.MouseEvent, localId: string) {
    e.stopPropagation();
    setRetryingId(localId);
    const result = await retrySingleDraft(localId);
    setRetryingId(null);
    if (result.success) {
      toast.success("Draft synced successfully");
      queryClient.invalidateQueries({ queryKey: ["get-calibration-reports"] });
    } else {
      toast.error(result.error ?? "Sync failed — try again");
    }
  }

  async function handleDiscardLocal() {
    if (!discardLocalId) return;
    await removeLocalDraft(discardLocalId);
    setDiscardDialogOpen(false);
    setDiscardLocalId(null);
    toast.success("Local draft discarded");
  }

  async function handleViewPdf(e: React.MouseEvent, reportId: string, index = 0) {
    e.stopPropagation();
    setViewingPdf(reportId);
    try {
      const res = await AUTH_API.get(EP_REPORT_URL(reportId, "calibration"));
      const urls: string[] = res.data.fileUrls;
      window.open(urls[index] ?? urls[0], "_blank");
    } catch {
      toast.error("Failed to load PDF");
    } finally {
      setViewingPdf(null);
    }
  }

  async function handleDownloadPdf(e: React.MouseEvent, report: ReportRow, index = 0) {
    e.stopPropagation();
    setDownloadingPdf(report._id);
    try {
      const res = await AUTH_API.get(EP_REPORT_URL(report._id, "calibration", true));
      const urls: string[] = res.data.fileUrls;
      window.open(urls[index] ?? urls[0], "_blank");
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setDownloadingPdf(null);
    }
  }

  async function handleRegeneratePdf(e: React.MouseEvent, reportId: string) {
    e.stopPropagation();
    if (regeneratingId) return;
    setRegeneratingId(reportId);
    const toastId = toast.loading("Generating PDF — this may take up to a minute…");
    try {
      await AUTH_API.post(EP_REGENERATE_CALIBRATION_PDF(reportId), undefined, { timeout: 120_000 });
      toast.success("PDF generated", { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["get-calibration-reports"] });
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "PDF generation failed";
      toast.error(msg, { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["get-calibration-reports"] });
    } finally {
      setRegeneratingId(null);
    }
  }

  function handleDelete() {
    if (!reportToDelete) return;
    deleteReport(reportToDelete._id);
  }

  const [rawExportReport, setRawExportReport] = useState<Record<string, unknown> | null>(null);
  const [rawExportMode,   setRawExportMode]   = useState<"pdf" | "excel">("pdf");
  const [rawExportLoading, setRawExportLoading] = useState(false);

  async function handleRawExport(reportId: string, format: "excel" | "pdf") {
    if (String(reportId).startsWith("local-")) {
      toast.error("This draft hasn't synced yet — export from the editor");
      return;
    }
    setRawExportMode(format);
    setRawExportLoading(true);
    const toastId = toast.loading("Loading report data…");
    try {
      const { data } = await AUTH_API.get(EP_CALIBRATION_REPORT_BY_ID(reportId));
      const report = (data?.report ?? data) as Record<string, unknown>;
      setRawExportReport(report);
      toast.dismiss(toastId);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Failed to load report";
      toast.error(msg, { id: toastId });
    } finally {
      setRawExportLoading(false);
    }
  }

  function handleVerifyReject(e: React.MouseEvent, reportId: string, status: "verified" | "rejected") {
    e.stopPropagation();
    verifyReject(
      { reportId, status },
      {
        onSuccess: () => toast.success(`Report ${status}`),
        onError: () => toast.error(`Failed to ${status === "verified" ? "verify" : "reject"} report`),
      }
    );
  }

  // ── Bulk selection ──
  const selectableRows = currentRows.filter((r) => !r.__local);
  const allOnPageSelected = selectableRows.length > 0 && selectableRows.every((r) => selectedIds.has(r._id));
  const someOnPageSelected = !allOnPageSelected && selectableRows.some((r) => selectedIds.has(r._id));

  function toggleRow(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }
  function togglePage(checked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const r of selectableRows) {
        if (checked) next.add(r._id); else next.delete(r._id);
      }
      return next;
    });
  }
  function clearSelection() { setSelectedIds(new Set()); }

  async function handleBulkAction(action: "verify" | "reject" | "delete") {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const verbing = action === "verify" ? "Verifying" : action === "reject" ? "Rejecting" : "Deleting";
    const toastId = toast.loading(`${verbing} ${ids.length} report${ids.length > 1 ? "s" : ""}…`);
    try {
      const mut =
        action === "verify" ? bulkVerifyMutate :
        action === "reject" ? bulkRejectMutate :
        bulkDeleteMutate;
      const res = await mut(ids);
      const okN = res.ok.length;
      const skipN = res.skipped.length;
      const verb = action === "verify" ? "verified" : action === "reject" ? "rejected" : "deleted";
      if (okN === 0) toast.error(`No reports ${verb} (${skipN} skipped)`, { id: toastId });
      else if (skipN > 0) toast.success(`${okN} ${verb}, ${skipN} skipped`, { id: toastId });
      else toast.success(`${okN} ${verb}`, { id: toastId });
      clearSelection();
      setBulkConfirm(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Bulk action failed", { id: toastId });
    }
  }

  async function handleBulkRegenerateFailed() {
    const targets = allItems.filter((r) => isPdfFailed(r));
    if (targets.length === 0) { toast.info("No failed PDFs to regenerate"); return; }
    setBulkRegenerating(true);
    const toastId = toast.loading(`Regenerating ${targets.length} PDF${targets.length > 1 ? "s" : ""}…`);
    let ok = 0; let fail = 0;
    const queue = [...targets];
    async function worker() {
      while (queue.length) {
        const r = queue.shift();
        if (!r) break;
        try {
          await AUTH_API.post(EP_REGENERATE_CALIBRATION_PDF(r._id), undefined, { timeout: 120_000 });
          ok += 1;
        } catch { fail += 1; }
      }
    }
    await Promise.all([worker(), worker(), worker()]);
    setBulkRegenerating(false);
    queryClient.invalidateQueries({ queryKey: ["get-calibration-reports"] });
    if (fail === 0) toast.success(`Regenerated ${ok} PDF${ok > 1 ? "s" : ""}`, { id: toastId });
    else toast.error(`${ok} succeeded, ${fail} failed`, { id: toastId });
  }

  function fmtDateCell(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toLocaleString("en-IN");
  }

  function handleExportCsv() {
    const rows = processed;
    if (rows.length === 0) { toast.info("No reports to export"); return; }
    const headers = ["Certificate No", "Format No", "Status", "Customer", "Created By", "Calibrated By", "Verified By", "Instruments", "Created At", "Last Updated"];
    const escape = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push([
        r.certNo ?? "", r.formatNo ?? "", r.status, r.customerName ?? "",
        r.createdBy?.name ?? "", r.signatures?.calibratedBy?.name ?? "",
        r.signatures?.verifiedBy?.name ?? "", r.instrumentCount ?? 0,
        fmtDateCell(r.createdAt), fmtDateCell(r.updatedAt),
      ].map(escape).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const ts = new Date().toISOString().slice(0, 10);
    a.href = url; a.download = `calibration-reports-${ts}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} report${rows.length > 1 ? "s" : ""}`);
  }

  async function handleExportXlsx() {
    const rows = processed;
    if (rows.length === 0) { toast.info("No reports to export"); return; }
    const XLSX = await import("xlsx");
    const data = rows.map((r) => ({
      "Certificate No": r.certNo ?? "",
      "Format No": r.formatNo ?? "",
      "Status": r.status,
      "Customer": r.customerName ?? "",
      "DUCs": (r.instruments ?? []).map((i) => i.nomenclature || `${i.make ?? ""} ${i.modelType ?? ""}`.trim()).filter(Boolean).join("; "),
      "Instrument Count": r.instrumentCount ?? 0,
      "Created By": r.createdBy?.name ?? "",
      "Calibrated By": r.signatures?.calibratedBy?.name ?? "",
      "Verified By": r.signatures?.verifiedBy?.name ?? "",
      "Calibrated At": fmtDateCell(r.signatures?.calibratedAt),
      "Verified At": fmtDateCell(r.signatures?.verifiedAt),
      "Created At": fmtDateCell(r.createdAt),
      "Last Updated": fmtDateCell(r.updatedAt),
      "PDF Available": (r.filePaths?.length ?? 0) > 0 ? "Yes" : "No",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Calibration Reports");
    const ts = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `calibration-reports-${ts}.xlsx`);
    toast.success(`Exported ${rows.length} report${rows.length > 1 ? "s" : ""}`);
  }

  async function handleExportAuditXlsx() {
    if (!auditLog?.length) return;
    const XLSX = await import("xlsx");
    const rows: Record<string, string>[] = [];
    auditLog.forEach((entry) => {
      const name = entry.performedBy?.signatureName || entry.performedBy?.name || entry.performedBy?.email || "Unknown";
      const ts = new Date(entry.createdAt).toLocaleString("en-IN");
      if (entry.changes?.length) {
        entry.changes.forEach((c) => {
          rows.push({ "Action": entry.action, "Performed By": name, "Timestamp": ts, "Field": c.field, "From": c.from, "To": c.to });
        });
      } else {
        rows.push({ "Action": entry.action, "Performed By": name, "Timestamp": ts, "Field": "", "From": "", "To": "" });
      }
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Audit Log");
    XLSX.writeFile(wb, `audit-log-${auditReportId}-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Audit log exported");
  }

  async function handleReopenConfirm() {
    if (!reopenReport || reopenReason.trim().length < 3) return;
    try {
      await reopenMutate({ reportId: reopenReport._id, reason: reopenReason.trim() });
      toast.success("Report reopened");
      setReopenReport(null);
      setReopenReason("");
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to reopen");
    }
  }

  async function handleReassignConfirm() {
    if (!reassignReport) return;
    const payload: { reportId: string; calibratedBy?: string | null; verifiedBy?: string | null } = {
      reportId: reassignReport._id,
    };
    const currentCalib = (reassignReport.signatures?.calibratedBy as { _id?: string } | undefined)?._id ?? "";
    const currentVerif = (reassignReport.signatures?.verifiedBy as { _id?: string } | undefined)?._id ?? "";
    if (reassignCalibBy !== currentCalib) payload.calibratedBy = reassignCalibBy || null;
    if (reassignVerifBy !== currentVerif) payload.verifiedBy = reassignVerifBy || null;
    if (payload.calibratedBy === undefined && payload.verifiedBy === undefined) {
      toast.info("No changes");
      return;
    }
    try {
      await reassignMutate(payload);
      toast.success("Signatories updated — PDF regenerating");
      setReassignReport(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to reassign");
    }
  }

  function openReassignDialog(report: ReportRow) {
    setReassignReport(report);
    const calib = (report.signatures?.calibratedBy as { _id?: string } | undefined)?._id ?? "";
    const verif = (report.signatures?.verifiedBy as { _id?: string } | undefined)?._id ?? "";
    setReassignCalibBy(calib);
    setReassignVerifBy(verif);
  }

  const failedPdfCount = useMemo(
    () => allItems.filter((r) => isPdfFailed(r)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allItems],
  );

  const reassignUsers = useMemo(
    () => (adminUsers ?? []).map((u: AdminUser) => ({ id: u.id, name: u.name, signatureName: u.signatureName })),
    [adminUsers],
  );

  // ═══════════ RENDER ═══════════════════════════════════════════════════════

  if (!mounted) {
    return <div style={{ minHeight: "60vh" }} />;
  }

  if (isLoading) {
    return (
      <div style={{ background: t.page, padding: 4, borderRadius: 12 }}>
        <TableSkeleton t={t} />
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 320 }}>
        <div style={{
          background: t.card, border: `1px solid ${t.line}`, borderRadius: 12,
          padding: 24, maxWidth: 360, textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        }}>
          <AlertCircle size={32} color={t.rejectFg} />
          <p style={{ margin: 0, fontSize: 15, fontWeight: 640, color: t.ink }}>Failed to load reports</p>
          <p style={{ margin: 0, fontSize: 12.5, color: t.muted }}>Please refresh and try again</p>
          <GhostButton t={t} onClick={() => refetch()}>RETRY</GhostButton>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: SANS_FF,
        color: t.ink,
        display: "flex", flexDirection: "column", gap: 18,
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <SectionMarker text="§ CALIBRATION — REPORTS" t={t} />
          <h1 style={{
            margin: "8px 0 4px", fontSize: 28, fontWeight: 660, letterSpacing: "-0.025em",
            color: t.ink, lineHeight: 1.1,
          }}>
            Calibration Reports
          </h1>
          <p style={{
            margin: 0, fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.1em",
            color: t.muted,
          }}>
            {counts.total} TOTAL · {counts.verified} VERIFIED · {counts.submitted + counts.draft} PENDING
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <GhostButton t={t} onClick={handleExportCsv} icon={<FileDown size={13} />}>EXPORT CSV</GhostButton>
          {!isAdmin && (
            <PrimaryButton t={t} onClick={() => router.push("/calibration/create")} icon={<Plus size={14} />}>
              NEW REPORT
            </PrimaryButton>
          )}
        </div>
      </div>

      {/* ── Segmented status filter ── */}
      <StatFilterBar counts={counts} active={statusFilter} onChange={(v) => { setStatusFilter(v); setCurrentPage(1); }} t={t} />

      {/* ── Failed PDF banner (admin) ── */}
      {isAdmin && failedPdfCount > 0 && (
        <FailedPdfsBanner count={failedPdfCount} isBusy={bulkRegenerating} onRegenerate={handleBulkRegenerateFailed} t={t} />
      )}

      {/* ── Local drafts strip ── */}
      <LocalDraftsStrip
        items={localItems}
        online={online}
        syncRunning={syncRunning}
        retryingId={retryingId}
        onSyncNow={syncNow}
        onRetry={handleRetryDraft}
        onDiscard={confirmDiscardLocal}
        t={t}
      />

      {/* ── Main card ── */}
      <div style={{
        background: t.card, border: `1px solid ${t.line}`, borderRadius: 12,
        overflow: "hidden",
      }}>
        <Toolbar
          search={searchQuery} onSearch={onSearch}
          status={statusFilter} onStatus={onStatusFilter}
          sortOrder={sortOrder} onSort={onSort}
          itemsPerPage={itemsPerPage} onItemsPerPage={onItemsPerPage}
          onExportXlsx={handleExportXlsx}
          canExport={processed.length > 0}
          t={t}
        />

        {isAdmin && selectedIds.size > 0 && (
          <BulkActionsBar
            count={selectedIds.size}
            onVerify={() => setBulkConfirm("verify")}
            onReject={() => setBulkConfirm("reject")}
            onDelete={() => setBulkConfirm("delete")}
            onClear={clearSelection}
            disabled={isBulkVerifying || isBulkRejecting || isBulkDeleting}
            t={t}
          />
        )}

        {/* ── Table ── */}
        <div style={{ overflowX: "auto" }}>
          {currentRows.length === 0 ? (
            <EmptyState
              isFiltered={!!searchQuery || statusFilter !== "all"}
              onCreate={() => router.push("/calibration/create")}
              canCreate={!isAdmin}
              t={t}
            />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
              <thead>
                <tr style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#fbfcfd" }}>
                  {isAdmin && (
                    <th style={{ ...headCell(t), width: 40, paddingLeft: 18 }}>
                      <input
                        type="checkbox"
                        aria-label="Select all rows on this page"
                        style={{ width: 15, height: 15, cursor: "pointer", accentColor: t.accent }}
                        checked={allOnPageSelected}
                        ref={(el) => { if (el) el.indeterminate = someOnPageSelected; }}
                        onChange={(e) => togglePage(e.target.checked)}
                      />
                    </th>
                  )}
                  {[
                    "CERTIFICATE",
                    "STATUS",
                    "CREATED BY",
                    "INSTR",
                    "CUSTOMER",
                    "CALIBRATED BY",
                    "VERIFIED BY",
                    "CREATED",
                    "UPDATED",
                    "PDF",
                    "",
                  ].map((h, i) => (
                    <th
                      key={h + i}
                      style={{
                        ...headCell(t),
                        paddingLeft: !isAdmin && i === 0 ? 18 : 12,
                        textAlign: h === "PDF" ? "center" : (h === "" ? "right" : "left"),
                        paddingRight: i === 10 ? 18 : 12,
                      }}
                    >{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentRows.map((report) => {
                  const selected = selectedIds.has(report._id);
                  return (
                    <tr
                      key={report._id}
                      onClick={() => router.push(`/calibration/${report._id}`)}
                      style={{
                        cursor: "pointer",
                        background: selected ? t.accentSoft : "transparent",
                        borderLeft: `2px solid ${selected ? t.accent : "transparent"}`,
                        transition: "background .12s ease",
                      }}
                      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = t.hover; }}
                      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}
                    >
                      {isAdmin && (
                        <td style={{ ...bodyCell(t), paddingLeft: 18, width: 40 }} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            aria-label={`Select report ${report.certNo || report._id}`}
                            style={{ width: 15, height: 15, cursor: "pointer", accentColor: t.accent }}
                            checked={selected}
                            onChange={(e) => toggleRow(report._id, e.target.checked)}
                          />
                        </td>
                      )}
                      <td style={{ ...bodyCell(t), paddingLeft: !isAdmin ? 18 : 12 }}>
                        <CertCell report={report} t={t} />
                      </td>
                      <td style={bodyCell(t)}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <StatusPill status={report.status} t={t} />
                          {report.__local && <LocalBadge t={t} />}
                        </div>
                      </td>
                      <td style={bodyCell(t)}>
                        <PersonCell name={report.createdBy?.name} email={report.createdBy?.email} t={t} />
                      </td>
                      <td style={bodyCell(t)}>
                        <InstrumentCountCell report={report} t={t} />
                      </td>
                      <td style={bodyCell(t)}>
                        <CustomerCell name={report.customerName} t={t} />
                      </td>
                      <td style={bodyCell(t)}>
                        <PersonCell name={report.signatures?.calibratedBy?.name} t={t} />
                      </td>
                      <td style={bodyCell(t)}>
                        <PersonCell name={report.signatures?.verifiedBy?.name} t={t} />
                      </td>
                      <td style={bodyCell(t)}>
                        <DateCell iso={report.createdAt} t={t} />
                      </td>
                      <td style={bodyCell(t)}>
                        <DateCell iso={report.updatedAt} t={t} />
                      </td>
                      <td style={{ ...bodyCell(t), textAlign: "center" }}>
                        <PdfCell
                          report={report}
                          isFailed={isPdfFailed(report)}
                          isPending={isPdfPending(report)}
                          isRegenerating={regeneratingId === report._id}
                          viewingId={viewingPdf}
                          downloadingId={downloadingPdf}
                          onView={handleViewPdf}
                          onDownload={handleDownloadPdf}
                          onRegenerate={handleRegeneratePdf}
                          t={t}
                        />
                      </td>
                      <td style={{ ...bodyCell(t), paddingRight: 18, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <RowActionsMenu
                          report={report}
                          isAdmin={!!isAdmin}
                          onEdit={() => router.push(`/calibration/${report._id}`)}
                          onClone={() => router.push(`/calibration/create?cloneFrom=${report._id}`)}
                          onHistory={() => setAuditReportId(report._id)}
                          onVerify={(e) => handleVerifyReject(e, report._id, "verified")}
                          onReject={(e) => handleVerifyReject(e, report._id, "rejected")}
                          onReopen={() => { setReopenReport(report); setReopenReason(""); }}
                          onReassign={() => openReassignDialog(report)}
                          onDelete={() => confirmDelete(report)}
                          onDownloadRawExcel={() => handleRawExport(report._id, "excel")}
                          onDownloadRawPdf={() => handleRawExport(report._id, "pdf")}
                          t={t}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer count */}
        {processed.length > 0 && (
          <div style={{
            padding: "10px 18px", borderTop: `1px solid ${t.line}`,
            fontFamily: MONO_FF, fontSize: 10.5, letterSpacing: "0.1em", color: t.faint, fontWeight: 600,
          }}>
            SHOWING {startIndex + 1}–{Math.min(startIndex + itemsPerPage, processed.length)} OF {processed.length} REPORT{processed.length !== 1 ? "S" : ""}
          </div>
        )}

        {totalPages > 1 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPage={setCurrentPage} t={t} />
        )}
      </div>

      {/* ── Dialogs ── */}
      <DiscardLocalDialog
        open={discardDialogOpen}
        onOpenChange={setDiscardDialogOpen}
        onConfirm={handleDiscardLocal}
        t={t}
      />
      <DeleteReportDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        report={reportToDelete}
        isDeleting={isDeleting}
        onConfirm={handleDelete}
        t={t}
      />
      <AuditHistoryDialog
        open={!!auditReportId}
        onOpenChange={(o) => { if (!o) setAuditReportId(null); }}
        entries={auditLog}
        loading={auditLoading}
        onExport={handleExportAuditXlsx}
        t={t}
      />
      {showOnboarding && (
        <OnboardingDialog
          sigName={sigName}
          setSigName={setSigName}
          isSaving={isSavingOnboard}
          onSave={handleOnboardSave}
          t={t}
        />
      )}
      <ReopenDialog
        report={reopenReport}
        reason={reopenReason}
        setReason={setReopenReason}
        isReopening={isReopening}
        onConfirm={handleReopenConfirm}
        onClose={() => { setReopenReport(null); setReopenReason(""); }}
        t={t}
      />
      <ReassignDialog
        report={reassignReport}
        users={reassignUsers}
        calib={reassignCalibBy}
        verif={reassignVerifBy}
        setCalib={setReassignCalibBy}
        setVerif={setReassignVerifBy}
        isReassigning={isReassigning}
        onConfirm={handleReassignConfirm}
        onClose={() => setReassignReport(null)}
        t={t}
      />
      <BulkConfirmDialog
        action={bulkConfirm}
        count={selectedIds.size}
        busy={isBulkVerifying || isBulkRejecting || isBulkDeleting}
        onConfirm={() => bulkConfirm && handleBulkAction(bulkConfirm)}
        onClose={() => setBulkConfirm(null)}
        t={t}
      />

      {rawExportReport && !rawExportLoading && (
        <RawExportPreview
          report={rawExportReport}
          initialMode={rawExportMode}
          onClose={() => setRawExportReport(null)}
        />
      )}
    </div>
  );
}

// ─── Cell style helpers ───────────────────────────────────────────────────────

function headCell(t: ReturnType<typeof useThemeTokens>["t"]): React.CSSProperties {
  return {
    padding: "12px",
    fontFamily: MONO_FF,
    fontSize: 10, letterSpacing: "0.14em", fontWeight: 700,
    color: t.faint,
    textAlign: "left",
    borderBottom: `1px solid ${t.line}`,
    whiteSpace: "nowrap",
  };
}

function bodyCell(t: ReturnType<typeof useThemeTokens>["t"]): React.CSSProperties {
  return {
    padding: "14px 12px",
    borderBottom: `1px solid ${t.softLine}`,
    verticalAlign: "middle",
  };
}
