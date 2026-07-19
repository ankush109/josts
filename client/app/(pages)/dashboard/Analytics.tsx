"use client";

/**
 * Analytics view for the admin dashboard — replaces the flat stat-card grid
 * with a real information-dense overview:
 *   - Hero row: status donut + 3 primary KPIs with sparklines + deltas
 *   - Status pills (draft/submitted/verified/rejected)
 *   - Reports trend area chart + user activity dual-series bar chart
 *   - System-health tiles (PDF, verification cycle, active users)
 *   - Team leaderboard, equipment aging gauge, audit feed
 *
 * Data source is unchanged (`useGetDashboard`) — this file is presentational.
 */

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity, ArrowDownRight, ArrowUpRight, Award, CheckCircle2,
  ChevronRight, Clock, FileText, Filter, RefreshCw, ShieldCheck,
  TrendingUp, Users, XCircle, Zap, AlertCircle, Timer, Flame,
} from "lucide-react";
import {
  type DashboardStats,
  type TrendPoint,
  type TopCustomer,
  type TopViewedReport,
  type AuditFeedEntry,
  type WeeklyActivityPoint,
} from "@/app/hooks/query/useGetDashboard";
import { type PresenceUser } from "@/app/hooks/query/usePresence";

// ─── Utilities ──────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

const AVATAR_HUE_LIST = [217, 271, 158, 42, 350, 191, 250, 178];
function avatarBg(name: string) {
  const hue = AVATAR_HUE_LIST[name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_HUE_LIST.length];
  return `hsl(${hue} 60% 50%)`;
}

function niceCeil(v: number): number {
  if (v <= 0) return 5;
  const mag = 10 ** Math.floor(Math.log10(v));
  const n = v / mag;
  if (n <= 1) return 1 * mag;
  if (n <= 2) return 2 * mag;
  if (n <= 5) return 5 * mag;
  return 10 * mag;
}

function fmtCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function pct(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

// ─── Delta pill ─────────────────────────────────────────────────────────────

function Delta({ value, suffix }: { value: number; suffix?: string }) {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-zinc-400">
        <span className="opacity-60">—</span>
        {suffix && <span className="opacity-60 ml-0.5">{suffix}</span>}
      </span>
    );
  }
  const up = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10.5px] font-mono font-semibold px-1.5 py-0.5 rounded ${
        up
          ? "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
          : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40"
      }`}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? "+" : ""}{value}
      {suffix && <span className="ml-0.5 opacity-70">{suffix}</span>}
    </span>
  );
}

// ─── Sparkline ──────────────────────────────────────────────────────────────

function Sparkline({
  points, color = "#3b82f6", height = 34, gradId,
}: { points: number[]; color?: string; height?: number; gradId: string }) {
  if (points.length < 2) return <div style={{ height }} className="w-full opacity-30" />;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const W = 200;
  const H = height;
  const dx = W / (points.length - 1);

  const norm = points.map((v, i) => ({
    x: i * dx,
    y: H - ((v - min) / range) * (H - 4) - 2,
  }));
  const pathLine = norm.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");
  const pathArea = `${pathLine} L ${W} ${H} L 0 ${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full block" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={pathArea} fill={`url(#${gradId})`} />
      <path d={pathLine} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Progress ring ──────────────────────────────────────────────────────────

function Ring({ value, total, size = 90, stroke = 10, tone = "verified" }: {
  value: number; total: number; size?: number; stroke?: number;
  tone?: "verified" | "submitted" | "draft" | "rejected";
}) {
  const p = total === 0 ? 0 : Math.min(1, value / total);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * p;
  const color =
    tone === "verified"  ? "#22c55e" :
    tone === "submitted" ? "#3b82f6" :
    tone === "rejected"  ? "#ef4444" :
                           "#94a3b8";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="currentColor" strokeWidth={stroke}
          className="text-zinc-100 dark:text-zinc-800"
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${c}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray .6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-lg font-bold tabular-nums text-foreground leading-none">
          {Math.round(p * 100)}%
        </div>
      </div>
    </div>
  );
}

// ─── Hero KPIs ──────────────────────────────────────────────────────────────

