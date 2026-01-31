import { useMutation } from "@tanstack/react-query";
import { API, AUTH_API } from "../client";
import { ENDPOINTS } from "../endpoints";


export const deleteReportMutation = async (reportId: string) => {
  const response = await AUTH_API.delete(ENDPOINTS.DELETE_DRAFT(reportId));
  return response.data;
};

export const useDeleteReportMutation = () => {
  return useMutation({
    mutationFn: deleteReportMutation,
    onError: (error) => {
      console.error("Error deleting report:", error);
    },
  });
};
