/**
 * @fileoverview Delete report mutation hook.
 */
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_DELETE_DRAFT } from "@/lib/endpoints";

/**
 * Deletes a report by ID.
 *
 * @param reportId - The report document ID to delete
 */
export async function deleteReport(reportId: string): Promise<unknown> {
  const { data } = await authClient.delete(EP_DELETE_DRAFT(reportId));
  return data;
}

/**
 * React Query mutation hook for deleting a report.
 *
 * @example
 * const { mutate: deleteReport } = useDeleteReportMutation();
 * deleteReport(reportId, { onSuccess: () => queryClient.invalidateQueries(...) });
 */
export function useDeleteReportMutation() {
  return useMutation({ mutationFn: deleteReport });
}
