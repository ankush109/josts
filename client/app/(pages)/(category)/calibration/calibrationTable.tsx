"use client";

import { useState, useMemo } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  MoreVertical,
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
  TrendingUp,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import { useGetCalibrationReports } from "@/app/hooks/query/useCalibrationReport";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportStatus = "draft" | "submitted" | "verified" | "rejected";

interface ReportListItem {
  _id: string;
  csrNo: string;
  formatNo: string;
  status: ReportStatus;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  instrumentCount: number;
  signatures: {
    calibratedBy?: { name: string; email: string };
    verifiedBy?: { name: string; email: string };
    calibratedAt?: string;
    verifiedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

const STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  draft: {
    label: "Draft",
    className: "bg-zinc-100 text-zinc-600 border-zinc-200",
    icon: <FileText className="h-3 w-3" />,
  },
  submitted: {
    label: "Submitted",
    className: "bg-blue-50 text-blue-700 border-blue-200",
    icon: <Clock className="h-3 w-3" />,
  },
  verified: {
    label: "Verified",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  rejected: {
    label: "Rejected",
    className: "bg-red-50 text-red-700 border-red-200",
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
  icon,
  accent,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 min-w-0 rounded-xl border p-4 text-left transition-all",
        active
          ? "border-blue-300 bg-blue-50 shadow-sm ring-1 ring-blue-200"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={cn("p-2 rounded-lg", accent)}>{icon}</div>
        <span className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</span>
      </div>
      <div className="text-xs font-medium text-zinc-500">{label}</div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CalibrationReportsTable() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useGetCalibrationReports();

  const [currentPage, setCurrentPage]       = useState(1);
  const [itemsPerPage, setItemsPerPage]     = useState(10);
  const [searchQuery, setSearchQuery]       = useState("");
  const [statusFilter, setStatusFilter]     = useState<string>("all");
  const [sortOrder, setSortOrder]           = useState<"asc" | "desc">("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  const allItems: ReportListItem[] = data?.items ?? [];

  // ── Counts for stat cards ──
  const counts = useMemo(() => ({
    total:     allItems.length,
    draft:     allItems.filter((r) => r.status === "draft").length,
    submitted: allItems.filter((r) => r.status === "submitted").length,
    verified:  allItems.filter((r) => r.status === "verified").length,
    rejected:  allItems.filter((r) => r.status === "rejected").length,
  }), [allItems]);

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

  const totalPages  = Math.ceil(processed.length / itemsPerPage);
  const startIndex  = (currentPage - 1) * itemsPerPage;
  const currentRows = processed.slice(startIndex, startIndex + itemsPerPage);

  function onSearch(v: string) { setSearchQuery(v); setCurrentPage(1); }
  function onStatusFilter(v: string) { setStatusFilter(v); setCurrentPage(1); }
  function onItemsPerPage(v: string) { setItemsPerPage(Number(v)); setCurrentPage(1); }
  function onSort() { setSortOrder((s) => (s === "asc" ? "desc" : "asc")); setCurrentPage(1); }

  function handleStatClick(status: string) {
    const next = statusFilter === status ? "all" : status;
    setStatusFilter(next);
    setCurrentPage(1);
  }

  function confirmDelete(id: string) {
    setReportToDelete(id);
    setDeleteDialogOpen(true);
  }

  function handleDelete() {
    if (!reportToDelete) return;
    toast.success("Report deleted");
    setDeleteDialogOpen(false);
    setReportToDelete(null);
    refetch();
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <div className="h-8 w-8 border-2 border-zinc-200 border-t-blue-500 rounded-full animate-spin" />
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
            <p className="font-semibold text-zinc-800">Failed to load reports</p>
            <p className="text-sm text-zinc-500">Please refresh and try again</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Calibration Reports</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Manage and track all calibration report records
          </p>
        </div>
        <Button
          onClick={() => router.push("/calibration/create")}
          className="h-9 gap-2 bg-zinc-900 hover:bg-zinc-700 text-white"
        >
          <Plus className="h-4 w-4" />
          New Report
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="flex gap-3">
        <StatCard
          label="Total Reports"
          value={counts.total}
          icon={<ClipboardList className="h-4 w-4 text-zinc-600" />}
          accent="bg-zinc-100"
          active={statusFilter === "all"}
          onClick={() => handleStatClick("all")}
        />
        <StatCard
          label="Drafts"
          value={counts.draft}
          icon={<FileText className="h-4 w-4 text-zinc-500" />}
          accent="bg-zinc-100"
          active={statusFilter === "draft"}
          onClick={() => handleStatClick("draft")}
        />
        <StatCard
          label="Submitted"
          value={counts.submitted}
          icon={<Clock className="h-4 w-4 text-blue-600" />}
          accent="bg-blue-50"
          active={statusFilter === "submitted"}
          onClick={() => handleStatClick("submitted")}
        />
        <StatCard
          label="Verified"
          value={counts.verified}
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          accent="bg-emerald-50"
          active={statusFilter === "verified"}
          onClick={() => handleStatClick("verified")}
        />
        <StatCard
          label="Rejected"
          value={counts.rejected}
          icon={<XCircle className="h-4 w-4 text-red-500" />}
          accent="bg-red-50"
          active={statusFilter === "rejected"}
          onClick={() => handleStatClick("rejected")}
        />
      </div>

      {/* ── Main table card ── */}
      <Card className="shadow-sm border-zinc-200">
        <CardContent className="p-0">

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-zinc-100">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                placeholder="Search by CSR No or engineer…"
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                className="pl-9 h-9 text-sm border-zinc-200"
              />
            </div>

            <div className="flex gap-2 ml-auto items-center">
              {/* Status filter */}
              <Select value={statusFilter} onValueChange={onStatusFilter}>
                <SelectTrigger className="h-9 w-36 text-sm border-zinc-200">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Button
                variant="outline"
                size="sm"
                onClick={onSort}
                className="h-9 gap-1.5 text-sm border-zinc-200"
              >
                {sortOrder === "asc" ? (
                  <ArrowUp className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" />
                )}
                {sortOrder === "asc" ? "Oldest" : "Newest"}
              </Button>

              {/* Per page */}
              <Select value={String(itemsPerPage)} onValueChange={onItemsPerPage}>
                <SelectTrigger className="h-9 w-28 text-sm border-zinc-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[5, 10, 20, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} / page
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                  <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide pl-5">
                    CSR No
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                    Status
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                    Created By
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                    Instruments
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                    Calibrated By
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                    Verified By
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
                    Date
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide text-right pr-5">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3 text-zinc-400">
                        <div className="h-12 w-12 rounded-full bg-zinc-100 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-zinc-300" />
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-500 text-sm">No reports found</p>
                          <p className="text-xs text-zinc-400 mt-1">
                            {searchQuery || statusFilter !== "all"
                              ? "Try adjusting your search or filters"
                              : "Create your first calibration report"}
                          </p>
                        </div>
                        {!searchQuery && statusFilter === "all" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push("/calibration/create")}
                            className="gap-1.5 mt-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            New Report
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentRows.map((report) => (
                    <TableRow
                      key={report._id}
                      className="hover:bg-zinc-50/60 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/calibration/${report._id}`)}
                    >
                      {/* CSR No */}
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-zinc-200 transition-colors">
                            <FlaskConical className="h-3.5 w-3.5 text-zinc-500" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-zinc-800">{report.csrNo}</p>
                            <p className="text-xs text-zinc-400">{report.formatNo}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <StatusBadge status={report.status} />
                      </TableCell>

                      {/* Created by */}
                      <TableCell>
                        <div>
                          <p className="text-sm text-zinc-700 font-medium">
                            {report.createdBy?.name ?? "—"}
                          </p>
                          <p className="text-xs text-zinc-400">{report.createdBy?.email ?? ""}</p>
                        </div>
                      </TableCell>

                      {/* Instrument count */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Layers className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="font-medium text-zinc-700">{report.instrumentCount}</span>
                        </div>
                      </TableCell>

                      {/* Calibrated by */}
                      <TableCell>
                        {report.signatures?.calibratedBy ? (
                          <div>
                            <p className="text-sm text-zinc-700">{report.signatures.calibratedBy.name}</p>
                            {report.signatures.calibratedAt && (
                              <p className="text-xs text-zinc-400">
                                {new Date(report.signatures.calibratedAt).toLocaleDateString("en-IN", {
                                  day: "numeric", month: "short", year: "numeric",
                                })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-300">—</span>
                        )}
                      </TableCell>

                      {/* Verified by */}
                      <TableCell>
                        {report.signatures?.verifiedBy ? (
                          <div>
                            <p className="text-sm text-zinc-700">{report.signatures.verifiedBy.name}</p>
                            {report.signatures.verifiedAt && (
                              <p className="text-xs text-zinc-400">
                                {new Date(report.signatures.verifiedAt).toLocaleDateString("en-IN", {
                                  day: "numeric", month: "short", year: "numeric",
                                })}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-300">—</span>
                        )}
                      </TableCell>

                      {/* Date */}
                      <TableCell>
                        <div>
                          <p className="text-sm text-zinc-600">
                            {new Date(report.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {new Date(report.updatedAt).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short",
                            })} updated
                          </p>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-xs text-zinc-400">
                              Actions
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/calibration/${report._id}`);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDelete(report._id);
                              }}
                              disabled={report.status !== "draft"}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>

              {processed.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={8} className="text-xs text-zinc-400 py-2.5 pl-5">
                      Showing {startIndex + 1}–{Math.min(startIndex + itemsPerPage, processed.length)} of{" "}
                      {processed.length} report{processed.length !== 1 ? "s" : ""}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
              <p className="text-sm text-zinc-400">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p - 1)}
                  disabled={currentPage === 1}
                  className="h-8 border-zinc-200"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      (p >= currentPage - 1 && p <= currentPage + 1)
                  )
                  .map((page, idx, arr) => (
                    <div key={page} className="flex gap-1.5">
                      {idx > 0 && page - arr[idx - 1] > 1 && (
                        <span className="px-2 py-1 text-zinc-400 text-sm">…</span>
                      )}
                      <Button
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={cn("h-8 min-w-[32px]", currentPage !== page && "border-zinc-200")}
                      >
                        {page}
                      </Button>
                    </div>
                  ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => p + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 border-zinc-200"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The report will be permanently removed.
              Only draft reports can be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
