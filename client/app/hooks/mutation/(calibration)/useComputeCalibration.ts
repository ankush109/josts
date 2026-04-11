import { useMutation } from "@tanstack/react-query";
import { AUTH_API } from "../../client";
import { ENDPOINTS } from "../../endpoints";

export const useComputeCalibration = () =>
  useMutation({
    mutationFn: async (instrument: any) => {
      const res = await AUTH_API.post(ENDPOINTS.COMPUTE_CALIBRATION_PREVIEW(), { instrument });
      return res.data.instrument as any;
    },
  });
