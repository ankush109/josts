"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  ChevronDown,
  Code2,
  Eye,
  FileCode2,
  FileText,
  GitCompare,
  History,
  Loader2,
  Play,
  Save,
  RotateCcw,
  AlertTriangle,
  Columns2,
} from "lucide-react";
import toast from "react-hot-toast";
import { diffLines } from "diff";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useAdminTemplates,
  useAdminTemplate,
  useAdminTemplateVersion,
  useCreateTemplateVersion,
  useActivateTemplateVersion,
  fetchTemplateSampleData,
  type TemplateVersionMeta,
} from "@/app/hooks/query/useAdminTemplates";
import { useGetCalibrationReports } from "@/app/hooks/query/useCalibrationReport";

// ─── helpers ───────────────────────────────────────────────────────────────

const Separator = () => (
  <span className="h-5 w-px bg-border mx-0.5 shrink-0" aria-hidden />
);

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1)  return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── popover (click-outside-closable) ──────────────────────────────────────

function Popover({
  open, onClose, anchorRef, children,
}: {
  open:      boolean;
  onClose:   () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  children:  React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const a = anchorRef.current?.getBoundingClientRect();
      if (!a) return;
      const margin = 12;
      const vw = window.innerWidth;
      const width = Math.min(320, vw - margin * 2);
      let left = a.right - width;
      if (left < margin) left = margin;
      if (left + width > vw - margin) left = vw - margin - width;
      setPos({ top: a.bottom + 4, left, width });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !pos || typeof window === "undefined") return null;
  return createPortal(
    <div
      ref={ref}
      style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
      className="z-[100] max-h-[60vh] overflow-hidden rounded-lg border border-border bg-white dark:bg-zinc-900 shadow-lg"
    >
      {children}
    </div>,
    document.body,
  );
}

// ─── code editor (textarea + line gutter + tab handling) ───────────────────

function CodeEditor({
  value,
  onChange,
  readOnly,
}: {
  value:    string;
  onChange: (v: string) => void;
  readOnly?: boolean;
}) {
  const taRef    = useRef<HTMLTextAreaElement>(null);
  const gutRef   = useRef<HTMLDivElement>(null);
  const lineCount = useMemo(() => Math.max(1, value.split("\n").length), [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Tab" || readOnly) return;
    e.preventDefault();
    const ta = e.currentTarget;
    const { selectionStart: s, selectionEnd: end, value: v } = ta;
    const next = v.slice(0, s) + "  " + v.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = s + 2;
    });
  };

  const syncScroll = () => {
    if (gutRef.current && taRef.current) {
      gutRef.current.scrollTop = taRef.current.scrollTop;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 rounded-lg border border-border bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="px-2.5 py-1.5 border-b border-border bg-zinc-50/50 dark:bg-zinc-950/30 shrink-0 flex items-center gap-2">
        <Code2 className="h-3 w-3 text-muted-foreground" />
        <span className="text-[11px] text-muted-foreground font-medium">Editor</span>
        <span className="text-[10px] text-muted-foreground/70 ml-auto font-mono">
          {lineCount} lines · {value.length} chars
        </span>
      </div>
      <div className="relative flex flex-1 min-h-0 bg-zinc-50 dark:bg-zinc-950 font-mono text-[12px] leading-5">
        <div
          ref={gutRef}
          className="select-none overflow-hidden text-right pr-2 pl-3 py-2 bg-zinc-100/70 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-600 border-r border-border"
          style={{ minWidth: 48 }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="leading-5">{i + 1}</div>
          ))}
        </div>
        <textarea
          ref={taRef}
          spellCheck={false}
          readOnly={readOnly}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          className="flex-1 resize-none bg-transparent text-foreground p-2 outline-none whitespace-pre leading-5"
          style={{ tabSize: 2 }}
        />
      </div>
    </div>
  );
}

// ─── version list ──────────────────────────────────────────────────────────

