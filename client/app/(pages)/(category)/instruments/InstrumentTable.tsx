"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search, FlaskConical, RefreshCw, ExternalLink,
  ChevronLeft, ChevronRight, Plus, Power, CircleSlash,
} from "lucide-react";
import toast from "react-hot-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGetInstruments } from "@/app/hooks/query/useGetInstruments";
import { useCreateInstrument } from "@/app/hooks/mutate/useCreateInstrument";

type ActiveFilter = "all" | "active" | "inactive";

export default function InstrumentTable() {
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [showAdd, setShowAdd]         = useState(false);

  const { data, isLoading, isError, refetch } = useGetInstruments(page);
  const { mutate: createInstrument, isPending: isCreating } = useCreateInstrument();

  // form state
  const [form, setForm] = useState({ key: "", make: "", modelType: "" });

  const all        = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  const activeCount   = all.filter((i) => i.isActive).length;
  const inactiveCount = all.filter((i) => !i.isActive).length;

  const items = all.filter((i) => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      i.key.toLowerCase().includes(q) ||
      i.make.toLowerCase().includes(q) ||
      i.modelType.toLowerCase().includes(q);
    const matchActive =
      activeFilter === "all"      ? true :
      activeFilter === "active"   ? i.isActive :
                                    !i.isActive;
    return matchSearch && matchActive;
  });

  const handleAdd = () => {
    if (!form.key.trim() || !form.make.trim()) {
      toast.error("Key and Make are required");
      return;
    }
    createInstrument(form, {
      onSuccess: () => {
        toast.success("Instrument created");
        setShowAdd(false);
        setForm({ key: "", make: "", modelType: "" });
      },
      onError: (err: any) => toast.error(err?.response?.data?.message ?? "Create failed"),
    });
  };

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            DUC Instrument Master
          </h1>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400 mt-0.5">
            Factory presets — ranges, units, sample readings — used to pre-fill the calibration form
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add Instrument
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",    value: totalItems,    tone: "neutral" },
          { label: "Active",   value: activeCount,   tone: "green"   },
          { label: "Inactive", value: inactiveCount, tone: "muted"   },
        ].map(({ label, value, tone }) => (
          <div
            key={label}
            className={`relative overflow-hidden rounded-xl border px-4 py-3 bg-white dark:bg-zinc-900
              ${tone === "green"   ? "border-emerald-200 dark:border-emerald-800" :
                tone === "muted"   ? "border-zinc-200 dark:border-zinc-700" :
                                     "border-zinc-200 dark:border-zinc-700"}`}
          >
            <div className={`absolute left-0 top-0 h-full w-1 rounded-l-xl
              ${tone === "green" ? "bg-emerald-400" :
                tone === "muted" ? "bg-zinc-300 dark:bg-zinc-600" :
                                   "bg-blue-400"}`}
            />
            <div className="text-[22px] font-bold text-zinc-900 dark:text-zinc-100 leading-none">{value}</div>
            <div className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1 uppercase tracking-wider">{label}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="Search by key, make, model…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 w-72 text-[13px] bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-lg dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>
          {/* Active filter pills */}
          <div className="flex items-center gap-1.5 text-[12px]">
            {(["all", "active", "inactive"] as ActiveFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1 rounded-full font-medium transition-colors capitalize ${
                  activeFilter === f
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {f === "all" ? `All (${totalItems})` :
                 f === "active" ? `Active (${activeCount})` :
                 `Inactive (${inactiveCount})`}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                {[
                  { label: "Instrument", cls: "w-72 text-left" },
                  { label: "Make",       cls: "w-40 text-left" },
                  { label: "Model",      cls: "w-40 text-left" },
                  { label: "Parameters", cls: "text-left" },
                  { label: "Status",     cls: "w-24 text-left" },
                  { label: "Active",     cls: "w-20 text-left" },
                  { label: "",           cls: "w-16 text-right" },
                ].map((c, i) => (
                  <th
                    key={i}
                    className={`px-4 py-3 text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest bg-zinc-50/70 dark:bg-zinc-800/50 whitespace-nowrap ${c.cls}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading && (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-zinc-400">
                    <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />Loading instruments…
                  </td>
                </tr>
              )}

              {isError && (
                <tr>
                  <td colSpan={7} className="text-center py-20">
                    <p className="text-red-500 text-[13px] mb-2">Failed to load instruments.</p>
                    <button onClick={() => refetch()} className="text-[12px] text-zinc-400 underline">Retry</button>
                  </td>
                </tr>
              )}

              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-zinc-400 text-[13px]">
                    No instruments found{search ? ` matching "${search}"` : ""}.
                  </td>
                </tr>
              )}

              {items.map((inst) => (
                <tr
                  key={inst._id}
                  className={`group hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50 transition-colors ${!inst.isActive ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                        <FlaskConical className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                      </div>
                      <div>
                        <div className="font-semibold text-[13px] text-zinc-800 dark:text-zinc-200 leading-tight">{inst.key}</div>
                        <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                          {inst.parameters.length} parameter{inst.parameters.length === 1 ? "" : "s"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-[12px] text-zinc-600 dark:text-zinc-400">{inst.make}</td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{inst.modelType}</td>
                  <td className="px-4 py-3.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <div className="flex flex-wrap gap-1">
                      {inst.parameters.slice(0, 4).map((p) => (
                        <span
                          key={p.parameterName}
                          className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 whitespace-nowrap"
                        >
                          {p.parameterName}
                        </span>
                      ))}
                      {inst.parameters.length > 4 && (
                        <span className="px-2 py-0.5 text-zinc-400">+{inst.parameters.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                      inst.isActive
                        ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500"
                    }`}>
                      {inst.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {inst.isActive
                      ? <Power className="h-3.5 w-3.5 text-emerald-500" />
                      : <CircleSlash className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-600" />}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/instruments/${inst._id}`}>
                        <button className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
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

        {/* Pagination */}
        <div className="px-5 py-3.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-[12px] text-zinc-400 dark:text-zinc-500">
            Showing {items.length} of {totalItems} instruments
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-8 w-8 rounded-lg text-[12px] font-medium transition-colors ${
                  p === page
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm"
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center border border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add Instrument dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md dark:bg-zinc-900 dark:border-zinc-700">
          <DialogHeader>
            <DialogTitle className="dark:text-zinc-100">Add Instrument</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Instrument Key <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. FLUKE_8846A"
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
              />
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">Unique identifier used internally (no spaces).</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Make <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="e.g. Fluke"
                value={form.make}
                onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))}
                className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                Model Type
              </label>
              <Input
                placeholder="e.g. 8846A"
                value={form.modelType}
                onChange={(e) => setForm((f) => ({ ...f, modelType: e.target.value }))}
                className="dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100"
              />
            </div>
          </div>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)} className="dark:border-zinc-700 dark:text-zinc-300">
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={isCreating}>
              {isCreating ? "Creating…" : "Create Instrument"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
