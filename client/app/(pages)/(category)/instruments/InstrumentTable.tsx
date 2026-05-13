"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, FlaskConical, RefreshCw, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useGetInstruments } from "@/app/hooks/query/useGetInstruments";

export default function InstrumentTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading, isError, refetch } = useGetInstruments(page);

  const all = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  const items = all.filter((i) => {
    const q = search.toLowerCase();
    return !q ||
      i.key.toLowerCase().includes(q) ||
      i.make.toLowerCase().includes(q) ||
      i.modelType.toLowerCase().includes(q);
  });

  return (
    <div className="w-full space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 tracking-tight">DUC Instrument Master</h1>
          <p className="text-[13px] text-slate-400 mt-0.5">
            Factory presets — ranges, units, sample readings — used to pre-fill the calibration form
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search by key, make, model…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 w-72 text-[13px] bg-slate-50 border-slate-200 rounded-lg"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-slate-100">
                {[
                  { label: "Instrument", cls: "w-72 text-left" },
                  { label: "Make",       cls: "w-40 text-left" },
                  { label: "Model",      cls: "w-40 text-left" },
                  { label: "Parameters", cls: "text-left" },
                  { label: "Status",     cls: "w-28 text-left" },
                  { label: "",           cls: "w-16 text-right" },
                ].map((c, i) => (
                  <th key={i} className={`px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50/70 whitespace-nowrap ${c.cls}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-400">
                    <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />Loading instruments…
                  </td>
                </tr>
              )}

              {isError && (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    <p className="text-red-500 text-[13px] mb-2">Failed to load instruments.</p>
                    <button onClick={() => refetch()} className="text-[12px] text-slate-400 underline">Retry</button>
                  </td>
                </tr>
              )}

              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-20 text-slate-400 text-[13px]">
                    No instruments found{search ? ` matching "${search}"` : ""}.
                  </td>
                </tr>
              )}

              {items.map((inst) => (
                <tr key={inst._id} className="group hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                        <FlaskConical className="h-3.5 w-3.5 text-slate-400" />
                      </div>
                      <div>
                        <div className="font-semibold text-[13px] text-slate-800 leading-tight">{inst.key}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {inst.parameters.length} parameter{inst.parameters.length === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-slate-600">{inst.make}</td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">{inst.modelType}</td>
                  <td className="px-4 py-3.5 text-[11px] text-slate-500">
                    <div className="flex flex-wrap gap-1">
                      {inst.parameters.slice(0, 4).map((p) => (
                        <span key={p.parameterName} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 whitespace-nowrap">
                          {p.parameterName}
                        </span>
                      ))}
                      {inst.parameters.length > 4 && (
                        <span className="px-2 py-0.5 text-slate-400">+{inst.parameters.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                      inst.isActive ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-400"
                    }`}>
                      {inst.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/instruments/${inst._id}`}>
                        <button className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[12px] text-slate-400">
            Showing {items.length} of {totalItems} instruments
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
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
              onClick={() => setPage((p) => p + 1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
