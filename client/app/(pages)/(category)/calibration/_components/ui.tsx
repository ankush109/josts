"use client";

import * as React from "react";
import {
  ChevronLeft, ChevronRight,
  Search, ArrowUp, ArrowDown, FileDown, Plus, RefreshCw, Loader2,
  FileText, Clock, CheckCircle2, XCircle, ClipboardList,
  History, Trash2, ShieldCheck, ShieldX,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { CalibrationReportStatus, AuditEntry } from "@/types/calibration";
import { MONO_FF, avatarColor, type ThemeTokens } from "./theme";

// ─── Status Pill ──────────────────────────────────────────────────────────────

export function StatusPill({ status, t }: { status: CalibrationReportStatus; t: ThemeTokens }) {
  const map: Record<CalibrationReportStatus, { label: string; icon: React.ReactNode; bg: string; fg: string; border: string }> = {
    draft:     { label: "DRAFT",     icon: <FileText size={11} />,     bg: t.draftBg,  fg: t.draftFg,  border: t.draftBorder },
    submitted: { label: "SUBMITTED", icon: <Clock size={11} />,        bg: t.submitBg, fg: t.submitFg, border: t.submitBorder },
    verified:  { label: "VERIFIED",  icon: <CheckCircle2 size={11} />, bg: t.verifyBg, fg: t.verifyFg, border: t.verifyBorder },
    rejected:  { label: "REJECTED",  icon: <XCircle size={11} />,      bg: t.rejectBg, fg: t.rejectFg, border: t.rejectBorder },
  };
  const cfg = map[status] ?? map.draft;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 8px", borderRadius: 6,
      background: cfg.bg, color: cfg.fg,
      border: `1px solid ${cfg.border}`,
      fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.1em", fontWeight: 600,
      whiteSpace: "nowrap",
    }}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Section Marker (mono eyebrow like landing "§ 01 — …") ────────────────────

export function SectionMarker({ text, t }: { text: string; t: ThemeTokens }) {
  return (
    <div style={{
      fontFamily: MONO_FF, fontSize: 10.5, letterSpacing: "0.16em",
      color: t.accent, fontWeight: 600,
    }}>
      {text}
    </div>
  );
}

// ─── Ghost Button (small monochrome outline) ──────────────────────────────────

export function GhostButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { t: ThemeTokens; icon?: React.ReactNode }) {
  const { t, icon, children, style, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        height: 34, padding: "0 12px", borderRadius: 8,
        background: "transparent", color: t.ink,
        border: `1px solid ${t.line}`,
        fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.08em", fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "background .15s ease, border-color .15s ease",
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = t.hover; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {icon}
      {children}
    </button>
  );
}

// ─── Primary Button (accent color) ────────────────────────────────────────────

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { t: ThemeTokens; icon?: React.ReactNode }) {
  const { t, icon, children, style, disabled, ...rest } = props;
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        height: 34, padding: "0 16px", borderRadius: 8,
        background: t.accent, color: t.accentInk,
        border: "none",
        fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.1em", fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
        boxShadow: "0 6px 18px rgba(47,111,237,0.25)",
        transition: "transform .12s ease, box-shadow .18s ease",
        ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
    >
      {icon}
      {children}
    </button>
  );
}

// ─── Stat Filter Bar (segmented, replaces 5 stat cards but with all counts) ───

export type StatCounts = { total: number; draft: number; submitted: number; verified: number; rejected: number };

