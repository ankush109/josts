"use client";

import { useState, useMemo, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Pencil,
  Trash2,
  FlaskConical,
  Layers,
  Plus,
  ClipboardList,
  Eye,
  Download,
  Loader2,
  ShieldCheck,
  ShieldX,
  History,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { useGetCalibrationReports } from "@/app/hooks/query/useCalibrationReport";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AUTH_API } from "@/app/hooks/client";
import { ENDPOINTS } from "@/app/hooks/endpoints";
import { useAuth } from "@/app/provider/AuthProvider";
import { useVerifyRejectCalibration } from "@/app/hooks/mutation/(calibration)/useVerifyRejectCalibration";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useGetAuditLog, type AuditEntry } from "@/app/hooks/query/(calibration)/useGetAuditLog";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportStatus = "draft" | "submitted" | "verified" | "rejected";

interface ReportListItem {
  _id: string;
  csrNo: string;
  formatNo: string;
  status: ReportStatus;
  createdBy: { _id: string; name: string; email: string };
  instrumentCount: number;
  instruments: { make: string; modelType: string }[];
  signatures: {
    calibratedBy?: { name: string; email: string };
    verifiedBy?: { name: string; email: string };
    calibratedAt?: string;
    verifiedAt?: string;
  };
  filePaths: string[];
  customerName: string;
  createdAt: string;
  updatedAt: string;
}

const NAVY       = "#1e3a5f";
const NAVY_DARK  = "#4a7bb5";   // lighter navy for dark mode
const NAVY_LIGHT = "#e8eef5";
const NAVY_LIGHT_DARK = "oklch(0.26 0.03 255)"; // muted dark header row
const NAVY_MEDIUM = "#c7d5e5";

// ─── Audit row component ───────────────────────────────────────────────────────

const ACTION_META: Record<AuditEntry["action"], { label: string; color: string }> = {
  created:        { label: "Created",        color: "bg-emerald-100 text-emerald-700" },
  updated:        { label: "Updated",        color: "bg-blue-100 text-blue-700" },
  status_changed: { label: "Status changed", color: "bg-violet-100 text-violet-700" },
  deleted:        { label: "Deleted",        color: "bg-red-100 text-red-700" },
};

function AuditRow({ entry, isLast }: { entry: AuditEntry; isLast: boolean }) {
  const baseMeta = ACTION_META[entry.action] ?? { label: entry.action, color: "bg-zinc-100 text-zinc-600" };
  const meta = entry.action === "status_changed"
    ? entry.changes[0]?.to === "verified"
      ? { label: "Verified",  color: "bg-emerald-100 text-emerald-700" }
      : entry.changes[0]?.to === "rejected"
      ? { label: "Rejected",  color: "bg-red-100 text-red-700" }
      : baseMeta
    : baseMeta;
  const name = entry.performedBy?.signatureName || entry.performedBy?.name || entry.performedBy?.email || "Unknown";
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const date = new Date(entry.createdAt);
  const dateStr = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <li className={cn("ml-6 pb-6", isLast && "pb-0")}>
      {/* dot */}
      <span className="absolute -left-[9px] flex h-[18px] w-[18px] items-center justify-center rounded-full bg-white border-2 border-zinc-300 ring-2 ring-white dark:bg-zinc-800 dark:border-zinc-600 dark:ring-zinc-800" />

      <div className="rounded-xl border border-zinc-100 bg-zinc-50/60 p-3 dark:border-zinc-700 dark:bg-zinc-800/50">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0 dark:bg-zinc-600">
              {initials}
            </div>
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{name}</span>
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", meta.color)}>{meta.label}</span>
          </div>
          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 whitespace-nowrap">{dateStr} · {timeStr}</span>
        </div>
      </div>
    </li>
  );
}

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  draft: {
    label: "Draft",
    className: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600",
    icon: <FileText className="h-3 w-3" />,
  },
  submitted: {
    label: "Submitted",
    className: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800",
    icon: <Clock className="h-3 w-3" />,
  },
  verified: {
    label: "Verified",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
    icon: <XCircle className="h-3 w-3" />,
  },
};

