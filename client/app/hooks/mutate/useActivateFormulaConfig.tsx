import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_FORMULA_CONFIG_ACTIVATE } from "@/lib/endpoints";
import { FORMULA_CONFIGS_KEY } from "../query/useGetFormulaConfigs";
import { FORMULA_CONFIG_KEY } from "../query/useGetFormulaConfig";

export function useActivateFormulaConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await authClient.patch(EP_FORMULA_CONFIG_ACTIVATE(id));
      return data.data ?? data;
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: [FORMULA_CONFIGS_KEY] });
      qc.invalidateQueries({ queryKey: [FORMULA_CONFIG_KEY, id] });
    },
  });
}
