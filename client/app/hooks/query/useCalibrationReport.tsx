import { useQuery } from "@tanstack/react-query";

import { ENDPOINTS } from "../endpoints";
import { API, AUTH_API } from "../client";

export const getCalibrationReports = async () => {
    const response = await AUTH_API.get(ENDPOINTS.GET_CALIBRATION_REPORTS())
    return response.data;
  };
  
  
  export const useGetCalibrationReports = () =>
    useQuery({
      queryKey: ["get-calibration-reports"],
      queryFn: () => getCalibrationReports(),
      select: (data) => {
        const res = data;
        return res;
      },
       staleTime: 0,          // always treat data as stale
    gcTime: 0,             // don't cache (React Query v5) — use `cacheTime: 0` if on v4
    refetchOnMount: true,
    });
  