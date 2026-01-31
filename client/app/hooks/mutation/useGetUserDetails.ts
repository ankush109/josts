import { useQuery } from "@tanstack/react-query";

import { ENDPOINTS } from "../endpoints";
import { API, AUTH_API } from "../client";

export const getUserDetails = async () => {
    const response = await AUTH_API.get(ENDPOINTS.GET_LOGGED_USER())
    return response.data;
  };
  
const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  
  export const useGetUserDetailsQuery = () =>
    useQuery({
      queryKey: ["get-user-details"],
      enabled: !!token,
      queryFn: () => getUserDetails(),
      select: (data) => {
        const res = data;
        return res;
      },
    });
  