import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_SUPPORT_SUBMIT, EP_SUPPORT_SEEN, EP_SUPPORT_REPLY } from "@/lib/endpoints";
import { SUPPORT_MY_KEY, SUPPORT_ALL_KEY } from "../query/useGetSupportMessages";

export function useSubmitSupport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { subject: string; message: string }) =>
      authClient.post(EP_SUPPORT_SUBMIT(), data),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPORT_MY_KEY }),
  });
}

export function useMarkSupportSeen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => authClient.patch(EP_SUPPORT_SEEN(id), {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: SUPPORT_ALL_KEY }),
  });
}

export function useReplySupport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reply }: { id: string; reply: string }) =>
      authClient.post(EP_SUPPORT_REPLY(id), { reply }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SUPPORT_ALL_KEY });
      qc.invalidateQueries({ queryKey: SUPPORT_MY_KEY });
    },
  });
}
