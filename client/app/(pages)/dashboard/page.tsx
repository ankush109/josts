"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useGetDashboard, type DashboardStats } from "@/app/hooks/query/useGetDashboard";
import { useAuth } from "@/app/provider/AuthProvider";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

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
}: {
  label: string;
  value: number;
  delta?: number;
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

function StatusBar({ byStatus, total }: { byStatus: DashboardStats["reports"]["byStatus"]; total: number }) {
  if (total === 0) return null;

  const segments = [
    { key: "draft",     label: "Draft",     color: "bg-zinc-400 dark:bg-zinc-500",      count: byStatus.draft },
    { key: "submitted", label: "Submitted",  color: "bg-blue-500",                       count: byStatus.submitted },
    { key: "verified",  label: "Verified",   color: "bg-emerald-500",                    count: byStatus.verified },
    { key: "rejected",  label: "Rejected",   color: "bg-red-500",                        count: byStatus.rejected },
  ] as const;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-5 space-y-3">
      <span className="text-sm font-medium text-muted-foreground">Status Breakdown</span>
      <div className="flex h-4 rounded-full overflow-hidden gap-0.5">
        {segments.map(({ key, color, count }) => {
          const pct = (count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={key}
              className={`${color} transition-all`}
              style={{ width: `${pct}%` }}
              title={`${key}: ${count}`}
            />
          );
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
                <td className="px-5 py-3">
                  <DaysLeftBadge days={eq.daysLeft} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentReportsList({ reports }: { reports: DashboardStats["recentReports"] }) {
  if (reports.length === 0) {
    return (
      <div className="text-sm text-muted-foreground px-1">No reports yet.</div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Recent Reports</span>
      </div>
      <ul>
        {reports.map((r) => (
          <li
            key={r._id}
            className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-border last:border-0 hover:bg-accent/30 transition-colors"
          >
            <span className="font-mono text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded">
              {r.customerName}
            </span>
            <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
              {r.customerName || "—"}
            </span>
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
      <div className="px-5 py-4 border-b border-border">
        <span className="text-sm font-semibold text-foreground">Engineer Workload</span>
      </div>
      <ul className="divide-y divide-border">
        {engineers.map((eng, idx) => (
          <li key={String(eng.userId)} className="flex items-center gap-3 px-5 py-3">
            <span className="w-5 text-xs font-bold text-muted-foreground text-right shrink-0">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1 gap-2">
                <span className="text-sm font-medium text-foreground truncate">{eng.name}</span>
                <span className="text-xs font-semibold text-muted-foreground shrink-0">{eng.reportCount}</span>
              </div>
              <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(eng.reportCount / max) * 100}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useGetDashboard();
  const { user } = useAuth();
  const router = useRouter();

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
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isAdmin ? "System-wide overview" : "Your activity overview"}
            </p>
          </div>

          {isLoading && <LoadingSkeleton />}

          {isError && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-700 dark:text-red-300">
              Failed to load dashboard data. Please refresh the page.
            </div>
          )}

          {data && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Reports" value={data.reports.total} />
                <StatCard
                  label="This Month"
                  value={data.reports.thisMonth}
                  delta={data.reports.thisMonth - data.reports.lastMonth}
                />
                <StatCard label="Verified" value={data.reports.byStatus.verified} />
                <StatCard
                  label="Pending"
                  value={data.reports.byStatus.submitted + data.reports.byStatus.draft}
                />
              </div>

              <StatusBar byStatus={data.reports.byStatus} total={data.reports.total} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-border p-5 flex gap-6">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Total Equipment</span>
                    <span className="text-2xl font-bold text-foreground">{data.equipment.total}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Active</span>
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {data.equipment.active}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-muted-foreground font-medium">Expiring Soon</span>
                    <span className={`text-2xl font-bold ${data.equipment.expiringSoon.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                      {data.equipment.expiringSoon.length}
                    </span>
                  </div>
                </div>

                {isAdmin && data.engineers.length > 0 && (
                  <EngineerWorkload engineers={data.engineers} />
                )}
              </div>

              <ExpiringSoonTable items={data.equipment.expiringSoon} />

              <RecentReportsList reports={data.recentReports} />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
