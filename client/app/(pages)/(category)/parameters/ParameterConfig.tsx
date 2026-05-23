"use client";

import { useState, useMemo } from "react";
import {
  Plus, Search, RefreshCw, ChevronDown, ChevronUp,
  Pencil, Power, CircleSlash, Check, X, Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  useGetParameters,
  type Parameter,
  type ParameterRangeSpec,
} from "@/app/hooks/query/useGetParameters";
import {
  useCreateParameter,
  useUpdateParameter,
  useSetParameterActive,
} from "@/app/hooks/mutate/useParameterMutations";

// ── helpers ──────────────────────────────────────────────────────────────────

function emptyRange(): ParameterRangeSpec {
  return { label: "", stdUncPct: 0, accPct: 0, accOffset: 0, leastCount: 0, scopePct: 0 };
}

type ActiveFilter = "all" | "active" | "inactive";

const RANGE_FIELDS: { key: keyof ParameterRangeSpec; label: string }[] = [
  { key: "label",      label: "Range Label" },
  { key: "stdUncPct",  label: "Std Unc %" },
  { key: "accPct",     label: "Acc %" },
  { key: "accOffset",  label: "Acc Offset" },
  { key: "leastCount", label: "Least Count" },
  { key: "scopePct",   label: "Scope %" },
];

// ── RangeRow — one editable row in the ranges grid ───────────────────────────

