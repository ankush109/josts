/**
 * @fileoverview Fetch calibration report audit log query hook.
 */
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_CALIBRATION_AUDIT_LOG } from "@/lib/endpoints";
import { isLocalId } from "@/app/lib/offline-drafts";
import type { AuditEntry } from "@/types/calibration";

/** Shared React Query cache key for audit logs. */
export const AUDIT_LOG_KEY = "audit-log" as const;

// Re-export type so existing imports from this file continue to work.
export type { AuditEntry };

/**
 * Fetches the full audit / history log for a calibration report.
 *
 * @param reportId - The report document ID to fetch history for
 * @returns Ordered array of audit log entries (newest last)
 */
export async function getAuditLog(reportId: string): Promise<AuditEntry[]> {
  const { data } = await authClient.get<AuditEntry[]>(
    EP_CALIBRATION_AUDIT_LOG(reportId),
  );
  return data;
}

/**
 * React Query hook for the calibration report audit log.
 * Skips the request when `reportId` is null.
 *
 * @param reportId - Report ID to load history for, or null to disable
 *
 * @example
 * const { data: log, isLoading } = useGetAuditLog(reportId);
 */
export function useGetAuditLog(reportId: string | null) {
  return useQuery<AuditEntry[]>({
    queryKey: [AUDIT_LOG_KEY, reportId],
    queryFn: () => getAuditLog(reportId!),
    enabled: !!reportId && !isLocalId(reportId),
  });
}
