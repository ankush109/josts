/**
 * @fileoverview Fetch all calibration reports query hook.
 */
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_EQUIPMEMTS } from "@/lib/endpoints";
import { Equipment } from "@/app/types/schema";

/** Shared React Query cache key for the reports list. */
export const EQUIPMENETS_KEY = "get-equipments-reports" as const;


/**
 * Fetches the paginated list of calibration reports for the authenticated user.
 *
 * @returns Paginated response with `items`, `total`, `page`, `limit`, `pages`
 */
export interface EquipmentApiResponse {
  success: boolean;
  data: Equipment[];
  totalPages: number;
  currentPage: number;
  totalItems: number;
}

export async function getEquipments(page = 1): Promise<EquipmentApiResponse> {
  const { data } = await authClient.get<EquipmentApiResponse>(EP_EQUIPMEMTS(), {
    params: { page, limit: 100 }
  });
  return data;
}

export function useGetEuipments(page: number) {
  return useQuery<EquipmentApiResponse>({
    queryKey: [EQUIPMENETS_KEY, page],
    queryFn: () => getEquipments(page),
    staleTime: 30_000,
  });
}