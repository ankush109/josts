"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, ExternalLink, AlertCircle, RefreshCw, Clock, CheckCircle2, ChevronLeft, ChevronRight, FlaskConical, MoreHorizontal } from "lucide-react";
import { format, parseISO, isPast, differenceInDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGetEuipments } from "@/app/hooks/query/useGetEquipments";
import Link from "next/link";

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmt = (d: string | Date | null | undefined) => {
  if (!d) return "—";
  try { return format(typeof d === "string" ? parseISO(d) : d, "dd MMM yyyy"); }
  catch { return "—"; }
};

type DueStatus = "overdue" | "soon" | "ok" | "none";

const getDueStatus = (nextDue: string | null | undefined): DueStatus => {
  if (!nextDue) return "none";
  try {
    const d = parseISO(nextDue as string);
    if (isPast(d)) return "overdue";
    if (differenceInDays(d, new Date()) <= 60) return "soon";
    return "ok";
  } catch { return "none"; }
};

const StatusBadge = ({ nextDue }: { nextDue: string | null | undefined }) => {
  const s = getDueStatus(nextDue);
  if (s === "overdue") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200">
      <AlertCircle className="h-3 w-3" /> Overdue
    </span>
  );
  if (s === "soon") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-200">
      <Clock className="h-3 w-3" /> Due Soon
    </span>
  );
  if (s === "ok") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
      <CheckCircle2 className="h-3 w-3" /> Valid
    </span>
  );
  return <span className="text-slate-300 text-[12px]">—</span>;
};

// ─── stat card ────────────────────────────────────────────────────────────────

