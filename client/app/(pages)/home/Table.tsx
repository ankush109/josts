"use client";

import { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { useGetReportsQuery } from "@/app/hooks/query/useGetReports";
import { getReportUrl } from "@/app/hooks/query/useGetReportUrl";
import { 
  EyeIcon, 
  Trash,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { useDeleteReportMutation } from "@/app/hooks/mutation/useDeleteReportMutation";
import { toast } from "sonner";
import Loading from "@/components/Loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChangeReportStatusMutation } from "@/app/hooks/mutation/updateReportStatus";

export default function PdfTable() {
  const { data, isLoading, isError, refetch } = useGetReportsQuery();
  const { mutate: changeReportStatus} = useChangeReportStatusMutation()
  const { mutate: deleteReport } = useDeleteReportMutation();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<string | null>(null);

  async function handlePreview(id: string) {
    try {
      const reportData = await getReportUrl(id);
      const reportUrl = reportData?.fileUrl;
      if (reportUrl) {
        window.open(reportUrl, "_blank");
      }
    } catch (error) {
      toast.error("Failed to open report");
    }
  }

  function confirmDelete(reportId: string) {
    setReportToDelete(reportId);
    setDeleteDialogOpen(true);
  }

  async function handleDelete() {
    if (!reportToDelete) return;
    
    deleteReport(reportToDelete, {
      onSuccess: () => {
        toast.success("Report deleted successfully");
        refetch();
        setDeleteDialogOpen(false);
        setReportToDelete(null);
      },
      onError: () => {
        toast.error("Failed to delete report");
      },
    });
  }

  const filteredAndSortedReports = useMemo(() => {
    const reports = data?.reports || [];
    
    let filtered = reports.filter((report: any) =>
      report.payload?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    filtered = [...filtered].sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
    });
    
    return filtered;
  }, [data?.reports, searchQuery, sortOrder]);

  const totalPages = Math.ceil(filteredAndSortedReports.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentReports = filteredAndSortedReports.slice(startIndex, endIndex);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleSortToggle = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
 const handleApprove = (reportId: string) => {
  changeReportStatus({reportId:reportId, status:"approved"}, {
    onSuccess: () => {
      toast.success("Report approved successfully");
      refetch();
    },
    onError: () => {
      toast.error("Failed to approve report");
    },
  });
    
  }
  const handleReject = (reportId: string) => {
    changeReportStatus({reportId:reportId, status:"rejected"}, {
      onSuccess: () => {
        toast.success("Report rejected successfully");
        refetch();
      },
      onError: () => {
        toast.error("Failed to reject report");
      },
    });
  }
  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1);
  };

  if (isLoading) return <Loading />;
  if (isError) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h3 className="font-semibold text-lg">Error Loading Reports</h3>
            <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Reports Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by report name..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSortToggle}
                className="flex items-center gap-2"
              >
                {sortOrder === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
                {sortOrder === "asc" ? "Oldest First" : "Newest First"}
              </Button>

              <Select
                value={itemsPerPage.toString()}
                onValueChange={handleItemsPerPageChange}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead className="font-semibold">Report Name</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Reported By</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="font-semibold">Approval</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {currentReports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center space-y-2">
                        <FileText className="h-12 w-12 text-muted-foreground/40" />
                        <p className="text-muted-foreground font-medium">No reports found</p>
                        <p className="text-sm text-muted-foreground/70">Try adjusting your search criteria</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  currentReports.map((report: any) => (
                    <TableRow key={report._id} className="hover:bg-muted/40 transition-colors">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          {report.payload?.name || "Untitled Report"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(report.status)} className="flex items-center gap-1 w-fit">
                          {getStatusIcon(report.status)}
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">
                        {report.reportedByUser?.name || "Unknown User"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(report.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </TableCell>
                      <TableCell>
                        {report.approvalStatus === "approved" ? (
                          <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        ) : report.approvalStatus === "rejected" ? (
                          <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-200">
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejected
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handlePreview(report._id)}>
                              <EyeIcon className="mr-2 h-4 w-4" />
                              View Report
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePreview(report._id)}>
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => confirmDelete(report._id)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash color="red" className="mr-2 h-4 w-4" />
                              Delete Report
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                           
                            <DropdownMenuItem className="text-green-600" onClick={() => handleApprove(report._id)}>
                              <CheckCircle2 color="green" className="mr-2 h-4 w-4" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => handleReject(report._id)}>
                              <CheckCircle2 color="red" className="mr-2 h-4 w-4" />
                              Reject
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>

              {filteredAndSortedReports.length > 0 && (
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={6} className="text-sm text-muted-foreground">
                      Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedReports.length)} of {filteredAndSortedReports.length} reports
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>

                <div className="hidden sm:flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      );
                    })
                    .map((page, index, array) => {
                      const showEllipsisBefore =
                        index > 0 && page - array[index - 1] > 1;

                      return (
                        <div key={page} className="flex gap-1">
                          {showEllipsisBefore && (
                            <span className="px-3 py-1 text-gray-400">...</span>
                          )}
                          <Button
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="min-w-[40px]"
                          >
                            {page}
                          </Button>
                        </div>
                      );
                    })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the report from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function getStatusVariant(status: string) {
  switch (status.toLowerCase()) {
    case "draft":
      return "secondary";
    case "uploaded":
      return "default";
    case "in_progress":
      return "in_progress";
    case "failed":
      return "destructive";
    default:
      return "default";
  }
}

function getStatusIcon(status: string) {
  switch (status.toLowerCase()) {
    case "uploaded":
      return <CheckCircle2 className="h-3 w-3" />;
    case "in_progress":
      return <Clock className="h-3 w-3" />;
    case "failed":
      return <XCircle className="h-3 w-3" />;
    default:
      return null;
  }
}