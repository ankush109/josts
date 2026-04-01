import { useMutation } from "@tanstack/react-query";
import { API, AUTH_API } from "../client";
import { ENDPOINTS } from "../endpoints";


export const generateCalibrationReport = async (reportData: any) => {
  console.log(reportData,"")
  const response = await AUTH_API.post(ENDPOINTS.CREATE_CALIBRATION_REPORT(), reportData);
  return response.data;
};

export const useGenerateCalibrationReport = () => {
  return useMutation({
    mutationFn: generateCalibrationReport,
    onError: (error) => {
      console.error("Error adding task:", error);
    },
  });
};