function HeroKpi({
  label, value, delta, deltaSuffix, tone, sparkPoints, sparkColor, gradId, icon, hint,
}: {
  label: string;
  value: string | number;
  delta?: number;
  deltaSuffix?: string;
  tone?: "primary" | "ok" | "warn" | "err";
  sparkPoints?: number[];
  sparkColor?: string;
  gradId: string;
  icon: React.ReactNode;
  hint?: string;
}) {
  const iconBg =
    tone === "ok"      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400" :
    tone === "warn"    ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400" :
    tone === "err"     ? "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400" :
                          "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400";

  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-zinc-900 p-4 relative overflow-hidden group hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        {delta !== undefined && <Delta value={delta} suffix={deltaSuffix} />}
      </div>
      <div className="mt-2.5">
        <p className="text-[10.5px] font-mono uppercase tracking-widest text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground tabular-nums mt-0.5 leading-none">
          {value}
        </p>
        {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
      </div>
      {sparkPoints && sparkPoints.length > 1 && (
        <div className="mt-3 -mx-4 -mb-4">
          <Sparkline points={sparkPoints} color={sparkColor ?? "#3b82f6"} height={38} gradId={gradId} />
        </div>
      )}
    </div>
  );
}

// ─── Status donut + composition ─────────────────────────────────────────────

