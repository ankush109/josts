import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_INSTRUMENT_HISTORY } from "@/lib/endpoints";

export interface InstrumentAuditEntry {
  _id:    string;
  action: "created" | "updated" | "activated" | "deactivated" | "deleted";
  performedBy?: { _id: string; name?: string; email?: string };
  changes: { field: string; from: string; to: string }[];
  createdAt: string;
}

async function fetchHistory(id: string): Promise<InstrumentAuditEntry[]> {
  const { data } = await authClient.get<{ success: boolean; data: InstrumentAuditEntry[] }>(
    EP_INSTRUMENT_HISTORY(id),
  );
  return data.data;
}

export function useGetInstrumentHistory(id: string) {
  return useQuery<InstrumentAuditEntry[]>({
    queryKey: ["instrument-history", id],
    queryFn:  () => fetchHistory(id),
    enabled:  Boolean(id),
    staleTime: 60_000,
  });
}
