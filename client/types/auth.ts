/**
 * @fileoverview Authentication & user domain types.
 *
 * Single source of truth for user-related shapes used across
 * AuthProvider, hooks, and page components.
 */

// ── User ──────────────────────────────────────────────────────────────────

/** Roles available in the system. */
export type UserRole = "user" | "admin";

/** Authenticated user object stored in AuthContext and localStorage. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  signatureName?: string | null;
  location?: string | null;
  [key: string]: unknown;
}

// ── Auth context ───────────────────────────────────────────────────────────

/** Value exposed by AuthContext. */
export interface AuthContextValue {
  user: AuthUser | null;
  /** Persist the user in context and localStorage. */
  setUser: (user: AuthUser | null) => void;
  /** Clear user and token from context and localStorage. */
  logout: () => void;
}

// ── API payloads ───────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  name: string;
  password: string;
  age: number;
  dob: string;
  gender: string;
  about?: string;
}

/** Server response after a successful login. */
export interface LoginResponse {
  token: string;
  user: AuthUser;
}
