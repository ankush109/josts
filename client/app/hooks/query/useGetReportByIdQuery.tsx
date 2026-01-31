import { useQuery } from "@tanstack/react-query";
import { ENDPOINTS } from "../endpoints";
import { AUTH_API } from "../client";

export const getReportById = async (reportId: string) => {
  const response = await AUTH_API.get(
    ENDPOINTS.GET_DRAFT_BY_ID(reportId)
  );
  return response.data;
};

export const useGetReportByIDsQuery = (reportId: string) =>
  useQuery({
    queryKey: ["get-report-by-id", reportId], // ✅ UNIQUE PER REPORT
    queryFn: () => getReportById(reportId),
    enabled: !!reportId, // ✅ don't run if id is missing
    staleTime: 0,        // optional: always refetch when mounted
   
    select: (data) => data,
  });
