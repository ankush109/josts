import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_FORMULA_CONFIG_BY_ID } from "@/lib/endpoints";
import { FormulaConfig } from "./useGetFormulaConfigs";

export const FORMULA_CONFIG_KEY = "formula-config" as const;

export function useGetFormulaConfig(id: string | undefined) {
  return useQuery<FormulaConfig>({
    queryKey: [FORMULA_CONFIG_KEY, id],
    queryFn: async () => {
      const { data } = await authClient.get(EP_FORMULA_CONFIG_BY_ID(id!));
      return data.data ?? data;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}