export function StatFilterBar({
  counts, active, onChange, t,
}: {
  counts: StatCounts;
  active: string;
  onChange: (v: string) => void;
  t: ThemeTokens;
}) {
  const items: { key: string; label: string; value: number; icon: React.ReactNode; tint?: { fg: string; bg: string } }[] = [
    { key: "all",       label: "ALL",        value: counts.total,     icon: <ClipboardList size={12} /> },
    { key: "draft",     label: "DRAFT",      value: counts.draft,     icon: <FileText size={12} />,     tint: { fg: t.draftFg,  bg: t.draftBg } },
    { key: "submitted", label: "SUBMITTED",  value: counts.submitted, icon: <Clock size={12} />,        tint: { fg: t.submitFg, bg: t.submitBg } },
    { key: "verified",  label: "VERIFIED",   value: counts.verified,  icon: <CheckCircle2 size={12} />, tint: { fg: t.verifyFg, bg: t.verifyBg } },
    { key: "rejected",  label: "REJECTED",   value: counts.rejected,  icon: <XCircle size={12} />,      tint: { fg: t.rejectFg, bg: t.rejectBg } },
  ];

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6, padding: 5,
      background: t.card, border: `1px solid ${t.line}`, borderRadius: 12,
    }}>
      {items.map((it) => {
        const isActive = active === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "8px 14px", borderRadius: 8, border: "none",
              background: isActive ? t.accentSoft : "transparent",
              color: isActive ? t.accent : t.muted,
              boxShadow: isActive ? `inset 0 0 0 1px ${t.accentSoftBorder}` : "none",
              cursor: "pointer",
              fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.12em", fontWeight: 700,
              transition: "background .15s ease, color .15s ease",
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = t.hover; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
          >
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: isActive ? t.accent : (it.tint?.fg ?? t.faint),
            }}>
              {it.icon}
            </span>
            {it.label}
            <span style={{
              fontVariantNumeric: "tabular-nums",
              color: isActive ? t.accent : t.ink,
              fontWeight: 700,
              minWidth: 20,
              textAlign: "center",
              padding: "1px 6px",
              borderRadius: 5,
              fontSize: 11,
              background: isActive ? "rgba(255,255,255,0)" : t.softLine,
            }}>
              {it.value}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Toolbar (search + status select + sort + export xlsx + per-page) ─────────

export function Toolbar({
  search, onSearch,
  status, onStatus,
  sortOrder, onSort,
  itemsPerPage, onItemsPerPage,
  onExportXlsx, canExport,
  t,
}: {
  search: string; onSearch: (v: string) => void;
  status: string; onStatus: (v: string) => void;
  sortOrder: "asc" | "desc"; onSort: () => void;
  itemsPerPage: number; onItemsPerPage: (v: string) => void;
  onExportXlsx: () => void; canExport: boolean;
  t: ThemeTokens;
}) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 10,
      padding: "12px 14px",
      borderBottom: `1px solid ${t.line}`,
      alignItems: "center",
    }}>
      <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 380 }}>
        <Search size={15} style={{
          position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
          color: t.faint, pointerEvents: "none",
        }} />
        <Input
          placeholder="Search cert no, customer, DUC…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          style={{
            paddingLeft: 34, height: 36, background: t.card,
            border: `1px solid ${t.line}`, color: t.ink,
            fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 6, marginLeft: "auto", flexWrap: "wrap", alignItems: "center" }}>
        <Select value={status} onValueChange={onStatus}>
          <SelectTrigger style={{
            height: 34, width: 132, background: t.card,
            border: `1px solid ${t.line}`, color: t.ink,
            fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.08em", fontWeight: 600,
          }}>
            <SelectValue placeholder="STATUS" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ALL STATUSES</SelectItem>
            <SelectItem value="draft">DRAFT</SelectItem>
            <SelectItem value="submitted">SUBMITTED</SelectItem>
            <SelectItem value="verified">VERIFIED</SelectItem>
            <SelectItem value="rejected">REJECTED</SelectItem>
          </SelectContent>
        </Select>

        <GhostButton
          t={t}
          onClick={onSort}
          icon={sortOrder === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
        >
          {sortOrder === "asc" ? "OLDEST" : "NEWEST"}
        </GhostButton>

        <GhostButton t={t} onClick={onExportXlsx} disabled={!canExport} icon={<FileDown size={13} />}>
          EXPORT XLSX
        </GhostButton>

        <Select value={String(itemsPerPage)} onValueChange={onItemsPerPage}>
          <SelectTrigger style={{
            height: 34, width: 96, background: t.card,
            border: `1px solid ${t.line}`, color: t.ink,
            fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.06em", fontWeight: 600,
          }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 20, 50].map((n) => <SelectItem key={n} value={String(n)}>{n} / PAGE</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ─── Bulk Actions Bar ─────────────────────────────────────────────────────────

export function BulkActionsBar({
  count,
  onVerify, onReject, onDelete, onClear,
  disabled,
  t,
}: {
  count: number;
  onVerify: () => void; onReject: () => void; onDelete: () => void; onClear: () => void;
  disabled: boolean;
  t: ThemeTokens;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, padding: "10px 16px",
      borderBottom: `1px solid ${t.line}`,
      background: t.accentSoft,
    }}>
      <p style={{
        margin: 0, fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.12em",
        color: t.accent, fontWeight: 700,
      }}>
        {count} SELECTED
      </p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <GhostButton t={t} onClick={onVerify} disabled={disabled} icon={<ShieldCheck size={13} />}
          style={{ borderColor: t.verifyBorder, color: t.verifyFg }}>
          VERIFY
        </GhostButton>
        <GhostButton t={t} onClick={onReject} disabled={disabled} icon={<ShieldX size={13} />}
          style={{ borderColor: t.rejectBorder, color: t.rejectFg }}>
          REJECT
        </GhostButton>
        <GhostButton t={t} onClick={onDelete} disabled={disabled} icon={<Trash2 size={13} />}
          style={{ borderColor: t.rejectBorder, color: t.rejectFg }}>
          DELETE
        </GhostButton>
        <button
          type="button"
          onClick={onClear}
          style={{
            height: 34, padding: "0 10px", border: "none", background: "transparent",
            fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.1em", fontWeight: 600,
            color: t.muted, cursor: "pointer",
          }}
        >
          CLEAR
        </button>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export function Pagination({
  currentPage, totalPages, onPage, t,
}: {
  currentPage: number; totalPages: number; onPage: (p: number) => void; t: ThemeTokens;
}) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((p) => p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1));

  const cell = (label: React.ReactNode, disabled: boolean, onClick: () => void, active = false): React.ReactNode => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        minWidth: 34, height: 34, padding: "0 10px",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: `1px solid ${active ? t.accent : t.line}`,
        background: active ? t.accent : t.card,
        color: active ? t.accentInk : t.ink,
        borderRadius: 7,
        fontFamily: MONO_FF, fontSize: 11, fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "background .12s ease, border-color .12s ease",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "12px 16px", borderTop: `1px solid ${t.line}`,
    }}>
      <p style={{
        margin: 0, fontFamily: MONO_FF, fontSize: 11, letterSpacing: "0.1em",
        color: t.muted, fontWeight: 600,
      }}>
        PAGE {currentPage} / {totalPages}
      </p>
      <div style={{ display: "flex", gap: 5 }}>
        {cell(<ChevronLeft size={14} />, currentPage === 1, () => onPage(currentPage - 1))}
        {pages.map((page, idx) => (
          <React.Fragment key={page}>
            {idx > 0 && page - pages[idx - 1] > 1 && (
              <span style={{ padding: "0 6px", color: t.faint, fontFamily: MONO_FF, alignSelf: "center", fontSize: 12 }}>…</span>
            )}
            {cell(page, false, () => onPage(page), currentPage === page)}
          </React.Fragment>
        ))}
        {cell(<ChevronRight size={14} />, currentPage === totalPages, () => onPage(currentPage + 1))}
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({
  isFiltered, onCreate, canCreate, t,
}: {
  isFiltered: boolean;
  onCreate?: () => void;
  canCreate: boolean;
  t: ThemeTokens;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
      padding: "72px 24px",
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 13,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: t.accentSoft,
        border: `1px solid ${t.accentSoftBorder}`,
      }}>
        <FileText size={22} color={t.accent} />
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{
          margin: 0, fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif",
          fontSize: 16, fontWeight: 640, color: t.ink, letterSpacing: "-0.01em",
        }}>
          No reports found
        </p>
        <p style={{
          margin: "6px 0 0", fontFamily: MONO_FF, fontSize: 10.5, letterSpacing: "0.1em",
          color: t.faint,
        }}>
          {isFiltered ? "TRY ADJUSTING YOUR SEARCH OR FILTERS" : "CREATE YOUR FIRST CALIBRATION REPORT"}
        </p>
      </div>
      {canCreate && !isFiltered && onCreate && (
        <PrimaryButton t={t} onClick={onCreate} icon={<Plus size={14} />}>
          NEW REPORT
        </PrimaryButton>
      )}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function TableSkeleton({ t }: { t: ThemeTokens }) {
  const bar = (w: number, h = 12): React.CSSProperties => ({
    width: w, height: h, borderRadius: 4,
    background: t.softLine,
    animation: "pulse 1.6s ease-in-out infinite",
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
      `}</style>

      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={bar(140, 10)} />
          <div style={bar(240, 22)} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={bar(100, 34)} />
          <div style={bar(120, 34)} />
        </div>
      </div>

      {/* stat filter */}
      <div style={{ display: "flex", gap: 6, padding: 5, background: t.card, border: `1px solid ${t.line}`, borderRadius: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => <div key={i} style={bar(110, 32)} />)}
      </div>

      {/* card */}
      <div style={{ background: t.card, border: `1px solid ${t.line}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 8, padding: 14, borderBottom: `1px solid ${t.line}` }}>
          <div style={bar(280, 34)} />
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <div style={bar(120, 34)} />
            <div style={bar(96, 34)} />
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "1.4fr 0.7fr 1fr 0.6fr 1fr 1fr 1fr 1fr 1fr 0.9fr 0.6fr",
            padding: "14px 16px", borderBottom: i === 7 ? "none" : `1px solid ${t.softLine}`, gap: 12, alignItems: "center",
          }}>
            <div style={bar(120)} />
            <div style={bar(64)} />
            <div style={bar(100)} />
            <div style={bar(28)} />
            <div style={bar(90)} />
            <div style={bar(80)} />
            <div style={bar(80)} />
            <div style={bar(96)} />
            <div style={bar(96)} />
            <div style={bar(48)} />
            <div style={bar(20, 20)} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Audit Row (used in AuditDialog) ──────────────────────────────────────────

