"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Wrench } from "lucide-react";
import Navbar from "@/components/Navbar";
import UserManagement from "@/app/(pages)/(category)/users/UserManagement";
import {
  useGetDashboard,
  type DashboardStats,
  type TrendPoint,
  type TopCustomer,
  type TopViewedReport,
  type AuditFeedEntry,
  type WeeklyActivityPoint,
} from "@/app/hooks/query/useGetDashboard";
import {
  usePresenceHeartbeat,
  useActiveUsers,
  type PresenceUser,
} from "@/app/hooks/query/usePresence";
import { useAuth } from "@/app/provider/AuthProvider";

// ─── helpers ──────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60)     return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60)     return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24)     return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1)   return "Yesterday";
  return `${days}d ago`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Deterministic avatar color from name
function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue} 65% 45%)`;
}

// ─── small atoms ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft:     "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    submitted: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    verified:  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    rejected:  "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full capitalize ${map[status] ?? map.draft}`}>
      {status}
    </span>
  );
}

function DaysLeftBadge({ days }: { days: number }) {
  const cls =
    days <= 14
      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
      : days <= 30
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300";
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${cls}`}>
      {days}d
    </span>
  );
}

function StatCard({
  label,
  value,
  delta,
  hint,
}: {
  label: string;
  value: number | string;
  delta?: number;
  hint?:  string;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-5 flex flex-col gap-2">
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-foreground">{value}</span>
        {delta !== undefined && delta !== 0 && (
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded mb-1 ${
              delta > 0
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta} vs last month
          </span>
        )}
      </div>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-zinc-200 dark:bg-zinc-700 rounded-lg ${className ?? ""}`} />
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonBlock key={i} className="h-24" />
        ))}
      </div>
      <SkeletonBlock className="h-16" />
      <SkeletonBlock className="h-48" />
      <SkeletonBlock className="h-64" />
    </div>
  );
}

// ─── charts (pure SVG, no extra deps) ─────────────────────────────────────

