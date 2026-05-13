import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import {
  EP_INSTRUMENT_BY_ID,
  EP_INSTRUMENT_ACTIVE,
} from "@/lib/endpoints";
import {
  INSTRUMENTS_KEY,
  type Instrument,
} from "../query/useGetInstruments";
import { INSTRUMENT_BY_ID_KEY } from "../query/useGetInstrumentById";

interface UpdateArgs {
  id:      string;
  payload: Partial<Instrument>;
}

export function useUpdateInstrument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: UpdateArgs) => {
      const { data } = await authClient.put<{ success: boolean; data: Instrument }>(
        EP_INSTRUMENT_BY_ID(id),
        payload,
      );
      return data.data;
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: [INSTRUMENTS_KEY] });
      qc.invalidateQueries({ queryKey: [INSTRUMENT_BY_ID_KEY, id] });
      qc.invalidateQueries({ queryKey: ["instrument-history", id] });
    },
  });
}

export function useSetInstrumentActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data } = await authClient.patch<{ success: boolean; data: Instrument }>(
        EP_INSTRUMENT_ACTIVE(id),
        { isActive },
      );
      return data.data;
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: [INSTRUMENTS_KEY] });
      qc.invalidateQueries({ queryKey: [INSTRUMENT_BY_ID_KEY, id] });
      qc.invalidateQueries({ queryKey: ["instrument-history", id] });
    },
  });
}
