"use client"
import React, { useState } from "react";
import { Search, Download, Plus, ExternalLink, MoreHorizontal, AlertCircle, RefreshCw } from "lucide-react";
import { format, parseISO, isPast, differenceInDays } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useGetEuipments } from "@/app/hooks/query/useGetEquipments";
import Link from "next/link";


// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  try { return format(typeof d === "string" ? parseISO(d) : d, "dd MMM yyyy"); }
  catch { return "—"; }
};

type DueBadge = "overdue" | "soon" | "ok" | "none";
const dueStatus = (nextDue: string | null | undefined): DueBadge => {
  if (!nextDue) return "none";
  const d = parseISO(nextDue as string);
  if (isPast(d)) return "overdue";
  if (differenceInDays(d, new Date()) <= 60) return "soon";
  return "ok";
};

const DueCell = ({ nextDue }: { nextDue: string | null | undefined }) => {
  const status = dueStatus(nextDue);
  const text = fmt(nextDue);
  if (status === "overdue")
    return <span className="flex items-center gap-1 text-red-600 font-semibold text-[12px]"><AlertCircle className="h-3 w-3" />{text}</span>;
  if (status === "soon")
    return <span className="text-amber-600 font-semibold text-[12px]">{text}</span>;
  return <span className="text-slate-600 text-[12px]">{text}</span>;
};

// ─── component ───────────────────────────────────────────────────────────────

export default function EquipmentTable() {
const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useGetEuipments(page);
  const [search, setSearch] = useState("");


  const items = (data?.data ?? []).filter((e) => {
    const q = search.toLowerCase();
    return (
      !q ||
      e.equipmentName?.toLowerCase().includes(q) ||
      e.idNo?.toLowerCase().includes(q) ||
      e.make?.toLowerCase().includes(q) ||
      e.serialNo?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-w-7xl p-5  min-h-screen">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-slate-800">Calibration Traceability Master Index</h2>
            <p className="text-[12px] text-slate-400 mt-0.5">Josts Engineering Company Limited</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search equipment, ID No…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 w-64 text-[13px] bg-slate-50 border-slate-200"
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[12px]">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button size="sm" className="h-8 gap-1.5 text-[12px] bg-[#1e3a5f] hover:bg-[#162d4a]">
              <Plus className="h-3.5 w-3.5" /> Add Entry
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="w-full">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#1e3a5f] hover:bg-[#1e3a5f] border-none">
                {["#", "Equipment Name", "Make", "Model", "Serial No.", "ID No.", "Cert. No.", "Cal. Lab", "Cal. Date", "Next Due", "NABL Cert.", ""].map((h, i) => (
                  <TableHead key={i} className="text-white/80 font-medium text-[11px] uppercase tracking-wider py-3 whitespace-nowrap">
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-16 text-slate-400 text-[13px]">
                    <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />Loading equipment…
                  </TableCell>
                </TableRow>
              )}
              {isError && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-16 text-red-500 text-[13px]">
                    Failed to load.{" "}
                    <button onClick={() => refetch()} className="underline">Retry</button>
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && !isError && items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center py-16 text-slate-400 text-[13px]">
                    No equipment found.
                  </TableCell>
                </TableRow>
              )}
              {items.map((item, idx) => (
                <TableRow key={item._id} className="hover:bg-slate-50 border-slate-100 group">
                  <TableCell className="text-slate-400 text-[11px] w-8">{idx + 1}</TableCell>
                  <TableCell className="font-medium text-slate-800 text-[13px] whitespace-nowrap">{item.equipmentName || "—"}</TableCell>
                  <TableCell className="text-slate-500 text-[12px]">{item.make || "—"}</TableCell>
                  <TableCell className="text-slate-500 text-[12px]">{item.model || "—"}</TableCell>
                  <TableCell className="font-mono text-slate-500 text-[11px]">{item.serialNo || "—"}</TableCell>
                  <TableCell>
                    <span className="bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded text-[11px] font-semibold font-mono whitespace-nowrap">
                      {item.idNo}
                    </span>
                  </TableCell>
                  <TableCell className="text-blue-600 text-[11px] whitespace-nowrap max-w-[160px] truncate" title={item.certificateNo}>
                    {item.certificateNo || "—"}
                  </TableCell>
                  <TableCell className="text-slate-500 text-[11px] max-w-[140px] truncate" title={item.calLab}>
                    {item.calLab || "—"}
                  </TableCell>
                  <TableCell className="text-slate-600 text-[12px] whitespace-nowrap">{fmt(item.calDate)}</TableCell>
                  <TableCell className="whitespace-nowrap"><DueCell nextDue={item.nextDue} /></TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px] text-slate-500 border-slate-200">
                      {item.nablCert || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Link href={`/equipments/${item._id}`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button></Link>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Footer */}
       {/* Footer */}
<div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
  <span className="text-[12px] text-slate-400">
    Showing page {data?.currentPage} of {data?.totalPages} · {data?.totalItems} total
  </span>
  <div className="flex items-center gap-1">
    <Button
      variant="outline" size="sm" className="h-7 text-[12px]"
      disabled={page === 1}
      onClick={() => setPage(p => p - 1)}
    >
      Previous
    </Button>
    {Array.from({ length: data?.totalPages ?? 1 }, (_, i) => i + 1).map(p => (
      <Button
        key={p}
        variant={p === page ? "default" : "outline"}
        size="sm"
        className={`h-7 w-7 text-[12px] ${p === page ? "bg-[#1e3a5f]" : ""}`}
        onClick={() => setPage(p)}
      >
        {p}
      </Button>
    ))}
    <Button
      variant="outline" size="sm" className="h-7 text-[12px]"
      disabled={page === (data?.totalPages ?? 1)}
      onClick={() => setPage(p => p + 1)}
    >
      Next
    </Button>
  </div>
</div>
      </div>
    </div>
  );
}