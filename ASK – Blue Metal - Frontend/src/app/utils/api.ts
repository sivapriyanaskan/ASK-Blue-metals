import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

/**
 * API client for the ASK Blue Metal backend.
 *
 * Security model:
 * - Access tokens live ONLY in memory (this module). They never touch
 *   localStorage, sessionStorage, or non-HttpOnly cookies.
 * - Refresh tokens live in a signed HttpOnly cookie set by the backend
 *   on `/api/v1/auth/login` and `/api/v1/auth/refresh`. The browser
 *   sends them automatically because we use `withCredentials: true`.
 * - On a 401 the client transparently calls `/auth/refresh` once and
 *   replays the original request. Concurrent 401s share a single
 *   refresh promise so we never double-rotate the refresh-token family.
 */

const baseURL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000/api/v1';

let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function onAuthExpired(handler: () => void): void {
  onSessionExpired = handler;
}

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

// --- Single-flight refresh ---------------------------------------------------

let refreshInFlight: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  try {
    const res = await axios.post(
      `${baseURL}/auth/refresh`,
      {},
      { withCredentials: true, headers: { 'Content-Type': 'application/json' } },
    );
    const token = res.data?.accessToken as string | undefined;
    if (!token) return null;
    accessToken = token;
    return token;
  } catch {
    return null;
  }
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    const status = error.response?.status;
    const url = original?.url ?? '';

    // Skip refresh for the auth endpoints themselves to avoid loops.
    const isAuthEndpoint =
      url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/logout');

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      original._retry = true;

      refreshInFlight = refreshInFlight ?? performRefresh();
      const newToken = await refreshInFlight;
      refreshInFlight = null;

      if (newToken) {
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return api.request(original);
      }

      // Refresh failed: clear token and notify subscriber (AppContext) so
      // the UI can transition to the login screen.
      accessToken = null;
      onSessionExpired?.();
    }

    return Promise.reject(error);
  },
);

// --- Typed auth helpers ------------------------------------------------------

export interface BackendUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED';
  roles: string[];
  permissions: string[];
  lastLoginAt?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken?: string;
  user: BackendUser;
}

export async function loginRequest(username: string, password: string): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/auth/login', { username, password });
  return res.data;
}

export async function refreshRequest(): Promise<LoginResponse | null> {
  try {
    const res = await api.post<LoginResponse>('/auth/refresh', {});
    return res.data;
  } catch {
    return null;
  }
}

export async function logoutRequest(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // Logout is best-effort; the access token is dropped client-side regardless.
  }
}

export async function meRequest(): Promise<BackendUser | null> {
  try {
    const res = await api.get<BackendUser>('/auth/me');
    return res.data;
  } catch {
    return null;
  }
}
