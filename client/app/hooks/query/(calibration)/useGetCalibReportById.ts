/**
 * @fileoverview Fetch a single calibration report by ID query hook.
 */
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_CALIBRATION_REPORT_BY_ID } from "@/lib/endpoints";
import { CALIBRATION_REPORTS_KEY } from "@/app/hooks/query/useCalibrationReport";
import type { CalibrationReportApiResponse } from "@/types/calibration";

/**
 * Fetches a single calibration report from the API.
 *
 * @param reportId - The document ID of the report to fetch
 * @returns The full calibration report document
 */
export async function getCalibrationReportById(
  reportId: string,
): Promise<CalibrationReportApiResponse> {
  const { data } = await authClient.get<CalibrationReportApiResponse>(
    EP_CALIBRATION_REPORT_BY_ID(reportId),
  );
  return data;
}

/**
 * React Query hook for fetching a single calibration report.
 * Uses the same base key as the list query so invalidation propagates.
 *
 * @param reportId - The document ID to fetch (skips the request when empty)
 *
 * @example
 * const { data: report, isLoading } = useGetCalibrationReportById(reportId);
 */
export function useGetCalibrationReportById(reportId: string) {
  return useQuery<CalibrationReportApiResponse>({
    queryKey: [CALIBRATION_REPORTS_KEY, reportId],
    queryFn: () => getCalibrationReportById(reportId),
    enabled: !!reportId,
  });
}
