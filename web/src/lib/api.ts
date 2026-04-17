import axios, { type AxiosInstance } from "axios";

const API_BASE = "/api";

/** Mutable ref for session id (memory only; WebSocket URLs may need it). */
let sessionIdRef: string | null = null;

export function setSessionIdForApi(id: string | null) {
  sessionIdRef = id;
}

export function getSessionIdFromApi(): string | null {
  return sessionIdRef;
}

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (sessionIdRef) {
    config.headers.set("X-Session-ID", sessionIdRef);
  }
  return config;
});

export function getAuthHeaders(): Record<string, string> {
  return sessionIdRef ? { "X-Session-ID": sessionIdRef } : {};
}
