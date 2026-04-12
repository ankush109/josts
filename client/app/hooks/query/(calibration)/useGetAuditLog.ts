import { useQuery } from "@tanstack/react-query";
import { AUTH_API } from "../../client";
import { ENDPOINTS } from "../../endpoints";

export interface AuditChange {
  field: string;
  from: string;
  to: string;
}

export interface AuditEntry {
  _id: string;
  reportId: string;
  action: "created" | "updated" | "status_changed" | "deleted";
  performedBy: { _id: string; name: string; email: string; signatureName?: string };
  changes: AuditChange[];
  createdAt: string;
}

export const useGetAuditLog = (reportId: string | null) =>
  useQuery<AuditEntry[]>({
    queryKey: ["audit-log", reportId],
    queryFn: async () => {
      const res = await AUTH_API.get(ENDPOINTS.GET_CALIBRATION_AUDIT_LOG(reportId!));
      return res.data;
    },
    enabled: !!reportId,
  });