function VersionList({
  versions,
  activeVersionId,
  selectedVersionId,
  onSelect,
  onActivate,
  activating,
}: {
  versions:          TemplateVersionMeta[];
  activeVersionId:   string | null;
  selectedVersionId: string | null;
  onSelect:          (versionId: string) => void;
  onActivate:        (versionId: string) => void;
  activating:        boolean;
}) {
  if (versions.length === 0) {
    return (
      <div className="text-xs text-muted-foreground p-3">No versions yet — save to create v1.</div>
    );
  }
  return (
    <ul className="divide-y divide-border">
      {versions.map((v) => {
        const isActive   = activeVersionId === v._id;
        const isSelected = selectedVersionId === v._id;
        return (
          <li
            key={v._id}
            onClick={() => onSelect(v._id)}
            className={`relative flex flex-col gap-1 px-3 py-2.5 cursor-pointer transition-colors ${
              isSelected
                ? "bg-blue-50/70 dark:bg-blue-950/30"
                : "hover:bg-accent/40"
            }`}
          >
            {isSelected && (
              <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-500" aria-hidden />
            )}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">v{v.versionNumber}</span>
                {isActive && (
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-900/50 font-medium">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums">{timeAgo(v.createdAt)}</span>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              <span className="text-foreground/70">{v.createdBy?.name ?? "system"}</span>
              {v.note ? <> · {v.note}</> : null}
            </div>
            {!isActive && isSelected && (
              <Button
                size="sm"
                variant="outline"
                disabled={activating}
                onClick={(e) => { e.stopPropagation(); onActivate(v._id); }}
                className="h-7 px-2.5 text-xs w-fit mt-1 gap-1.5"
              >
                {activating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Activate this version
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ─── diff view ─────────────────────────────────────────────────────────────

function DiffView({
  before, after, beforeLabel, afterLabel,
}: {
  before:      string;
  after:       string;
  beforeLabel: string;
  afterLabel:  string;
}) {
  const parts = useMemo(() => diffLines(before, after), [before, after]);

  type Row = { kind: "add" | "del" | "ctx"; before: number | null; after: number | null; text: string };
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let bn = 1, an = 1;
    for (const p of parts) {
      const lines = p.value.replace(/\n$/, "").split("\n");
      for (const line of lines) {
        if (p.added)        out.push({ kind: "add", before: null, after: an++, text: line });
        else if (p.removed) out.push({ kind: "del", before: bn++, after: null, text: line });
        else                out.push({ kind: "ctx", before: bn++, after: an++, text: line });
      }
    }
    return out;
  }, [parts]);

  const stats = useMemo(() => {
    let added = 0, removed = 0;
    for (const r of rows) {
      if (r.kind === "add") added++;
      else if (r.kind === "del") removed++;
    }
    return { added, removed };
  }, [rows]);

  return (
    <div className="flex flex-col h-full min-h-0 rounded-lg border border-border bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-mono text-[12px]">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border bg-zinc-100 dark:bg-zinc-900 text-[11px] font-sans shrink-0">
        <div className="truncate text-muted-foreground">
          <span className="text-red-600 dark:text-red-400">− {beforeLabel}</span>
          <span className="mx-2 opacity-40">vs</span>
          <span className="text-emerald-600 dark:text-emerald-400">+ {afterLabel}</span>
        </div>
        <div className="text-[10px] text-muted-foreground shrink-0">
          <span className="text-emerald-600 dark:text-emerald-400">+{stats.added}</span>
          {" / "}
          <span className="text-red-600 dark:text-red-400">−{stats.removed}</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto leading-5">
        {stats.added === 0 && stats.removed === 0 ? (
          <div className="p-4 text-xs text-muted-foreground font-sans">No differences.</div>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {rows.map((r, i) => {
                const bg =
                  r.kind === "add" ? "bg-emerald-50 dark:bg-emerald-950/30" :
                  r.kind === "del" ? "bg-red-50 dark:bg-red-950/30"         :
                                     "";
                const marker = r.kind === "add" ? "+" : r.kind === "del" ? "−" : " ";
                const markerColor =
                  r.kind === "add" ? "text-emerald-600 dark:text-emerald-400" :
                  r.kind === "del" ? "text-red-600 dark:text-red-400"         :
                                     "text-zinc-400";
                return (
                  <tr key={i} className={bg}>
                    <td className="select-none text-right pr-1 pl-2 text-zinc-400 dark:text-zinc-600 w-[3em] align-top">{r.before ?? ""}</td>
                    <td className="select-none text-right pr-2     text-zinc-400 dark:text-zinc-600 w-[3em] align-top">{r.after  ?? ""}</td>
                    <td className={`select-none text-center w-[1.5em] align-top ${markerColor}`}>{marker}</td>
                    <td className="whitespace-pre-wrap break-words pr-2 py-px align-top">{r.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── save dialog ───────────────────────────────────────────────────────────

function SaveDialog({
  open,
  onClose,
  onConfirm,
  saving,
  hasSampleReport,
}: {
  open:            boolean;
  onClose:         () => void;
  onConfirm:       (note: string, activate: boolean) => void | Promise<void>;
  saving:          boolean;
  hasSampleReport: boolean;
}) {
  const [note,       setNote]       = useState("");
  const [activate,   setActivate]   = useState(true);
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    if (!open) { setNote(""); setActivate(true); setValidating(false); }
  }, [open]);

  const handleConfirm = async () => {
    setValidating(true);
    try { await onConfirm(note, activate); }
    finally { setValidating(false); }
  };

  const busy = saving || validating;
  const blockActivateNoSample = activate && !hasSampleReport;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Save as new version</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          Every save creates a new version. Old versions are kept and can be reactivated at any time.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wide mb-1 block">
              Change note (optional)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. updated footer address"
              className="w-full text-sm border border-input rounded-md px-3 py-2 bg-transparent outline-none focus-visible:ring-2 ring-ring/50"
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={activate} onChange={(e) => setActivate(e.target.checked)} />
            <span>Activate this version immediately</span>
          </label>
          {activate && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-2 text-[11px] text-amber-800 dark:text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>The next PDF generated will use this template. A broken template can break all subsequent PDFs until rolled back.</span>
            </div>
          )}
          {hasSampleReport ? (
            <div className="text-[11px] text-muted-foreground">
              Will validate by rendering against the selected sample report before {activate ? "activating" : "saving"}.
            </div>
          ) : blockActivateNoSample ? (
            <div className="text-[11px] text-red-600 dark:text-red-400">
              No sample report selected — pick one in the top toolbar to validate before activating.
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground">
              No sample report selected — saving without validation (won&apos;t be activated).
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={busy || blockActivateNoSample}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {validating ? "Validating…" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── preview pane ──────────────────────────────────────────────────────────
//
// ejs@4 (our installed version) ships only a CJS bundle that calls `require`
// at the top — useless in the browser. ejs's own minified file fails silently
// when loaded as a <script> (the load event fires but window.ejs is never set).
//
// esm.sh transpiles ejs into a real browser ESM module. We dynamic-import it
// at preview time, with /* webpackIgnore: true */ so Next's bundler leaves the
// URL alone and the browser handles it as a runtime ESM fetch.

const EJS_ESM_URL = "https://esm.sh/ejs@3.1.10?bundle";

let ejsLoadPromise: Promise<any> | null = null;

async function ensureBrowserEjs(): Promise<any> {
  if (typeof window === "undefined") throw new Error("Preview requires a browser");
  if (!ejsLoadPromise) {
    ejsLoadPromise = (async () => {
      const mod: any = await import(/* webpackIgnore: true */ EJS_ESM_URL);
      const ejs = mod?.default ?? mod;
      if (typeof ejs?.render !== "function") {
        throw new Error("EJS module loaded but render() is missing");
      }
      return ejs;
    })().catch((err) => {
      ejsLoadPromise = null;
      throw new Error(`Failed to load EJS engine (${EJS_ESM_URL}): ${err?.message ?? err}`);
    });
  }
  return ejsLoadPromise;
}

// Try rendering `body` against `reportId`'s sample data. Returns null on
// success or the error message on failure. Used both by the live preview pane
// and by validate-on-save.
async function validateTemplate(body: string, reportId: string): Promise<string | null> {
  try {
    const [data, ejs] = await Promise.all([
      fetchTemplateSampleData(reportId),
      ensureBrowserEjs(),
    ]);
    ejs.render(body, data, { async: false });
    return null;
  } catch (e: any) {
    return e?.message ?? String(e);
  }
}

function PreviewPane({
  draftBody,
  reportId,
  renderToken,
}: {
  draftBody:   string;
  reportId:    string | null;
  renderToken: number;
}) {
  const [html,    setHtml]    = useState<string>("");
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const draftRef    = useRef(draftBody);
  const reportIdRef = useRef(reportId);
  useEffect(() => { draftRef.current    = draftBody; }, [draftBody]);
  useEffect(() => { reportIdRef.current = reportId;  }, [reportId]);

  const run = useCallback(async () => {
    const rid = reportIdRef.current;
    if (!rid) {
      toast.error("Pick a report to preview against");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let data: Record<string, unknown>;
      try {
        data = await fetchTemplateSampleData(rid);
      } catch (e: any) {
        const status = e?.response?.status;
        const body   = e?.response?.data;
        throw new Error(
          `Failed to fetch sample data (${status ?? "network"}): ${
            typeof body === "string" ? body : body?.message ?? e?.message ?? "unknown"
          }`,
        );
      }

      let ejs: any;
      try {
        ejs = await ensureBrowserEjs();
      } catch (e: any) {
        throw new Error(`Failed to load EJS engine: ${e?.message ?? "unknown"}`);
      }

      let rendered: string;
      try {
        rendered = ejs.render(draftRef.current, data, { async: false });
      } catch (e: any) {
        throw new Error(`EJS render error: ${e?.message ?? String(e)}`);
      }
      setHtml(rendered);
    } catch (e: any) {
      console.error("[template preview]", e);
      setError(e?.message ?? "Render failed");
      setHtml("");
    } finally {
      setLoading(false);
    }
  }, []);

  // Parent increments renderToken to request a re-render (Cmd+Enter shortcut).
  useEffect(() => {
    if (renderToken > 0) run();
  }, [renderToken, run]);

  // Auto-render: debounce changes to the draft or the picked sample report so
  // the preview updates as the admin types, without re-rendering on every
  // keystroke. Skipped when no report is selected (run() would just toast).
  useEffect(() => {
    if (!reportId) return;
    const t = setTimeout(() => { run(); }, 500);
    return () => clearTimeout(t);
  }, [draftBody, reportId, run]);

  // A4 at 96dpi → 794 × 1123 px per page. Render iframe at A4 width and grow
  // its height to fit *all* pages stacked, then scale-to-fit container width.
  const A4_W = 794;
  const A4_H = 1123;
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef    = useRef<HTMLIFrameElement>(null);
  const [scale,         setScale]         = useState(1);
  const [contentHeight, setContentHeight] = useState(A4_H);

  // Inject:
  //  - <base href="…"> so relative URLs (logo, images, fonts) resolve to our
  //    origin instead of the about:srcdoc empty base
  //  - CSS that styles each .page like a real A4 sheet (white paper, shadow,
  //    gap between pages, print-margins as padding) so the preview reads like
  //    a paginated PDF viewer.
  const wrappedHtml = useMemo(() => {
    if (!html) return "";
    const base = typeof window !== "undefined" ? window.location.origin + "/" : "/";
    const injection = `
      <base href="${base}">
      <style>
        html, body {
          overflow: visible !important;
          height:   auto    !important;
          background: transparent !important;
          margin:   0 !important;
          padding:  0 !important;
        }
        body > * { margin: 0 auto; }
        .page {
          width:   210mm                !important;
          height:  297mm                !important;
          padding: 15mm 14mm 15mm 12mm  !important;
          margin:  0 auto 16px auto     !important;
          background: #fff              !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          overflow: hidden              !important;
          box-sizing: border-box        !important;
          position: relative;
        }
        .page::after {
          content: "Page " counter(jpage);
          counter-increment: jpage;
          position: absolute;
          right: 8mm;
          bottom: 4mm;
          font-size: 9px;
          color: #9ca3af;
          font-family: ui-sans-serif, system-ui, sans-serif;
        }
        body { counter-reset: jpage; }
      </style>
    `;
    if (/<head[^>]*>/i.test(html)) {
      return html.replace(/<head([^>]*)>/i, `<head$1>${injection}`);
    }
    return injection + html;
  }, [html]);

  const measureContent = () => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const h = Math.max(
      doc.documentElement.scrollHeight,
      doc.body?.scrollHeight ?? 0,
      A4_H,
    );
    setContentHeight(h);
  };

  const handleIframeLoad = () => {
    measureContent();
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;

    // Re-measure as late-loading images, fonts, or async layout shifts content.
    const ro = new ResizeObserver(measureContent);
    if (doc.body) ro.observe(doc.body);
    doc.querySelectorAll("img").forEach((img) => {
      if (!(img as HTMLImageElement).complete) {
        img.addEventListener("load",  measureContent, { once: true });
        img.addEventListener("error", measureContent, { once: true });
      }
    });

    // Forward wheel and keyboard scroll events to the outer container.
    // The iframe is sized to its full content height so it has no internal
    // scroll, but the browser still routes wheel events to the iframe DOM —
    // which then black-holes them, preventing the parent from scrolling.
    const forwardWheel = (e: WheelEvent) => {
      const c = containerRef.current;
      if (!c) return;
      c.scrollBy({ left: e.deltaX, top: e.deltaY, behavior: "auto" });
      e.preventDefault();
    };
    doc.addEventListener("wheel", forwardWheel, { passive: false });

    const forwardKey = (e: KeyboardEvent) => {
      const c = containerRef.current;
      if (!c) return;
      const step = c.clientHeight;
      const moves: Record<string, number> = {
        ArrowDown:  60,  ArrowUp:    -60,
        PageDown:   step, PageUp:    -step,
        " ":        step, Home:      -1e9, End: 1e9,
      };
      if (e.key in moves) {
        c.scrollBy({ top: moves[e.key], behavior: "auto" });
        e.preventDefault();
      }
    };
    doc.addEventListener("keydown", forwardKey);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth - 32;
      if (w <= 0) return;
      setScale(Math.min(w / A4_W, 1.5));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wrappedHtml]);

  return (
    <div className="flex flex-col h-full min-h-0 rounded-lg border border-border overflow-hidden bg-white dark:bg-zinc-900">
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border bg-zinc-50/50 dark:bg-zinc-950/30 shrink-0">
        <Button
          size="sm"
          onClick={run}
          disabled={loading || !reportId}
          className="gap-1.5 h-7 px-2.5 text-xs"
          title="Render preview (⌘/Ctrl+Enter)"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          Render
          <kbd className="ml-0.5 hidden sm:inline-flex text-[9px] px-1 py-px rounded bg-white/20 font-mono">⌘↵</kbd>
        </Button>
        <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
          <Eye className="h-3 w-3" />
          Preview
        </span>
        {html && (
          <span className="text-[10px] text-muted-foreground ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 ring-1 ring-border">
            A4 · {Math.round(scale * 100)}%
          </span>
        )}
      </div>
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-auto relative bg-zinc-100 dark:bg-zinc-950"
      >
        {error ? (
          <div className="h-full w-full overflow-auto p-4 bg-red-50 dark:bg-red-950/30">
            <div className="text-xs font-semibold text-red-700 dark:text-red-300 mb-2">
              Preview failed
            </div>
            <pre className="text-[11px] leading-4 text-red-800 dark:text-red-200 whitespace-pre-wrap break-words font-mono">
              {error}
            </pre>
            <div className="text-[10px] text-red-600/70 dark:text-red-400/70 mt-3">
              See browser console for the underlying error object.
            </div>
          </div>
        ) : html ? (
          <div
            className="mx-auto my-4"
            style={{
              width:  A4_W * scale,
              height: contentHeight * scale,
            }}
          >
            <iframe
              ref={iframeRef}
              srcDoc={wrappedHtml}
              sandbox="allow-same-origin"
              title="template preview"
              onLoad={handleIframeLoad}
              style={{
                width:           A4_W,
                height:          contentHeight,
                transform:       `scale(${scale})`,
                transformOrigin: "top left",
                border:          "none",
                background:      "transparent",
              }}
            />
          </div>
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-center p-6 gap-3">
            <div className="h-12 w-12 rounded-2xl bg-white dark:bg-zinc-900 ring-1 ring-border flex items-center justify-center text-muted-foreground shadow-sm">
              <Eye className="h-5 w-5" />
            </div>
            <div className="text-xs text-muted-foreground max-w-[280px]">
              {reportId
                ? <>Click <strong className="text-foreground">Render</strong> (or press <kbd className="text-[10px] px-1 py-px rounded bg-zinc-200 dark:bg-zinc-800 font-mono">⌘↵</kbd>) to see the result.</>
                : "Pick a sample report from the toolbar above to preview the template against real data."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── main ──────────────────────────────────────────────────────────────────

const DEFAULT_KEY = "calibration-certificate";

export default function TemplateManagement() {
  const { data: templates, isLoading: loadingList } = useAdminTemplates();
  const tplKey = templates?.[0]?.key ?? DEFAULT_KEY;

  const { data: tpl, isLoading: loadingTpl } = useAdminTemplate(tplKey);

  const activeVersionId = tpl?.activeVersionId ?? null;
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  useEffect(() => {
    if (!tpl) return;
    if (selectedVersionId && tpl.versions.some((v) => v._id === selectedVersionId)) return;
    setSelectedVersionId(activeVersionId ?? tpl.versions[0]?._id ?? null);
  }, [tpl, activeVersionId, selectedVersionId]);

  const { data: version, isLoading: loadingVersion } = useAdminTemplateVersion(
    tplKey,
    selectedVersionId ?? undefined,
  );
  const { data: activeVersionBody } = useAdminTemplateVersion(
    tplKey,
    activeVersionId ?? undefined,
  );

  const [draft,         setDraft]         = useState<string>("");
  const [saveOpen,      setSaveOpen]      = useState(false);
  const [view,          setView]          = useState<"editor" | "preview" | "split">("split");
  const [previewReport, setPreviewReport] = useState<string>("");
  const [renderToken,   setRenderToken]   = useState(0);
  const [versionsOpen,  setVersionsOpen]  = useState(false);
  const [forceEditor,   setForceEditor]   = useState(false);
  const versionsBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (version?.body !== undefined) setDraft(version.body);
    setForceEditor(false);
  }, [version?.body, selectedVersionId]);

  const isDirty       = version ? draft !== version.body : draft.length > 0;
  const isActiveSel   = selectedVersionId === activeVersionId;
  const showDiff      = !forceEditor && !isDirty && !isActiveSel && !!activeVersionId && !!activeVersionBody && !!version;

  const create   = useCreateTemplateVersion(tplKey);
  const activate = useActivateTemplateVersion(tplKey);

  const { data: reportsPage } = useGetCalibrationReports();
  const reportOptions = reportsPage?.items ?? [];

  const handleSave = useCallback(async (note: string, activateAfter: boolean) => {
    // Validate-on-save: try rendering against the picked report. If activating,
    // a broken template would break all subsequent PDFs — refuse. If only
    // saving as a non-active version, warn but still allow (admin may be
    // intentionally storing a WIP).
    if (previewReport) {
      const err = await validateTemplate(draft, previewReport);
      if (err) {
        const blocking = activateAfter;
        toast.error(`${blocking ? "Refused to save" : "Validation failed"}: ${err}`, { duration: 6000 });
        if (blocking) return;
      }
    } else if (activateAfter) {
      toast.error("Pick a sample report (top toolbar) to validate before activating", { duration: 5000 });
      return;
    }

    create.mutate(
      { body: draft, note, activate: activateAfter },
      {
        onSuccess: (newVersion) => {
          toast.success(`Saved as v${newVersion.versionNumber}${activateAfter ? " (activated)" : ""}`);
          setSelectedVersionId(newVersion._id);
          setSaveOpen(false);
        },
        onError: (e: any) => {
          toast.error(e?.response?.data?.message ?? "Save failed");
        },
      },
    );
  }, [draft, previewReport, create]);

  const handleActivate = (versionId: string) => {
    activate.mutate(versionId, {
      onSuccess: () => toast.success("Version activated"),
      onError: (e: any) => toast.error(e?.response?.data?.message ?? "Activate failed"),
    });
  };

  const handleResetDraft = () => {
    if (version) setDraft(version.body);
  };

  const handleForkIntoEditor = () => {
    setForceEditor(true);
  };

  // Keyboard shortcuts: Cmd/Ctrl+S → Save, Cmd/Ctrl+Enter → Render preview
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        if (draft.trim() && !create.isPending) setSaveOpen(true);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (previewReport) setRenderToken((t) => t + 1);
        else toast.error("Pick a report to preview against");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [draft, create.isPending, previewReport]);

  if (loadingList || loadingTpl) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading templates…
      </div>
    );
  }

  if (!tpl) {
    return (
      <div className="rounded-xl border border-border bg-white dark:bg-zinc-900 p-6 text-sm text-muted-foreground">
        No templates available.
      </div>
    );
  }

  const activeVersion   = tpl.versions.find((v) => v._id === activeVersionId);
  const selectedVersion = tpl.versions.find((v) => v._id === selectedVersionId);

  const viewIcons = { editor: Code2, split: Columns2, preview: Eye } as const;

  return (
    <div className="space-y-3">
      {/* Identity card */}
      <div className="rounded-xl border border-border bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-3 border-b border-border">
          <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/50 ring-1 ring-blue-100 dark:ring-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-foreground truncate">{tpl.name}</h2>
              {activeVersion && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-900/50 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Active · v{activeVersion.versionNumber}
                </span>
              )}
              {showDiff && selectedVersion && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 ring-1 ring-sky-200 dark:ring-sky-900/50 font-medium">
                  <GitCompare className="h-3 w-3" />
                  Viewing v{selectedVersion.versionNumber}
                </span>
              )}
              {isDirty && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-900/50 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Unsaved
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{tpl.description}</p>
          </div>
        </div>

        {/* Toolbar row */}
        <div className="px-3 py-2 flex items-center gap-2 flex-wrap bg-zinc-50/50 dark:bg-zinc-950/30">
          {/* Sample data */}
          <div className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <FileCode2 className="h-3.5 w-3.5" />
            <span className="font-medium">Sample:</span>
          </div>
          <select
            value={previewReport}
            onChange={(e) => setPreviewReport(e.target.value)}
            className="text-xs border border-input rounded-md px-2.5 py-1.5 bg-white dark:bg-zinc-900 outline-none focus-visible:ring-2 ring-ring/40 max-w-[240px] truncate cursor-pointer hover:border-foreground/30"
          >
            <option value="">Pick a report…</option>
            {reportOptions.map((r: any) => (
              <option key={r._id} value={r._id}>
                {r.csrNo || r._id.slice(-6)} · {r.customerName || "—"}
              </option>
            ))}
          </select>

          <Separator />

          {/* View toggle */}
          <div className="inline-flex rounded-md border border-border bg-white dark:bg-zinc-900 p-0.5 text-xs shadow-sm">
            {(["editor", "split", "preview"] as const).map((v) => {
              const Icon = viewIcons[v];
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  title={v.charAt(0).toUpperCase() + v.slice(1)}
                  className={`px-2.5 py-1 rounded inline-flex items-center gap-1.5 transition-colors ${
                    view === v
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="capitalize">{v}</span>
                </button>
              );
            })}
          </div>

          <Separator />

          {/* Versions popover trigger */}
          <div className="relative">
            <Button
              ref={versionsBtnRef}
              variant="outline"
              size="sm"
              onClick={() => setVersionsOpen((o) => !o)}
              title="Version history"
              className="gap-1.5"
            >
              <History className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">v{selectedVersion?.versionNumber ?? "?"}</span>
              <span className="text-[10px] text-muted-foreground">of {tpl.versions.length}</span>
              <ChevronDown className="h-3 w-3 opacity-60" />
            </Button>
            <Popover open={versionsOpen} onClose={() => setVersionsOpen(false)} anchorRef={versionsBtnRef}>
              <div className="px-3 py-2 border-b border-border flex items-center gap-2 shrink-0 bg-zinc-50/50 dark:bg-zinc-950/30">
                <History className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Version history</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{tpl.versions.length} total</span>
              </div>
              <div className="max-h-[50vh] overflow-y-auto">
                <VersionList
                  versions={tpl.versions}
                  activeVersionId={activeVersionId}
                  selectedVersionId={selectedVersionId}
                  onSelect={(id) => { setSelectedVersionId(id); setVersionsOpen(false); }}
                  onActivate={handleActivate}
                  activating={activate.isPending}
                />
              </div>
            </Popover>
          </div>

          {/* spacer */}
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {selectedVersionId && !isActiveSel && selectedVersion && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleActivate(selectedVersionId)}
                disabled={activate.isPending || isDirty}
                title={isDirty ? "Save or reset your edits first" : `Make v${selectedVersion.versionNumber} the active template`}
                className="gap-1.5 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                {activate.isPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <CheckCircle2 className="h-3.5 w-3.5" />}
                Make v{selectedVersion.versionNumber} active
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetDraft}
              disabled={!isDirty}
              title="Discard unsaved edits"
              className="gap-1.5 text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </Button>
            <Button
              size="sm"
              onClick={() => setSaveOpen(true)}
              disabled={!draft.trim() || create.isPending}
              title="Save (⌘/Ctrl+S)"
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" /> Save…
              <kbd className="ml-1 hidden sm:inline-flex text-[9px] px-1 py-px rounded bg-white/20 font-mono">⌘S</kbd>
            </Button>
          </div>
        </div>
      </div>

      {/* Main grid: editor/diff/preview, full width */}
      <div className={`grid grid-cols-1 gap-3 ${view === "split" ? "min-h-[calc(100vh-220px)] lg:h-[calc(100vh-220px)]" : "h-[calc(100vh-220px)]"} min-h-[480px]`}>
        <div className="flex flex-col min-h-0">
          {loadingVersion && (
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1 shrink-0">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading version body…
            </div>
          )}

          {showDiff && (
            <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-sky-200 dark:border-sky-900/50 bg-sky-50 dark:bg-sky-950/20 text-xs shrink-0">
              <GitCompare className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="text-sky-900 dark:text-sky-200">
                Comparing <strong className="font-semibold">v{activeVersion?.versionNumber}</strong> (active) → <strong className="font-semibold">v{selectedVersion?.versionNumber}</strong>. Read-only view.
              </span>
              <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs ml-auto gap-1.5" onClick={handleForkIntoEditor}>
                <Code2 className="h-3 w-3" />
                Load into editor
              </Button>
            </div>
          )}

          <div className={`grid flex-1 min-h-0 ${view === "split" ? "grid-cols-1 lg:grid-cols-2 auto-rows-fr [&>*]:min-h-[420px] lg:[&>*]:min-h-0" : "grid-cols-1"} gap-4`}>
            {(view === "editor" || view === "split") && (
              showDiff
                ? <DiffView
                    before={activeVersionBody?.body ?? ""}
                    after={version?.body ?? ""}
                    beforeLabel={`v${activeVersion?.versionNumber} active`}
                    afterLabel={`v${selectedVersion?.versionNumber}`}
                  />
                : <CodeEditor value={draft} onChange={setDraft} />
            )}
            {(view === "preview" || view === "split") && (
              <PreviewPane
                draftBody={showDiff ? (version?.body ?? "") : draft}
                reportId={previewReport || null}
                renderToken={renderToken}
              />
            )}
          </div>
        </div>
      </div>

      <SaveDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onConfirm={handleSave}
        saving={create.isPending}
        hasSampleReport={!!previewReport}
      />
    </div>
  );
}
