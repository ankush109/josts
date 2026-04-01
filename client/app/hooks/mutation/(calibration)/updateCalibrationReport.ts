import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AUTH_API } from "../../client";
import { ENDPOINTS } from "../../endpoints";

export const updateCalibrationReport = async (data: any) => {
  const { reportId, ...payload } = data;
  const response = await AUTH_API.put(ENDPOINTS.UPDATE_CALIBRATION_REPORT(reportId), payload);
  return response.data;
};

export const useUpdateCalibrationReport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateCalibrationReport,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["get-calibration-reports", variables.reportId] });
    },
  });
};