function TrendChart({ trend }: { trend: TrendPoint[] }) {
  const w = 800;
  const h = 160;
  const pad = { top: 10, right: 10, bottom: 18, left: 28 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const max = Math.max(1, ...trend.map((p) => p.total));
  const stepX = innerW / Math.max(1, trend.length - 1);

  const colors = {
    draft:     "#a1a1aa",
    submitted: "#3b82f6",
    verified:  "#10b981",
    rejected:  "#ef4444",
  } as const;

  // Stacked area: draft, submitted, verified, rejected
  const stackOrder = ["draft", "submitted", "verified", "rejected"] as const;

  const paths = stackOrder.map((key, idx) => {
    const upper: { x: number; y: number }[] = [];
    const lower: { x: number; y: number }[] = [];
    trend.forEach((p, i) => {
      let stackedBelow = 0;
      for (let k = 0; k < idx; k++) stackedBelow += p[stackOrder[k]];
      const stackedHere = stackedBelow + p[key];
      const x = pad.left + i * stepX;
      lower.push({ x, y: pad.top + innerH - (stackedBelow / max) * innerH });
      upper.push({ x, y: pad.top + innerH - (stackedHere / max) * innerH });
    });
    const top  = upper.map((pt, i) => `${i === 0 ? "M" : "L"}${pt.x},${pt.y}`).join(" ");
    const bot  = [...lower].reverse().map((pt) => `L${pt.x},${pt.y}`).join(" ");
    return { d: `${top} ${bot} Z`, color: colors[key] };
  });

  // X-axis labels: ~4 evenly-spaced ticks
  const labelIndices = [0, Math.floor(trend.length / 3), Math.floor((2 * trend.length) / 3), trend.length - 1];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-5">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-semibold text-foreground">Reports trend</span>
        <span className="text-xs text-muted-foreground">last 90 days · stacked by status</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const y = pad.top + innerH * (1 - p);
          return (
            <g key={p}>
              <line x1={pad.left} x2={pad.left + innerW} y1={y} y2={y} stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth={0.5} />
              <text x={pad.left - 4} y={y + 3} textAnchor="end" className="text-[9px] fill-current text-zinc-400">
                {Math.round(max * p)}
              </text>
            </g>
          );
        })}

        {/* Stacked areas */}
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color} fillOpacity={0.85} />
        ))}

        {/* X-axis labels */}
        {labelIndices.map((idx) => (
          <text
            key={idx}
            x={pad.left + idx * stepX}
            y={h - 4}
            textAnchor="middle"
            className="text-[9px] fill-current text-zinc-400"
          >
            {trend[idx]?.day?.slice(5)}
          </text>
        ))}
      </svg>
      <div className="flex flex-wrap gap-3 mt-2">
        {stackOrder.map((key) => (
          <div key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: colors[key] }} />
            {key}
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyActivityChart({ weeks }: { weeks: WeeklyActivityPoint[] }) {
  const w = 800;
  const h = 180;
  const pad = { top: 12, right: 14, bottom: 30, left: 32 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;

  const max = Math.max(1, ...weeks.flatMap((p) => [p.accounts, p.logins]));
  const slotW = innerW / Math.max(1, weeks.length);
  const barW  = Math.max(3, (slotW * 0.4));

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-5">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm font-semibold text-foreground">User activity</span>
        <span className="text-xs text-muted-foreground">last 12 weeks · accounts vs logins</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
        {/* Grid lines + Y-axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const y = pad.top + innerH * (1 - p);
          return (
            <g key={p}>
              <line x1={pad.left} x2={pad.left + innerW} y1={y} y2={y}
                stroke="currentColor" className="text-zinc-200 dark:text-zinc-800" strokeWidth={0.5} />
              <text x={pad.left - 4} y={y + 3} textAnchor="end"
                className="text-[9px] fill-current text-zinc-400">
                {Math.round(max * p)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {weeks.map((p, i) => {
          const slotX = pad.left + i * slotW;
          const acctH = (p.accounts / max) * innerH;
          const lgnH  = (p.logins   / max) * innerH;
          const acctX = slotX + slotW / 2 - barW - 1;
          const lgnX  = slotX + slotW / 2 + 1;
          const acctY = pad.top + innerH - acctH;
          const lgnY  = pad.top + innerH - lgnH;
          return (
            <g key={p.weekStart}>
              {p.accounts > 0 && (
                <rect x={acctX} y={acctY} width={barW} height={acctH} fill="#8b5cf6" rx={1}>
                  <title>{p.weekStart}: {p.accounts} accounts</title>
                </rect>
              )}
              {p.logins > 0 && (
                <rect x={lgnX} y={lgnY} width={barW} height={lgnH} fill="#10b981" rx={1}>
                  <title>{p.weekStart}: {p.logins} logins ({p.uniqueLogins} unique)</title>
                </rect>
              )}
            </g>
          );
        })}

        {/* X-axis labels — every other week */}
        {weeks.map((p, i) => {
          if (i % 2 !== 0) return null;
          const slotX = pad.left + i * slotW + slotW / 2;
          return (
            <text key={p.weekStart} x={slotX} y={h - 12} textAnchor="middle"
              className="text-[9px] fill-current text-zinc-400">
              {p.weekStart.slice(5)}
            </text>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3 mt-1">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#8b5cf6" }} />
          Accounts created
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#10b981" }} />
          Logins
        </div>
      </div>
    </div>
  );
}

function ExpiringBucketsChart({
  buckets,
}: {
  buckets: DashboardStats["equipment"]["expiringBuckets"];
}) {
  const items = [
    { label: "<7 days",    value: buckets?.critical, color: "bg-red-500" },
    { label: "7–30 days",  value: buckets?.soon,     color: "bg-amber-500" },
    { label: "30–90 days", value: buckets?.upcoming, color: "bg-yellow-500" },
  ];
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-5 space-y-3">
      <span className="text-sm font-semibold text-foreground">Calibration windows</span>
      <div className="space-y-2">
        {items.map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-3">
            <span className="w-24 text-xs text-muted-foreground shrink-0">{label}</span>
            <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className={`${color} h-full rounded-full transition-all`} style={{ width: `${(value / max) * 100}%` }} />
            </div>
            <span className="w-8 text-xs font-semibold text-foreground text-right">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── lists ─────────────────────────────────────────────────────────────────

function StatusBar({ byStatus, total }: { byStatus: DashboardStats["reports"]["byStatus"]; total: number }) {
  if (total === 0) return null;
  const segments = [
    { key: "draft",     label: "Draft",     color: "bg-zinc-400 dark:bg-zinc-500",      count: byStatus.draft },
    { key: "submitted", label: "Submitted", color: "bg-blue-500",                       count: byStatus.submitted },
    { key: "verified",  label: "Verified",  color: "bg-emerald-500",                    count: byStatus.verified },
    { key: "rejected",  label: "Rejected",  color: "bg-red-500",                        count: byStatus.rejected },
  ] as const;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-5 space-y-3">
      <span className="text-sm font-medium text-muted-foreground">Status Breakdown</span>
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
        {segments.map(({ key, color, count }) => {
          const pct = (count / total) * 100;
          if (pct === 0) return null;
          return <div key={key} className={`${color} transition-all`} style={{ width: `${pct}%` }} title={`${key}: ${count}`} />;
        })}
      </div>
      <div className="flex flex-wrap gap-3">
        {segments.map(({ key, label, color, count }) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`inline-block h-2.5 w-2.5 rounded-sm ${color}`} />
            {label}: <span className="font-semibold text-foreground">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExpiringSoonTable({ items }: { items: DashboardStats["equipment"]["expiringSoon"] }) {
  if (items.length === 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-sm text-emerald-700 dark:text-emerald-300 font-medium">
        All equipment calibration is current.
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Equipment Expiring Soon</span>
        <span className="ml-2 text-xs text-muted-foreground">(next 90 days)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="px-5 py-3 text-left font-medium">Equipment</th>
              <th className="px-5 py-3 text-left font-medium">Serial No</th>
              <th className="px-5 py-3 text-left font-medium">Due Date</th>
              <th className="px-5 py-3 text-left font-medium">Days Left</th>
            </tr>
          </thead>
          <tbody>
            {items.map((eq) => (
              <tr key={String(eq._id)} className="border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
                <td className="px-5 py-3 font-medium text-foreground">{eq.equipmentName}</td>
                <td className="px-5 py-3 text-muted-foreground">{eq.serialNo ?? "—"}</td>
                <td className="px-5 py-3 text-muted-foreground">
                  {new Date(eq.nextDue).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
                <td className="px-5 py-3"><DaysLeftBadge days={eq.daysLeft} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentReportsList({ reports }: { reports: DashboardStats["recentReports"] }) {
  if (reports.length === 0) return <div className="text-sm text-muted-foreground px-1">No reports yet.</div>;
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border"><span className="text-sm font-semibold text-foreground">Recent Reports</span></div>
      <ul>
        {reports.map((r) => (
          <li key={r._id} className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border last:border-0 hover:bg-accent/30 transition-colors">
            <span className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded">
              {r.customerName}
            </span>
            <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">{r.customerName || "—"}</span>
            {r.viewCount > 0 && (
              <span className="text-[10px] text-muted-foreground">{r.viewCount} views</span>
            )}
            <StatusBadge status={r.status} />
            <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(r.createdAt)}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{r.createdBy.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EngineerWorkload({ engineers }: { engineers: DashboardStats["engineers"] }) {
  if (engineers.length === 0) return null;
  const max = Math.max(...engineers.map((e) => e.reportCount), 1);
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border"><span className="text-sm font-semibold text-foreground">Engineer Workload</span></div>
      <ul className="divide-y divide-border">
        {engineers.map((eng, idx) => (
          <li key={String(eng.userId)} className="flex items-center gap-3 px-5 py-3">
            <span className="w-5 text-xs font-bold text-muted-foreground text-right shrink-0">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-sm font-medium text-foreground truncate">{eng.name}</span>
                <span className="text-xs font-semibold text-muted-foreground shrink-0">{eng.reportCount}</span>
              </div>
              <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(eng.reportCount / max) * 100}%` }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopCustomersList({ customers }: { customers: TopCustomer[] }) {
  if (customers?.length === 0) return null;
  const max = Math.max(...customers?.map((c) => c.reportCount), 1);
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border"><span className="text-sm font-semibold text-foreground">Top Customers</span></div>
      <ul className="divide-y divide-border">
        {customers.map((c, idx) => (
          <li key={c.customerName} className="flex items-center gap-3 px-5 py-3">
            <span className="w-5 text-xs font-bold text-muted-foreground text-right shrink-0">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-sm font-medium text-foreground truncate">{c.customerName}</span>
                <span className="text-xs font-semibold text-muted-foreground shrink-0">{c.reportCount}</span>
              </div>
              <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${(c.reportCount / max) * 100}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground">Last: {timeAgo(c.lastReportAt)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TopViewedList({ items }: { items: TopViewedReport[] }) {
  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-5">
        <span className="text-sm font-semibold text-foreground">Most Viewed Reports</span>
        <p className="text-xs text-muted-foreground mt-2">No views recorded yet.</p>
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border"><span className="text-sm font-semibold text-foreground">Most Viewed Reports</span></div>
      <ul className="divide-y divide-border">
        {items.map((r, idx) => (
          <li key={r._id} className="flex items-center gap-3 px-5 py-3">
            <span className="w-5 text-xs font-bold text-muted-foreground text-right shrink-0">{idx + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-foreground truncate">{r.customerName || "—"}</span>
                <StatusBadge status={r.status} />
              </div>
              <div className="text-[10px] text-muted-foreground">
                {r.createdBy.name} · {r.lastViewedAt ? `last view ${timeAgo(r.lastViewedAt)}` : ""}
              </div>
            </div>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400 shrink-0">{r.viewCount}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AuditFeed({ entries }: { entries: AuditFeedEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-5">
        <span className="text-sm font-semibold text-foreground">Activity Feed</span>
        <p className="text-xs text-muted-foreground mt-2">No recent activity.</p>
      </div>
    );
  }
  const actionColor: Record<string, string> = {
    created:        "text-emerald-500",
    updated:        "text-blue-500",
    status_changed: "text-violet-500",
    deleted:        "text-red-500",
  };
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border"><span className="text-sm font-semibold text-foreground">Activity Feed</span></div>
      <ul className="divide-y divide-border max-h-[420px] overflow-y-auto">
        {entries.map((e) => (
          <li key={e._id} className="px-5 py-3 flex items-start gap-3 text-sm">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
              style={{ background: avatarColor(e.performedBy?.name ?? "?") }}
              title={e.performedBy?.email}
            >
              {initials(e.performedBy?.name ?? "?")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-foreground font-medium">{e.performedBy?.name ?? "Unknown"}</span>
                <span className={`text-xs font-semibold ${actionColor[e.action] ?? "text-muted-foreground"}`}>
                  {e.action.replace("_", " ")}
                </span>
                {e.reportId && (
                  <span className="text-xs text-muted-foreground truncate">
                    · {e.reportId.customerName || e.reportId._id.slice(-6)}
                  </span>
                )}
              </div>
              {e.changes.length > 0 && (
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {e.changes.slice(0, 3).map((c) => c.field).join(", ")}
                  {e.changes.length > 3 && ` +${e.changes.length - 3} more`}
                </div>
              )}
            </div>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">{timeAgo(e.createdAt)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActiveUsersPanel({ users, currentUserId }: { users: PresenceUser[] | undefined; currentUserId?: string }) {
  if (!users || users.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="relative flex h-2 w-2">
            <span className="inline-flex h-full w-full rounded-full bg-zinc-400" />
          </span>
          <span className="text-sm font-semibold text-foreground">Active now</span>
        </div>
        <p className="text-xs text-muted-foreground">No one else is online.</p>
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-sm font-semibold text-foreground">Active now</span>
        <span className="text-xs text-muted-foreground">({users.length})</span>
      </div>
      <ul className="divide-y divide-border">
        {users.map((u) => (
          <li key={u.userId} className="flex items-center gap-3 px-5 py-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 relative"
              style={{ background: avatarColor(u.name) }}
              title={u.email}
            >
              {initials(u.name)}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-zinc-900" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">
                {u.name} {u.userId === currentUserId && <span className="text-xs text-muted-foreground">(you)</span>}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {u.reportId
                  ? <>viewing <span className="font-mono">…{u.reportId.slice(-6)}</span></>
                  : u.route || "online"}
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{timeAgo(u.lastSeen)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────

type SectionView = "analytics" | "actions";

function SectionTabs({
  value, onChange,
}: {
  value:    SectionView;
  onChange: (v: SectionView) => void;
}) {
  const tabs: { key: SectionView; label: string; icon: typeof BarChart3 }[] = [
    { key: "analytics", label: "Analytics", icon: BarChart3 },
    { key: "actions",   label: "Actions",   icon: Wrench },
  ];
  return (
    <div className="inline-flex rounded-lg border border-border bg-white dark:bg-zinc-900 p-0.5 text-sm">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
            value === key
              ? "bg-blue-600 text-white"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useGetDashboard();
  const { user } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<SectionView>("analytics");

  // Heartbeat — keeps current user counted as active
  usePresenceHeartbeat({ enabled: !!user, route: "/dashboard" });
  const { data: activeUsers } = useActiveUsers();

  useEffect(() => {
    if (user && user.role !== "admin") router.replace("/calibration");
  }, [user, router]);

  if (!user || user.role !== "admin") return null;

  const isAdmin = true;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-background pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isAdmin ? "System-wide overview" : "Your activity overview"}
              </p>
            </div>
            <SectionTabs value={view} onChange={setView} />
          </div>

          {view === "actions" ? (
            <UserManagement />
          ) : (
          <>
          {isLoading && <LoadingSkeleton />}

          {isError && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
              Failed to load dashboard data. Please refresh the page.
            </div>
          )}

          {data && (
            <div className="space-y-5">
              {/* Top stat row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Reports" value={data.reports.total} />
                <StatCard
                  label="This Month"
                  value={data.reports.thisMonth}
                  delta={data.reports.thisMonth - data.reports.lastMonth}
                />
                <StatCard label="Verified" value={data.reports.byStatus.verified} />
                <StatCard
                  label="Avg verify time"
                  value={data.avgVerifyDays ? `${data.avgVerifyDays.value}d` : "—"}
                  hint={data.avgVerifyDays ? `over ${data.avgVerifyDays.sampleSize} reports` : undefined}
                />
              </div>

              <StatusBar byStatus={data.reports.byStatus} total={data.reports.total} />

              {/* User & login stats row */}
              {data.users && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <StatCard
                    label="Total Users"
                    value={data.users.total}
                    delta={data.users.thisWeek - data.users.lastWeek}
                    hint={`${data.users.thisWeek} new this week`}
                  />
                  <StatCard
                    label="Logins this week"
                    value={data.users.loginsThisWeek}
                    delta={data.users.loginsThisWeek - data.users.loginsLastWeek}
                  />
                  <StatCard
                    label="Total Logins"
                    value={data.users.loginsTotal}
                    hint="all-time"
                  />
                  <StatCard
                    label="New This Week"
                    value={data.users.thisWeek}
                    hint={`${data.users.lastWeek} last week`}
                  />
                </div>
              )}

              {/* Weekly user activity chart */}
              {data.weeklyActivity && data.weeklyActivity.length > 0 && (
                <WeeklyActivityChart weeks={data.weeklyActivity} />
              )}

              {/* Trend chart */}
              {data?.trend?.length > 0 && <TrendChart trend={data.trend} />}

              {/* Equipment + workload row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-5 flex gap-6">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Total Equipment</span>
                    <span className="text-2xl font-bold text-foreground">{data.equipment.total}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Active</span>
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.equipment.active}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Expiring Soon</span>
                    <span className={`text-2xl font-bold ${data.equipment.expiringSoon.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                      {data.equipment.expiringSoon.length}
                    </span>
                  </div>
                </div>

                {isAdmin && data.engineers.length > 0 && <EngineerWorkload engineers={data.engineers} />}
              </div>

              {/* Buckets + active users row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ExpiringBucketsChart
                  buckets={data.equipment.expiringBuckets ?? { critical: 0, soon: 0, upcoming: 0 }}
                />
                <ActiveUsersPanel users={activeUsers} currentUserId={user?.id} />
              </div>

              {/* Customers + Most viewed */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TopCustomersList customers={data.topCustomers ?? []} />
                <TopViewedList items={data.topViewed ?? []} />
              </div>

              {/* Activity feed full width */}
              <AuditFeed entries={data.auditFeed ?? []} />

              <ExpiringSoonTable items={data.equipment.expiringSoon} />

              <RecentReportsList reports={data.recentReports} />
            </div>
          )}
          </>
          )}
        </div>
      </main>
    </>
  );
}
