import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_PARAMETERS, EP_PARAMETER_BY_ID, EP_PARAMETER_ACTIVE } from "@/lib/endpoints";
import { PARAMETERS_KEY, type Parameter } from "../query/useGetParameters";

interface CreateArgs {
  parameterName: string;
  unit:          string;
  ranges?:       Parameter["ranges"];
}

interface UpdateArgs {
  id:      string;
  payload: Partial<Omit<Parameter, "_id">>;
}

export function useCreateParameter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: CreateArgs) => {
      const { data } = await authClient.post<{ success: boolean; data: Parameter }>(
        EP_PARAMETERS(),
        args,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PARAMETERS_KEY] });
    },
  });
}

export function useUpdateParameter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: UpdateArgs) => {
      const { data } = await authClient.put<{ success: boolean; data: Parameter }>(
        EP_PARAMETER_BY_ID(id),
        payload,
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PARAMETERS_KEY] });
    },
  });
}

export function useSetParameterActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { data } = await authClient.patch<{ success: boolean; data: Parameter }>(
        EP_PARAMETER_ACTIVE(id),
        { isActive },
      );
      return data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PARAMETERS_KEY] });
    },
  });
}
