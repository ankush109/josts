/**
 * @fileoverview Login mutation hook.
 */
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { EP_LOGIN } from "@/lib/endpoints";
import type { LoginPayload, LoginResponse } from "@/types/auth";

/**
 * Sends login credentials to the API and returns the token + user object.
 *
 * @param payload - Email and password
 * @returns Server response containing the JWT and authenticated user
 */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const { data } = await apiClient.post<LoginResponse>(EP_LOGIN(), payload);
  return data;
}

/**
 * React Query mutation hook for user login.
 *
 * @example
 * const { mutate: login, isPending } = useLoginMutation();
 * login({ email, password }, { onSuccess: (data) => saveToken(data.token) });
 */
export function useLoginMutation() {
  return useMutation({ mutationFn: login });
}