function RangeRow({
  range, index, onChange, onRemove,
}: {
  range:    ParameterRangeSpec;
  index:    number;
  onChange: (i: number, field: keyof ParameterRangeSpec, val: string) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2 items-center">
      {RANGE_FIELDS.map(({ key }) => (
        <Input
          key={key}
          value={range[key] as string | number}
          onChange={(e) => onChange(index, key, e.target.value)}
          className="h-8 text-xs"
          placeholder={key === "label" ? "e.g. 400mV/0.1" : "0"}
        />
      ))}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="p-1 text-red-400 hover:text-red-600 transition-colors"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── EditPanel — inline edit panel expanded under a row ───────────────────────

function EditPanel({
  param,
  onSave,
  onCancel,
  isSaving,
}: {
  param:    Parameter;
  onSave:   (updated: Partial<Parameter>) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [name,   setName]   = useState(param.parameterName);
  const [unit,   setUnit]   = useState(param.unit);
  const [ranges, setRanges] = useState<ParameterRangeSpec[]>(() =>
    param.ranges.map((r) => ({ ...r }))
  );

  const handleRangeChange = (i: number, field: keyof ParameterRangeSpec, val: string) => {
    setRanges((prev) => prev.map((r, idx) =>
      idx !== i ? r : { ...r, [field]: field === "label" ? val : Number(val) }
    ));
  };

  const handleRemoveRange = (i: number) => {
    setRanges((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleAddRange = () => {
    setRanges((prev) => [...prev, emptyRange()]);
  };

  const handleSave = () => {
    if (!name.trim()) { toast.error("Parameter name is required"); return; }
    const invalids = ranges.filter((r) => !r.label.trim());
    if (invalids.length) { toast.error("All ranges must have a label"); return; }
    onSave({ parameterName: name.trim(), unit: unit.trim(), ranges });
  };

  return (
    <div className="border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-800/40 p-4 space-y-4">
      {/* Name + Unit row */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1 block">
            Parameter Name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-sm"
            placeholder="e.g. DC Voltage"
          />
        </div>
        <div className="w-28">
          <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1 block">
            Unit
          </label>
          <Input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="h-8 text-sm"
            placeholder="e.g. V"
          />
        </div>
      </div>

      {/* Ranges grid */}
      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2">
          {RANGE_FIELDS.map(({ key, label }) => (
            <span key={key} className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
              {label}
            </span>
          ))}
          <span />
        </div>

        {ranges.length === 0 && (
          <p className="text-[13px] text-slate-400 dark:text-zinc-500 py-2">
            No ranges configured. Add one below.
          </p>
        )}

        {ranges.map((r, i) => (
          <RangeRow
            key={i}
            range={r}
            index={i}
            onChange={handleRangeChange}
            onRemove={handleRemoveRange}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddRange}
          className="h-7 text-xs mt-1"
        >
          <Plus className="h-3 w-3 mr-1" /> Add Range
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 border-t border-slate-200 dark:border-zinc-700">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSaving}
          className="h-7 text-xs"
        >
          <Check className="h-3 w-3 mr-1" />
          {isSaving ? "Saving…" : "Save"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          className="h-7 text-xs"
        >
          <X className="h-3 w-3 mr-1" /> Cancel
        </Button>
      </div>
    </div>
  );
}

// ── AddParameterDialog ────────────────────────────────────────────────────────

function AddParameterDialog({
  open,
  onClose,
}: {
  open:    boolean;
  onClose: () => void;
}) {
  const [name,   setName]   = useState("");
  const [unit,   setUnit]   = useState("");
  const [ranges, setRanges] = useState<ParameterRangeSpec[]>([emptyRange()]);
  const { mutate: create, isPending } = useCreateParameter();

  const handleRangeChange = (i: number, field: keyof ParameterRangeSpec, val: string) => {
    setRanges((prev) => prev.map((r, idx) =>
      idx !== i ? r : { ...r, [field]: field === "label" ? val : Number(val) }
    ));
  };

  const handleRemoveRange = (i: number) => {
    setRanges((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Parameter name is required"); return; }
    const invalids = ranges.filter((r) => !r.label.trim());
    if (invalids.length) { toast.error("All ranges must have a label"); return; }
    create(
      { parameterName: name.trim(), unit: unit.trim(), ranges },
      {
        onSuccess: () => {
          toast.success("Parameter created");
          setName(""); setUnit(""); setRanges([emptyRange()]);
          onClose();
        },
        onError: (e: any) => toast.error(e?.response?.data?.message ?? "Create failed"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Parameter</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1 block">
                Parameter Name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. DC Voltage"
                className="h-9"
              />
            </div>
            <div className="w-32">
              <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1 block">
                Unit
              </label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. V"
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-2">
              {RANGE_FIELDS.map(({ key, label }) => (
                <span key={key} className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
                  {label}
                </span>
              ))}
              <span />
            </div>

            {ranges.map((r, i) => (
              <RangeRow
                key={i}
                range={r}
                index={i}
                onChange={handleRangeChange}
                onRemove={handleRemoveRange}
              />
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRanges((p) => [...p, emptyRange()])}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" /> Add Range
            </Button>
          </div>

          <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-zinc-700">
            <Button onClick={handleSubmit} disabled={isPending} className="h-8 text-sm">
              {isPending ? "Creating…" : "Create Parameter"}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isPending} className="h-8 text-sm">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── ParameterRow — one row in the main table ─────────────────────────────────

function ParameterRow({ param }: { param: Parameter }) {
  const [expanded, setExpanded] = useState(false);
  const [editing,  setEditing]  = useState(false);

  const { mutate: update,   isPending: isSaving }   = useUpdateParameter();
  const { mutate: setActive, isPending: isToggling } = useSetParameterActive();

  const handleSave = (payload: Partial<Parameter>) => {
    update(
      { id: param._id, payload },
      {
        onSuccess: () => { toast.success("Saved"); setEditing(false); setExpanded(false); },
        onError:   (e: any) => toast.error(e?.response?.data?.message ?? "Save failed"),
      },
    );
  };

  const handleToggle = () => {
    setActive(
      { id: param._id, isActive: !param.isActive },
      {
        onSuccess: () => toast.success(param.isActive ? "Disabled" : "Enabled"),
        onError:   (e: any) => toast.error(e?.response?.data?.message ?? "Toggle failed"),
      },
    );
  };

  const handleEdit = () => {
    setExpanded(true);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setExpanded(false);
  };

  return (
    <>
      <tr
        className={`border-b border-slate-100 dark:border-zinc-800 transition-colors hover:bg-slate-50/60 dark:hover:bg-zinc-800/30 ${
          !param.isActive ? "opacity-50" : ""
        }`}
      >
        {/* Name */}
        <td className="px-4 py-3">
          <span className="text-sm font-medium text-slate-900 dark:text-zinc-100">
            {param.parameterName}
          </span>
        </td>

        {/* Unit */}
        <td className="px-4 py-3">
          <span className="text-sm text-slate-600 dark:text-zinc-400">{param.unit || "—"}</span>
        </td>

        {/* Ranges count */}
        <td className="px-4 py-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300">
            {param.ranges.length} range{param.ranges.length !== 1 ? "s" : ""}
          </span>
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          {param.isActive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-zinc-700 text-slate-500 dark:text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> Inactive
            </span>
          )}
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => !editing && setExpanded((p) => !p)}
              className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
              title={expanded ? "Collapse" : "View ranges"}
            >
              {expanded
                ? <ChevronUp className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />
              }
            </button>
            <button
              onClick={handleEdit}
              className="p-1.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={handleToggle}
              disabled={isToggling}
              className={`p-1.5 rounded transition-colors ${
                param.isActive
                  ? "text-amber-500 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  : "text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              }`}
              title={param.isActive ? "Disable" : "Enable"}
            >
              {param.isActive
                ? <CircleSlash className="h-3.5 w-3.5" />
                : <Power className="h-3.5 w-3.5" />
              }
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded panel */}
      {expanded && (
        <tr>
          <td colSpan={5} className="px-4 pb-4 pt-0">
            {editing ? (
              <EditPanel
                param={param}
                onSave={handleSave}
                onCancel={handleCancel}
                isSaving={isSaving}
              />
            ) : (
              <ReadonlyRanges ranges={param.ranges} />
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ── ReadonlyRanges — view-only range table ────────────────────────────────────

function ReadonlyRanges({ ranges }: { ranges: ParameterRangeSpec[] }) {
  if (!ranges.length) {
    return (
      <div className="border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-800/40 p-4">
        <p className="text-[13px] text-slate-400 dark:text-zinc-500">No ranges configured.</p>
      </div>
    );
  }

  return (
    <div className="border border-slate-200 dark:border-zinc-700 rounded-lg bg-slate-50 dark:bg-zinc-800/40 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800">
            {RANGE_FIELDS.map(({ key, label }) => (
              <th key={key} className="px-3 py-2 text-left font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide text-[10px]">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ranges.map((r, i) => (
            <tr key={i} className="border-b last:border-0 border-slate-200 dark:border-zinc-700">
              <td className="px-3 py-2 font-medium text-slate-800 dark:text-zinc-200">{r.label}</td>
              <td className="px-3 py-2 text-slate-600 dark:text-zinc-400">{r.stdUncPct}</td>
              <td className="px-3 py-2 text-slate-600 dark:text-zinc-400">{r.accPct}</td>
              <td className="px-3 py-2 text-slate-600 dark:text-zinc-400">{r.accOffset}</td>
              <td className="px-3 py-2 text-slate-600 dark:text-zinc-400">{r.leastCount}</td>
              <td className="px-3 py-2 text-slate-600 dark:text-zinc-400">{r.scopePct}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main ParameterConfig ──────────────────────────────────────────────────────

export default function ParameterConfig() {
  const [search,       setSearch]       = useState("");
  const [filter,       setFilter]       = useState<ActiveFilter>("all");
  const [showAdd,      setShowAdd]      = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useGetParameters();

  const all = data?.data ?? [];

  const activeCount   = all.filter((p) => p.isActive).length;
  const inactiveCount = all.filter((p) => !p.isActive).length;

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    return all.filter((p) => {
      const matchSearch = !q || p.parameterName.toLowerCase().includes(q) || p.unit.toLowerCase().includes(q);
      const matchFilter =
        filter === "all"      ? true :
        filter === "active"   ? p.isActive :
                                !p.isActive;
      return matchSearch && matchFilter;
    });
  }, [all, search, filter]);

  return (
    <div className="w-full space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
            Parameter Configuration
          </h1>
          <p className="text-[13px] text-slate-500 dark:text-zinc-400 mt-0.5">
            Calibration constants per parameter and range — used by all uncertainty budget calculations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <Button onClick={() => setShowAdd(true)} size="sm" className="h-8 text-sm gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Parameter
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total",    value: all.length,     bg: "bg-slate-100 dark:bg-zinc-800",          text: "text-slate-700 dark:text-zinc-200" },
          { label: "Active",   value: activeCount,    bg: "bg-emerald-50 dark:bg-emerald-900/20",   text: "text-emerald-700 dark:text-emerald-400" },
          { label: "Inactive", value: inactiveCount,  bg: "bg-amber-50 dark:bg-amber-900/20",       text: "text-amber-700 dark:text-amber-400" },
        ].map(({ label, value, bg, text }) => (
          <div key={label} className={`${bg} rounded-lg px-4 py-3`}>
            <p className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${text}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search parameters…"
            className="pl-8 h-8 text-sm"
          />
        </div>
        <div className="flex rounded-md border border-slate-200 dark:border-zinc-700 overflow-hidden text-xs">
          {(["all", "active", "inactive"] as ActiveFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 capitalize transition-colors ${
                filter === f
                  ? "bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                  : "bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900">
        {isLoading ? (
          <div className="py-20 text-center text-sm text-slate-400 dark:text-zinc-500">Loading…</div>
        ) : isError ? (
          <div className="py-20 text-center text-sm text-red-500">Failed to load parameters.</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/60">
                {["Parameter Name", "Unit", "Ranges", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-sm text-slate-400 dark:text-zinc-500">
                    {search ? "No parameters match your search." : "No parameters configured yet. Add one above."}
                  </td>
                </tr>
              ) : (
                visible.map((param) => <ParameterRow key={param._id} param={param} />)
              )}
            </tbody>
          </table>
        )}
      </div>

      <AddParameterDialog open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
