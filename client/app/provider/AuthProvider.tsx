"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  [key: string]: any;
}

interface AuthContextValue {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  setUser: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);

  // Initialise from localStorage once on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUserState(JSON.parse(stored));
    } catch {
      localStorage.removeItem("user");
    }
  }, []);

  function setUser(u: AuthUser | null) {
    setUserState(u);
    if (u) {
      localStorage.setItem("user", JSON.stringify(u));
    } else {
      localStorage.removeItem("user");
    }
  }

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

export function useAuth() {
  return useContext(AuthContext);
}
