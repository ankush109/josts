"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, Calculator, CheckCircle2, Pencil, Save, X, RefreshCw, Play,
  Lock, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetFormulaConfig } from "@/app/hooks/query/useGetFormulaConfig";
import { useUpdateFormulaConfig } from "@/app/hooks/mutate/useUpdateFormulaConfig";
import { useActivateFormulaConfig } from "@/app/hooks/mutate/useActivateFormulaConfig";
import { authClient } from "@/lib/api-client";
import { EP_FORMULA_CONFIG_TEST } from "@/lib/endpoints";
import { FormulaRow } from "@/app/hooks/query/useGetFormulaConfigs";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SampleInputs {
  nomValue: number;
  stdUncPct: number;
  leastCount: number;
  refAccPct: number;
  refAccFloor: number;
  scopePct: number;
  readings: number[];
}

interface PreviewResult {
  symbol: string;
  value: number | null;
  error?: string;
}

const DEFAULT_INPUTS: SampleInputs = {
  nomValue: 100,
  stdUncPct: 0.2,
  leastCount: 0.1,
  refAccPct: 0.05,
  refAccFloor: 0,
  scopePct: 0,
  readings: [100, 100, 100, 100, 100],
};

const fmt = (d: string | undefined) => {
  if (!d) return "—";
  try { return format(parseISO(d), "dd MMM yyyy, HH:mm"); } catch { return "—"; }
};

const fmtNum = (v: number | null | undefined): string => {
  if (v == null) return "—";
  return v.toFixed(6);
};

// ─── Flowchart ────────────────────────────────────────────────────────────────

type NodeKind = "input" | "locked" | "computed";

interface FlowNode {
  symbol: string;
  label: string;
  kind: NodeKind;
  col: number;
  row: number;
}

const FLOW_NODES: FlowNode[] = [
  // col 0 — raw inputs
  { symbol: "readings",    label: "readings",       kind: "input",    col: 0, row: 0 },
  { symbol: "nomValue",    label: "nomValue / absNom", kind: "input", col: 0, row: 2 },
  { symbol: "stdUncPct",   label: "stdUncPct",      kind: "input",    col: 0, row: 3 },
  { symbol: "refAccPct",   label: "refAccPct",       kind: "input",    col: 0, row: 4 },
  { symbol: "leastCount",  label: "leastCount",      kind: "input",    col: 0, row: 5 },
  { symbol: "scopePct",    label: "scopePct",        kind: "input",    col: 0, row: 6 },
  // col 1 — statistical (locked)
  { symbol: "J",           label: "J: Mean Value",   kind: "locked",   col: 1, row: 0 },
  { symbol: "K",           label: "K: Std. U/c of Mean", kind: "locked", col: 1, row: 1 },
  // col 2 — primary computed
  { symbol: "M",           label: "M: Std. Uncertainty", kind: "computed", col: 2, row: 2 },
  { symbol: "O",           label: "O: U/c Acc. Ref.",  kind: "computed", col: 2, row: 4 },
  { symbol: "P",           label: "P: U/c L/c DUC",    kind: "computed", col: 2, row: 5 },
  // col 2.5 — N from M
  { symbol: "N",           label: "N: U/c Ref. Std.",  kind: "computed", col: 3, row: 2 },
  // col 3 — combined
  { symbol: "Q",           label: "Q: Combined Uc",    kind: "computed", col: 4, row: 3 },
  { symbol: "R",           label: "R: Effective DoF",  kind: "computed", col: 5, row: 3 },
  { symbol: "S",           label: "S: k Factor",       kind: "computed", col: 6, row: 3 },
  { symbol: "T",           label: "T: Expanded Uc",    kind: "computed", col: 7, row: 3 },
  { symbol: "V",           label: "V: Resulted Exp. U/C", kind: "computed", col: 7, row: 5 },
  { symbol: "W",           label: "W: % U/C",          kind: "computed", col: 7, row: 6 },
];

const KIND_COLORS: Record<NodeKind, string> = {
  input:    "bg-slate-800 border-slate-600 text-slate-200",
  locked:   "bg-zinc-800 border-zinc-600 text-zinc-300",
  computed: "bg-blue-950 border-blue-700 text-blue-200",
};

