"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FlaskConical, RefreshCw, Plus, Trash2, Save, History, Power, FileDown } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import { useGetInstrumentById } from "@/app/hooks/query/useGetInstrumentById";
import { useGetInstrumentHistory } from "@/app/hooks/query/useGetInstrumentHistory";
import { useOnlineStatus } from "@/app/hooks/useOnlineStatus";
import {
  useUpdateInstrument,
  useSetInstrumentActive,
} from "@/app/hooks/mutate/useUpdateInstrument";
import type {
  Instrument,
  InstrumentParamPreset,
  InstrumentRangeSpec,
  InstrumentSample,
} from "@/app/hooks/query/useGetInstruments";

const num = (v: string): number => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const blankRange = (): InstrumentRangeSpec => ({
  label: "", stdUncPct: 0, accPct: 0, accOffset: 0, leastCount: 0, scopePct: 0,
});

const blankParam = (): InstrumentParamPreset => ({
  parameterName: "",
  unit:          "",
  ranges:        [blankRange()],
  samples:       [[]],
});

export default function InstrumentDetailPage() {
  const { instrumentId } = useParams<{ instrumentId: string }>();
  const router = useRouter();
  const { data, isLoading, isError } = useGetInstrumentById(instrumentId);
  const { data: history } = useGetInstrumentHistory(instrumentId);
  const { mutate: update, isPending: isSaving } = useUpdateInstrument();
  const { mutate: setActive, isPending: isToggling } = useSetInstrumentActive();
  const isOffline = !useOnlineStatus();

  // Local editable copy
  const [draft, setDraft] = useState<Instrument | null>(null);
  useEffect(() => { if (data) setDraft(structuredClone(data)); }, [data]);

  const isDirty = useMemo(() => {
    if (!data || !draft) return false;
    return JSON.stringify(data) !== JSON.stringify(draft);
  }, [data, draft]);

  if (isLoading) {
    return (
      <Shell>
        <div className="text-center py-20 text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin inline mr-2" />Loading instrument…
        </div>
      </Shell>
    );
  }
  if (isError || !draft) {
    return (
      <Shell>
        <div className="text-center py-20 text-red-500 text-sm">Failed to load instrument.</div>
      </Shell>
    );
  }

  const updateTop = (k: keyof Instrument, v: string | boolean) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const updateParam = (idx: number, patch: Partial<InstrumentParamPreset>) =>
    setDraft((d) => d && {
      ...d,
      parameters: d.parameters.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    });

  const addParam = () =>
    setDraft((d) => d && { ...d, parameters: [...d.parameters, blankParam()] });

  const removeParam = (idx: number) =>
    setDraft((d) => d && {
      ...d,
      parameters: d.parameters.filter((_, i) => i !== idx),
    });

  const updateRange = (pi: number, ri: number, patch: Partial<InstrumentRangeSpec>) =>
    setDraft((d) => d && {
      ...d,
      parameters: d.parameters.map((p, i) =>
        i !== pi ? p : { ...p, ranges: p.ranges.map((r, j) => j === ri ? { ...r, ...patch } : r) }
      ),
    });

  const addRange = (pi: number) =>
    setDraft((d) => d && {
      ...d,
      parameters: d.parameters.map((p, i) =>
        i !== pi ? p : { ...p, ranges: [...p.ranges, blankRange()], samples: [...p.samples, []] }
      ),
    });

  const removeRange = (pi: number, ri: number) =>
    setDraft((d) => d && {
      ...d,
      parameters: d.parameters.map((p, i) =>
        i !== pi ? p : {
          ...p,
          ranges:  p.ranges.filter((_, j) => j !== ri),
          samples: p.samples.filter((_, j) => j !== ri),
        }
      ),
    });

  const updateSamples = (pi: number, ri: number, samples: InstrumentSample[]) =>
    setDraft((d) => d && {
      ...d,
      parameters: d.parameters.map((p, i) =>
        i !== pi ? p : {
          ...p,
          samples: p.samples.map((row, j) => (j === ri ? samples : row)),
        }
      ),
    });

  const onSave = () => {
    if (!draft) return;
    update(
      { id: instrumentId, payload: draft },
      {
        onSuccess: () => toast.success("Instrument saved"),
        onError:   (err: any) => toast.error(err?.response?.data?.message ?? "Save failed"),
      },
    );
  };

  const onToggleActive = () => {
    setActive(
      { id: instrumentId, isActive: !draft.isActive },
      {
        onSuccess: () => toast.success(draft.isActive ? "Instrument deactivated" : "Instrument activated"),
        onError:   () => toast.error("Failed to update status"),
      },
    );
  };

  return (
    <Shell>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/instruments")}
        className="mb-4 -ml-2 text-slate-500 dark:text-zinc-400"
      >
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Instruments
      </Button>

      {/* Header / top fields */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 mb-5">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
            <FlaskConical className="h-5 w-5 text-slate-500 dark:text-zinc-400" />
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4">
            <LabeledInput label="Key" value={draft.key}       onChange={(v) => updateTop("key", v)} />
            <LabeledInput label="Make" value={draft.make}      onChange={(v) => updateTop("make", v)} />
            <LabeledInput label="Model" value={draft.modelType} onChange={(v) => updateTop("modelType", v)} />
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={draft.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-500"}>
              {draft.isActive ? "Active" : "Inactive"}
            </Badge>
            <Button
              size="sm"
              variant={draft.isActive ? "outline" : "default"}
              onClick={onToggleActive}
              disabled={isToggling || isOffline}
              title={isOffline ? "Instrument templates can only be updated online" : undefined}
              className="gap-1.5"
            >
              <Power className="h-3.5 w-3.5" />
              {draft.isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          {isDirty && (
            <span className="text-[11px] text-amber-600 dark:text-amber-400">Unsaved changes</span>
          )}
          <Button
            size="sm"
            onClick={onSave}
            disabled={!isDirty || isSaving || isOffline}
            title={isOffline ? "Save requires internet" : undefined}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {/* Parameters */}
      <div className="space-y-4">
        {draft.parameters.map((p, pi) => (
          <div key={pi} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50 gap-3">
              <div className="flex items-center gap-3 flex-1">
                <Input
                  value={p.parameterName}
                  onChange={(e) => updateParam(pi, { parameterName: e.target.value })}
                  placeholder="Parameter name"
                  className="h-8 text-[13px] font-semibold max-w-xs"
                />
                <Input
                  value={p.unit}
                  onChange={(e) => updateParam(pi, { unit: e.target.value })}
                  placeholder="Unit"
                  className="h-8 text-[12px] w-20"
                />
              </div>
              <Button size="sm" variant="ghost" onClick={() => removeParam(pi)} className="text-red-500 gap-1">
                <Trash2 className="h-3.5 w-3.5" /> Remove parameter
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-zinc-800">
                    {["Range", "Std. Unc. %", "Accuracy %", "Acc. Offset", "Least Count", "Scope %", ""].map((h, i) => (
                      <th key={i} className="px-3 py-2.5 text-left text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest bg-slate-50/40 dark:bg-zinc-800/40">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                  {p.ranges.map((r, ri) => (
                    <tr key={ri}>
                      <td className="px-3 py-2"><Input value={r.label}      onChange={(e) => updateRange(pi, ri, { label: e.target.value })}            className="h-8 text-[12px] font-mono" /></td>
                      <td className="px-3 py-2"><Input value={r.stdUncPct}  onChange={(e) => updateRange(pi, ri, { stdUncPct: num(e.target.value) })}   className="h-8 text-[12px] font-mono w-24" type="number" step="any" /></td>
                      <td className="px-3 py-2"><Input value={r.accPct}     onChange={(e) => updateRange(pi, ri, { accPct: num(e.target.value) })}      className="h-8 text-[12px] font-mono w-24" type="number" step="any" /></td>
                      <td className="px-3 py-2"><Input value={r.accOffset}  onChange={(e) => updateRange(pi, ri, { accOffset: num(e.target.value) })}   className="h-8 text-[12px] font-mono w-28" type="number" step="any" /></td>
                      <td className="px-3 py-2"><Input value={r.leastCount} onChange={(e) => updateRange(pi, ri, { leastCount: num(e.target.value) })}  className="h-8 text-[12px] font-mono w-24" type="number" step="any" /></td>
                      <td className="px-3 py-2"><Input value={r.scopePct}   onChange={(e) => updateRange(pi, ri, { scopePct: num(e.target.value) })}    className="h-8 text-[12px] font-mono w-24" type="number" step="any" /></td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removeRange(pi, ri)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2 border-t border-slate-100 dark:border-zinc-800 flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => addRange(pi)} className="text-[12px] gap-1">
                <Plus className="h-3.5 w-3.5" /> Add range
              </Button>
            </div>

            <details className="border-t border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-800/20">
              <summary className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 cursor-pointer hover:text-slate-700 dark:hover:text-zinc-200">
                Sample readings — used by "Load examples"
              </summary>
              <div className="px-4 pb-4 space-y-3">
                {p.ranges.map((r, ri) => (
                  <SampleEditor
                    key={ri}
                    rangeLabel={r.label || `Range ${ri + 1}`}
                    samples={p.samples[ri] ?? []}
                    onChange={(s) => updateSamples(pi, ri, s)}
                  />
                ))}
              </div>
            </details>
          </div>
        ))}

        <Button variant="outline" onClick={addParam} className="w-full gap-2 border-dashed">
          <Plus className="h-4 w-4" /> Add parameter
        </Button>
      </div>

      {/* History */}
      <div className="mt-8 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50">
          <History className="h-4 w-4 text-slate-400 dark:text-zinc-500" />
          <span className="text-sm font-semibold text-slate-800 dark:text-zinc-200">History</span>
          <span className="text-[11px] text-slate-400 dark:text-zinc-500">{history?.length ?? 0} entries</span>
          <Button
            variant="outline" size="sm"
            className="ml-auto h-7 gap-1 text-xs border-slate-200"
            disabled={!history?.length}
            onClick={async () => {
              if (!history?.length) return;
              const XLSX = await import("xlsx");
              const rows: Record<string, string>[] = [];
              history.forEach((e) => {
                const name = e.performedBy?.name ?? e.performedBy?.email ?? "system";
                const ts   = new Date(e.createdAt).toLocaleString("en-IN");
                if (e.changes.length) {
                  e.changes.forEach((c) => rows.push({ "Action": e.action, "Performed By": name, "Timestamp": ts, "Field": c.field, "From": c.from, "To": c.to }));
                } else {
                  rows.push({ "Action": e.action, "Performed By": name, "Timestamp": ts, "Field": "", "From": "", "To": "" });
                }
              });
              const ws = XLSX.utils.json_to_sheet(rows);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, "History");
              XLSX.writeFile(wb, `instrument-history-${instrumentId}-${new Date().toISOString().slice(0,10)}.xlsx`);
            }}
          >
            <FileDown className="h-3 w-3" />
            Export Excel
          </Button>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-zinc-800 max-h-96 overflow-y-auto">
          {(!history || history.length === 0) && (
            <div className="px-5 py-10 text-center text-slate-400 dark:text-zinc-500 text-[12px]">No history yet.</div>
          )}
          {history?.map((e) => (
            <div key={e._id} className="px-5 py-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-600 dark:text-zinc-300">{e.action}</span>
                  <span className="text-[11px] text-slate-400 dark:text-zinc-600">·</span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">{e.performedBy?.name ?? e.performedBy?.email ?? "system"}</span>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">{new Date(e.createdAt).toLocaleString()}</span>
              </div>
              {e.changes.length > 0 && (
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 space-y-0.5">
                  {e.changes.slice(0, 6).map((c, i) => (
                    <div key={i}>
                      <span className="font-semibold text-slate-600 dark:text-zinc-300">{c.field}</span>
                      <span className="text-slate-400 dark:text-zinc-600"> · </span>
                      <span className="line-through text-slate-400 dark:text-zinc-600">{c.from}</span>
                      <span className="text-slate-400 dark:text-zinc-600"> → </span>
                      <span className="text-slate-700 dark:text-zinc-200">{c.to}</span>
                    </div>
                  ))}
                  {e.changes.length > 6 && <div className="text-slate-400 dark:text-zinc-500">+{e.changes.length - 6} more…</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}

// ───────────────────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full min-h-screen pt-24 bg-background">
      <Navbar />
      <div className="max-w-[1200px] mx-auto px-6 py-8">{children}</div>
    </div>
  );
}

function LabeledInput({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-[13px]" />
    </div>
  );
}

function SampleEditor({ rangeLabel, samples, onChange }: {
  rangeLabel: string;
  samples:    InstrumentSample[];
  onChange:   (s: InstrumentSample[]) => void;
}) {
  const updatePoint = (idx: number, patch: Partial<InstrumentSample>) =>
    onChange(samples.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  const updateReading = (idx: number, ri: number, val: string) =>
    onChange(
      samples.map((s, i) => i !== idx ? s : {
        ...s,
        readings: Array.from({ length: 5 }, (_, k) => k === ri ? val : (s.readings[k] ?? "")),
      })
    );
  const addPoint = () => onChange([...samples, { nominal: "", readings: ["", "", "", "", ""] }]);
  const removePoint = (idx: number) => onChange(samples.filter((_, i) => i !== idx));

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-slate-50 dark:bg-zinc-800 border-b border-slate-100 dark:border-zinc-700 flex items-center justify-between">
        <span className="text-[11px] font-mono text-slate-600 dark:text-zinc-300">{rangeLabel}</span>
        <Button size="sm" variant="ghost" onClick={addPoint} className="text-[11px] h-6 gap-1">
          <Plus className="h-3 w-3" /> Add point
        </Button>
      </div>
      {samples.length === 0 ? (
        <div className="px-3 py-3 text-[11px] text-slate-400 dark:text-zinc-500">No sample points.</div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-zinc-700">
          {samples.map((s, idx) => (
            <div key={idx} className="px-3 py-2 flex items-center gap-2">
              <Input
                value={s.nominal}
                onChange={(e) => updatePoint(idx, { nominal: e.target.value })}
                placeholder="Nominal"
                className="h-7 text-[11px] font-mono w-24"
              />
              <span className="text-slate-300">→</span>
              {Array.from({ length: 5 }, (_, ri) => (
                <Input
                  key={ri}
                  value={s.readings[ri] ?? ""}
                  onChange={(e) => updateReading(idx, ri, e.target.value)}
                  placeholder={`r${ri + 1}`}
                  className="h-7 text-[11px] font-mono w-20"
                />
              ))}
              <button onClick={() => removePoint(idx)} className="text-red-400 hover:text-red-600 ml-1">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
