/**
 * @fileoverview Fetch draft reports query hook.
 */
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_DRAFTS } from "@/lib/endpoints";

/** Shared React Query cache key for draft reports. */
export const DRAFTS_KEY = "get-draft-reports" as const;

/**
 * Fetches all draft reports for the authenticated user.
 *
 * @returns Array of draft report documents
 */
export async function getDraftReports(): Promise<unknown[]> {
  const { data } = await authClient.get<unknown[]>(EP_DRAFTS());
  return data;
}

/**
 * React Query hook for fetching draft reports.
 *
 * @example
 * const { data: drafts, isLoading } = useGetDraftReports();
 */
export function useGetDraftReports() {
  return useQuery<unknown[]>({
    queryKey: [DRAFTS_KEY],
    queryFn: getDraftReports,
  });
}
