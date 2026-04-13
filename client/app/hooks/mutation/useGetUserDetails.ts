/**
 * @fileoverview Fetch current user profile query hook.
 *
 * @note Despite living in the `mutation/` folder for historical reasons,
 *       this is a read-only query. New code should colocate queries in
 *       the `query/` folder.
 */
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/api-client";
import { EP_USER_PROFILE } from "@/lib/endpoints";
import type { AuthUser } from "@/types/auth";

/** Query key used to identify this data in the React Query cache. */
export const USER_DETAILS_KEY = "user-details" as const;

/**
 * Fetches the profile of the currently authenticated user.
 *
 * @returns The authenticated user's profile data
 */
export async function getUserDetails(): Promise<AuthUser> {
  const { data } = await authClient.get<AuthUser>(EP_USER_PROFILE());
  return data;
}

/**
 * React Query hook for fetching the authenticated user's profile.
 * Only runs when a token is present in localStorage.
 *
 * @example
 * const { data: user, isLoading } = useGetUserDetailsQuery();
 */
export function useGetUserDetailsQuery() {
  const hasToken =
    typeof window !== "undefined" && !!localStorage.getItem("token");

  return useQuery<AuthUser>({
    queryKey: [USER_DETAILS_KEY],
    queryFn: getUserDetails,
    enabled: hasToken,
  });
}
