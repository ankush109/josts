import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_EQUIPMENT_HISTORY } from "@/lib/endpoints";

export interface EquipmentAuditEntry {
  _id:    string;
  action: "created" | "updated" | "activated" | "deactivated" | "deleted";
  performedBy?: { _id: string; name?: string; email?: string };
  changes: { field: string; from: string; to: string }[];
  createdAt: string;
}

async function fetchHistory(id: string): Promise<EquipmentAuditEntry[]> {
  const { data } = await authClient.get<{ success: boolean; data: EquipmentAuditEntry[] }>(
    EP_EQUIPMENT_HISTORY(id),
  );
  return data.data;
}

export function useGetEquipmentHistory(id: string) {
  return useQuery<EquipmentAuditEntry[]>({
    queryKey: ["equipment-history", id],
    queryFn:  () => fetchHistory(id),
    enabled:  Boolean(id),
    staleTime: 60_000,
  });
}
