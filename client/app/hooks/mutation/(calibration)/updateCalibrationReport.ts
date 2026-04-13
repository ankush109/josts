/**
 * @fileoverview Update calibration report mutation hook.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_UPDATE_CALIBRATION_REPORT } from "@/lib/endpoints";
import { CALIBRATION_REPORTS_KEY } from "@/app/hooks/query/useCalibrationReport";

export interface UpdateCalibrationReportPayload {
  /** The report document ID to update. */
  reportId: string;
  [key: string]: unknown;
}

/**
 * Sends a full PUT update for an existing calibration report.
 *
 * @param payload - Report ID plus the updated report body
 * @returns The updated report document
 */
export async function updateCalibrationReport(
  payload: UpdateCalibrationReportPayload,
): Promise<unknown> {
  const { reportId, ...body } = payload;
  const { data } = await authClient.put(
    EP_UPDATE_CALIBRATION_REPORT(reportId),
    body,
  );
  return data;
}

/**
 * React Query mutation hook for updating a calibration report.
 * Automatically invalidates the reports list cache on success.
 *
 * @example
 * const { mutate: updateReport } = useUpdateCalibrationReport();
 * updateReport({ reportId, ...payload }, { onSuccess: () => toast.success("Saved") });
 */
export function useUpdateCalibrationReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCalibrationReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALIBRATION_REPORTS_KEY] });
    },
  });
}
