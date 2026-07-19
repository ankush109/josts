"use client";

import * as React from "react";
import {
  Eye, Download, Loader2, RefreshCw, XCircle,
  MoreHorizontal, Pencil, FileText, History,
  ShieldCheck, ShieldX, RotateCcw, UserCog, Trash2, AlertCircle,
  FlaskConical, Layers,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { CalibrationReportStatus } from "@/types/calibration";
import { MONO_FF, type ThemeTokens } from "./theme";

export interface ReportRow {
  _id: string;
  certNo: string;
  formatNo: string;
  status: CalibrationReportStatus;
  createdBy: { _id: string; name: string; email: string };
  instrumentCount: number;
  instruments: { make: string; modelType: string; nomenclature?: string }[];
  signatures: {
    calibratedBy?: { name: string; email: string; _id?: string };
    verifiedBy?: { name: string; email: string; _id?: string };
    calibratedAt?: string;
    verifiedAt?: string;
  };
  filePaths: string[];
  pdfFailedAt?: string | null;
  pdfError?: string;
  customerName: string;
  createdAt: string;
  updatedAt: string;
  __local?: boolean;
}

function toTitleCase(str: string) {
  return str.replace(/\w+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

// ─── PDF Cell ─────────────────────────────────────────────────────────────────

export function PdfCell({
  report,
  isFailed,
  isPending,
  isRegenerating,
  viewingId,
  downloadingId,
  onView,
  onDownload,
  onRegenerate,
  t,
}: {
  report: ReportRow;
  isFailed: boolean;
  isPending: boolean;
  isRegenerating: boolean;
  viewingId: string | null;
  downloadingId: string | null;
  onView: (e: React.MouseEvent, id: string, index?: number) => void;
  onDownload: (e: React.MouseEvent, r: ReportRow, index?: number) => void;
  onRegenerate: (e: React.MouseEvent, id: string) => void;
  t: ThemeTokens;
}) {
  const dash = <span style={{ fontFamily: MONO_FF, color: t.faint, fontSize: 12 }}>—</span>;

  if (report.status === "draft") return dash;

  if (isFailed) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.08em",
              color: t.rejectFg, fontWeight: 600,
            }}>
              <XCircle size={12} /> FAILED
            </span>
          </TooltipTrigger>
          <TooltipContent>{report.pdfError || "PDF generation failed"}</TooltipContent>
        </Tooltip>
        <button
          onClick={(e) => onRegenerate(e, report._id)}
          disabled={isRegenerating}
          style={{
            display: "inline-flex", alignItems: "center", gap: 4,
            padding: "3px 7px", borderRadius: 5,
            border: `1px solid ${t.rejectBorder}`, background: "transparent",
            color: t.rejectFg,
            fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.08em", fontWeight: 600,
            cursor: isRegenerating ? "not-allowed" : "pointer",
            opacity: isRegenerating ? 0.6 : 1,
          }}
          title="Retry PDF generation"
        >
          {isRegenerating ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
          RETRY
        </button>
      </div>
    );
  }

  if (isPending) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span style={{ display: "inline-flex" }}>
            <Loader2 size={14} className="animate-spin" style={{ color: t.warnFg }} />
          </span>
        </TooltipTrigger>
        <TooltipContent>PDF is being generated…</TooltipContent>
      </Tooltip>
    );
  }

  if (!report.filePaths?.length) return dash;

  const iconBtn = (child: React.ReactNode, onClick: (e: React.MouseEvent) => void, disabled: boolean, tip: string, borderRight = false): React.ReactNode => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 30, height: 28, background: "transparent",
            border: "none",
            borderRight: borderRight ? `1px solid ${t.line}` : "none",
            color: t.muted,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.5 : 1,
            transition: "background .12s ease, color .12s ease",
          }}
          onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = t.hover; e.currentTarget.style.color = t.accent; } }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = t.muted; }}
        >
          {child}
        </button>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );

  if (report.filePaths.length > 1) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }} onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={viewingId === report._id}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 8px", borderRadius: 6,
                border: `1px solid ${t.line}`, background: t.card, color: t.muted,
                fontFamily: MONO_FF, fontSize: 10, fontWeight: 700, cursor: "pointer",
              }}
            >
              {viewingId === report._id ? <Loader2 size={11} className="animate-spin" /> : <Eye size={11} />}
              {report.filePaths.length}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuLabel style={{ fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.12em", color: t.faint }}>
              VIEW PDF
            </DropdownMenuLabel>
            {report.filePaths.map((_, i) => {
              const inst = report.instruments[i];
              const label = inst ? toTitleCase(`${inst.make} ${inst.modelType}`.trim()) : `Instrument ${i + 1}`;
              return (
                <DropdownMenuItem key={i} onClick={(e) => onView(e, report._id, i)}>
                  <Eye size={13} style={{ marginRight: 8 }} /> {label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={downloadingId === report._id}
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 30, height: 26, borderRadius: 6,
                border: `1px solid ${t.line}`, background: t.card, color: t.muted, cursor: "pointer",
              }}
            >
              {downloadingId === report._id ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuLabel style={{ fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.12em", color: t.faint }}>
              DOWNLOAD PDF
            </DropdownMenuLabel>
            {report.filePaths.map((_, i) => {
              const inst = report.instruments[i];
              const label = inst ? toTitleCase(`${inst.make} ${inst.modelType}`.trim()) : `Instrument ${i + 1}`;
              return (
                <DropdownMenuItem key={i} onClick={(e) => onDownload(e, report, i)}>
                  <Download size={13} style={{ marginRight: 8 }} /> {label}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => onRegenerate(e, report._id)} disabled={isRegenerating}>
              {isRegenerating ? <Loader2 size={13} style={{ marginRight: 8 }} className="animate-spin" /> : <RefreshCw size={13} style={{ marginRight: 8 }} />}
              Regenerate all
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center",
        borderRadius: 6, border: `1px solid ${t.line}`, overflow: "hidden",
        background: t.card,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {iconBtn(viewingId === report._id ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />, (e) => onView(e, report._id), viewingId === report._id, "View PDF", true)}
      {iconBtn(downloadingId === report._id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />, (e) => onDownload(e, report), downloadingId === report._id, "Download PDF", true)}
      {iconBtn(isRegenerating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />, (e) => onRegenerate(e, report._id), isRegenerating, "Regenerate PDF")}
    </div>
  );
}

// ─── Row actions dropdown ─────────────────────────────────────────────────────

export function RowActionsMenu({
  report,
  isAdmin,
  onEdit,
  onClone,
  onHistory,
  onVerify,
  onReject,
  onReopen,
  onReassign,
  onDelete,
  t,
}: {
  report: ReportRow;
  isAdmin: boolean;
  onEdit: () => void;
  onClone: () => void;
  onHistory: () => void;
  onVerify: (e: React.MouseEvent) => void;
  onReject: (e: React.MouseEvent) => void;
  onReopen: () => void;
  onReassign: () => void;
  onDelete: () => void;
  t: ThemeTokens;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 30, height: 30, borderRadius: 7,
            background: "transparent", border: "none",
            color: t.faint, cursor: "pointer",
            transition: "background .12s ease, color .12s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = t.hover; e.currentTarget.style.color = t.ink; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = t.faint; }}
        >
          <MoreHorizontal size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" style={{ minWidth: 180 }}>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <Pencil size={13} style={{ marginRight: 8, color: t.muted }} /> Edit report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClone(); }}>
          <FileText size={13} style={{ marginRight: 8, color: t.muted }} /> Copy to new report
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onHistory(); }}>
          <History size={13} style={{ marginRight: 8, color: t.muted }} /> View history
        </DropdownMenuItem>

        {isAdmin && report.status !== "draft" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onVerify} style={{ color: t.verifyFg }}>
              <ShieldCheck size={13} style={{ marginRight: 8 }} /> Verify report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReject} style={{ color: t.rejectFg }}>
              <ShieldX size={13} style={{ marginRight: 8 }} /> Reject report
            </DropdownMenuItem>
          </>
        )}
        {isAdmin && (report.status === "verified" || report.status === "rejected") && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReopen(); }}>
            <RotateCcw size={13} style={{ marginRight: 8, color: t.muted }} /> Reopen report
          </DropdownMenuItem>
        )}
        {isAdmin && report.status !== "draft" && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReassign(); }}>
            <UserCog size={13} style={{ marginRight: 8, color: t.muted }} /> Reassign signatories
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{ color: t.rejectFg }}>
          <Trash2 size={13} style={{ marginRight: 8 }} /> Delete report
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Row cell helpers ─────────────────────────────────────────────────────────

export function CertCell({ report, t }: { report: ReportRow; t: ThemeTokens }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: t.accentSoft, border: `1px solid ${t.accentSoftBorder}`,
        flexShrink: 0,
      }}>
        <FlaskConical size={14} color={t.accent} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{
          margin: 0, fontFamily: MONO_FF, fontSize: 12.5, fontWeight: 700,
          color: t.ink, letterSpacing: "0.02em",
        }}>
          {report.certNo || "—"}
        </p>
        <p style={{
          margin: "2px 0 0", fontFamily: MONO_FF, fontSize: 10.5, letterSpacing: "0.06em",
          color: t.faint,
        }}>
          {report.formatNo}
        </p>
      </div>
    </div>
  );
}

