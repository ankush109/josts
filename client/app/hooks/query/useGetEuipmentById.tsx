import { useQuery } from "@tanstack/react-query";
import { EP_EQUIPMENTS_BY_ID } from "../endpoints";
import { AUTH_API } from "../client";

export const getEquipmentById = async (equipmentId: string) => {
  const response = await AUTH_API.get(
    EP_EQUIPMENTS_BY_ID(equipmentId)
  );
  return response.data;
};

export const useGetEuipmentsById = (equipmentId: string) =>
  useQuery({
    queryKey: ["get-equipment-by-id", equipmentId], // ✅ UNIQUE PER REPORT
    queryFn: () => getEquipmentById(equipmentId),
    enabled: !!equipmentId, // ✅ don't run if id is missing
    staleTime: 0,        // optional: always refetch when mounted
   
    select: (data) => data,
  });
