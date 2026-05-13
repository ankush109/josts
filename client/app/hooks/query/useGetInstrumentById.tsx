import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_INSTRUMENT_BY_ID } from "@/lib/endpoints";
import type { Instrument } from "./useGetInstruments";

export const INSTRUMENT_BY_ID_KEY = "get-instrument-by-id" as const;

async function fetchInstrument(id: string): Promise<Instrument> {
  const { data } = await authClient.get<{ success: boolean; data: Instrument }>(
    EP_INSTRUMENT_BY_ID(id)
  );
  return data.data;
}

export function useGetInstrumentById(id: string) {
  return useQuery<Instrument>({
    queryKey: [INSTRUMENT_BY_ID_KEY, id],
    queryFn:  () => fetchInstrument(id),
    enabled:  Boolean(id),
    staleTime: 5 * 60_000,
  });
}
