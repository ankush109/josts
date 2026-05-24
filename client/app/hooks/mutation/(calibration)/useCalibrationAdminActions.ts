"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import {
  EP_REOPEN_CALIBRATION_REPORT,
  EP_REASSIGN_SIGNATORIES,
  EP_BULK_VERIFY_CALIBRATION,
  EP_BULK_REJECT_CALIBRATION,
  EP_BULK_DELETE_CALIBRATION,
} from "@/lib/endpoints";
import { CALIBRATION_REPORTS_KEY } from "@/app/hooks/query/useCalibrationReport";

export function useReopenCalibrationReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, reason }: { reportId: string; reason: string }) => {
      const { data } = await authClient.post(EP_REOPEN_CALIBRATION_REPORT(reportId), { reason });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CALIBRATION_REPORTS_KEY] });
    },
  });
}

export interface ReassignSignatoriesPayload {
  reportId: string;
  calibratedBy?: string | null;
  verifiedBy?: string | null;
}

export function useReassignSignatories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, ...rest }: ReassignSignatoriesPayload) => {
      const { data } = await authClient.patch(EP_REASSIGN_SIGNATORIES(reportId), rest);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CALIBRATION_REPORTS_KEY] });
    },
  });
}

export interface BulkResult { ok: string[]; skipped: string[] }

export function useBulkVerify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await authClient.post<BulkResult>(EP_BULK_VERIFY_CALIBRATION(), { ids });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CALIBRATION_REPORTS_KEY] }); },
  });
}

export function useBulkReject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await authClient.post<BulkResult>(EP_BULK_REJECT_CALIBRATION(), { ids });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CALIBRATION_REPORTS_KEY] }); },
  });
}

export function useBulkDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { data } = await authClient.post<BulkResult>(EP_BULK_DELETE_CALIBRATION(), { ids });
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [CALIBRATION_REPORTS_KEY] }); },
  });
}