function StatusBadge({ status }: { status: ReportStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.className}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  total,
  icon,
  accent,
  barColor,
  active,
  onClick,
}: {
  label: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  accent: string;
  barColor: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const cardNavy = isDark ? NAVY_DARK : NAVY;
  const cardNavyLight = isDark ? NAVY_LIGHT_DARK : NAVY_LIGHT;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 min-w-[120px] rounded-xl border p-4 text-left transition-all",
        active
          ? isDark ? "border-[#4a7bb5]/40 shadow-sm ring-1 ring-[#4a7bb5]/20" : "border-[#1e3a5f]/40 shadow-sm ring-1 ring-[#1e3a5f]/20"
          : "border-slate-200 bg-white hover:border-[#1e3a5f]/20 hover:shadow-sm dark:bg-zinc-900 dark:border-zinc-700 dark:hover:border-zinc-500"
      )}
      style={active ? { backgroundColor: cardNavyLight } : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={cn("p-2 rounded-lg", accent)}>{icon}</div>
        <span className="text-2xl font-bold tabular-nums" style={{ color: cardNavy }}>
          {value}
        </span>
      </div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CalibrationReportsTable() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const navy      = isDark ? NAVY_DARK      : NAVY;
  const navyLight = isDark ? NAVY_LIGHT_DARK : NAVY_LIGHT;
  const { user, setUser } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data, isLoading, isError, refetch } = useGetCalibrationReports();
  const { mutate: verifyReject } = useVerifyRejectCalibration();
  const queryClient = useQueryClient();
  const { mutate: deleteReport, isPending: isDeleting } = useMutation({
    mutationFn: (reportId: string) => AUTH_API.delete(ENDPOINTS.DELETE_CALIBRATION_REPORT(reportId)),
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
      await AUTH_API.put(ENDPOINTS.UPDATE_PROFILE(), { signatureName: sigName.trim() });
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
  const [reportToDelete, setReportToDelete] = useState<ReportListItem | null>(null);
  const [viewingPdf,    setViewingPdf]    = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);
  const [auditReportId, setAuditReportId] = useState<string | null>(null);
  const { data: auditLog, isLoading: auditLoading } = useGetAuditLog(auditReportId);
  const allItems: ReportListItem[] = data?.items ?? [];

  function isPdfFailed(report: ReportListItem) {
    if (report.filePaths?.length) return false;
    if (report.status === "draft") return false;
    return Date.now() - new Date(report.createdAt).getTime() > 24 * 60 * 60 * 1000;
  }

  function isPdfPending(report: ReportListItem) {
    return report.status !== "draft" && !report.filePaths?.length && !isPdfFailed(report);
  }

  // ── Counts for stat cards ──
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

  // ── Filtered + sorted ──
  const processed = useMemo(() => {
    let list = [...allItems];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.csrNo.toLowerCase().includes(q) ||
          r.createdBy?.name?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
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

  function handleStatClick(status: string) {
    setStatusFilter(statusFilter === status ? "all" : status);
    setCurrentPage(1);
  }

  function confirmDelete(report: ReportListItem) { setReportToDelete(report); setDeleteDialogOpen(true); }

  function toTitleCase(str: string) {
    return str.replace(/\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }

  async function handleViewPdf(e: React.MouseEvent, reportId: string, index = 0) {
    e.stopPropagation();
    setViewingPdf(reportId);
    try {
      const res = await AUTH_API.get(ENDPOINTS.GET_REPORT_URL(reportId, "calibration"));
      const urls: string[] = res.data.fileUrls;
      window.open(urls[index] ?? urls[0], "_blank");
    } catch {
      toast.error("Failed to load PDF");
    } finally {
      setViewingPdf(null);
    }
  }

  async function handleDownloadPdf(e: React.MouseEvent, report: ReportListItem, index = 0) {
    e.stopPropagation();
    setDownloadingPdf(report._id);
    try {
      const res = await AUTH_API.get(ENDPOINTS.GET_REPORT_URL(report._id, "calibration", true));
      const urls: string[] = res.data.fileUrls;
      window.open(urls[index] ?? urls[0], "_blank");
    } catch {
      toast.error("Failed to download PDF");
    } finally {
      setDownloadingPdf(null);
    }
  }

  function handleDelete() {
    if (!reportToDelete) return;
    deleteReport(reportToDelete._id);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="h-8 w-8 border-2 rounded-full animate-spin" style={{ borderColor: NAVY_MEDIUM, borderTopColor: NAVY }} />
          <span className="text-sm">Loading reports…</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-sm">
          <CardContent className="pt-6 flex flex-col items-center gap-2 text-center">
            <AlertCircle className="h-10 w-10 text-red-400" />
            <p className="font-semibold" style={{ color: navy }}>Failed to load reports</p>
            <p className="text-sm text-slate-500">Please refresh and try again</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2" style={{ borderColor: navy, color: navy }}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: navy }}>Calibration Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage and track all calibration report records</p>
        </div>
        {!isAdmin && (
          <Button onClick={() => router.push("/calibration/create")} className="h-9 gap-2 text-white" style={{ backgroundColor: navy }}>
            <Plus className="h-4 w-4" /> New Report
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard label="Total Reports" value={counts.total} total={counts.total} barColor={isDark ? "bg-[#4a7bb5]" : "bg-[#1e3a5f]"} icon={<ClipboardList className="h-4 w-4" style={{ color: navy }} />} accent={isDark ? "bg-[#1e3a5f]/30" : "bg-[#e8eef5]"} active={statusFilter === "all"} onClick={() => handleStatClick("all")} />
        <StatCard label="Drafts" value={counts.draft} total={counts.total} barColor="bg-slate-400" icon={<FileText className="h-4 w-4 text-slate-500" />} accent="bg-slate-100" active={statusFilter === "draft"} onClick={() => handleStatClick("draft")} />
        <StatCard label="Submitted" value={counts.submitted} total={counts.total} barColor="bg-sky-500" icon={<Clock className="h-4 w-4 text-sky-600" />} accent="bg-sky-50" active={statusFilter === "submitted"} onClick={() => handleStatClick("submitted")} />
        <StatCard label="Verified" value={counts.verified} total={counts.total} barColor="bg-emerald-500" icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />} accent="bg-emerald-50" active={statusFilter === "verified"} onClick={() => handleStatClick("verified")} />
        <StatCard label="Rejected" value={counts.rejected} total={counts.total} barColor="bg-red-400" icon={<XCircle className="h-4 w-4 text-red-500" />} accent="bg-red-50" active={statusFilter === "rejected"} onClick={() => handleStatClick("rejected")} />
      </div>

      <Card className="shadow-sm border-slate-200 dark:border-zinc-700">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-100 dark:border-zinc-700">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search by CSR No or engineer…" value={searchQuery} onChange={(e) => onSearch(e.target.value)} className="pl-9 h-9 text-sm border-slate-200 focus-visible:ring-[#1e3a5f]/30" />
            </div>
            <div className="flex gap-2 ml-auto items-center">
              <Select value={statusFilter} onValueChange={onStatusFilter}>
                <SelectTrigger className="h-9 w-36 text-sm border-slate-200"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={onSort} className="h-9 gap-1.5 text-sm border-slate-200">
                {sortOrder === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
                {sortOrder === "asc" ? "Oldest" : "Newest"}
              </Button>
              <Select value={String(itemsPerPage)} onValueChange={onItemsPerPage}>
                <SelectTrigger className="h-9 w-28 text-sm border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map((n) => (<SelectItem key={n} value={String(n)}>{n} / page</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent" style={{ backgroundColor: navyLight }}>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide pl-5" style={{ color: navy }}>CSR No</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: navy }}>Status</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: navy }}>Created By</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: navy }}>Instruments</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: navy }}>Customer</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: navy }}>Calibrated By</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: navy }}>Verified By</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: navy }}>Date</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-center" style={{ color: navy }}>PDF</TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-right pr-4" style={{ color: navy }}>Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-slate-400">
                        <div className="h-12 w-12 rounded-full flex items-center justify-center" style={{ backgroundColor: navyLight }}>
                          <FileText className="h-6 w-6" style={{ color: navy }} />
                        </div>
                        <div>
                          <p className="font-semibold text-sm" style={{ color: navy }}>No reports found</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {searchQuery || statusFilter !== "all" ? "Try adjusting your search or filters" : "Create your first calibration report"}
                          </p>
                        </div>
                        {!isAdmin && !searchQuery && statusFilter === "all" && (
                          <Button size="sm" variant="outline" onClick={() => router.push("/calibration/create")} className="gap-1.5 mt-1" style={{ borderColor: navy, color: navy }}>
                            <Plus className="h-3.5 w-3.5" /> New Report
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentRows.map((report) => (
                    <TableRow key={report._id} className="hover:bg-accent/40 transition-colors cursor-pointer group border-l-2 border-l-transparent hover:border-l-primary/30" onClick={() => router.push(`/calibration/${report._id}`)}>
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors" style={{ backgroundColor: navyLight }}>
                            <FlaskConical className="h-3.5 w-3.5" style={{ color: navy }} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm" style={{ color: navy }}>{report.csrNo}</p>
                            <p className="text-xs text-slate-400 dark:text-zinc-500">{report.formatNo}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={report.status} /></TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm text-slate-700 font-medium dark:text-zinc-200">{report.createdBy?.name ?? "—"}</p>
                          <p className="text-xs text-slate-400 dark:text-zinc-500">{report.createdBy?.email ?? ""}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-600 cursor-default">
                              <Layers className="h-3 w-3" />
                              {report.instrumentCount}
                            </span>
                          </TooltipTrigger>
                          {report.instruments?.length > 0 && (
                            <TooltipContent side="right" className="max-w-[200px] p-2 space-y-1">
                              {report.instruments.map((inst, i) => (
                                <div key={i} className="text-[11px] leading-tight">
                                  {toTitleCase(`${inst.make} ${inst.modelType}`.trim()) || `Instrument ${i + 1}`}
                                </div>
                              ))}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        {report.customerName ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200 max-w-[140px] truncate dark:bg-violet-950 dark:text-violet-300 dark:border-violet-800">
                            {report.customerName}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.signatures?.calibratedBy
                          ? <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">{report.signatures.calibratedBy.name}</span>
                          : <span className="text-xs text-slate-300 dark:text-zinc-600">—</span>}
                      </TableCell>
                      <TableCell>
                        {report.signatures?.verifiedBy
                          ? <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">{report.signatures.verifiedBy.name}</span>
                          : <span className="text-xs text-slate-300 dark:text-zinc-600">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-slate-700 dark:text-zinc-200">
                            {new Date(report.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                          <span className="text-xs text-slate-400 dark:text-zinc-500">
                            {new Date(report.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {report.status === "draft" ? (
                          <span className="text-xs text-slate-300 dark:text-zinc-600">—</span>
                        ) : isPdfFailed(report) ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center gap-1 text-xs text-red-400 font-medium cursor-default">
                                <XCircle className="h-3.5 w-3.5" /> Failed
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>PDF generation failed</TooltipContent>
                          </Tooltip>
                        ) : isPdfPending(report) ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Loader2 className="h-4 w-4 animate-spin text-amber-500 mx-auto cursor-default" />
                            </TooltipTrigger>
                            <TooltipContent>PDF is being generated…</TooltipContent>
                          </Tooltip>
                        ) : report.filePaths.length > 0 ? (
                          report.filePaths.length > 1 ? (
                            /* multiple PDFs — show count badge with separate view/download dropdowns */
                            <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="inline-flex items-center gap-1 px-2 py-1 rounded-l-md border border-r-0 border-slate-200 dark:border-zinc-700 text-[11px] font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50" disabled={viewingPdf === report._id}>
                                    {viewingPdf === report._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                                    <span>{report.filePaths.length}</span>
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center">
                                  <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider">View PDF</DropdownMenuLabel>
                                  {report.filePaths.map((_, i) => {
                                    const inst = report.instruments[i];
                                    const label = inst ? toTitleCase(`${inst.make} ${inst.modelType}`.trim()) : `Instrument ${i + 1}`;
                                    return <DropdownMenuItem key={i} onClick={(e) => handleViewPdf(e, report._id, i)}><Eye className="mr-2 h-3.5 w-3.5" />{label}</DropdownMenuItem>;
                                  })}
                                </DropdownMenuContent>
                              </DropdownMenu>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button className="inline-flex items-center px-2 py-1 rounded-r-md border border-slate-200 dark:border-zinc-700 text-[11px] font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50" disabled={downloadingPdf === report._id}>
                                    {downloadingPdf === report._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center">
                                  <DropdownMenuLabel className="text-[10px] text-slate-400 uppercase tracking-wider">Download PDF</DropdownMenuLabel>
                                  {report.filePaths.map((_, i) => {
                                    const inst = report.instruments[i];
                                    const label = inst ? toTitleCase(`${inst.make} ${inst.modelType}`.trim()) : `Instrument ${i + 1}`;
                                    return <DropdownMenuItem key={i} onClick={(e) => handleDownloadPdf(e, report, i)}><Download className="mr-2 h-3.5 w-3.5" />{label}</DropdownMenuItem>;
                                  })}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ) : (
                            /* single PDF — pill button group */
                            <div className="inline-flex items-center rounded-md border border-slate-200 dark:border-zinc-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => handleViewPdf(e, report._id)}
                                    disabled={viewingPdf === report._id}
                                    className="px-2.5 py-1.5 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-[#1e3a5f] dark:hover:text-blue-400 transition-colors border-r border-slate-200 dark:border-zinc-700 disabled:opacity-50"
                                  >
                                    {viewingPdf === report._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>View PDF</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => handleDownloadPdf(e, report)}
                                    disabled={downloadingPdf === report._id}
                                    className="px-2.5 py-1.5 text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-[#1e3a5f] dark:hover:text-blue-400 transition-colors disabled:opacity-50"
                                  >
                                    {downloadingPdf === report._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Download PDF</TooltipContent>
                              </Tooltip>
                            </div>
                          )
                        ) : (
                          <span className="text-xs text-slate-300 dark:text-zinc-600">—</span>
                        )}
                      </TableCell>
                      <TableCell className="pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {/* Edit — non-admin only */}
                          {!isAdmin && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => { e.stopPropagation(); router.push(`/calibration/${report._id}`); }}
                                  className="p-1.5 rounded-md text-slate-400 hover:text-[#1e3a5f] dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Edit report</TooltipContent>
                            </Tooltip>
                          )}
                          {/* History */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={(e) => { e.stopPropagation(); setAuditReportId(report._id); }}
                                className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                              >
                                <History className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>View history</TooltipContent>
                          </Tooltip>
                          {/* Admin: Verify / Reject */}
                          {isAdmin && report.status === "submitted" && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => handleVerifyReject(e, report._id, "verified")}
                                    className="p-1.5 rounded-md text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                  >
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Verify report</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={(e) => handleVerifyReject(e, report._id, "rejected")}
                                    className="p-1.5 rounded-md text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                  >
                                    <ShieldX className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Reject report</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                          {/* Delete — non-admin only */}
                          {!isAdmin && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => { e.stopPropagation(); confirmDelete(report); }}
                                  className="p-1.5 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Delete report</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>

              {processed.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={10} className="text-xs text-slate-400 py-2.5 pl-5">
                      Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, processed.length)} of {processed.length} report{processed.length !== 1 ? "s" : ""}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-sm text-slate-400">Page {currentPage} of {totalPages}</p>
              <div className="flex gap-1.5">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 1} className="h-8 border-slate-200">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                  .map((page, idx, arr) => (
                    <div key={page} className="flex gap-1.5">
                      {idx > 0 && page - arr[idx - 1] > 1 && <span className="px-2 py-1 text-slate-400 text-sm">…</span>}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={cn("h-8 min-w-[32px]", currentPage === page ? "text-white" : "border-slate-200")}
                        style={currentPage === page ? { backgroundColor: navy } : undefined}
                      >{page}</Button>
                    </div>
                  ))}
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage === totalPages} className="h-8 border-slate-200">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-sm p-5">
          <AlertDialogHeader className="mb-3">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-sm font-semibold text-zinc-900 leading-tight">Delete Report</AlertDialogTitle>
                <p className="text-xs text-zinc-400">This cannot be undone</p>
              </div>
            </div>
          </AlertDialogHeader>

          <AlertDialogDescription asChild>
            <div className="space-y-2">
              {reportToDelete && (
                <>
                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-100">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">CSR No</span>
                    <span className="text-sm font-bold text-zinc-900 font-mono">{reportToDelete.csrNo}</span>
                  </div>
                  {reportToDelete.instruments?.length > 0 && (
                    <div className="flex items-start justify-between py-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mt-1">
                        {reportToDelete.instruments.length > 1 ? "Instruments" : "Instrument"}
                      </span>
                      <div className="flex flex-wrap gap-1.5 justify-end max-w-[60%]">
                        {reportToDelete.instruments.map((inst, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 text-xs font-medium">
                            {[inst.make, inst.modelType].filter(Boolean).join(" ") || "Unknown"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </AlertDialogDescription>

          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel disabled={isDeleting} className="flex-1 h-9 text-sm">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="flex-1 h-9 text-sm bg-red-600 hover:bg-red-700">
              {isDeleting ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Deleting…</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Audit history dialog ── */}
      <Dialog open={!!auditReportId} onOpenChange={(o) => { if (!o) setAuditReportId(null); }}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-zinc-500" /> Audit History
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 mt-2">
            {auditLoading ? (
              <div className="flex items-center justify-center h-32 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            ) : !auditLog?.length ? (
              <div className="flex flex-col items-center justify-center h-32 text-sm text-zinc-400 gap-2">
                <History className="h-6 w-6 opacity-30" />
                No history yet
              </div>
            ) : (
              <ol className="relative border-l border-zinc-200 ml-3 space-y-0">
                {auditLog.map((entry, i) => (
                  <AuditRow key={entry._id} entry={entry} isLast={i === auditLog.length - 1} />
                ))}
              </ol>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── First-login onboarding modal ── */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 flex flex-col gap-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="h-14 w-14 rounded-full flex items-center justify-center mb-1" style={{ backgroundColor: navyLight }}>
                <PenLine className="h-6 w-6" style={{ color: navy }} />
              </div>
              <h2 className="text-xl font-semibold tracking-tight" style={{ color: navy }}>
                One last step
              </h2>
              <p className="text-sm text-slate-500 max-w-xs">
                Enter the name you&apos;d like to appear on calibration certificates and reports.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Signature / Display Name</label>
              <Input
                autoFocus
                placeholder="e.g. Ankush Kumar"
                value={sigName}
                onChange={(e) => setSigName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleOnboardSave()}
                className="h-10"
              />
              <p className="text-xs text-slate-400">This will be shown under your signature on all documents.</p>
            </div>

            <Button
              onClick={handleOnboardSave}
              disabled={!sigName.trim() || isSavingOnboard}
              className="w-full h-10 text-white"
              style={{ backgroundColor: navy }}
            >
              {isSavingOnboard ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get started →"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}