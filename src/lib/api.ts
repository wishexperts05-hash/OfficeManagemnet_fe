import axios from "axios";
import Cookies from "js-cookie";
import { store } from "../store";
import { logout, setAccessToken } from "../store/authSlice";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
});

function clearOfficeSession() {
  Cookies.remove("officeAccessToken");
  Cookies.remove("officeRefreshToken");
  try {
    store.dispatch(logout());
  } catch {
    // ignore if store not ready
  }
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (!path.startsWith("/login") && !path.startsWith("/mpin")) {
    window.location.assign("/login");
  }
}

function isAuthEndpoint(url?: string) {
  if (!url) return false;
  return (
    url.includes("/auth/refresh") ||
    url.includes("/auth/otp") ||
    url.includes("/auth/logout") ||
    url.includes("/auth/admin/login")
  );
}

api.interceptors.request.use((config) => {
  const token = Cookies.get("officeAccessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined;
    const status = error.response?.status;
    const message = String(error.response?.data?.message || "");

    if (status !== 401 || !original || original._retry || isAuthEndpoint(original.url)) {
      // Stale client session with no usable token
      if (
        status === 401 &&
        (message.toLowerCase().includes("access token") || message.toLowerCase().includes("unauthorized"))
      ) {
        const hasRefresh = Boolean(Cookies.get("officeRefreshToken"));
        if (!hasRefresh && !isAuthEndpoint(original?.url)) {
          clearOfficeSession();
        }
      }
      return Promise.reject(error);
    }

    original._retry = true;
    const refreshToken = Cookies.get("officeRefreshToken");
    if (!refreshToken) {
      clearOfficeSession();
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      const accessToken = data.data.accessToken as string;
      const nextRefresh = data.data.refreshToken as string;
      Cookies.set("officeAccessToken", accessToken, { expires: 1 });
      Cookies.set("officeRefreshToken", nextRefresh, { expires: 30 });
      store.dispatch(setAccessToken(accessToken));
      original.headers = original.headers || {};
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch {
      clearOfficeSession();
      return Promise.reject(error);
    }
  },
);

export type ApiSuccess<T> = {
  success: boolean;
  message: string;
  data: T;
  meta?: { total: number; page: number; limit: number; totalPages: number };
};

export function getErrorMessage(err: unknown, fallback = "Something went wrong") {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { message?: string })?.message || fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/** Call on boot when access cookie is gone but refresh may still work. */
export async function restoreOfficeSession(): Promise<boolean> {
  const access = Cookies.get("officeAccessToken");
  if (access) return true;
  const refreshToken = Cookies.get("officeRefreshToken");
  if (!refreshToken) {
    if (localStorage.getItem("officeUser")) clearOfficeSession();
    return false;
  }
  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
    Cookies.set("officeAccessToken", data.data.accessToken, { expires: 1 });
    Cookies.set("officeRefreshToken", data.data.refreshToken, { expires: 30 });
    store.dispatch(setAccessToken(data.data.accessToken));
    return true;
  } catch {
    clearOfficeSession();
    return false;
  }
}