function FlowNodeBox({
  node,
  previewMap,
}: {
  node: FlowNode;
  previewMap: Map<string, PreviewResult>;
}) {
  const result = previewMap.get(node.symbol);
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 text-[11px] font-mono min-w-[130px] text-center shadow-sm",
        KIND_COLORS[node.kind],
      )}
    >
      <div className="font-semibold">{node.label}</div>
      {result && (
        <div
          className={cn(
            "text-[10px] mt-1 font-mono",
            result.error ? "text-red-400" : "text-emerald-400",
          )}
        >
          {result.error ? `Err: ${result.error}` : fmtNum(result.value)}
        </div>
      )}
      {node.kind === "input" && previewMap.size > 0 && !result && (
        <div className="text-[10px] mt-1 text-slate-500">—</div>
      )}
    </div>
  );
}

function Flowchart({ previewResults }: { previewResults: PreviewResult[] }) {
  const previewMap = useMemo(() => {
    const m = new Map<string, PreviewResult>();
    for (const r of previewResults) m.set(r.symbol, r);
    return m;
  }, [previewResults]);

  const COL_W = 160;
  const ROW_H = 64;
  const PAD_X = 16;
  const PAD_Y = 16;
  const COLS = 8;
  const ROWS = 7;

  const width = COLS * COL_W + PAD_X * 2;
  const height = ROWS * ROW_H + PAD_Y * 2;

  const nodePos = (n: FlowNode) => ({
    x: PAD_X + n.col * COL_W + COL_W / 2,
    y: PAD_Y + n.row * ROW_H + ROW_H / 2,
  });

  // Edges: [fromSymbol, toSymbol]
  const EDGES: [string, string][] = [
    ["readings",   "J"],
    ["readings",   "K"],
    ["nomValue",   "M"],
    ["stdUncPct",  "M"],
    ["M",          "N"],
    ["refAccPct",  "O"],
    ["nomValue",   "O"],
    ["leastCount", "P"],
    ["K",          "Q"],
    ["N",          "Q"],
    ["O",          "Q"],
    ["P",          "Q"],
    ["Q",          "R"],
    ["R",          "S"],
    ["Q",          "T"],
    ["S",          "T"],
    ["T",          "V"],
    ["T",          "W"],
    ["nomValue",   "W"],
  ];

  const nodeBySymbol = useMemo(() => {
    const m = new Map<string, FlowNode>();
    for (const n of FLOW_NODES) m.set(n.symbol, n);
    return m;
  }, []);

  return (
    <div className="overflow-x-auto">
      <div style={{ position: "relative", width, height }}>
        {/* SVG edges */}
        <svg
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          width={width}
          height={height}
        >
          <defs>
            <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="#4b5563" />
            </marker>
          </defs>
          {EDGES.map(([from, to], i) => {
            const fn = nodeBySymbol.get(from);
            const tn = nodeBySymbol.get(to);
            if (!fn || !tn) return null;
            const fp = nodePos(fn);
            const tp = nodePos(tn);
            const mx = (fp.x + tp.x) / 2;
            return (
              <path
                key={i}
                d={`M${fp.x},${fp.y} C${mx},${fp.y} ${mx},${tp.y} ${tp.x},${tp.y}`}
                fill="none"
                stroke="#374151"
                strokeWidth={1.5}
                markerEnd="url(#arr)"
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {FLOW_NODES.map((node) => {
          const pos = nodePos(node);
          return (
            <div
              key={node.symbol}
              style={{
                position: "absolute",
                left: pos.x - 65,
                top: pos.y - 24,
                width: 130,
              }}
            >
              <FlowNodeBox node={node} previewMap={previewMap} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FormulaConfigDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.configId as string;

  const { data: config, isLoading, isError } = useGetFormulaConfig(id);
  const { mutate: update, isPending: isSaving } = useUpdateFormulaConfig();
  const { mutate: activate, isPending: isActivating } = useActivateFormulaConfig();

  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<FormulaRow[] | null>(null);
  const [sampleInputs, setSampleInputs] = useState<SampleInputs>(DEFAULT_INPUTS);
  const [readingsRaw, setReadingsRaw] = useState("100, 100, 100, 100, 100");
  const [previewResults, setPreviewResults] = useState<PreviewResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (config) setDraft(structuredClone(config.formulas));
  }, [config]);

  const isDirty = useMemo(() => {
    if (!config || !draft) return false;
    return JSON.stringify(config.formulas) !== JSON.stringify(draft);
  }, [config, draft]);

  const updateFormula = (idx: number, formula: string) => {
    setDraft((d) => d ? d.map((r, i) => (i === idx ? { ...r, formula } : r)) : d);
  };

  const onSave = () => {
    if (!draft || !config) return;
    update(
      { id, payload: { ...config, formulas: draft } },
      {
        onSuccess: () => { toast.success("Saved"); setEditMode(false); },
        onError: (err: any) => toast.error(err?.response?.data?.message ?? "Save failed"),
      },
    );
  };

  const onCancel = () => {
    if (config) setDraft(structuredClone(config.formulas));
    setEditMode(false);
  };

  const onActivate = () => {
    activate(id, {
      onSuccess: () => toast.success("Activated"),
      onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to activate"),
    });
  };

  const runPreview = async () => {
    setIsRunning(true);
    try {
      const readings = readingsRaw
        .split(",")
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n));
      const body = { sampleInputs: { ...sampleInputs, readings } };
      const { data } = await authClient.post(EP_FORMULA_CONFIG_TEST(id), body);
      setPreviewResults(data.results ?? []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Preview failed");
    } finally {
      setIsRunning(false);
    }
  };

  const previewMap = useMemo(() => {
    const m = new Map<string, PreviewResult>();
    for (const r of previewResults) m.set(r.symbol, r);
    return m;
  }, [previewResults]);

  // ── Loading / error states ───────────────────────────────────────────────

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="h-6 w-6 animate-spin text-zinc-500" />
        <p className="text-[13px] text-zinc-500">Loading formula config…</p>
      </div>
    </div>
  );

  if (isError || !config || !draft) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 text-[14px] mb-3">Failed to load formula config.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>Go Back</Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">

      {/* Top bar */}
      <div className="bg-zinc-900 border-b border-zinc-800 text-white px-5 py-4 flex items-center gap-4 shadow-md">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10 shrink-0"
          onClick={() => router.push("/formula-config")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[12px] text-white/40 shrink-0">
          <span>Formula Configs</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-white/80 font-medium truncate max-w-[200px]">{config.name}</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2 shrink-0">
          {config.isActive ? (
            <Badge className="bg-violet-500/20 text-violet-300 border border-violet-700 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Active
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={onActivate}
              disabled={isActivating}
              className="text-white/80 hover:text-white hover:bg-white/10 gap-1.5"
            >
              {isActivating ? "Activating…" : "Activate"}
            </Button>
          )}

          {!editMode ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditMode(true)}
              className="gap-1.5 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={onCancel}
                className="text-white/70 hover:text-white hover:bg-white/10 gap-1.5"
              >
                <X className="h-3.5 w-3.5" /> Cancel
              </Button>
              <Button
                size="sm"
                onClick={onSave}
                disabled={!isDirty || isSaving}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="h-3.5 w-3.5" />
                {isSaving ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 py-7 space-y-6">

        {/* Meta */}
        <div className="text-[12px] text-zinc-500 flex items-center gap-4">
          <span>Created: {fmt(config.createdAt)}</span>
          <span>·</span>
          <span>Updated: {fmt(config.updatedAt)}</span>
          {config.createdBy?.name && (
            <>
              <span>·</span>
              <span>by {config.createdBy.name}</span>
            </>
          )}
          {config.description && (
            <>
              <span>·</span>
              <span className="text-zinc-400">{config.description}</span>
            </>
          )}
        </div>

        {/* ── Section A: Formula Table + Live Preview ────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">

          {/* Sample Inputs Panel */}
          <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="h-4 w-4 text-violet-500" />
              <span className="text-[12px] font-semibold text-slate-700 dark:text-zinc-200">
                Sample Inputs
              </span>
            </div>
            <div className="flex flex-wrap gap-3 items-end">
              {(
                [
                  { key: "nomValue",    label: "nomValue"    },
                  { key: "stdUncPct",   label: "stdUncPct"   },
                  { key: "leastCount",  label: "leastCount"  },
                  { key: "refAccPct",   label: "refAccPct"   },
                  { key: "refAccFloor", label: "refAccFloor" },
                  { key: "scopePct",    label: "scopePct"    },
                ] as { key: keyof Omit<SampleInputs, "readings">; label: string }[]
              ).map(({ key, label }) => (
                <div key={key} className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                    {label}
                  </label>
                  <Input
                    type="number"
                    value={sampleInputs[key]}
                    onChange={(e) =>
                      setSampleInputs((s) => ({ ...s, [key]: parseFloat(e.target.value) || 0 }))
                    }
                    className="h-8 w-24 text-[12px] font-mono"
                  />
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
                  readings (comma-separated)
                </label>
                <Input
                  value={readingsRaw}
                  onChange={(e) => setReadingsRaw(e.target.value)}
                  className="h-8 w-56 text-[12px] font-mono"
                />
              </div>
              <Button
                size="sm"
                onClick={runPreview}
                disabled={isRunning}
                className="h-8 gap-1.5 bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Play className="h-3.5 w-3.5" />
                {isRunning ? "Running…" : "Run Preview"}
              </Button>
            </div>
          </div>

          {/* Formula Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-zinc-800/50 border-b border-slate-200 dark:border-zinc-800">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest w-14">
                    Symbol
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest w-44">
                    Column Name
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">
                    Formula
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest w-52">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-widest w-32">
                    Preview
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {draft.map((row, i) => {
                  const result = previewMap.get(row.symbol);
                  return (
                    <tr
                      key={row.symbol}
                      className={cn(
                        "hover:bg-slate-50/60 dark:hover:bg-zinc-800/40 transition-colors",
                        !row.editable && "opacity-80",
                      )}
                    >
                      {/* Symbol */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-[13px] text-violet-600 dark:text-violet-400">
                          {row.symbol}
                          {!row.editable && (
                            <Lock className="h-2.5 w-2.5 text-slate-400 dark:text-zinc-500" />
                          )}
                        </span>
                      </td>

                      {/* Column name */}
                      <td className="px-4 py-3 text-slate-600 dark:text-zinc-300 text-[12px]">
                        {row.columnName || row.label}
                      </td>

                      {/* Formula */}
                      <td className="px-4 py-3">
                        {editMode && row.editable ? (
                          <Input
                            value={draft[i].formula}
                            onChange={(e) => updateFormula(i, e.target.value)}
                            className="h-8 text-[12px] font-mono w-full min-w-[260px]"
                          />
                        ) : (
                          <code className={cn(
                            "text-[11px] font-mono px-2 py-1 rounded",
                            row.editable
                              ? "bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400",
                          )}>
                            {row.formula}
                          </code>
                        )}
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3 text-[11px] text-slate-400 dark:text-zinc-500">
                        {row.description}
                      </td>

                      {/* Preview */}
                      <td className="px-4 py-3 text-right">
                        {result ? (
                          result.error ? (
                            <span
                              className="text-[11px] font-mono text-red-500 dark:text-red-400"
                              title={result.error}
                            >
                              Error
                            </span>
                          ) : (
                            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                              {fmtNum(result.value)}
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] text-slate-300 dark:text-zinc-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Section B: Flowchart ──────────────────────────────────────── */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-violet-500/10 dark:bg-violet-500/15 flex items-center justify-center shrink-0">
              <Calculator className="h-4 w-4 text-violet-500" />
            </div>
            <span className="text-[13px] font-semibold text-slate-700 dark:text-zinc-200">
              Dependency Flowchart
            </span>
            <span className="text-[11px] text-slate-400 dark:text-zinc-500">
              {previewResults.length > 0 ? "Showing live preview values" : "Run preview to see values"}
            </span>
            <div className="ml-auto flex items-center gap-3 text-[11px] text-slate-400 dark:text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-slate-700 border border-slate-500" />
                Input
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-zinc-700 border border-zinc-500" />
                Locked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded bg-blue-950 border border-blue-700" />
                Computed
              </span>
            </div>
          </div>
          <div className="p-5 bg-zinc-950/50 dark:bg-zinc-950/80 rounded-b-2xl">
            <Flowchart previewResults={previewResults} />
          </div>
        </div>

      </div>
    </div>
  );
}
