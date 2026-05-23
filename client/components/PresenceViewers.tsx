"use client";

import { useReportViewers, type PresenceUser } from "@/app/hooks/query/usePresence";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360} 65% 45%)`;
}

/**
 * Avatar stack for everyone currently viewing the given report.
 * The current user is excluded so the badge reflects "others looking
 * over your shoulder" rather than counting yourself.
 */
export function ReportViewerStack({
  reportId,
  currentUserId,
}: {
  reportId:      string | null | undefined;
  currentUserId: string | undefined;
}) {
  const { data } = useReportViewers(reportId);

  const others: PresenceUser[] = (data ?? []).filter((v) => v.userId !== currentUserId);
  if (others.length === 0) return null;

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800"
      title={others.map((u) => u.name).join(", ")}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
      <div className="flex -space-x-1.5">
        {others.slice(0, 4).map((u) => (
          <div
            key={u.userId}
            className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-white dark:ring-zinc-900"
            style={{ background: avatarColor(u.name) }}
          >
            {initials(u.name)}
          </div>
        ))}
        {others.length > 4 && (
          <div className="w-6 h-6 rounded-full bg-zinc-700 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-zinc-900">
            +{others.length - 4}
          </div>
        )}
      </div>
      <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
        {others.length === 1 ? `${others[0].name} is viewing` : `${others.length} viewing`}
      </span>
    </div>
  );
}
