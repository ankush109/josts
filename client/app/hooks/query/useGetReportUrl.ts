/**
 * @fileoverview Fetch a signed report PDF URL query hook.
 */
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_REPORT_URL } from "@/lib/endpoints";

/** Shared React Query cache key for report URLs. */
export const REPORT_URL_KEY = "get-report-url" as const;

export interface ReportUrlResponse {
  fileUrls: string[];
}

/**
 * Fetches a signed download URL for the given report PDF.
 *
 * @param id - Report document ID
 * @returns Object containing the array of signed file URLs
 */
export async function getReportUrl(id: string): Promise<ReportUrlResponse> {
  const { data } = await authClient.get<ReportUrlResponse>(EP_REPORT_URL(id));
  return data;
}

/**
 * React Query hook for fetching report PDF URLs.
 * Skips the request when `id` is empty.
 *
 * @param id - Report document ID
 *
 * @example
 * const { data } = useGetReportUrl(reportId);
 * const url = data?.fileUrls[0];
 */
export function useGetReportUrl(id: string) {
  return useQuery<ReportUrlResponse>({
    queryKey: [REPORT_URL_KEY, id],
    queryFn: () => getReportUrl(id),
    enabled: !!id,
  });
}
