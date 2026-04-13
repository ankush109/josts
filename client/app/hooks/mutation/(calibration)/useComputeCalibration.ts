/**
 * @fileoverview Compute calibration uncertainty budget mutation hook.
 */
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_COMPUTE_CALIBRATION } from "@/lib/endpoints";
import type { ComputedBudget } from "@/types/calibration";

/**
 * Server-side shape sent to the compute endpoint.
 * Uses `parameters` (not `params`) to match the API contract.
 */
export interface ComputeInstrumentPayload {
  make: string;
  modelType: string;
  parameters: Array<{
    name: string;
    unit: string;
    ranges: Array<{
      label: string;
      measurements: Array<{
        nomValue: number | null;
        readings: (number | null)[];
        corrected: string;
      }>;
    }>;
  }>;
}

/**
 * Server response from the compute endpoint.
 * Each measurement point gains a `computed` budget.
 */
export interface ComputeInstrumentResult {
  parameters: Array<{
    ranges: Array<{
      measurements: Array<{
        computed: ComputedBudget | null;
      }>;
    }>;
  }>;
}

/**
 * Sends an instrument's measurements to the server and receives back the
 * fully-computed uncertainty budget for each measurement point.
 *
 * @param instrument - Server-shaped instrument payload with raw readings
 * @returns Server response with `computed` fields filled in per measurement
 */
export async function computeCalibration(
  instrument: ComputeInstrumentPayload,
): Promise<ComputeInstrumentResult> {
  const { data } = await authClient.post<{ instrument: ComputeInstrumentResult }>(
    EP_COMPUTE_CALIBRATION(),
    { instrument },
  );
  return data.instrument;
}

/**
 * React Query mutation hook for running the server-side uncertainty
 * budget computation.
 *
 * @example
 * const { mutate: compute, isPending } = useComputeCalibration();
 * compute(instrument, { onSuccess: (computed) => mergeBack(computed) });
 */
export function useComputeCalibration() {
  return useMutation({ mutationFn: computeCalibration });
}
