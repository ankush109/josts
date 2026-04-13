"use client";

/**
 * @fileoverview Authentication context provider.
 *
 * Wraps the application with an AuthContext that tracks the signed-in user.
 * The user object is persisted in localStorage so it survives page refreshes.
 *
 * Usage:
 *   - Wrap your root layout with <AuthProvider>
 *   - Consume with the useAuth() hook
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthUser, AuthContextValue } from "@/types/auth";

const AuthContext = createContext<AuthContextValue>({
  user: null,
  setUser: () => {},
  logout: () => {},
});

/**
 * Provides the authentication context to the component tree.
 * Reads the initial user from localStorage on mount.
 *
 * @param children - The component subtree that needs auth access
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);

  /** Hydrate from localStorage once on mount (client-side only). */
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUserState(JSON.parse(stored) as AuthUser);
    } catch {
      localStorage.removeItem("user");
    }
  }, []);

  /**
   * Updates the user in both React state and localStorage.
   * Pass `null` to clear the stored user.
   *
   * @param u - The user to persist, or null to remove
   */
  function setUser(u: AuthUser | null) {
    setUserState(u);
    if (u) {
      localStorage.setItem("user", JSON.stringify(u));
    } else {
      localStorage.removeItem("user");
    }
  }

  /**
   * Signs the user out by clearing all auth state from
   * both React context and localStorage.
   */
  function logout() {
    setUserState(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook for accessing the authentication context.
 *
 * @returns The current user, a setter, and a logout function
 *
 * @example
 * const { user, logout } = useAuth();
 */
export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
