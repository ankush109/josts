/**
 * @fileoverview Verify / reject calibration report status mutation hook.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_VERIFY_REJECT_CALIBRATION } from "@/lib/endpoints";
import { CALIBRATION_REPORTS_KEY } from "@/app/hooks/query/useCalibrationReport";
import type { CalibrationReportStatus } from "@/types/calibration";

export interface VerifyRejectPayload {
  reportId: string;
  status: Extract<CalibrationReportStatus, "verified" | "rejected">;
}

/**
 * Transitions a submitted report to either "verified" or "rejected".
 *
 * @param payload - Report ID and the target status
 * @returns Updated report document
 */
export async function verifyRejectCalibration(
  payload: VerifyRejectPayload,
): Promise<unknown> {
  const { reportId, status } = payload;
  const { data } = await authClient.patch(
    EP_VERIFY_REJECT_CALIBRATION(reportId),
    { status },
  );
  return data;
}

/**
 * React Query mutation hook for verifying or rejecting a calibration report.
 * Automatically invalidates the reports list cache on success.
 *
 * @example
 * const { mutate: verifyReject } = useVerifyRejectCalibration();
 * verifyReject({ reportId, status: "verified" });
 */
export function useVerifyRejectCalibration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verifyRejectCalibration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CALIBRATION_REPORTS_KEY] });
    },
  });
}
