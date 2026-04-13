/**
 * @fileoverview Fetch all (legacy) reports query hook.
 */
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_REPORTS } from "@/lib/endpoints";

/** Shared React Query cache key for the reports list. */
export const REPORTS_KEY = "get-user-reports" as const;

/**
 * Fetches all reports belonging to the authenticated user.
 *
 * @returns Array of report documents
 */
export async function getReports(): Promise<unknown[]> {
  const { data } = await authClient.get<unknown[]>(EP_REPORTS());
  return data;
}

/**
 * React Query hook for fetching the user's report list.
 *
 * @example
 * const { data: reports, isLoading } = useGetReportsQuery();
 */
export function useGetReportsQuery() {
  return useQuery<unknown[]>({
    queryKey: [REPORTS_KEY],
    queryFn: getReports,
  });
}
