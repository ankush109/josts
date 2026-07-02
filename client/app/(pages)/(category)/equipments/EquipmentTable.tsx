"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, ExternalLink, AlertCircle, RefreshCw, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, FlaskConical, MoreHorizontal, Loader2, Power,
  CircleSlash, ChevronDown, ChevronUp, GitBranch,
} from "lucide-react";
import { format, parseISO, isPast, differenceInDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useGetEuipments } from "@/app/hooks/query/useGetEquipments";
import {
  useCreateEquipment,
  useActivateEquipmentVersion,
} from "@/app/hooks/mutate/useUpdateEquipment";
import toast from "react-hot-toast";
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
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-600 border border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900/60">
      <AlertCircle className="h-3 w-3" /> Overdue
    </span>
  );
  if (s === "soon") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/60">
      <Clock className="h-3 w-3" /> Due Soon
    </span>
  );
  if (s === "ok") return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/60">
      <CheckCircle2 className="h-3 w-3" /> Valid
    </span>
  );
  return <span className="text-slate-300 dark:text-zinc-600 text-[12px]">—</span>;
};

// ─── stat card ────────────────────────────────────────────────────────────────

const Stat = ({
  icon, label, value, active, tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  active?: boolean;
  tone?: "default" | "valid" | "soon" | "overdue";
}) => {
  const t = tone ?? "default";
  return (
    <div className={`group relative flex items-center gap-4 px-5 py-4 rounded-2xl border cursor-default select-none transition-all overflow-hidden ${
      active
        ? "bg-gradient-to-br from-[#1e3a5f] to-[#162d4a] border-[#1e3a5f] text-white shadow-lg shadow-[#1e3a5f]/20"
        : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-700"
    }`}>
      {!active && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
          t === "valid"   ? "bg-emerald-500/70" :
          t === "soon"    ? "bg-amber-500/70"   :
          t === "overdue" ? "bg-red-500/70"     : "bg-slate-300/40 dark:bg-zinc-700/70"
        }`} />
      )}
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
        active
          ? "bg-white/15 ring-1 ring-white/10"
          : t === "valid"   ? "bg-emerald-50 dark:bg-emerald-950/40"
          : t === "soon"    ? "bg-amber-50 dark:bg-amber-950/40"
          : t === "overdue" ? "bg-red-50 dark:bg-red-950/40"
          :                   "bg-slate-100 dark:bg-zinc-800"
      }`}>
        {icon}
      </div>
      <div>
        <div className={`text-2xl font-bold leading-none tabular-nums ${
          active ? "text-white" : "text-slate-800 dark:text-zinc-100"
        }`}>{value}</div>
        <div className={`text-[11px] mt-1 font-medium ${
          active ? "text-white/70" : "text-slate-500 dark:text-zinc-400"
        }`}>{label}</div>
      </div>
    </div>
  );
};

// ─── version expansion row ────────────────────────────────────────────────────

interface EquipmentVersion {
  versionNumber: number;
  calDate?:      string | null;
  nextDue?:      string | null;
  certificateNo?: string;
  nablCert?:     string;
  calLab?:       string;
  createdAt?:    string;
}

