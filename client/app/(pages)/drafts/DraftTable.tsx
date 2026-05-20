"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
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
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Edit,
  FilePenLine,
  Layers,
  MoreVertical,
  Search,
  Trash,
  AlertCircle,
  CloudOff,
} from "lucide-react";
import Loading from "@/components/Loader";
import { useGetCalibrationReports } from "@/app/hooks";
import { useLocalDraftReports } from "@/app/hooks/useLocalDraftReports";
import { authClient as AUTH_API } from "@/lib/api-client";
import { EP_DELETE_CALIBRATION_REPORT } from "@/lib/endpoints";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CALIBRATION_REPORTS_KEY } from "@/app/hooks/query/useCalibrationReport";

interface DraftRow {
  _id: string;
  customerName: string;
  instrumentCount: number;
  createdBy: { name?: string; email?: string };
  createdAt: string;
  updatedAt: string;
  isLocal: boolean;
}

export default function DraftTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useGetCalibrationReports();
  const { items: localItems } = useLocalDraftReports();

  const { mutate: deleteReport, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => AUTH_API.delete(EP_DELETE_CALIBRATION_REPORT(id)),
    onSuccess: () => {
      toast.success("Draft deleted");
      queryClient.invalidateQueries({ queryKey: [CALIBRATION_REPORTS_KEY] });
      setDeleteDialogOpen(false);
      setReportToDelete(null);
    },
    onError: () => toast.error("Failed to delete draft"),
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<DraftRow | null>(null);

  const rows: DraftRow[] = useMemo(() => {
    type CalibItem = {
      _id: string;
      status: string;
      customerName?: string;
      instrumentCount?: number;
      instruments?: unknown[];
      createdBy?: { name?: string; email?: string };
      createdAt: string;
      updatedAt: string;
    };
    const items = (data?.items ?? []) as unknown as CalibItem[];
    const serverDrafts: DraftRow[] = items
      .filter((r) => r.status === "draft")
      .map((r) => ({
        _id: r._id,
        customerName: r.customerName ?? "",
        instrumentCount: r.instrumentCount ?? r.instruments?.length ?? 0,
        createdBy: {
          name: r.createdBy?.name,
          email: r.createdBy?.email,
        },
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        isLocal: false,
      }));
    const local: DraftRow[] = localItems.map((r) => ({
      _id: r._id,
      customerName: r.customerName ?? "",
      instrumentCount: r.instrumentCount ?? 0,
      createdBy: { name: r.createdBy?.name, email: r.createdBy?.email },
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      isLocal: true,
    }));
    return [...local, ...serverDrafts];
  }, [data?.items, localItems]);

  const filteredSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? rows.filter(
          (r) =>
            r.customerName.toLowerCase().includes(q) ||
            r.createdBy?.name?.toLowerCase().includes(q),
        )
      : rows;
    return [...filtered].sort((a, b) => {
      const diff = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      return sortOrder === "asc" ? diff : -diff;
    });
  }, [rows, searchQuery, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRows = filteredSorted.slice(startIndex, endIndex);

  function confirmDelete(row: DraftRow) {
    if (row.isLocal) {
      toast.info("Local drafts can only be deleted from the calibration page");
      return;
    }
    setReportToDelete(row);
    setDeleteDialogOpen(true);
  }

  function handleDelete() {
    if (!reportToDelete) return;
    deleteReport(reportToDelete._id);
  }

  if (isLoading) return <Loading />;
  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <h3 className="font-semibold text-lg">Error Loading Drafts</h3>
              <p className="text-sm text-muted-foreground">Please try refreshing</p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Draft Reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by CSR No, customer, or engineer…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder((s) => (s === "asc" ? "desc" : "asc"))}
                className="flex items-center gap-2"
              >
                {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                {sortOrder === "asc" ? "Oldest" : "Newest"}
              </Button>

              <Select
                value={itemsPerPage.toString()}
                onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}
              >
                <SelectTrigger className="w-28 sm:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 / page</SelectItem>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="font-semibold">CSR No</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Instruments</TableHead>
                  <TableHead className="font-semibold">Created By</TableHead>
                  <TableHead className="font-semibold">Last Edited</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-2">
                        <FilePenLine className="h-12 w-12 text-muted-foreground/40" />
                        <p className="text-muted-foreground font-medium">No drafts found</p>
                        <p className="text-sm text-muted-foreground/70">
                          {searchQuery ? "Try adjusting your search" : "Drafts you save will appear here"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentRows.map((row) => (
                    <TableRow
                      key={row._id}
                      className="hover:bg-muted/40 transition-colors cursor-pointer"
                      onClick={() => router.push(`/calibration/${row._id}`)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FilePenLine className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-mono text-sm">{row.customerName || "—"}</span>
                          {row.isLocal && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <CloudOff className="h-3 w-3" /> Local
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.customerName || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold bg-muted text-muted-foreground">
                          <Layers className="h-3 w-3" />
                          {row.instrumentCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {row.createdBy?.name || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(row.updatedAt).toLocaleDateString("en-IN", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/calibration/${row._id}`} className="cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Draft
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => confirmDelete(row)}
                              disabled={row.isLocal}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete Draft
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredSorted.length > 0 && (
            <div className="flex items-center justify-between pt-2 text-sm text-muted-foreground">
              <span>
                Showing {startIndex + 1}–{Math.min(endIndex, filteredSorted.length)} of {filteredSorted.length} draft{filteredSorted.length !== 1 ? "s" : ""}
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span>Page {currentPage} of {totalPages}</span>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the draft. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
