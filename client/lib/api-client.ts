/**
 * @fileoverview Axios HTTP client instances for the Josts API.
 *
 * Two clients are exported:
 * - `apiClient`   – unauthenticated (login, register)
 * - `authClient`  – automatically injects the Bearer token from localStorage
 *
 * The auth client also handles 401 responses by clearing credentials and
 * redirecting the user back to the login page.
 */

import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from "axios";

const BASE_URL = "/api-proxy";

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true"
  },
});

export const authClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true"
  },
});
// ── Request interceptor ────────────────────────────────────────────────────

/**
 * Reads the JWT from localStorage and attaches it as an `Authorization`
 * header before every request made through `authClient`.
 */
authClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor ───────────────────────────────────────────────────

/**
 * Handles expired / invalid tokens (HTTP 401) by clearing local storage
 * and redirecting to the login page.
 */
authClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);
