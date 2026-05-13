/**
 * @fileoverview Fetch DUC instrument master records (Fluke, SVERKER, …)
 * with their factory presets (ranges, units, sample readings).
 */
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_INSTRUMENTS } from "@/lib/endpoints";

export interface InstrumentSample {
  nominal:  string;
  readings: string[];
}

/**
 * Calibration constants per range used by the uncertainty-budget math.
 * See server/src/constants/instrument-specs.js for the formulae.
 */
export interface InstrumentRangeSpec {
  label:      string; // e.g. "400mV/0.1"
  stdUncPct:  number;
  accPct:     number;
  accOffset:  number;
  leastCount: number;
  scopePct:   number;
}

export interface InstrumentParamPreset {
  parameterName: string;
  unit:          string;
  ranges:        InstrumentRangeSpec[];
  samples:       InstrumentSample[][];
}

export interface Instrument {
  _id:        string;
  key:        string;
  make:       string;
  modelType:  string;
  parameters: InstrumentParamPreset[];
  isActive:   boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface InstrumentApiResponse {
  success:     boolean;
  data:        Instrument[];
  totalPages:  number;
  currentPage: number;
  totalItems:  number;
}

export const INSTRUMENTS_KEY = "get-instruments" as const;

export async function fetchInstruments(page = 1): Promise<InstrumentApiResponse> {
  const { data } = await authClient.get<InstrumentApiResponse>(EP_INSTRUMENTS(), {
    params: { page, limit: 100 },
  });
  return data;
}

export function useGetInstruments(page = 1) {
  return useQuery<InstrumentApiResponse>({
    queryKey: [INSTRUMENTS_KEY, page],
    queryFn:  () => fetchInstruments(page),
    staleTime: 5 * 60_000,
  });
}
