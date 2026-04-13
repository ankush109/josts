/**
 * @fileoverview Create calibration report mutation hook.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_CREATE_CALIBRATION_REPORT } from "@/lib/endpoints";
import { CALIBRATION_REPORTS_KEY } from "@/app/hooks/query/useCalibrationReport";

/** Raw payload accepted by POST /calibration-report. */
export interface CreateCalibrationReportPayload {
  [key: string]: unknown;
}

/**
 * Persists a new calibration report to the server.
 *
 * @param payload - Report data (instruments, meta, status, etc.)
 * @returns The created report document
 */
export async function createCalibrationReport(
  payload: CreateCalibrationReportPayload,
): Promise<unknown> {
  const { data } = await authClient.post(
    EP_CREATE_CALIBRATION_REPORT(),
    payload,
  );
  return data;
}

/**
 * React Query mutation hook for creating a calibration report.
 * Automatically invalidates the reports list cache on success.
 *
 * @example
 * const { mutate: createReport, isPending } = useGenerateCalibrationReport();
 * createReport(payload, { onSuccess: (report) => router.push(`/calibration/${report._id}`) });
 */
export function useGenerateCalibrationReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCalibrationReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALIBRATION_REPORTS_KEY] });
    },
  });
}
