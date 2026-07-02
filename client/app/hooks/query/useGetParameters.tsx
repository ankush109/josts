import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_PARAMETERS } from "@/lib/endpoints";

export interface ParameterRangeSpec {
  label:      string;
  leastCount: number;
  frequency?: string;
}

export interface ParameterSampleMeasurement {
  nominal:  string;
  readings: string[];
}

export interface Parameter {
  _id:           string;
  parameterName: string;
  unit:          string;
  isActive:      boolean;
  ranges:        ParameterRangeSpec[];
  /** samples[rangeIndex] = sample points for that range */
  samples:       ParameterSampleMeasurement[][];
  createdAt?:    string;
  updatedAt?:    string;
}

export interface ParameterApiResponse {
  success:     boolean;
  data:        Parameter[];
  totalPages:  number;
  currentPage: number;
  totalItems:  number;
}

export const PARAMETERS_KEY = "get-parameters" as const;

export async function fetchParameters(): Promise<ParameterApiResponse> {
  const { data } = await authClient.get<ParameterApiResponse>(EP_PARAMETERS(), {
    params: { limit: 200 },
  });
  return data;
}

export function useGetParameters() {
  return useQuery<ParameterApiResponse>({
    queryKey: [PARAMETERS_KEY],
    queryFn:  fetchParameters,
    staleTime: 5 * 60_000,
  });
}
