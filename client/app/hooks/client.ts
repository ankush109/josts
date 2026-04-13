/**
 * @fileoverview Re-exports the canonical API client instances.
 *
 * Prefer importing directly from `@/lib/api-client` in new code.
 * This file exists for backwards compatibility with existing hook imports.
 */
export { apiClient as API, authClient as AUTH_API } from "@/lib/api-client";