function VersionsRow({
  item,
  colSpan,
}: {
  item: any;
  colSpan: number;
}) {
  const { mutate: activateVersion, isPending: isActivating } = useActivateEquipmentVersion();
  const versions: EquipmentVersion[] = item.versions ?? [];
  const activeVn: number = item.activeVersion ?? item.currentVersion ?? 1;

  if (!versions.length) return null;

  const sorted = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);

  return (
    <tr className="bg-slate-50/80 dark:bg-zinc-800/30">
      <td colSpan={colSpan} className="px-6 py-4">
        <div className="flex items-center gap-2 mb-3">
          <GitBranch className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-widest">
            {versions.length} Calibration Versions
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {sorted.map((v) => {
            const isActiveV = v.versionNumber === activeVn;
            return (
              <div
                key={v.versionNumber}
                className={`min-w-[200px] rounded-xl border px-4 py-3 flex flex-col gap-1.5 ${
                  isActiveV
                    ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/60 dark:bg-emerald-950/20"
                    : "border-slate-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="font-mono text-[14px] font-bold text-slate-700 dark:text-zinc-100">
                    v{v.versionNumber}
                  </span>
                  {isActiveV && (
                    <Badge className="bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60 text-[10px] font-semibold h-5">
                      Active
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 space-y-0.5">
                  <div><span className="text-slate-400 dark:text-zinc-500">Cal Date: </span>{fmt(v.calDate)}</div>
                  <div><span className="text-slate-400 dark:text-zinc-500">Next Due: </span>{fmt(v.nextDue)}</div>
                  {v.certificateNo && <div><span className="text-slate-400 dark:text-zinc-500">Cert: </span>{v.certificateNo}</div>}
                  {v.createdAt && (
                    <div className="text-[10px] text-slate-400 dark:text-zinc-500 pt-0.5">
                      {fmt(v.createdAt)}
                    </div>
                  )}
                </div>
                {!isActiveV && (
                  <button
                    disabled={isActivating}
                    onClick={() => activateVersion({ id: item._id, versionNumber: v.versionNumber }, {
                      onSuccess: () => toast.success(`v${v.versionNumber} is now active`),
                      onError:   (err: any) => toast.error(err?.response?.data?.message ?? "Failed to activate"),
                    })}
                    className="mt-1.5 flex items-center justify-center gap-1 h-7 w-full rounded-lg border border-slate-200 dark:border-zinc-700 text-[11px] text-slate-500 dark:text-zinc-400 hover:border-emerald-300 hover:text-emerald-600 dark:hover:border-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {isActivating ? "Activating…" : "Activate"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </td>
    </tr>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

interface CreateForm {
  equipmentName: string;
  idNo:          string;
  make:          string;
  model:         string;
  serialNo:      string;
  certificateNo: string;
  nablCert:      string;
  calLab:        string;
  calDate:       string;
  nextDue:       string;
  nominalRatio:  string;
}

const BLANK_FORM: CreateForm = {
  equipmentName: "", idNo: "", make: "", model: "", serialNo: "",
  certificateNo: "", nablCert: "", calLab: "", calDate: "", nextDue: "", nominalRatio: "",
};

type ActiveFilter = "all" | "active" | "inactive";
type StatusFilter = "all" | "overdue" | "soon" | "ok";

const COL_COUNT = 11;

export default function EquipmentTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useGetEuipments(page);

  const [createOpen, setCreateOpen]   = useState(false);
  const [form, setForm]               = useState<CreateForm>(BLANK_FORM);
  const { mutate: createEquipment, isPending: isCreating } = useCreateEquipment();

  function updateField<K extends keyof CreateForm>(k: K, v: CreateForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleCreate() {
    if (!form.equipmentName.trim()) { toast.error("Equipment name is required"); return; }
    if (!form.idNo.trim())          { toast.error("ID No. is required"); return; }
    const payload = {
      ...form,
      equipmentName: form.equipmentName.trim(),
      idNo:          form.idNo.trim(),
      calDate:       form.calDate || null,
      nextDue:       form.nextDue || null,
      parameters:    [],
    };
    createEquipment(payload, {
      onSuccess: (created: any) => {
        toast.success("Equipment created");
        setCreateOpen(false);
        setForm(BLANK_FORM);
        if (created?._id) router.push(`/equipments/${created._id}`);
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message ?? "Failed to create equipment");
      },
    });
  }

  const allItems  = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;
  const totalItems = data?.totalItems ?? 0;

  const overdue = allItems.filter(e => getDueStatus(typeof e.nextDue === "string" ? e.nextDue : undefined) === "overdue").length;
  const soon    = allItems.filter(e => getDueStatus(typeof e.nextDue === "string" ? e.nextDue : undefined) === "soon").length;
  const valid   = allItems.filter(e => getDueStatus(typeof e.nextDue === "string" ? e.nextDue : undefined) === "ok").length;

  const activeCount   = allItems.filter(e => e.isActive !== false).length;
  const inactiveCount = allItems.filter(e => e.isActive === false).length;

  const items = allItems.filter((e) => {
    const q = search.toLowerCase();
    if (q && !(e.equipmentName?.toLowerCase().includes(q) || e.idNo?.toLowerCase().includes(q) || e.make?.toLowerCase().includes(q) || e.serialNo?.toLowerCase().includes(q))) return false;
    if (activeFilter === "active"   && e.isActive === false) return false;
    if (activeFilter === "inactive" && e.isActive !== false) return false;
    if (statusFilter !== "all") {
      const s = getDueStatus(typeof e.nextDue === "string" ? e.nextDue : undefined);
      if (s !== statusFilter) return false;
    }
    return true;
  });

  return (
    <div className="w-full space-y-5">

      {/* Page heading */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-zinc-100 tracking-tight">Master Equipment Index</h1>
          <p className="text-[13px] text-slate-500 dark:text-zinc-400 mt-0.5">Manage and track all reference standard equipment</p>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="h-9 gap-1.5 text-[13px] bg-[#1e3a5f] hover:bg-[#162d4a] dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm rounded-xl px-4"
        >
          <Plus className="h-3.5 w-3.5" /> Add Entry
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat active icon={<FlaskConical className="h-4.5 w-4.5 text-white" />}                                          label="Total Instruments" value={totalItems} />
        <Stat tone="valid"   icon={<CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 dark:text-emerald-400" />}      label="Valid"             value={valid} />
        <Stat tone="soon"    icon={<Clock className="h-4.5 w-4.5 text-amber-500 dark:text-amber-400" />}                 label="Due Soon"          value={soon} />
        <Stat tone="overdue" icon={<AlertCircle className="h-4.5 w-4.5 text-red-500 dark:text-red-400" />}               label="Overdue"           value={overdue} />
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">

        {/* Toolbar */}
        <div className="px-5 py-3.5 border-b border-slate-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-zinc-500" />
              <Input
                placeholder="Search by name, ID No., make…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8 w-72 text-[13px] bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-zinc-700 overflow-hidden bg-slate-50 dark:bg-zinc-800/60">
              {([
                { v: "all",      label: "All",      count: allItems.length },
                { v: "active",   label: "Active",   count: activeCount },
                { v: "inactive", label: "Inactive", count: inactiveCount },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setActiveFilter(opt.v as ActiveFilter)}
                  className={`px-3 h-8 text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                    activeFilter === opt.v
                      ? "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-sm"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200"
                  }`}
                >
                  {opt.label}
                  <span className="text-[10px] tabular-nums text-slate-400 dark:text-zinc-500">{opt.count}</span>
                </button>
              ))}
            </div>
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-zinc-700 overflow-hidden bg-slate-50 dark:bg-zinc-800/60">
              {([
                { v: "all",     label: "All Status", count: allItems.length },
                { v: "ok",      label: "Valid",       count: valid },
                { v: "soon",    label: "Due Soon",    count: soon },
                { v: "overdue", label: "Overdue",     count: overdue },
              ] as const).map((opt) => (
                <button
                  key={opt.v}
                  onClick={() => setStatusFilter(opt.v as StatusFilter)}
                  className={`px-3 h-8 text-[11px] font-medium transition-colors flex items-center gap-1.5 ${
                    statusFilter === opt.v
                      ? "bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 shadow-sm"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200"
                  }`}
                >
                  {opt.label}
                  <span className="text-[10px] tabular-nums text-slate-400 dark:text-zinc-500">{opt.count}</span>
                </button>
              ))}
            </div>
          </div>
          {search && (
            <span className="text-[11px] text-slate-400 dark:text-zinc-500">
              {items.length} match{items.length === 1 ? "" : "es"}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-slate-100 dark:border-zinc-800">
                {[
                  { label: "Equipment",   cls: "w-64 text-left"   },
                  { label: "ID No.",      cls: "w-44 text-left"   },
                  { label: "Serial No.",  cls: "w-32 text-left"   },
                  { label: "Certificate", cls: "w-44 text-left"   },
                  { label: "Cal. Lab",    cls: "text-left"        },
                  { label: "Cal. Date",   cls: "w-28 text-left"   },
                  { label: "Next Due",    cls: "w-36 text-left"   },
                  { label: "Status",      cls: "w-32 text-left"   },
                  { label: "Active",      cls: "w-28 text-left"   },
                  { label: "NABL",        cls: "w-24 text-left"   },
                  { label: "",            cls: "w-16 text-right"  },
                ].map((col, i) => (
                  <th key={i} className={`px-4 py-3 text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-widest bg-slate-50/70 dark:bg-zinc-800/50 whitespace-nowrap ${col.cls}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">

              {isLoading && (
                <tr>
                  <td colSpan={COL_COUNT} className="text-center py-20 text-slate-400 dark:text-zinc-500">
                    <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />Loading equipment…
                  </td>
                </tr>
              )}

              {isError && (
                <tr>
                  <td colSpan={COL_COUNT} className="text-center py-20">
                    <p className="text-red-500 dark:text-red-400 text-[13px] mb-2">Failed to load equipment.</p>
                    <button onClick={() => refetch()} className="text-[12px] text-slate-400 dark:text-zinc-500 underline underline-offset-2">Retry</button>
                  </td>
                </tr>
              )}

              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td colSpan={COL_COUNT} className="text-center py-20">
                    <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-zinc-500">
                      <FlaskConical className="h-10 w-10 opacity-40" />
                      <p className="text-[13px] font-medium">
                        No equipment found{search ? ` matching "${search}"` : ""}.
                      </p>
                      {!search && (
                        <button
                          onClick={() => setCreateOpen(true)}
                          className="text-[12px] text-blue-600 dark:text-blue-400 hover:underline mt-1"
                        >
                          + Add your first entry
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {items.map((item) => {
                const hasVersions = (item.versions?.length ?? 0) > 0;
                const isExpanded  = expandedId === item._id;
                const activeVn    = item.activeVersion ?? item.currentVersion ?? 1;

                return (
                  <>
                    <tr
                      key={item._id}
                      onClick={() => router.push(`/equipments/${item._id}`)}
                      className={`group hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer ${
                        item.isActive === false ? "opacity-60" : ""
                      } ${isExpanded ? "bg-slate-50/40 dark:bg-zinc-800/20" : ""}`}
                    >
                      {/* Equipment name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-colors">
                            <FlaskConical className="h-3.5 w-3.5 text-slate-400 dark:text-zinc-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-[13px] text-slate-800 dark:text-zinc-100 leading-tight truncate flex items-center gap-2">
                              {item.equipmentName || "—"}
                              {hasVersions && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-600 dark:bg-amber-950/30 dark:border-amber-800/50 dark:text-amber-400 font-mono text-[9px] font-bold shrink-0">
                                  v{activeVn}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5 truncate">{[item.make, item.model].filter(Boolean).join(" · ") || "—"}</div>
                          </div>
                        </div>
                      </td>

                      {/* ID No. */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-900/60 dark:text-teal-300 font-mono text-[11px] font-bold tracking-wide whitespace-nowrap">
                          {item.idNo}
                        </span>
                      </td>

                      {/* Serial No. */}
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500 dark:text-zinc-400">{item.serialNo || "—"}</td>

                      {/* Certificate */}
                      <td className="px-4 py-3.5 text-[11px] text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap max-w-[160px] truncate" title={item.certificateNo ?? ""}>
                        {item.certificateNo || "—"}
                      </td>

                      {/* Cal. Lab */}
                      <td className="px-4 py-3.5 text-[11px] text-slate-500 dark:text-zinc-400 max-w-[180px] truncate" title={item.calLab ?? ""}>
                        {item.calLab || "—"}
                      </td>

                      {/* Cal. Date */}
                      <td className="px-4 py-3.5 text-[12px] text-slate-500 dark:text-zinc-400 whitespace-nowrap">{fmt(item.calDate)}</td>

                      {/* Next Due */}
                      <td className="px-4 py-3.5 text-[12px] text-slate-600 dark:text-zinc-300 whitespace-nowrap">{fmt(typeof item.nextDue === "string" ? item.nextDue : undefined)}</td>

                      {/* Status badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge nextDue={typeof item.nextDue === "string" ? item.nextDue : undefined} />
                      </td>

                      {/* Active / Inactive */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {item.isActive === false ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700">
                            <CircleSlash className="h-3 w-3" /> Inactive
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60">
                            <Power className="h-3 w-3" /> Active
                          </span>
                        )}
                      </td>

                      {/* NABL */}
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400 font-mono text-[10px]">
                          {item.nablCert || "—"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {hasVersions && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : item._id)}
                              className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors ${
                                isExpanded
                                  ? "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30"
                                  : "text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:text-zinc-500 dark:hover:text-amber-400 dark:hover:bg-amber-950/30"
                              }`}
                              title="Show versions"
                            >
                              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          <Link href={`/equipments/${item._id}`}>
                            <button className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:text-zinc-500 dark:hover:text-blue-400 dark:hover:bg-blue-950/40 transition-colors opacity-0 group-hover:opacity-100">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                          </Link>
                          <button className="h-7 w-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Version sub-rows */}
                    {isExpanded && hasVersions && (
                      <VersionsRow key={`${item._id}-versions`} item={item} colSpan={COL_COUNT} />
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-[12px] text-slate-400 dark:text-zinc-500">
            Showing {items.length > 0 ? `${(page - 1) * 20 + 1}–${(page - 1) * 20 + items.length}` : "0"} of {totalItems} instruments
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-8 w-8 rounded-lg text-[12px] font-medium transition-colors ${
                  p === page
                    ? "bg-[#1e3a5f] dark:bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
              className="h-8 w-8 rounded-lg flex items-center justify-center border border-slate-200 dark:border-zinc-700 text-slate-400 dark:text-zinc-500 hover:bg-slate-50 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Add Entry dialog ── */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!isCreating) setCreateOpen(o); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Reference Equipment</DialogTitle>
            <p className="text-[12px] text-slate-500 dark:text-zinc-400 mt-1">
              Create a new entry in the traceability master index. You can add calibration readings after the entry is created.
            </p>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <CreateField label="Equipment Name *" value={form.equipmentName} onChange={(v) => updateField("equipmentName", v)} placeholder="e.g. Fluke 8846A" />
            <CreateField label="ID No. *"         value={form.idNo}          onChange={(v) => updateField("idNo", v)}          placeholder="JECL/KOL/..." mono />
            <CreateField label="Make"             value={form.make}          onChange={(v) => updateField("make", v)}          placeholder="Fluke" />
            <CreateField label="Model"            value={form.model}         onChange={(v) => updateField("model", v)}         placeholder="8846A" />
            <CreateField label="Serial No."       value={form.serialNo}      onChange={(v) => updateField("serialNo", v)}      mono />
            <CreateField label="Certificate No."  value={form.certificateNo} onChange={(v) => updateField("certificateNo", v)} mono />
            <CreateField label="NABL Cert."       value={form.nablCert}      onChange={(v) => updateField("nablCert", v)}      mono />
            <CreateField label="Cal. Lab"         value={form.calLab}        onChange={(v) => updateField("calLab", v)}        placeholder="e.g. YEA, Howrah" />
            <CreateField label="Cal. Date"        value={form.calDate}       onChange={(v) => updateField("calDate", v)}        type="date" />
            <CreateField label="Next Due"         value={form.nextDue}       onChange={(v) => updateField("nextDue", v)}        type="date" />
            <CreateField label="Nominal Ratio"    value={form.nominalRatio}  onChange={(v) => updateField("nominalRatio", v)}   placeholder="e.g. 4:1" />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" disabled={isCreating} onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isCreating || !form.equipmentName.trim() || !form.idNo.trim()}
              onClick={handleCreate}
              className="bg-[#1e3a5f] hover:bg-[#162d4a] gap-1.5"
            >
              {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {isCreating ? "Creating…" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Create-dialog field ─────────────────────────────────────────────────────

function CreateField({
  label, value, onChange, placeholder, type = "text", mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "date";
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-zinc-400 mb-1.5">
        {label}
      </label>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`h-9 text-[13px] ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}
