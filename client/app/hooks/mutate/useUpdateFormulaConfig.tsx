import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_FORMULA_CONFIG_BY_ID } from "@/lib/endpoints";
import { FormulaConfig, FORMULA_CONFIGS_KEY } from "../query/useGetFormulaConfigs";
import { FORMULA_CONFIG_KEY } from "../query/useGetFormulaConfig";

export function useUpdateFormulaConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<FormulaConfig> }) => {
      const { data } = await authClient.put(EP_FORMULA_CONFIG_BY_ID(id), payload);
      return data.data ?? data;
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: [FORMULA_CONFIGS_KEY] });
      qc.invalidateQueries({ queryKey: [FORMULA_CONFIG_KEY, id] });
    },
  });
}