const ACTION_META: Record<AuditEntry["action"], { label: string; fg: string; bg: string; dot: string }> = {
  created:        { label: "CREATED",         fg: "#1d7a44", bg: "#e6f6ee", dot: "#22c55e" },
  updated:        { label: "UPDATED",         fg: "#1e5aa8", bg: "#eaf4fd", dot: "#3b82f6" },
  status_changed: { label: "STATUS CHANGED",  fg: "#5b21b6", bg: "#efe7fb", dot: "#8b5cf6" },
  deleted:        { label: "DELETED",         fg: "#b52c2c", bg: "#fbeaea", dot: "#ef4444" },
};

export function AuditRow({ entry, isLast, t }: { entry: AuditEntry; isLast: boolean; t: ThemeTokens }) {
  const baseMeta = ACTION_META[entry.action] ?? { label: entry.action.toUpperCase(), fg: t.muted, bg: t.softLine, dot: t.faint };
  const meta = entry.action === "status_changed"
    ? entry.changes[0]?.to === "verified"
      ? { label: "VERIFIED", fg: "#1d7a44", bg: "#e6f6ee", dot: "#22c55e" }
      : entry.changes[0]?.to === "rejected"
      ? { label: "REJECTED", fg: "#b52c2c", bg: "#fbeaea", dot: "#ef4444" }
      : baseMeta
    : baseMeta;
  const name = entry.performedBy?.signatureName || entry.performedBy?.name || entry.performedBy?.email || "Unknown";
  const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
  const date = new Date(entry.createdAt);
  const dateStr = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <li style={{ position: "relative", display: "flex", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <span style={{
          marginTop: 6, width: 10, height: 10, borderRadius: "50%",
          background: meta.dot, boxShadow: `0 0 0 3px ${t.card}`, flexShrink: 0,
        }} />
        {!isLast && <span style={{ marginTop: 4, flex: 1, width: 1, background: t.line }} />}
      </div>
      <div style={{ minWidth: 0, flex: 1, paddingBottom: isLast ? 0 : 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: avatarColor(name),
              color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 9, fontWeight: 700, flexShrink: 0,
            }}>
              {initials}
            </div>
            <span style={{ fontSize: 13, fontWeight: 640, color: t.ink, minWidth: 0 }}>{name}</span>
            <span style={{
              fontFamily: MONO_FF, fontSize: 9.5, letterSpacing: "0.12em", fontWeight: 700,
              padding: "2px 6px", borderRadius: 4,
              background: meta.bg, color: meta.fg, flexShrink: 0,
            }}>
              {meta.label}
            </span>
          </div>
          <span style={{
            fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.08em",
            color: t.faint, whiteSpace: "nowrap",
          }}>
            {dateStr} · {timeStr}
          </span>
        </div>
        {entry.changes?.length > 0 && (
          <div style={{ marginTop: 6, marginLeft: 30, display: "flex", flexDirection: "column", gap: 2 }}>
            {entry.changes.map((c: { field: string; from: string; to: string }, ci: number) => (
              <div key={ci} style={{
                display: "flex", alignItems: "center", gap: 6,
                fontFamily: MONO_FF, fontSize: 11, color: t.muted,
              }}>
                <span style={{ fontWeight: 700, minWidth: 90, flexShrink: 0, color: t.ink, letterSpacing: "0.02em" }}>{c.field}</span>
                <span style={{ textDecoration: "line-through", color: t.faint, maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.from}</span>
                <span style={{ color: t.faint }}>→</span>
                <span style={{ fontWeight: 640, color: t.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.to}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

// ─── Failed PDFs banner ───────────────────────────────────────────────────────

export function FailedPdfsBanner({
  count, isBusy, onRegenerate, t,
}: {
  count: number; isBusy: boolean; onRegenerate: () => void; t: ThemeTokens;
}) {
  if (count === 0) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, padding: "12px 16px",
      background: t.warnBg, border: `1px solid ${t.warnBorder}`,
      borderRadius: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <XCircle size={16} color={t.warnFg} />
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: t.warnFg }}>
            {count} PDF{count > 1 ? "s" : ""} failed to generate
          </p>
          <p style={{ margin: "2px 0 0", fontFamily: MONO_FF, fontSize: 10, letterSpacing: "0.08em", color: t.warnFg, opacity: 0.75 }}>
            RETRY IN BATCH — MAX 3 CONCURRENT
          </p>
        </div>
      </div>
      <GhostButton
        t={t}
        onClick={onRegenerate}
        disabled={isBusy}
        icon={isBusy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
        style={{ borderColor: t.warnBorder, color: t.warnFg }}
      >
        {isBusy ? "REGENERATING…" : "REGENERATE ALL"}
      </GhostButton>
    </div>
  );
}
