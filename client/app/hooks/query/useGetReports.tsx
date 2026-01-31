import { useQuery } from "@tanstack/react-query";

import { ENDPOINTS } from "../endpoints";
import { API, AUTH_API } from "../client";

export const getReports = async () => {
    const response = await AUTH_API.get(ENDPOINTS.GET_REPORTS())
    return response.data;
  };
  
  const userId = localStorage.getItem("user");
  
  export const useGetReportsQuery = () =>
    useQuery({
      queryKey: ["get-user-reports"],
      queryFn: () => getReports(),
      select: (data) => {
        const res = data;
        return res;
      },
    });
  