function StatusDonut({ byStatus, total }: { byStatus: DashboardStats["reports"]["byStatus"]; total: number }) {
  const rows = [
    { key: "verified",  label: "Verified",  value: byStatus.verified,  color: "#22c55e" },
    { key: "submitted", label: "Submitted", value: byStatus.submitted, color: "#3b82f6" },
    { key: "draft",     label: "Draft",     value: byStatus.draft,     color: "#94a3b8" },
    { key: "rejected",  label: "Rejected",  value: byStatus.rejected,  color: "#ef4444" },
  ];
  const size = 140;
  const r    = 58;
  const stroke = 22;
  const cx = size / 2, cy = size / 2;
  const c  = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Status composition</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Distribution across the full report set</p>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">TOTAL · {total}</span>
      </div>
      <div className="flex items-center gap-5">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-zinc-100 dark:text-zinc-800" />
            {total > 0 && rows.map((r0) => {
              const frac = r0.value / total;
              const seg  = c * frac;
              const off  = -c * acc;
              acc += frac;
              return (
                <circle
                  key={r0.key}
                  cx={cx} cy={cy} r={r}
                  fill="none" stroke={r0.color} strokeWidth={stroke}
                  strokeDasharray={`${seg} ${c - seg}`}
                  strokeDashoffset={off}
                  style={{ transition: "stroke-dasharray .5s" }}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[9.5px] font-mono uppercase tracking-widest text-muted-foreground">Reports</span>
            <span className="text-2xl font-bold text-foreground tabular-nums leading-none mt-0.5">{total}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">
              {pct(byStatus.verified, total)}% verified
            </span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {rows.map((r0) => (
            <div key={r0.key} className="flex items-center gap-2 text-[12px]">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: r0.color }} />
              <span className="text-muted-foreground flex-1">{r0.label}</span>
              <span className="text-foreground font-mono font-semibold tabular-nums">{r0.value}</span>
              <span className="text-[10px] font-mono text-muted-foreground w-9 text-right">{pct(r0.value, total)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Weekly activity — dual-series area chart with gradient fills ─────────────

function ActivityChart({ weeks }: { weeks: WeeklyActivityPoint[] }) {
  const [range, setRange] = useState<"12" | "8" | "4">("12");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const sliced = useMemo(
    () => weeks.slice(-Number(range)),
    [weeks, range]
  );
  const max = Math.max(1, ...sliced.map((w) => Math.max(w.accounts, w.logins)));
  const scale = niceCeil(max);

  const W = 720, H = 200;
  const paddingL = 34, paddingR = 12, paddingT = 12, paddingB = 30;
  const iw = W - paddingL - paddingR;
  const ih = H - paddingT - paddingB;
  const n = sliced.length;
  const dx = n > 1 ? iw / (n - 1) : iw;

  const toXY = (v: number, i: number) => ({
    x: paddingL + i * dx,
    y: paddingT + ih - (v / scale) * ih,
  });

  const linePath = (arr: { x: number; y: number }[]) =>
    arr.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ");

  const accountsPts = sliced.map((w, i) => toXY(w.accounts, i));
  const loginsPts   = sliced.map((w, i) => toXY(w.logins,   i));

  const accountsArea = `${linePath(accountsPts)} L ${accountsPts[accountsPts.length - 1]?.x ?? paddingL} ${paddingT + ih} L ${paddingL} ${paddingT + ih} Z`;
  const loginsArea   = `${linePath(loginsPts)} L ${loginsPts[loginsPts.length - 1]?.x ?? paddingL} ${paddingT + ih} L ${paddingL} ${paddingT + ih} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  const svgRef = useRef<SVGSVGElement>(null);
  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || n === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    if (relX < paddingL || relX > W - paddingR) { setHoverIdx(null); return; }
    const idx = Math.round((relX - paddingL) / dx);
    setHoverIdx(Math.max(0, Math.min(n - 1, idx)));
  }

  const hovered = hoverIdx !== null ? sliced[hoverIdx] : null;
  const hoverX = hoverIdx !== null ? paddingL + hoverIdx * dx : null;
  const tooltipLeftPct = hoverIdx !== null ? ((paddingL + hoverIdx * dx) / W) * 100 : 0;
  const tooltipOnRight = tooltipLeftPct > 65;

  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">User activity</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Accounts created + login events per week</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-zinc-50 dark:bg-zinc-800/40">
          {(["4", "8", "12"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setRange(k)}
              className={`px-2 h-6 text-[10.5px] font-mono uppercase tracking-widest rounded transition-colors ${
                range === k
                  ? "bg-white dark:bg-zinc-900 text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {k}w
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full block"
          style={{ height: 200 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="grad-logins" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"   stopColor="#22c55e" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="grad-accounts" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"   stopColor="#8b5cf6" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {gridLines.map((frac) => {
            const y = paddingT + ih * frac;
            const v = Math.round(scale * (1 - frac));
            return (
              <g key={frac}>
                <line x1={paddingL} y1={y} x2={W - paddingR} y2={y}
                  stroke="currentColor" strokeOpacity="0.08" strokeDasharray={frac === 1 ? undefined : "3 3"}
                  className="text-foreground" />
                <text x={paddingL - 6} y={y + 3} textAnchor="end" fontSize="9" fontFamily="ui-monospace, monospace" className="fill-muted-foreground">
                  {v}
                </text>
              </g>
            );
          })}

          {/* Areas */}
          <path d={loginsArea}   fill="url(#grad-logins)" />
          <path d={accountsArea} fill="url(#grad-accounts)" />

          {/* Lines */}
          <path d={linePath(loginsPts)}   fill="none" stroke="#22c55e" strokeWidth="2" strokeLinejoin="round" />
          <path d={linePath(accountsPts)} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" />

          {/* Points */}
          {loginsPts.map((p, i) => (
            <circle
              key={`l-${i}`} cx={p.x} cy={p.y}
              r={hoverIdx === i ? 5 : 3}
              fill="#22c55e" stroke="#fff" strokeWidth="1.5"
              className="dark:stroke-zinc-900"
              style={{ transition: "r .12s" }}
            />
          ))}
          {accountsPts.map((p, i) => (
            <circle
              key={`a-${i}`} cx={p.x} cy={p.y}
              r={hoverIdx === i ? 5 : 3}
              fill="#8b5cf6" stroke="#fff" strokeWidth="1.5"
              className="dark:stroke-zinc-900"
              style={{ transition: "r .12s" }}
            />
          ))}

          {/* Hover crosshair */}
          {hoverX !== null && (
            <line
              x1={hoverX} x2={hoverX}
              y1={paddingT} y2={paddingT + ih}
              stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3"
              className="text-foreground"
              pointerEvents="none"
            />
          )}

          {/* X-axis labels — every N weeks */}
          {sliced.map((w, i) => {
            if (n <= 6 || i % Math.ceil(n / 6) === 0) {
              const x = toXY(0, i).x;
              const label = w.weekStart.slice(5);
              return (
                <text key={i} x={x} y={H - 10} textAnchor="middle" fontSize="9" fontFamily="ui-monospace, monospace" className="fill-muted-foreground">
                  {label}
                </text>
              );
            }
            return null;
          })}
        </svg>

        {/* Tooltip overlay */}
        {hovered && hoverIdx !== null && (
          <div
            className="absolute z-10 pointer-events-none rounded-lg border border-border bg-white dark:bg-zinc-900 shadow-lg p-2.5 min-w-[150px]"
            style={{
              left: tooltipOnRight ? undefined : `calc(${tooltipLeftPct}% + 12px)`,
              right: tooltipOnRight ? `calc(${100 - tooltipLeftPct}% + 12px)` : undefined,
              top: 8,
            }}
          >
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
              WEEK OF {hovered.weekStart}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[12px]">
                <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                <span className="text-muted-foreground flex-1">Accounts</span>
                <span className="text-foreground font-mono font-bold tabular-nums">{hovered.accounts}</span>
              </div>
              <div className="flex items-center gap-2 text-[12px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-muted-foreground flex-1">Logins</span>
                <span className="text-foreground font-mono font-bold tabular-nums">{hovered.logins}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] pt-1 mt-1 border-t border-border">
                <span className="text-muted-foreground flex-1">Unique</span>
                <span className="text-muted-foreground font-mono tabular-nums">{hovered.uniqueLogins}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-4 text-[11px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-violet-500" />
          <span className="text-muted-foreground">Accounts created</span>
          <span className="text-foreground font-mono font-semibold tabular-nums">
            {sliced.reduce((s, w) => s + w.accounts, 0)}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">Logins</span>
          <span className="text-foreground font-mono font-semibold tabular-nums">
            {sliced.reduce((s, w) => s + w.logins, 0)}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 ml-auto">
          <span className="text-muted-foreground text-[10.5px] font-mono uppercase tracking-widest">
            AVG {(sliced.reduce((s, w) => s + w.logins, 0) / Math.max(1, sliced.length)).toFixed(1)}/wk
          </span>
        </span>
      </div>
    </div>
  );
}

// ─── Reports trend — stacked area chart ─────────────────────────────────────

function TrendAreaChart({ trend }: { trend: TrendPoint[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (trend.length === 0) return null;

  const W = 720, H = 220;
  const paddingL = 34, paddingR = 12, paddingT = 12, paddingB = 30;
  const iw = W - paddingL - paddingR;
  const ih = H - paddingT - paddingB;

  const stacks = trend.map((t) => ({
    day: t.day,
    v: t.verified,
    s: t.submitted,
    d: t.draft,
    r: t.rejected,
    total: t.total,
  }));

  const max = Math.max(1, ...stacks.map((s) => s.total));
  const scale = niceCeil(max);
  const n = stacks.length;
  const dx = n > 1 ? iw / (n - 1) : iw;

  const bandY = (top: number) => paddingT + ih - (top / scale) * ih;
  const layer = (accessor: (s: typeof stacks[number]) => number, cumBefore: (s: typeof stacks[number]) => number) => {
    const upper: string[] = [];
    const lower: string[] = [];
    stacks.forEach((s, i) => {
      const x = paddingL + i * dx;
      const before = cumBefore(s);
      const val    = accessor(s);
      upper.push(`${i === 0 ? "M" : "L"} ${x} ${bandY(before + val)}`);
      lower.push(`L ${x} ${bandY(before)}`);
    });
    return `${upper.join(" ")} ${[...lower].reverse().join(" ")} Z`;
  };

  const rejPath = layer((s) => s.r, () => 0);
  const drfPath = layer((s) => s.d, (s) => s.r);
  const subPath = layer((s) => s.s, (s) => s.r + s.d);
  const verPath = layer((s) => s.v, (s) => s.r + s.d + s.s);

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || n === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * W;
    if (relX < paddingL || relX > W - paddingR) { setHoverIdx(null); return; }
    const idx = Math.round((relX - paddingL) / dx);
    setHoverIdx(Math.max(0, Math.min(n - 1, idx)));
  }

  const hovered = hoverIdx !== null ? stacks[hoverIdx] : null;
  const hoverX = hoverIdx !== null ? paddingL + hoverIdx * dx : null;
  const tooltipLeftPct = hoverIdx !== null ? ((paddingL + hoverIdx * dx) / W) * 100 : 0;
  const tooltipOnRight = tooltipLeftPct > 65;

  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Reports trend</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Weekly stacked · by status</p>
        </div>
        <span className="text-[10.5px] font-mono uppercase tracking-widest text-muted-foreground">
          {trend.length}w window · peak {Math.max(...stacks.map((s) => s.total))}
        </span>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full block"
          style={{ height: H }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="trend-verified" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.55" />
            </linearGradient>
            <linearGradient id="trend-submitted" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.55" />
            </linearGradient>
            <linearGradient id="trend-draft" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.55" />
            </linearGradient>
            <linearGradient id="trend-rejected" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.55" />
            </linearGradient>
          </defs>

          {gridLines.map((frac) => {
            const y = paddingT + ih * frac;
            const v = Math.round(scale * (1 - frac));
            return (
              <g key={frac}>
                <line x1={paddingL} y1={y} x2={W - paddingR} y2={y}
                  stroke="currentColor" strokeOpacity="0.08" strokeDasharray={frac === 1 ? undefined : "3 3"}
                  className="text-foreground" />
                <text x={paddingL - 6} y={y + 3} textAnchor="end" fontSize="9" fontFamily="ui-monospace, monospace" className="fill-muted-foreground">
                  {v}
                </text>
              </g>
            );
          })}

          <path d={rejPath} fill="url(#trend-rejected)" />
          <path d={drfPath} fill="url(#trend-draft)" />
          <path d={subPath} fill="url(#trend-submitted)" />
          <path d={verPath} fill="url(#trend-verified)" />

          {/* Hover crosshair + point */}
          {hoverX !== null && hovered && (
            <>
              <line
                x1={hoverX} x2={hoverX}
                y1={paddingT} y2={paddingT + ih}
                stroke="currentColor" strokeOpacity="0.35" strokeWidth="1" strokeDasharray="3 3"
                className="text-foreground"
                pointerEvents="none"
              />
              <circle
                cx={hoverX} cy={bandY(hovered.total)}
                r={5}
                fill="#fff"
                stroke="#3b82f6"
                strokeWidth="2"
                className="dark:fill-zinc-900"
                pointerEvents="none"
              />
            </>
          )}

          {stacks.map((s, i) => {
            if (n > 8 && i % Math.ceil(n / 6) !== 0) return null;
            const x = paddingL + i * dx;
            return (
              <text key={i} x={x} y={H - 10} textAnchor="middle" fontSize="9" fontFamily="ui-monospace, monospace" className="fill-muted-foreground">
                {s.day.slice(5)}
              </text>
            );
          })}
        </svg>

        {/* Tooltip */}
        {hovered && hoverIdx !== null && (
          <div
            className="absolute z-10 pointer-events-none rounded-lg border border-border bg-white dark:bg-zinc-900 shadow-lg p-2.5 min-w-[170px]"
            style={{
              left: tooltipOnRight ? undefined : `calc(${tooltipLeftPct}% + 12px)`,
              right: tooltipOnRight ? `calc(${100 - tooltipLeftPct}% + 12px)` : undefined,
              top: 8,
            }}
          >
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1.5">
              WEEK OF {hovered.day}
            </div>
            <div className="space-y-1">
              {[
                { color: "#22c55e", label: "Verified",  val: hovered.v },
                { color: "#3b82f6", label: "Submitted", val: hovered.s },
                { color: "#94a3b8", label: "Draft",     val: hovered.d },
                { color: "#ef4444", label: "Rejected",  val: hovered.r },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-2 text-[12px]">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: row.color }} />
                  <span className="text-muted-foreground flex-1">{row.label}</span>
                  <span className={`font-mono font-bold tabular-nums ${row.val === 0 ? "text-muted-foreground" : "text-foreground"}`}>
                    {row.val}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-[12px] pt-1 mt-1 border-t border-border">
                <span className="text-foreground font-semibold flex-1">Total</span>
                <span className="text-foreground font-mono font-bold tabular-nums">{hovered.total}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]">
        {[
          { color: "#22c55e", label: "Verified"  },
          { color: "#3b82f6", label: "Submitted" },
          { color: "#94a3b8", label: "Draft"     },
          { color: "#ef4444", label: "Rejected"  },
        ].map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
            <span className="text-muted-foreground">{l.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Equipment aging gauge ──────────────────────────────────────────────────

function EquipmentAging({ buckets, total }: {
  buckets: DashboardStats["equipment"]["expiringBuckets"];
  total: number;
}) {
  const critical = buckets.critical ?? 0;
  const soon     = buckets.soon ?? 0;
  const upcoming = buckets.upcoming ?? 0;
  const safe     = Math.max(0, total - critical - soon - upcoming);
  const rows = [
    { key: "critical", label: "Overdue",     value: critical, color: "#ef4444", desc: "< 0 days" },
    { key: "soon",     label: "Due < 30d",   value: soon,     color: "#f59e0b", desc: "0-30 days" },
    { key: "upcoming", label: "Due < 90d",   value: upcoming, color: "#eab308", desc: "31-90 days" },
    { key: "safe",     label: "Safe",        value: safe,     color: "#22c55e", desc: "> 90 days" },
  ];
  const denom = Math.max(1, total);

  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
            <Flame className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Equipment aging</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Calibration expiry distribution</p>
          </div>
        </div>
        <span className="text-[10.5px] font-mono uppercase tracking-widest text-muted-foreground">{total} TOTAL</span>
      </div>

      <div className="flex h-3 w-full rounded overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {rows.map((r) => r.value > 0 && (
          <div
            key={r.key}
            style={{ width: `${(r.value / denom) * 100}%`, background: r.color }}
            title={`${r.label}: ${r.value}`}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {rows.map((r) => (
          <div key={r.key} className="rounded-lg border border-border p-2.5 bg-zinc-50/40 dark:bg-zinc-800/30">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground truncate">
                {r.label}
              </span>
            </div>
            <div className="text-lg font-bold tabular-nums leading-none" style={{ color: r.color }}>
              {r.value}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{r.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Team leaderboard ──────────────────────────────────────────────────────

function TeamLeaderboard({ engineers }: { engineers: DashboardStats["engineers"] }) {
  const top = engineers.slice(0, 6);
  const max = Math.max(1, ...top.map((e) => e.reportCount));

  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center">
            <Award className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Team leaderboard</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Reports created per engineer</p>
          </div>
        </div>
      </div>
      {top.length === 0 ? (
        <p className="text-[12px] text-muted-foreground py-6 text-center">No engineer activity yet.</p>
      ) : (
        <div className="space-y-2.5">
          {top.map((e, i) => {
            const w = (e.reportCount / max) * 100;
            return (
              <div key={e.userId} className="flex items-center gap-3">
                <div className="w-4 text-[10.5px] font-mono text-muted-foreground tabular-nums text-right">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: avatarBg(e.name) }}
                >
                  {initials(e.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-foreground truncate leading-tight">{e.name}</p>
                  <div className="mt-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${w}%`, transition: "width .5s" }} />
                  </div>
                </div>
                <span className="text-sm font-bold tabular-nums text-foreground shrink-0">{e.reportCount}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Active users tile ─────────────────────────────────────────────────────

function ActiveNowTile({ users, currentUserId }: { users: PresenceUser[] | undefined; currentUserId?: string }) {
  const list = users?.filter((u) => u.userId !== currentUserId) ?? [];
  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-zinc-900 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
            <div className="relative">
              <Users className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Live · {(users?.length ?? 0)} online</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Includes you</p>
          </div>
        </div>
      </div>
      {list.length === 0 ? (
        <p className="text-[12px] text-muted-foreground py-4 text-center">You&apos;re the only one here right now.</p>
      ) : (
        <div className="flex -space-x-2 mb-3">
          {list.slice(0, 8).map((u) => (
            <div
              key={u.userId}
              title={u.name}
              className="h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white dark:ring-zinc-900"
              style={{ background: avatarBg(u.name) }}
            >
              {initials(u.name)}
            </div>
          ))}
          {list.length > 8 && (
            <div className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300 ring-2 ring-white dark:ring-zinc-900">
              +{list.length - 8}
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-lg border border-border p-2.5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Concurrent</p>
          <p className="text-lg font-bold tabular-nums leading-none mt-0.5">{users?.length ?? 0}</p>
        </div>
        <div className="rounded-lg border border-border p-2.5">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Others</p>
          <p className="text-lg font-bold tabular-nums leading-none mt-0.5 text-emerald-600 dark:text-emerald-400">{list.length}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Top customers ─────────────────────────────────────────────────────────

function TopCustomersCard({ customers }: { customers: TopCustomer[] }) {
  const max = Math.max(1, ...customers.map((c) => c.reportCount));
  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-zinc-900 p-5">
      <h3 className="text-sm font-semibold text-foreground">Top customers</h3>
      <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">By report volume · last 90d</p>
      {customers.length === 0 ? (
        <p className="text-[12px] text-muted-foreground py-4 text-center">No customer data yet.</p>
      ) : (
        <div className="space-y-2">
          {customers.slice(0, 6).map((c, i) => (
            <div key={c.customerName + i} className="flex items-center gap-3">
              <span className="text-[10.5px] font-mono text-muted-foreground w-4 text-right">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-foreground truncate">{c.customerName || "(unnamed)"}</p>
                <div className="mt-1 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(c.reportCount / max) * 100}%` }} />
                </div>
              </div>
              <span className="text-[12px] font-mono font-bold tabular-nums text-foreground">{c.reportCount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Top viewed ─────────────────────────────────────────────────────────────

function TopViewedCard({ items }: { items: TopViewedReport[] }) {
  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-zinc-900 p-5">
      <h3 className="text-sm font-semibold text-foreground">Most viewed reports</h3>
      <p className="text-[11px] text-muted-foreground mt-0.5 mb-3">Peer traffic across the team</p>
      {items.length === 0 ? (
        <p className="text-[12px] text-muted-foreground py-4 text-center">No views recorded yet.</p>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 5).map((r, i) => (
            <Link
              key={r._id}
              href={`/calibration/${r._id}`}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group"
            >
              <span className="text-[10.5px] font-mono text-muted-foreground w-4 text-right">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-medium text-foreground truncate">{r.customerName || "(unnamed)"}</p>
                <p className="text-[10.5px] text-muted-foreground truncate">
                  by {r.createdBy?.name ?? "—"} · {r.status}
                </p>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-blue-600 dark:text-blue-400 shrink-0">
                {r.viewCount} 👁
              </span>
              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Expiring soon table ─────────────────────────────────────────────────────

function ExpiringSoonTable({ items }: { items: DashboardStats["equipment"]["expiringSoon"] }) {
  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Expiring next</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Closest calibration deadlines</p>
        </div>
        <Link href="/equipments" className="text-[10.5px] font-mono uppercase tracking-widest text-blue-600 hover:underline inline-flex items-center gap-1">
          ALL EQUIPMENT <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-[12px] text-muted-foreground py-6 text-center">Nothing scheduled to expire soon.</p>
      ) : (
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="text-left">
              <th className="px-5 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Equipment</th>
              <th className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Serial</th>
              <th className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Next due</th>
              <th className="px-5 py-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground text-right">Days</th>
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 8).map((eq) => {
              const tone = eq.daysLeft < 0 ? "err" : eq.daysLeft < 30 ? "warn" : "ok";
              const toneColor =
                tone === "err"  ? "text-red-600 dark:text-red-400" :
                tone === "warn" ? "text-amber-600 dark:text-amber-400" :
                                  "text-emerald-600 dark:text-emerald-400";
              return (
                <tr key={eq._id} className="border-t border-border">
                  <td className="px-5 py-2.5 font-medium text-foreground truncate max-w-[240px]">{eq.equipmentName}</td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">{eq.serialNo ?? "—"}</td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">
                    {new Date(eq.nextDue).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td className={`px-5 py-2.5 text-right font-mono font-bold tabular-nums ${toneColor}`}>
                    {eq.daysLeft < 0 ? `${eq.daysLeft}` : `+${eq.daysLeft}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Audit feed ─────────────────────────────────────────────────────────────

const ACTION_META: Record<AuditFeedEntry["action"], { label: string; color: string; dot: string }> = {
  created:        { label: "Created",         color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40", dot: "bg-emerald-500" },
  updated:        { label: "Updated",         color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40",             dot: "bg-blue-500"    },
  status_changed: { label: "Status changed",  color: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40",     dot: "bg-violet-500"  },
  deleted:        { label: "Deleted",         color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40",                 dot: "bg-red-500"     },
};

function AuditFeedCard({ entries }: { entries: AuditFeedEntry[] }) {
  return (
    <div className="rounded-2xl border border-border bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Activity feed</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Recent report actions across the team</p>
        </div>
        <span className="text-[10.5px] font-mono uppercase tracking-widest text-muted-foreground">{entries.length}</span>
      </div>
      {entries.length === 0 ? (
        <p className="text-[12px] text-muted-foreground py-6 text-center">No recent activity.</p>
      ) : (
        <div className="max-h-[380px] overflow-y-auto">
          {entries.slice(0, 20).map((e) => {
            const meta = ACTION_META[e.action] ?? ACTION_META.updated;
            const who  = e.performedBy?.name ?? "System";
            const r    = e.reportId;
            return (
              <div key={e._id} className="flex items-start gap-3 px-5 py-3 border-t border-border first:border-t-0">
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ background: avatarBg(who) }}
                >
                  {initials(who)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[12.5px]">
                    <span className="font-semibold text-foreground truncate">{who}</span>
                    <span className={`inline-flex items-center gap-1 text-[9.5px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded ${meta.color}`}>
                      <span className={`w-1 h-1 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                    {r && (
                      <Link href={`/calibration/${r._id}`} className="text-[11.5px] text-blue-600 hover:underline truncate">
                        {r.customerName || "(unnamed)"}
                      </Link>
                    )}
                  </div>
                  {e.changes?.length > 0 && (
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[10.5px] font-mono">
                      {e.changes.slice(0, 3).map((c, i) => (
                        <span key={i} className="text-muted-foreground">
                          <span className="text-foreground">{c.field}</span>
                          <span className="opacity-60"> {c.from} → {c.to}</span>
                        </span>
                      ))}
                      {e.changes.length > 3 && <span className="text-muted-foreground">+{e.changes.length - 3} more</span>}
                    </div>
                  )}
                </div>
                <span className="text-[10.5px] font-mono text-muted-foreground shrink-0 tabular-nums">
                  {timeAgo(e.createdAt)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main analytics view ────────────────────────────────────────────────────

export default function Analytics({
  data,
  activeUsers,
  currentUserId,
  onRefresh,
  isFetching,
}: {
  data: DashboardStats;
  activeUsers: PresenceUser[] | undefined;
  currentUserId?: string;
  onRefresh: () => void;
  isFetching: boolean;
}) {
  const [rangeDays, setRangeDays] = useState<7 | 30 | 90>(30);

  const trendPoints = data.trend.map((t) => t.total);
  const monthDelta  = data.reports.thisMonth - data.reports.lastMonth;
  const verifyPct   = pct(data.reports.byStatus.verified, data.reports.total);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          <span>Live · updates on window focus</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-zinc-50 dark:bg-zinc-800/40">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setRangeDays(d)}
                className={`px-2.5 h-7 text-[11px] font-mono uppercase tracking-widest rounded transition-colors ${
                  rangeDays === d
                    ? "bg-white dark:bg-zinc-900 text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d}D
              </button>
            ))}
          </div>
          <button
            onClick={onRefresh}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-border text-[11px] font-medium text-foreground hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Row 1: Hero KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <HeroKpi
          gradId="kpi-total"
          label="Total Reports"
          value={fmtCompact(data.reports.total)}
          icon={<FileText className="h-4 w-4" />}
          sparkPoints={trendPoints}
          sparkColor="#3b82f6"
          hint={`Peak week: ${Math.max(0, ...trendPoints)}`}
        />
        <HeroKpi
          gradId="kpi-month"
          label="This Month"
          value={data.reports.thisMonth}
          delta={monthDelta}
          deltaSuffix="vs last"
          tone="primary"
          icon={<TrendingUp className="h-4 w-4" />}
          sparkPoints={trendPoints.slice(-6)}
          sparkColor="#22c55e"
        />
        <HeroKpi
          gradId="kpi-verified"
          label="Verified rate"
          value={`${verifyPct}%`}
          tone="ok"
          hint={`${data.reports.byStatus.verified} of ${data.reports.total}`}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <HeroKpi
          gradId="kpi-avgtime"
          label="Avg verify time"
          value={data.avgVerifyDays ? `${data.avgVerifyDays.value}d` : "—"}
          hint={data.avgVerifyDays ? `across ${data.avgVerifyDays.sampleSize} reports` : "not enough data"}
          tone={data.avgVerifyDays && data.avgVerifyDays.value <= 3 ? "ok" : "warn"}
          icon={<Timer className="h-4 w-4" />}
        />
      </div>

      {/* Row 2: Status donut + trend area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatusDonut byStatus={data.reports.byStatus} total={data.reports.total} />
        <div className="lg:col-span-2">
          <TrendAreaChart trend={data.trend} />
        </div>
      </div>

      {/* Row 3: User activity + user KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ActivityChart weeks={data.weeklyActivity ?? []} />
        </div>
        <div className="grid grid-cols-2 gap-3 content-start">
          <HeroKpi
            gradId="kpi-users-total"
            label="Total Users"
            value={data.users.total}
            delta={data.users.thisWeek - data.users.lastWeek}
            deltaSuffix="new"
            icon={<Users className="h-4 w-4" />}
          />
          <HeroKpi
            gradId="kpi-logins-week"
            label="Logins / Week"
            value={data.users.loginsThisWeek}
            delta={data.users.loginsThisWeek - data.users.loginsLastWeek}
            tone="ok"
            icon={<Zap className="h-4 w-4" />}
          />
          <HeroKpi
            gradId="kpi-logins-total"
            label="All-Time Logins"
            value={fmtCompact(data.users.loginsTotal)}
            icon={<CheckCircle2 className="h-4 w-4" />}
            hint="cumulative"
          />
          <HeroKpi
            gradId="kpi-new-users"
            label="New This Week"
            value={data.users.thisWeek}
            hint={`${data.users.lastWeek} last week`}
            tone="primary"
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>
      </div>

      {/* Row 4: Equipment + Team + Active */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <EquipmentAging
          buckets={data.equipment.expiringBuckets ?? { critical: 0, soon: 0, upcoming: 0 }}
          total={data.equipment.total}
        />
        <TeamLeaderboard engineers={data.engineers} />
        <ActiveNowTile users={activeUsers} currentUserId={currentUserId} />
      </div>

      {/* Row 5: Top customers + Top viewed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopCustomersCard customers={data.topCustomers ?? []} />
        <TopViewedCard items={data.topViewed ?? []} />
      </div>

      {/* Row 6: Activity feed full width */}
      <AuditFeedCard entries={data.auditFeed ?? []} />

      {/* Row 7: Expiring soon */}
      <ExpiringSoonTable items={data.equipment.expiringSoon} />
    </div>
  );
}
