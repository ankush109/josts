import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import {
  EP_EQUIPMENTS_BY_ID,
  EP_EQUIPMENT_ACTIVE,
  EP_EQUIPMENT_DELETE,
  EP_EQUIPMEMTS,
} from "@/lib/endpoints";
import { EQUIPMENETS_KEY } from "../query/useGetEquipments";

export function useCreateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await authClient.post(EP_EQUIPMEMTS(), payload);
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EQUIPMENETS_KEY] });
    },
  });
}

export function useUpdateEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: any }) => {
      const { data } = await authClient.put(EP_EQUIPMENTS_BY_ID(id), payload);
      return data.data;
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: [EQUIPMENETS_KEY] });
      qc.invalidateQueries({ queryKey: ["get-equipment-by-id", id] });
      qc.invalidateQueries({ queryKey: ["equipment-history", id] });
    },
  });
}

export function useDeleteEquipment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await authClient.delete(EP_EQUIPMENT_DELETE(id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [EQUIPMENETS_KEY] });
    },
  });
}

export function useSetEquipmentActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data } = await authClient.patch(EP_EQUIPMENT_ACTIVE(id), { isActive });
      return data.data;
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: [EQUIPMENETS_KEY] });
      qc.invalidateQueries({ queryKey: ["get-equipment-by-id", id] });
      qc.invalidateQueries({ queryKey: ["equipment-history", id] });
    },
  });
}
