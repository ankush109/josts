/**
 * @fileoverview Change report status mutation hook.
 *
 * @note File is named `updateReportStatus.ts` for historical reasons.
 *       The exported hook follows the standard `use*` naming convention.
 */
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_CHANGE_REPORT_STATUS } from "@/lib/endpoints";

export interface ChangeReportStatusPayload {
  reportId: string;
  /** Target status string (e.g. "submitted", "draft"). */
  status: string;
}

/**
 * Updates the lifecycle status of a report.
 *
 * @param payload - Report ID and the new status string
 */
export async function changeReportStatus(
  payload: ChangeReportStatusPayload,
): Promise<unknown> {
  const { reportId, status } = payload;
  const { data } = await authClient.put(
    EP_CHANGE_REPORT_STATUS(reportId, status),
  );
  return data;
}

/**
 * React Query mutation hook for changing a report's status.
 *
 * @example
 * const { mutate: changeStatus } = useChangeReportStatusMutation();
 * changeStatus({ reportId, status: "submitted" });
 */
export function useChangeReportStatusMutation() {
  return useMutation({ mutationFn: changeReportStatus });
}