const Stat = ({
  icon, label, value, active,
}: { icon: React.ReactNode; label: string; value: number | string; active?: boolean }) => (
  <div className={`flex items-center gap-4 px-5 py-4 rounded-2xl border cursor-default select-none transition-colors ${
    active ? "bg-[#1e3a5f] border-[#1e3a5f] text-white shadow-md" : "bg-white border-slate-200 hover:border-slate-300"
  }`}>
    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${active ? "bg-white/15" : "bg-slate-100"}`}>
      {icon}
    </div>
    <div>
      <div className={`text-2xl font-bold leading-none ${active ? "text-white" : "text-slate-800"}`}>{value}</div>
      <div className={`text-[11px] mt-1 ${active ? "text-white/60" : "text-slate-400"}`}>{label}</div>
    </div>
  </div>
);

// ─── main component ───────────────────────────────────────────────────────────

export default function EquipmentTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useGetEuipments(page);

  const allItems = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  const overdue  = allItems.filter(e => getDueStatus(typeof e.nextDue === "string" ? e.nextDue : undefined) === "overdue").length;
  const soon     = allItems.filter(e => getDueStatus(typeof e.nextDue === "string" ? e.nextDue : undefined) === "soon").length;
  const valid    = allItems.filter(e => getDueStatus(typeof e.nextDue === "string" ? e.nextDue : undefined) === "ok").length;

  const items = allItems.filter((e) => {
    const q = search.toLowerCase();
    return !q || e.equipmentName?.toLowerCase().includes(q) || e.idNo?.toLowerCase().includes(q) || e.make?.toLowerCase().includes(q) || e.serialNo?.toLowerCase().includes(q);
  });

  return (
    <div className="w-full space-y-5">

      {/* Page heading */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">Traceability Master Index</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">Manage and track all reference standard equipment</p>
        </div>
        <Button size="sm" className="h-9 gap-1.5 text-[13px] bg-[#1e3a5f] hover:bg-[#162d4a] shadow-sm rounded-xl px-4">
          <Plus className="h-3.5 w-3.5" /> Add Entry
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat active icon={<FlaskConical className="h-4.5 w-4.5 text-white" />}   label="Total Instruments" value={totalItems} />
        <Stat        icon={<CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />} label="Valid"            value={valid} />
        <Stat        icon={<Clock className="h-4.5 w-4.5 text-amber-500" />}      label="Due Soon"         value={soon} />
        <Stat        icon={<AlertCircle className="h-4.5 w-4.5 text-red-500" />}  label="Overdue"          value={overdue} />
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search by name, ID No., make…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 w-72 text-[13px] bg-slate-50 border-slate-200 rounded-lg"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-slate-100">
                {[
                  { label: "Equipment",   cls: "w-64 text-left"   },
                  { label: "ID No.",      cls: "w-44 text-left"   },
                  { label: "Serial No.",  cls: "w-32 text-left"   },
                  { label: "Certificate", cls: "w-44 text-left"   },
                  { label: "Cal. Lab",    cls: "text-left"        },
                  { label: "Cal. Date",   cls: "w-28 text-left"   },
                  { label: "Next Due",    cls: "w-36 text-left"   },
                  { label: "Status",      cls: "w-32 text-left"   },
                  { label: "NABL",        cls: "w-24 text-left"   },
                  { label: "",            cls: "w-16 text-right"  },
                ].map((col, i) => (
                  <th key={i} className={`px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50/70 whitespace-nowrap ${col.cls}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">

              {isLoading && (
                <tr>
                  <td colSpan={10} className="text-center py-20 text-slate-400">
                    <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />Loading equipment…
                  </td>
                </tr>
              )}

              {isError && (
                <tr>
                  <td colSpan={10} className="text-center py-20">
                    <p className="text-red-500 text-[13px] mb-2">Failed to load equipment.</p>
                    <button onClick={() => refetch()} className="text-[12px] text-slate-400 underline underline-offset-2">Retry</button>
                  </td>
                </tr>
              )}

              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-20 text-slate-400 text-[13px]">
                    No equipment found{search ? ` matching "${search}"` : ""}.
                  </td>
                </tr>
              )}

              {items.map((item) => (
                <tr
                  key={item._id}
                  onClick={() => router.push(`/equipments/${item._id}`)}
                  className="group hover:bg-slate-50/70 transition-colors cursor-pointer"
                >

                  {/* Equipment name */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <FlaskConical className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-[13px] text-slate-800 leading-tight">{item.equipmentName || "—"}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{[item.make, item.model].filter(Boolean).join(" · ") || "—"}</div>
                      </div>
                    </div>
                  </td>

                  {/* ID No. */}
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 font-mono text-[11px] font-bold tracking-wide whitespace-nowrap">
                      {item.idNo}
                    </span>
                  </td>

                  {/* Serial No. */}
                  <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">{item.serialNo || "—"}</td>

                  {/* Certificate */}
                  <td className="px-4 py-3.5 text-[11px] text-blue-600 font-medium whitespace-nowrap max-w-[160px] truncate" title={item.certificateNo ?? ""}>
                    {item.certificateNo || "—"}
                  </td>

                  {/* Cal. Lab */}
                  <td className="px-4 py-3.5 text-[11px] text-slate-500 max-w-[180px] truncate" title={item.calLab ?? ""}>
                    {item.calLab || "—"}
                  </td>

                  {/* Cal. Date */}
                  <td className="px-4 py-3.5 text-[12px] text-slate-500 whitespace-nowrap">{fmt(item.calDate)}</td>

                  {/* Next Due */}
                  <td className="px-4 py-3.5 text-[12px] text-slate-600 whitespace-nowrap">{fmt(typeof item.nextDue === "string" ? item.nextDue : undefined)}</td>

                  {/* Status badge */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <StatusBadge nextDue={typeof item.nextDue === "string" ? item.nextDue : undefined} />
                  </td>

                  {/* NABL */}
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-mono text-[10px]">
                      {item.nablCert || "—"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/equipments/${item._id}`}>
                        <button className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </Link>
                      <button className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[12px] text-slate-400">
            Showing {items.length > 0 ? `${(page - 1) * 20 + 1}–${(page - 1) * 20 + items.length}` : "0"} of {totalItems} instruments
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-8 w-8 rounded-lg text-[12px] font-medium transition-colors ${
                  p === page ? "bg-[#1e3a5f] text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
