"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  History,
  Loader2,
  Play,
  Save,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
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
  type AdminTemplate,
  type TemplateVersionMeta,
} from "@/app/hooks/query/useAdminTemplates";
import { useGetCalibrationReports } from "@/app/hooks/query/useCalibrationReport";

// ─── helpers ───────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1)  return "just now";
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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
    <div className="relative flex h-[60vh] rounded-lg border border-border bg-zinc-50 dark:bg-zinc-950 overflow-hidden font-mono text-[12px] leading-5">
      <div
        ref={gutRef}
        className="select-none overflow-hidden text-right pr-2 pl-3 py-2 bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600 border-r border-border"
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
    <ul className="divide-y divide-border max-h-[50vh] overflow-y-auto">
      {versions.map((v) => {
        const isActive   = activeVersionId === v._id;
        const isSelected = selectedVersionId === v._id;
        return (
          <li
            key={v._id}
            onClick={() => onSelect(v._id)}
            className={`flex flex-col gap-1 px-3 py-2 cursor-pointer hover:bg-accent/40 ${isSelected ? "bg-accent/60" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">v{v.versionNumber}</span>
                {isActive && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium uppercase tracking-wide">
                    Active
                  </span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground">{timeAgo(v.createdAt)}</span>
            </div>
            <div className="text-[11px] text-muted-foreground truncate">
              {v.createdBy?.name ?? "system"}{v.note ? ` — ${v.note}` : ""}
            </div>
            {!isActive && isSelected && (
              <Button
                size="sm"
                variant="outline"
                disabled={activating}
                onClick={(e) => { e.stopPropagation(); onActivate(v._id); }}
                className="h-7 px-2 text-xs w-fit mt-1"
              >
                {activating ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Activate
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ─── save dialog ───────────────────────────────────────────────────────────

function SaveDialog({
  open,
  onClose,
  onConfirm,
  saving,
}: {
  open:      boolean;
  onClose:   () => void;
  onConfirm: (note: string, activate: boolean) => void;
  saving:    boolean;
}) {
  const [note,     setNote]     = useState("");
  const [activate, setActivate] = useState(true);

  useEffect(() => {
    if (!open) { setNote(""); setActivate(true); }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
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
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={() => onConfirm(note, activate)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── preview pane ──────────────────────────────────────────────────────────
//
// EJS's npm ESM build imports `node:fs`, which Next.js cannot bundle for the
// browser. We load the UMD browser build from jsDelivr at preview time and
// cache it on `window.ejs`.

const EJS_CDN = "https://cdn.jsdelivr.net/npm/ejs@4/ejs.min.js";

async function ensureBrowserEjs(): Promise<any> {
  if (typeof window === "undefined") throw new Error("Preview requires a browser");
  const w = window as any;
  if (w.ejs?.render) return w.ejs;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${EJS_CDN}"]`);
    if (existing) { existing.addEventListener("load", () => resolve()); return; }
    const s = document.createElement("script");
    s.src     = EJS_CDN;
    s.async   = true;
    s.onload  = () => resolve();
    s.onerror = () => reject(new Error("Failed to load EJS preview engine"));
    document.head.appendChild(s);
  });
  if (!w.ejs?.render) throw new Error("EJS did not initialise on window");
  return w.ejs;
}

function PreviewPane({
  draftBody,
  reportId,
}: {
  draftBody: string;
  reportId:  string | null;
}) {
  const [html,    setHtml]    = useState<string>("");
  const [error,   setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!reportId) {
      toast.error("Pick a report to preview against");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [data, ejs] = await Promise.all([
        fetchTemplateSampleData(reportId),
        ensureBrowserEjs(),
      ]);
      const rendered = ejs.render(draftBody, data);
      setHtml(rendered);
    } catch (e: any) {
      setError(e?.message ?? "Render failed");
      setHtml("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={run} disabled={loading || !reportId}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Render preview
        </Button>
        {error && (
          <span className="text-xs text-red-600 dark:text-red-400 truncate" title={error}>
            {error}
          </span>
        )}
      </div>
      <div className="h-[60vh] border border-border rounded-lg overflow-hidden bg-white">
        {html
          ? <iframe srcDoc={html} sandbox="" className="w-full h-full border-0" title="template preview" />
          : (
            <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground p-6 text-center">
              {error
                ? "Fix the template error above and re-render."
                : reportId
                  ? "Click \"Render preview\" to see the result."
                  : "Select a report from the dropdown above to preview against."}
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

  // Default selection: active version, or newest if none active
  useEffect(() => {
    if (!tpl) return;
    if (selectedVersionId && tpl.versions.some((v) => v._id === selectedVersionId)) return;
    setSelectedVersionId(activeVersionId ?? tpl.versions[0]?._id ?? null);
  }, [tpl, activeVersionId, selectedVersionId]);

  const { data: version, isLoading: loadingVersion } = useAdminTemplateVersion(
    tplKey,
    selectedVersionId ?? undefined,
  );

  const [draft,        setDraft]        = useState<string>("");
  const [saveOpen,     setSaveOpen]     = useState(false);
  const [view,         setView]         = useState<"editor" | "preview" | "split">("split");
  const [previewReport, setPreviewReport] = useState<string>("");

  // Sync editor when a different version is loaded (only if user has no unsaved changes)
  useEffect(() => {
    if (version?.body !== undefined) setDraft(version.body);
  }, [version?.body]);

  const isDirty = version ? draft !== version.body : draft.length > 0;

  const create   = useCreateTemplateVersion(tplKey);
  const activate = useActivateTemplateVersion(tplKey);

  const { data: reportsPage } = useGetCalibrationReports();
  const reportOptions = reportsPage?.items ?? [];

  const handleSave = (note: string, activateAfter: boolean) => {
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
  };

  const handleActivate = (versionId: string) => {
    activate.mutate(versionId, {
      onSuccess: () => toast.success("Version activated"),
      onError: (e: any) => toast.error(e?.response?.data?.message ?? "Activate failed"),
    });
  };

  const handleResetDraft = () => {
    if (version) setDraft(version.body);
  };

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

  const activeVersion = tpl.versions.find((v) => v._id === activeVersionId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-border bg-white dark:bg-zinc-900 p-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-foreground">{tpl.name}</h2>
            {activeVersion && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-medium uppercase tracking-wide">
                Active: v{activeVersion.versionNumber}
              </span>
            )}
            {isDirty && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 font-medium uppercase tracking-wide">
                Unsaved changes
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={previewReport}
            onChange={(e) => setPreviewReport(e.target.value)}
            className="text-xs border border-input rounded-md px-2 py-1.5 bg-transparent outline-none max-w-[220px]"
          >
            <option value="">Preview against…</option>
            {reportOptions.map((r: any) => (
              <option key={r._id} value={r._id}>
                {r.csrNo || r._id.slice(-6)} · {r.customerName || "—"}
              </option>
            ))}
          </select>

          <div className="inline-flex rounded-md border border-border bg-white dark:bg-zinc-900 p-0.5 text-xs">
            {(["editor", "split", "preview"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2 py-1 rounded ${view === v ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-accent"}`}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={handleResetDraft} disabled={!isDirty}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
          <Button size="sm" onClick={() => setSaveOpen(true)} disabled={!draft.trim() || create.isPending}>
            <Save className="h-3.5 w-3.5" /> Save…
          </Button>
        </div>
      </div>

      {/* Main grid: editor/preview + versions */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div>
          {loadingVersion && (
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading version body…
            </div>
          )}
          <div className={`grid ${view === "split" ? "grid-cols-2" : "grid-cols-1"} gap-4`}>
            {(view === "editor" || view === "split") && (
              <CodeEditor value={draft} onChange={setDraft} />
            )}
            {(view === "preview" || view === "split") && (
              <PreviewPane draftBody={draft} reportId={previewReport || null} />
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-3 py-2 border-b border-border flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Versions</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{tpl.versions.length}</span>
          </div>
          <VersionList
            versions={tpl.versions}
            activeVersionId={activeVersionId}
            selectedVersionId={selectedVersionId}
            onSelect={setSelectedVersionId}
            onActivate={handleActivate}
            activating={activate.isPending}
          />
        </div>
      </div>

      <SaveDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onConfirm={handleSave}
        saving={create.isPending}
      />
    </div>
  );
}
