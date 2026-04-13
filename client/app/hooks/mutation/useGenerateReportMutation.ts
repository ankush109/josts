/**
 * @fileoverview Generate (create) a legacy report mutation hook.
 */
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_REPORTS } from "@/lib/endpoints";

/** Minimal shape expected when creating a report. */
export interface CreateReportPayload {
  [key: string]: unknown;
}

/**
 * Creates a new report on the server.
 *
 * @param payload - Report data to persist
 */
export async function generateReport(payload: CreateReportPayload): Promise<unknown> {
  const { data } = await authClient.post(EP_REPORTS(), payload);
  return data;
}

/**
 * React Query mutation hook for creating a new report.
 *
 * @example
 * const { mutate: createReport } = useGenerateReportMutation();
 * createReport(payload, { onSuccess: () => router.push("/home") });
 */
export function useGenerateReportMutation() {
  return useMutation({ mutationFn: generateReport });
}
