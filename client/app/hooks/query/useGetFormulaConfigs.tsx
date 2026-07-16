import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_FORMULA_CONFIGS } from "@/lib/endpoints";

export interface FormulaRow {
  symbol: string;
  label: string;
  columnName: string;
  formula: string;
  description: string;
  editable: boolean;
}

export interface FormulaConfig {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  formulas: FormulaRow[];
  createdBy?: { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export const FORMULA_CONFIGS_KEY = "formula-configs" as const;

export function useGetFormulaConfigs() {
  return useQuery<FormulaConfig[]>({
    queryKey: [FORMULA_CONFIGS_KEY],
    queryFn: async () => {
      const { data } = await authClient.get(EP_FORMULA_CONFIGS());
      return data.data ?? data;
    },
    staleTime: 30_000,
  });
}
