import { useMutation } from "@tanstack/react-query";
import { API, AUTH_API } from "../client";
import { ENDPOINTS } from "../endpoints";

export const changeReportStatus = async ({
    reportId,
    status,
  }: {
    reportId: string;
    status: string;
  }) => {
    const response = await AUTH_API.put(
      ENDPOINTS.CHANGE_REPORT_STATUS(reportId, status)
    );
    return response.data;
  };
  
  export const useChangeReportStatusMutation = () => {
    return useMutation({
      mutationFn: changeReportStatus,
      onError: (error) => {
        console.error("Error changing report status:", error);
      },
    });
  };
  