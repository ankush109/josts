import { useQuery } from "@tanstack/react-query";

import { ENDPOINTS } from "../endpoints";
import { API, AUTH_API } from "../client";

export const getDraftReports = async () => {
    const response = await AUTH_API.get(ENDPOINTS.GET_DRAFTS())
    return response.data;
  };
  
  
  export const useGetDraftReports = () =>
    useQuery({
      queryKey: ["get-draft-reports"],
      queryFn: () => getDraftReports(),
      select: (data) => {
        const res = data;
        return res;
      },
    });
  