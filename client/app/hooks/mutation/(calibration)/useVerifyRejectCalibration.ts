import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AUTH_API } from "../../client";
import { ENDPOINTS } from "../../endpoints";

export const useVerifyRejectCalibration = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: "verified" | "rejected" }) => {
      const response = await AUTH_API.patch(
        ENDPOINTS.VERIFY_REJECT_CALIBRATION_REPORT(reportId),
        { status }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["get-calibration-reports"] });
    },
  });
};
