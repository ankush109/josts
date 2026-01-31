import { useMutation } from "@tanstack/react-query";
import { API, AUTH_API } from "../client";
import { ENDPOINTS } from "../endpoints";


export const generateReport = async (userData: any) => {
  const response = await AUTH_API.post(ENDPOINTS.GET_REPORTS(), userData);
  return response.data;
};

export const useGenerateReportMutation = () => {
  return useMutation({
    mutationFn: generateReport,
    onError: (error) => {
      console.error("Error adding task:", error);
    },
  });
};