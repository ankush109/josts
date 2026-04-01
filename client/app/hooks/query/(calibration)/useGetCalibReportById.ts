import { useQuery } from "@tanstack/react-query";

import { ENDPOINTS } from "../../endpoints";
import { API, AUTH_API } from "../../client";

export const getCalibrationReportById = async (reportId:string) => {
    const response = await AUTH_API.get(ENDPOINTS.GET_CALIBRATION_REPORTS_BY_ID(reportId))
    return response.data;
  };
  
  
  export const useGetCalibrationReportById = (reportId:string) =>
    useQuery({
      queryKey: ["get-calibration-reports",reportId],
      queryFn: () => getCalibrationReportById(reportId),
      select: (data) => {
        const res = data;
        return res;
      },
    });
  