export function InstrumentCountCell({ report, t }: { report: ReportRow; t: ThemeTokens }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 8px", borderRadius: 6,
          background: t.softLine, color: t.muted,
          border: `1px solid ${t.line}`,
          fontFamily: MONO_FF, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em",
          cursor: "default",
        }}>
          <Layers size={11} />
          {report.instrumentCount}
        </span>
      </TooltipTrigger>
      {report.instruments?.length > 0 && (
        <TooltipContent side="right" style={{ maxWidth: 220, padding: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {report.instruments.map((inst, i) => (
              <div key={i} style={{ fontSize: 11, lineHeight: 1.35 }}>
                {toTitleCase(`${inst.make} ${inst.modelType}`.trim()) || `Instrument ${i + 1}`}
              </div>
            ))}
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  );
}

export function PersonCell({ name, email, t }: { name?: string; email?: string; t: ThemeTokens }) {
  if (!name) return <span style={{ fontFamily: MONO_FF, color: t.faint, fontSize: 12 }}>—</span>;
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 560, color: t.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {name}
      </p>
      {email && (
        <p style={{ margin: "2px 0 0", fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.06em", color: t.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {email}
        </p>
      )}
    </div>
  );
}

export function DateCell({ iso, t }: { iso?: string; t: ThemeTokens }) {
  if (!iso) return <span style={{ fontFamily: MONO_FF, color: t.faint, fontSize: 12 }}>—</span>;
  const d = new Date(iso);
  const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const timeStr = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  return (
    <div>
      <p style={{ margin: 0, fontSize: 12.5, fontWeight: 560, color: t.ink, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        {dateStr}
      </p>
      <p style={{ margin: "2px 0 0", fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.06em", color: t.faint, whiteSpace: "nowrap" }}>
        {timeStr}
      </p>
    </div>
  );
}

export function CustomerCell({ name, t }: { name?: string; t: ThemeTokens }) {
  if (!name) return <span style={{ fontFamily: MONO_FF, color: t.faint, fontSize: 12 }}>—</span>;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 9px", borderRadius: 100,
      background: t.accentSoft, color: t.accent,
      border: `1px solid ${t.accentSoftBorder}`,
      fontSize: 11.5, fontWeight: 600,
      maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    }}>
      {name}
    </span>
  );
}

export function LocalBadge({ t }: { t: ThemeTokens }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          padding: "2px 6px", borderRadius: 4,
          background: t.warnBg, color: t.warnFg,
          border: `1px solid ${t.warnBorder}`,
          fontFamily: MONO_FF, fontSize: 9, letterSpacing: "0.12em", fontWeight: 700,
        }}>
          <AlertCircle size={9} />
          LOCAL
        </span>
      </TooltipTrigger>
      <TooltipContent>Saved on this device — syncs when online</TooltipContent>
    </Tooltip>
  );
}
