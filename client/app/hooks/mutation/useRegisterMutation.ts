/**
 * @fileoverview Register mutation hook.
 */
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { EP_REGISTER } from "@/lib/endpoints";
import type { RegisterPayload, LoginResponse } from "@/types/auth";

/**
 * Submits new-user registration data to the API.
 *
 * @param payload - User registration fields
 * @returns Server response (token + user on success)
 */
export async function register(payload: RegisterPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(EP_REGISTER(), payload);
  return data;
}

/**
 * React Query mutation hook for user registration.
 *
 * @example
 * const { mutate: register, isPending } = useRegisterMutation();
 * register(formValues, { onSuccess: () => router.push("/login") });
 */
export function useRegisterMutation() {
  return useMutation({ mutationFn: register });
}
