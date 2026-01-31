import { useQuery } from "@tanstack/react-query";

import { ENDPOINTS } from "../endpoints";
import { API, AUTH_API } from "../client";

export const getReportUrl = async (id:any) => {
    const response = await AUTH_API.get(ENDPOINTS.GET_REPORTS(id))
    return response.data;
  };
  
  
  export const useGetReportUrl = (id:any) =>
    useQuery({
      queryKey: ["get-report-url", id],
      queryFn: () => getReportUrl,
      select: (data) => {
        const res = data;
        return res;
      },
    });
  