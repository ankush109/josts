import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_FORMULA_CONFIGS } from "@/lib/endpoints";
import { FORMULA_CONFIGS_KEY } from "../query/useGetFormulaConfigs";

export function useCreateFormulaConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description: string; sourceId?: string }) => {
      const { data } = await authClient.post(EP_FORMULA_CONFIGS(), payload);
      return data.data ?? data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [FORMULA_CONFIGS_KEY] });
    },
  });
}
