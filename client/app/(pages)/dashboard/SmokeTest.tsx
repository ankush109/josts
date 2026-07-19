"use client";

/**
 * Admin diagnostics: a self-contained smoke test suite that exercises the
 * happy paths (auth, master data, report CRUD, compute, submit, PDF poll,
 * cleanup) against the *live* backend using the current admin's credentials.
 *
 * Renders a pipeline-style UI so the admin sees each step run in real time.
 * Every step is defined in `buildSteps()`, sequenced in `run()`, and reported
 * via React state so the UI reflects progress without polling.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2, XCircle, Loader2, Play, Square, Copy, ExternalLink,
  ClipboardCheck, Beaker, RefreshCw, Timer, ChevronRight, ChevronDown,
  AlertCircle, Zap, Clock, History, Trash2,
} from "lucide-react";
import { authClient as AUTH_API } from "@/lib/api-client";
import {
  EP_USER_PROFILE,
  EP_INSTRUMENTS,
  EP_EQUIPMEMTS,
  EP_PARAMETERS,
  EP_FORMULA_CONFIG_ACTIVE,
  EP_CALIBRATION_REPORTS,
  EP_CREATE_CALIBRATION_REPORT,
  EP_CALIBRATION_REPORT_BY_ID,
  EP_UPDATE_CALIBRATION_REPORT,
  EP_COMPUTE_CALIBRATION,
  EP_REPORT_URL,
} from "@/lib/endpoints";

// ─── Types ──────────────────────────────────────────────────────────────────

type StepStatus = "pending" | "running" | "passed" | "failed" | "skipped";

interface StepResult {
  key:       string;
  label:     string;
  desc:      string;
  status:    StepStatus;
  startedAt: number | null;
  endedAt:   number | null;
  detail:    string;
  error?:    string;
  data?:     any;
}

interface Ctx {
  /** Populated as steps produce artefacts. */
  createdReportId?: string;
  seedInstrumentId?: string;
  seedEquipmentId?:  string;
  paramName?:        string;
  createdCertNo?:    string;
  updatedCustomerName?: string;
  originalCustomerName?: string;
  computedBudget?:   any;
  pdfUrl?:           string;
  latestReportCount?: number;
  highestReport?:    any;
  activeFormula?:    any;
}

interface RunHistoryEntry {
  ts:          number;
  durationMs:  number;
  passed:      number;
  failed:      number;
  total:       number;
  overall:     "passed" | "failed" | "aborted";
  reportId?:   string;
  certNo?:     string;
  pdfUrl?:     string;
  failedStep?: { key: string; label: string; error: string };
}

const HISTORY_KEY   = "jasper.smokeTest.history";
const HISTORY_MAX   = 25;

function loadHistory(): RunHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as RunHistoryEntry[]) : [];
  } catch { return []; }
}

function saveHistory(entries: RunHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_MAX)));
  } catch { /* quota */ }
}

/** Extracts a human-readable error out of an axios error or thrown Error. */
function extractError(err: any): string {
  const status = err?.response?.status;
  const data   = err?.response?.data;
  // The API returns errors in two shapes:
  //   - Zod middleware: `errors: [{ field, message }]`
  //   - Mongoose / other:    `errors: [string]`
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    const list = data.errors
      .map((e: any) =>
        typeof e === "string"
          ? e
          : `${e.field ?? e.path ?? "?"}: ${e.message ?? "invalid"}`
      )
      .join(" · ");
    return `${status ? `HTTP ${status} · ` : ""}${data.message ?? "Validation failed"}\n  ${list}`;
  }
  const msg = data?.message ?? err?.message ?? "Unknown error";
  return `${status ? `HTTP ${status} · ` : ""}${msg}`;
}

// ─── Test payload ───────────────────────────────────────────────────────────

const TEST_CUSTOMER_NAME_A = `[SMOKE] Jasper Test Corp · ${new Date().toISOString().slice(0, 10)}`;
const TEST_CUSTOMER_NAME_B = `[SMOKE] Jasper Test Corp · updated`;

