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
    });
  