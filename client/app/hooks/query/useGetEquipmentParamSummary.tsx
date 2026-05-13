import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_EQUIPMENTS_PARAMS_SUMMARY } from "@/lib/endpoints";

export interface EquipmentParamSummary {
  _id: string;
  equipmentName: string;
  make?: string;
  model?: string;
  serialNo?: string;
  nextDue?: string;
  parameters: { parameterName: string }[];
}

async function fetchEquipmentParamSummary(): Promise<EquipmentParamSummary[]> {
  const { data } = await authClient.get<{ success: boolean; data: EquipmentParamSummary[] }>(
    EP_EQUIPMENTS_PARAMS_SUMMARY()
  );
  return data.data;
}

export function useGetEquipmentParamSummary() {
  return useQuery({
    queryKey: ["equipment-param-summary"],
    queryFn: fetchEquipmentParamSummary,
    staleTime: 60_000,
  });
}