/**
 * Stable parameter name that we know has seeded instrument constants server-side.
 * Avoids the failure mode where the active parameter list picks a name with no
 * matching constants, causing compute → NaN → Mongoose cast error.
 */
const STABLE_PARAM_NAME = "DC Voltage";

function buildTestPayload(ctx: Ctx, userId: string, status: "draft" | "submitted") {
  return {
    createdBy: userId,
    status,
    layoutStyle: "current",
    letterHeadStyle: "kol",
    customerName:    TEST_CUSTOMER_NAME_A,
    customerAddress: "Kolkata, WB",
    customerRefNo:   `PO-SMOKE-${Date.now()}`,
    ducReceivedDate:    new Date().toISOString().slice(0, 10),
    dateOfCalibration:  new Date().toISOString().slice(0, 10),
    calibrationDueDate: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10),
    calibrationLocation: "at_lab",
    calibrationInterval: 12,
    remarks: ["Smoke-test report — safe to delete."],
    instruments: [
      {
        nomenclature: "Smoke DUC",
        make:         "SmokeTest",
        modelType:    "ST-100",
        slNo:         "SN-SMOKE-1",
        idNo:         "ID-SMOKE-1",
        othersDetails: "",
        jobId:         "SMOKE-JOB",
        environmental: {
          supplyVoltage: "230",
          temperature:   "25",
          humidity:      "55",
          voltageArea:   "low",
        },
        refStandards: ctx.seedEquipmentId
          ? [{
              equipmentId: ctx.seedEquipmentId,
              equipmentName: "Smoke Reference",
              calDate: new Date().toISOString().slice(0, 10),
              calDueDate: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10),
            }]
          : [],
        parameters: [
          {
            name: STABLE_PARAM_NAME,
            unit: "V",
            ranges: [
              {
                label: "10V",
                // Numeric values — the compute path does arithmetic without
                // coercion, so string readings become NaN via string+number.
                measurements: [
                  { nomValue: 1, readings: [1.001, 1.000, 0.999, 1.002, 1.000], readingUnits: [], corrected: "" },
                  { nomValue: 5, readings: [5.010, 5.005, 4.998, 5.000, 5.003], readingUnits: [], corrected: "" },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function SmokeTestPanel() {
  const [steps, setSteps]   = useState<StepResult[]>(() => buildSteps());
  const [running, setRunning] = useState(false);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [history, setHistory] = useState<RunHistoryEntry[]>([]);
  const abortRef = useRef<{ aborted: boolean }>({ aborted: false });
  const ctxRef   = useRef<Ctx>({});

  useEffect(() => { setHistory(loadHistory()); }, []);

  const total  = steps.length;
  const passed = steps.filter((s) => s.status === "passed").length;
  const failed = steps.filter((s) => s.status === "failed").length;
  const runningIdx = steps.findIndex((s) => s.status === "running");
  const durationTotal = useMemo(() => {
    return steps.reduce((acc, s) => {
      if (s.startedAt && s.endedAt) return acc + (s.endedAt - s.startedAt);
      return acc;
    }, 0);
  }, [steps]);

  function reset() {
    ctxRef.current = {};
    abortRef.current.aborted = false;
    setSteps(buildSteps());
    setSummary("");
    setExpandedKey(null);
  }

  function updateStep(key: string, patch: Partial<StepResult>) {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  async function run() {
    reset();
    setRunning(true);
    const startAll = Date.now();
    let failedStep: { key: string; label: string; error: string } | undefined;

    for (const step of buildSteps()) {
      if (abortRef.current.aborted) {
        updateStep(step.key, { status: "skipped", detail: "Aborted by user" });
        continue;
      }
      updateStep(step.key, {
        status:    "running",
        startedAt: Date.now(),
        detail:    "Running…",
      });
      try {
        const result = await runStep(step.key, ctxRef.current);
        updateStep(step.key, {
          status:  "passed",
          endedAt: Date.now(),
          detail:  result.detail ?? "OK",
          data:    result.data,
        });
      } catch (err: any) {
        const errorText = extractError(err);
        failedStep = { key: step.key, label: step.label, error: errorText };
        updateStep(step.key, {
          status:  "failed",
          endedAt: Date.now(),
          detail:  "Failed",
          error:   errorText,
        });
        setExpandedKey(step.key);
        break;
      }
    }

    setRunning(false);
    const durationMs = Date.now() - startAll;
    const elapsed    = (durationMs / 1000).toFixed(1);
    setSummary(
      abortRef.current.aborted
        ? `Aborted after ${elapsed}s`
        : `Finished in ${elapsed}s`
    );

    // Persist run summary to localStorage
    setSteps((finalSteps) => {
      const passedCount = finalSteps.filter((s) => s.status === "passed").length;
      const failedCount = finalSteps.filter((s) => s.status === "failed").length;
      const overall: RunHistoryEntry["overall"] =
        abortRef.current.aborted ? "aborted" :
        failedCount > 0          ? "failed"  :
                                   "passed";
      const entry: RunHistoryEntry = {
        ts:          Date.now(),
        durationMs,
        passed:      passedCount,
        failed:      failedCount,
        total:       finalSteps.length,
        overall,
        reportId:    ctxRef.current.createdReportId,
        certNo:      ctxRef.current.createdCertNo,
        pdfUrl:      ctxRef.current.pdfUrl,
        failedStep,
      };
      const next = [entry, ...loadHistory()].slice(0, HISTORY_MAX);
      saveHistory(next);
      setHistory(next);
      return finalSteps;
    });
  }

  function clearHistory() {
    saveHistory([]);
    setHistory([]);
  }

  function abort() {
    abortRef.current.aborted = true;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-2xl border border-border bg-white dark:bg-zinc-900 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Beaker className="h-4 w-4 text-blue-500" />
              <span className="font-mono text-[10.5px] tracking-widest text-blue-500 uppercase font-bold">
                § SMOKE TEST
              </span>
            </div>
            <h2 className="text-xl font-semibold text-foreground tracking-tight">
              Happy-path diagnostic suite
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Runs {steps.length} checks against the live backend as the current admin — auth, master data,
              report CRUD, compute, submit, PDF. The created smoke-test report is kept for inspection;
              you can open it from the header links or the run history.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!running ? (
              <button
                onClick={run}
                className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <Play className="h-3.5 w-3.5" />
                {steps.some((s) => s.status !== "pending") ? "Run again" : "Run test suite"}
              </button>
            ) : (
              <button
                onClick={abort}
                className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-colors shadow-sm"
              >
                <Square className="h-3.5 w-3.5" />
                Abort
              </button>
            )}
          </div>
        </div>

        {/* Progress + counts */}
        <div className="mt-5 flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  failed > 0 ? "bg-red-500" : "bg-blue-500"
                }`}
                style={{ width: `${((passed + failed) / total) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <Stat label="TOTAL"  value={total}  tone="neutral" />
            <Stat label="PASSED" value={passed} tone="ok" />
            <Stat label="FAILED" value={failed} tone="err" />
            <Stat
              label="ELAPSED"
              value={`${(durationTotal / 1000).toFixed(1)}s`}
              tone="neutral"
            />
          </div>
        </div>
        {summary && (
          <p className="mt-3 text-xs font-mono text-muted-foreground tracking-wide">
            {summary}
          </p>
        )}

        {/* Artefact links — show as soon as we have them */}
        {(ctxRef.current.createdReportId || ctxRef.current.pdfUrl) && (
          <div className="mt-4 flex flex-wrap gap-2">
            {ctxRef.current.createdReportId && (
              <Link
                href={`/calibration/${ctxRef.current.createdReportId}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-400 text-[12px] font-medium hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                Open report{ctxRef.current.createdCertNo ? ` · ${ctxRef.current.createdCertNo}` : ""}
              </Link>
            )}
            {ctxRef.current.pdfUrl && (
              <a
                href={ctxRef.current.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 text-[12px] font-medium hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
                View generated PDF
              </a>
            )}
          </div>
        )}
      </div>

      {/* Pipeline */}
      <div className="rounded-2xl border border-border bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="divide-y divide-border">
          {steps.map((step, i) => (
            <PipelineRow
              key={step.key}
              step={step}
              index={i}
              isNext={i === runningIdx}
              expanded={expandedKey === step.key}
              onToggle={() =>
                setExpandedKey((k) => (k === step.key ? null : step.key))
              }
              ctx={ctxRef.current}
            />
          ))}
        </div>
      </div>

      {/* Run history */}
      {history.length > 0 && (
        <RunHistoryPanel history={history} onClear={clearHistory} />
      )}
    </div>
  );
}

// ─── Run history panel ─────────────────────────────────────────────────────

function RunHistoryPanel({ history, onClear }: { history: RunHistoryEntry[]; onClear: () => void }) {
  const passedTotal = history.filter((h) => h.overall === "passed").length;
  const failedTotal = history.filter((h) => h.overall === "failed").length;

  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Run history</span>
          <span className="text-[10.5px] font-mono uppercase tracking-widest text-muted-foreground">
            {history.length} · {passedTotal} passed · {failedTotal} failed
          </span>
        </div>
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-medium text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <Trash2 className="h-3 w-3" />
          Clear
        </button>
      </div>
      <div className="divide-y divide-border max-h-[420px] overflow-y-auto">
        {history.map((entry, i) => (
          <RunHistoryRow key={`${entry.ts}-${i}`} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function RunHistoryRow({ entry }: { entry: RunHistoryEntry }) {
  const [open, setOpen] = useState(false);
  const dt = new Date(entry.ts);
  const when = dt.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const badge =
    entry.overall === "passed"
      ? { color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60", label: "PASSED" }
      : entry.overall === "aborted"
      ? { color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60", label: "ABORTED" }
      : { color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/60", label: "FAILED" };

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
      >
        <span className={`text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0 ${badge.color}`}>
          {badge.label}
        </span>
        <span className="text-[11.5px] font-mono text-muted-foreground shrink-0 tabular-nums flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {when}
        </span>
        <span className="flex-1 min-w-0 flex items-center gap-3 text-[12px]">
          <span className="text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
            {entry.passed}✓
          </span>
          {entry.failed > 0 && (
            <span className="text-red-600 dark:text-red-400 font-mono tabular-nums">
              {entry.failed}✗
            </span>
          )}
          <span className="text-muted-foreground font-mono">
            / {entry.total}
          </span>
          <span className="text-muted-foreground font-mono flex items-center gap-1">
            <Timer className="h-3 w-3" />
            {(entry.durationMs / 1000).toFixed(1)}s
          </span>
          {entry.certNo && (
            <span className="text-muted-foreground font-mono truncate">· {entry.certNo}</span>
          )}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {entry.reportId && (
            <Link
              href={`/calibration/${entry.reportId}`}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
              className="text-[10.5px] font-mono text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              REPORT
            </Link>
          )}
          {entry.pdfUrl && (
            <a
              href={entry.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10.5px] font-mono text-emerald-600 hover:underline inline-flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              PDF
            </a>
          )}
          {entry.failedStep &&
            (open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />)}
        </div>
      </button>
      {open && entry.failedStep && (
        <div className="px-5 pb-3 pl-16">
          <div className="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 p-3">
            <p className="text-[11px] font-semibold text-red-700 dark:text-red-300">
              Failed at step: <span className="font-mono">{entry.failedStep.label}</span>
            </p>
            <p className="text-[11px] font-mono text-red-600 dark:text-red-400 mt-1 whitespace-pre-wrap">
              {entry.failedStep.error}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────

function PipelineRow({
  step, index, isNext, expanded, onToggle, ctx,
}: {
  step: StepResult;
  index: number;
  isNext: boolean;
  expanded: boolean;
  onToggle: () => void;
  ctx: Ctx;
}) {
  const duration = step.startedAt && step.endedAt ? ((step.endedAt - step.startedAt) / 1000).toFixed(2) : null;
  const canExpand = !!step.error || !!step.data || step.status === "running";

  return (
    <div
      className={`transition-colors ${
        step.status === "running" ? "bg-blue-50/40 dark:bg-blue-950/10"
        : step.status === "failed" ? "bg-red-50/40 dark:bg-red-950/10"
        : step.status === "passed" ? "bg-emerald-50/20 dark:bg-emerald-950/5"
        : ""
      }`}
    >
      <button
        onClick={onToggle}
        disabled={!canExpand}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left disabled:cursor-default"
      >
        {/* index gutter */}
        <div className="w-6 text-center font-mono text-[10px] text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </div>

        {/* status icon */}
        <div className="w-5 h-5 flex items-center justify-center shrink-0">
          {step.status === "pending"  && <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-600" />}
          {step.status === "running"  && <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />}
          {step.status === "passed"   && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          {step.status === "failed"   && <XCircle className="h-4 w-4 text-red-500" />}
          {step.status === "skipped"  && <div className="w-2 h-2 rounded-full bg-zinc-400" />}
        </div>

        {/* label + desc */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${
              step.status === "failed" ? "text-red-600 dark:text-red-400" :
              step.status === "passed" ? "text-zinc-800 dark:text-zinc-200" :
              step.status === "running" ? "text-blue-700 dark:text-blue-400" :
              "text-zinc-700 dark:text-zinc-300"
            }`}>
              {step.label}
            </span>
            {isNext && step.status === "running" && (
              <span className="text-[9px] font-mono uppercase tracking-widest text-blue-500 bg-blue-100 dark:bg-blue-950/40 px-1.5 py-0.5 rounded">
                LIVE
              </span>
            )}
          </div>
          <div className="text-[11.5px] text-muted-foreground mt-0.5 truncate">
            {step.desc}
          </div>
        </div>

        {/* detail + duration */}
        <div className="flex items-center gap-3 shrink-0">
          {duration && (
            <span className="flex items-center gap-1 text-[10.5px] font-mono text-muted-foreground">
              <Timer className="h-3 w-3" />
              {duration}s
            </span>
          )}
          <span className={`text-[11px] font-mono ${
            step.status === "failed"  ? "text-red-600" :
            step.status === "passed"  ? "text-emerald-600" :
            step.status === "running" ? "text-blue-500" :
            "text-zinc-400"
          }`}>
            {step.status === "passed" && step.detail}
            {step.status === "failed" && "FAILED"}
            {step.status === "running" && "RUNNING…"}
            {step.status === "pending" && "PENDING"}
            {step.status === "skipped" && "SKIPPED"}
          </span>
          {canExpand && (
            expanded
              ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (step.error || step.data) && (
        <div className="px-5 pb-4 pl-[64px] pt-1">
          {step.error && (
            <div className="rounded-md border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 p-3 flex gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-red-700 dark:text-red-300">Error</p>
                <p className="text-[11.5px] font-mono text-red-600 dark:text-red-400 mt-1 whitespace-pre-wrap break-all">
                  {step.error}
                </p>
              </div>
            </div>
          )}
          {step.data && (
            <div className="rounded-md border border-border bg-zinc-50 dark:bg-zinc-800/40 p-3 mt-2">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">Payload</p>
              <pre className="text-[10.5px] font-mono text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap overflow-x-auto max-h-[220px]">
                {JSON.stringify(step.data, null, 2)}
              </pre>
            </div>
          )}
          {/* Report-specific quick actions */}
          {step.key === "poll_pdf" && step.status === "passed" && ctx.createdReportId && (
            <div className="mt-2 flex gap-2">
              {ctx.pdfUrl && (
                <a
                  href={ctx.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open generated PDF
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone: "ok" | "err" | "neutral" }) {
  const color =
    tone === "ok"  ? "text-emerald-600 dark:text-emerald-400" :
    tone === "err" ? "text-red-600 dark:text-red-400" :
                     "text-zinc-700 dark:text-zinc-200";
  return (
    <div className="flex flex-col items-end">
      <span className={`text-sm font-bold tabular-nums leading-none ${color}`}>{value}</span>
      <span className="text-[9.5px] font-mono tracking-widest text-muted-foreground mt-0.5">{label}</span>
    </div>
  );
}

// ─── Step registry ──────────────────────────────────────────────────────────

function buildSteps(): StepResult[] {
  const defs: { key: string; label: string; desc: string }[] = [
    { key: "auth",           label: "Auth check",              desc: "GET /user/profile — verify admin token works" },
    { key: "instruments",    label: "Fetch DUC master",        desc: "GET /instruments — DUC instrument templates load" },
    { key: "equipments",     label: "Fetch reference standards", desc: "GET /equipments — traceable equipment list loads" },
    { key: "parameters",     label: "Fetch parameter config",  desc: "GET /parameters — calibration constants available" },
    { key: "formula",        label: "Fetch active formula",    desc: "GET /formula-config/active — GUM formulas are active" },
    { key: "list_reports",   label: "List existing reports",   desc: "GET /calibration-report — record current count + latest" },
    { key: "create",         label: "Create draft report",     desc: "POST /calibration-report — insert a smoke-test draft" },
    { key: "read_back",      label: "Read report back",        desc: "GET /calibration-report/:id — the draft is retrievable" },
    { key: "edit",           label: "Edit draft (customer)",   desc: "PUT /calibration-report/:id — update customer name" },
    { key: "compute",        label: "Compute uncertainty",     desc: "POST /calibration-report/compute — uncertainty budget returns" },
    { key: "submit",         label: "Submit report",           desc: "PUT status=submitted — triggers worker + PDF generation" },
    { key: "poll_pdf",       label: "Wait for PDF",            desc: "GET /reports/:id/url — poll until worker uploads to S3" },
    { key: "match_latest",   label: "Match against latest",    desc: "Compare shape with the most recent existing report" },
    { key: "keep_report",    label: "Preserve report",         desc: "Report is kept so the admin can inspect it" },
  ];
  return defs.map((d) => ({
    ...d,
    status:    "pending",
    startedAt: null,
    endedAt:   null,
    detail:    "",
  }));
}

// ─── Step implementations ───────────────────────────────────────────────────

async function runStep(key: string, ctx: Ctx): Promise<{ detail?: string; data?: any }> {
  switch (key) {
    case "auth": {
      const { data } = await AUTH_API.get(EP_USER_PROFILE());
      const user = (data as any)?.user ?? data;
      if (!user?.role || user.role !== "admin") throw new Error("Not authenticated as admin");
      return { detail: `admin · ${user.email ?? ""}`, data: { id: user.id ?? user._id, role: user.role } };
    }

    case "instruments": {
      const { data } = await AUTH_API.get(EP_INSTRUMENTS());
      const rows = (data as any)?.data ?? data ?? [];
      if (!Array.isArray(rows)) throw new Error("Unexpected response shape");
      const first = rows[0];
      if (first) ctx.seedInstrumentId = first._id;
      return { detail: `${rows.length} instruments`, data: { count: rows.length, sample: first?.key ?? first?.name } };
    }

    case "equipments": {
      const { data } = await AUTH_API.get(EP_EQUIPMEMTS(), { params: { page: 1, limit: 5 } });
      const rows = (data as any)?.data ?? [];
      if (!Array.isArray(rows)) throw new Error("Unexpected response shape");
      const first = rows[0];
      if (first) ctx.seedEquipmentId = first._id;
      return { detail: `${rows.length} equipments (page 1)`, data: { count: rows.length, first: first?.equipmentName } };
    }

    case "parameters": {
      const { data } = await AUTH_API.get(EP_PARAMETERS());
      const rows = (data as any)?.data ?? data ?? [];
      const active = Array.isArray(rows) ? rows.find((p: any) => p.isActive) : null;
      if (active?.parameterName) ctx.paramName = active.parameterName;
      return { detail: `${rows.length} parameters`, data: { count: rows.length, active: active?.parameterName } };
    }

    case "formula": {
      const { data } = await AUTH_API.get(EP_FORMULA_CONFIG_ACTIVE());
      const cfg = (data as any)?.data ?? data;
      if (!cfg) throw new Error("No active formula config. Seed one via /formula-config.");
      ctx.activeFormula = { name: cfg.name, formulas: cfg.formulas?.length ?? 0 };
      return { detail: `${cfg.name} · ${cfg.formulas?.length ?? 0} formulas`, data: ctx.activeFormula };
    }

    case "list_reports": {
      const { data } = await AUTH_API.get(EP_CALIBRATION_REPORTS(), { params: { page: 1, limit: 5 } });
      const items = (data as any)?.items ?? (data as any)?.data ?? [];
      ctx.latestReportCount = items.length;
      ctx.highestReport = items[0] ?? null;
      return { detail: `${items.length} on first page`, data: { count: items.length, latestCertNo: items[0]?.certNo } };
    }

    case "create": {
      // Grab userId from auth step — fetch again to be safe
      const { data: profile } = await AUTH_API.get(EP_USER_PROFILE());
      const user = (profile as any)?.user ?? profile;
      const rawId = user?.id ?? user?._id;
      const userId = typeof rawId === "string"
        ? rawId
        : rawId?.toString?.() ?? String(rawId ?? "");
      if (!userId || !/^[a-f0-9]{24}$/i.test(userId)) {
        throw new Error(`Could not resolve a 24-char user ObjectId (got "${userId}")`);
      }
      const payload = buildTestPayload(ctx, userId, "draft");
      const { data } = await AUTH_API.post(EP_CREATE_CALIBRATION_REPORT(), payload);
      const rpt = (data as any)?.data ?? data;
      if (!rpt?._id) throw new Error("No report id returned");
      ctx.createdReportId = rpt._id;
      ctx.createdCertNo   = rpt.certNo;
      ctx.originalCustomerName = TEST_CUSTOMER_NAME_A;
      return { detail: `id · ${String(rpt._id).slice(-8)} · ${rpt.certNo ?? ""}`, data: { id: rpt._id, certNo: rpt.certNo, status: rpt.status } };
    }

    case "read_back": {
      if (!ctx.createdReportId) throw new Error("No report id in ctx");
      const { data } = await AUTH_API.get(EP_CALIBRATION_REPORT_BY_ID(ctx.createdReportId));
      const rpt = (data as any)?.data ?? data;
      if (rpt?.customerName !== ctx.originalCustomerName) {
        throw new Error(`customerName mismatch: expected "${ctx.originalCustomerName}", got "${rpt?.customerName}"`);
      }
      return { detail: `status: ${rpt.status}`, data: { customerName: rpt.customerName, status: rpt.status } };
    }

    case "edit": {
      if (!ctx.createdReportId) throw new Error("No report id in ctx");
      await AUTH_API.put(EP_UPDATE_CALIBRATION_REPORT(ctx.createdReportId), {
        customerName: TEST_CUSTOMER_NAME_B,
      });
      const { data } = await AUTH_API.get(EP_CALIBRATION_REPORT_BY_ID(ctx.createdReportId));
      const rpt = (data as any)?.data ?? data;
      if (rpt?.customerName !== TEST_CUSTOMER_NAME_B) {
        throw new Error(`Edit did not persist: got "${rpt?.customerName}"`);
      }
      ctx.updatedCustomerName = TEST_CUSTOMER_NAME_B;
      return { detail: "customerName updated · persisted", data: { newName: rpt.customerName } };
    }

    case "compute": {
      const instrument = buildTestPayload(ctx, "compute", "draft").instruments[0];
      const { data } = await AUTH_API.post(EP_COMPUTE_CALIBRATION(), { instrument });
      const result = (data as any)?.instrument ?? (data as any)?.data ?? data;
      const firstMeas = result?.parameters?.[0]?.ranges?.[0]?.measurements?.[0];
      if (!firstMeas?.computed) throw new Error("No computed budget returned");
      ctx.computedBudget = firstMeas.computed;
      return {
        detail: `mean=${firstMeas.computed.meanValue?.toFixed(4)} · %UC=${firstMeas.computed.percentUc?.toFixed(3)}`,
        data:  firstMeas.computed,
      };
    }

    case "submit": {
      if (!ctx.createdReportId) throw new Error("No report id in ctx");
      // We update to status=submitted via the PUT endpoint (server merges).
      await AUTH_API.put(EP_UPDATE_CALIBRATION_REPORT(ctx.createdReportId), { status: "submitted" });
      const { data } = await AUTH_API.get(EP_CALIBRATION_REPORT_BY_ID(ctx.createdReportId));
      const rpt = (data as any)?.data ?? data;
      if (rpt?.status !== "submitted") {
        throw new Error(`Status did not change: still "${rpt?.status}"`);
      }
      return { detail: `status → submitted`, data: { status: rpt.status } };
    }

    case "poll_pdf": {
      if (!ctx.createdReportId) throw new Error("No report id in ctx");
      const start = Date.now();
      const deadline = start + 45_000;
      let attempt = 0;
      while (Date.now() < deadline) {
        attempt += 1;
        try {
          const { data } = await AUTH_API.get(EP_REPORT_URL(ctx.createdReportId, "calibration"));
          const urls = (data as any)?.fileUrls ?? [];
          if (urls.length > 0) {
            ctx.pdfUrl = urls[0];
            const elapsed = ((Date.now() - start) / 1000).toFixed(1);
            return { detail: `PDF ready in ${elapsed}s · ${attempt} poll${attempt > 1 ? "s" : ""}`, data: { url: urls[0], attempts: attempt } };
          }
        } catch {
          // no-op — the endpoint 404s until the worker has uploaded.
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
      throw new Error("Timed out after 45s waiting for worker to publish PDF");
    }

    case "match_latest": {
      // Verify shape parity between our new report and the latest existing one.
      if (!ctx.createdReportId) throw new Error("No report id in ctx");
      if (!ctx.highestReport)   return { detail: "Skipped · no baseline report exists" };
      const { data } = await AUTH_API.get(EP_CALIBRATION_REPORT_BY_ID(ctx.createdReportId));
      const rpt = (data as any)?.data ?? data;
      const required = ["_id", "certNo", "status", "customerName", "instruments", "createdAt", "updatedAt"];
      const missing = required.filter((k) => !(k in rpt));
      if (missing.length > 0) throw new Error(`Missing keys: ${missing.join(", ")}`);
      const baselineKeys = new Set(Object.keys(ctx.highestReport));
      const newKeys      = new Set(Object.keys(rpt));
      const drift = [...baselineKeys].filter((k) => !newKeys.has(k));
      return {
        detail: drift.length === 0 ? "Shape matches latest" : `${drift.length} key(s) drifted`,
        data:   { drift, requiredOK: missing.length === 0 },
      };
    }

    case "keep_report": {
      if (!ctx.createdReportId) return { detail: "No report was created" };
      return {
        detail: `kept · id ${ctx.createdReportId.slice(-8)}${ctx.createdCertNo ? ` · ${ctx.createdCertNo}` : ""}`,
        data:   { id: ctx.createdReportId, certNo: ctx.createdCertNo, pdfUrl: ctx.pdfUrl },
      };
    }

    default:
      throw new Error(`Unknown step key: ${key}`);
  }
}
