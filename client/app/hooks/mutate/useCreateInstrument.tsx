import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_INSTRUMENTS } from "@/lib/endpoints";
import { INSTRUMENTS_KEY, type Instrument } from "../query/useGetInstruments";

interface CreateInstrumentPayload {
  key:       string;
  make:      string;
  modelType: string;
}

export function useCreateInstrument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateInstrumentPayload) => {
      const { data } = await authClient.post<{ success: boolean; data: Instrument }>(
        EP_INSTRUMENTS(),
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [INSTRUMENTS_KEY] });
    },
  });
}
