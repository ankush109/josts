/**
 * @fileoverview Fetch all calibration reports query hook.
 */
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_CALIBRATION_REPORTS } from "@/lib/endpoints";
import type { CalibrationReportApiResponse } from "@/types/calibration";

/** Shared React Query cache key for the reports list. */
export const CALIBRATION_REPORTS_KEY = "get-calibration-reports" as const;

/** Paginated response shape returned by GET /calibration-report */
export interface CalibrationReportPage {
  items: CalibrationReportApiResponse[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/**
 * Fetches the paginated list of calibration reports for the authenticated user.
 *
 * @returns Paginated response with `items`, `total`, `page`, `limit`, `pages`
 */
export async function getCalibrationReports(): Promise<CalibrationReportPage> {
  const { data } = await authClient.get<CalibrationReportPage>(
    EP_CALIBRATION_REPORTS(),
  );
  return data;
}

/**
 * React Query hook for fetching all calibration reports.
 *
 * @example
 * const { data } = useGetCalibrationReports();
 * const reports = data?.items ?? [];
 */
export function useGetCalibrationReports() {
  return useQuery<CalibrationReportPage>({
    queryKey: [CALIBRATION_REPORTS_KEY],
    queryFn: getCalibrationReports,
    staleTime: 30_000, // treat data as fresh for 30 s
  });
}
