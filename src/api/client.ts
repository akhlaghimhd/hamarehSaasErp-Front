/**
 * FE-P0-T01 — Central API Client
 *
 * Responsibilities (locked by Frontend Architecture):
 * - Single Axios instance for all Backend calls
 * - Inject Authorization: Bearer <access_token>
 * - Inject X-Tenant-ID (required by TenantContextMiddleware)
 * - Normalize Backend error shapes into ApiClientError
 * - Clear auth storage on 401 (session invalid)
 * - No business logic; pure transport + contract
 *
 * Backend contracts observed:
 * - Header: X-Tenant-ID
 * - Auth: Laravel Sanctum personal access token (no refresh endpoint yet)
 * - Success envelope: { status: "success", message?, data }
 * - Error envelope: { status: "error" | success: false, message, errors? }
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { ApiClientError, type ApiErrorResponse } from "./types";
import { tokenStorage } from "./token-storage";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

/** Header name locked by Backend TenantContextMiddleware. */
export const TENANT_HEADER = "X-Tenant-ID";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30_000,
});

// ---------------------------------------------------------------------------
// Request: inject token + tenant
// ---------------------------------------------------------------------------
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Allow per-request override via config.headers[TENANT_HEADER]
    const existingTenant = config.headers[TENANT_HEADER];
    if (!existingTenant) {
      const tenantId = tokenStorage.getTenantId();
      if (tenantId) {
        config.headers[TENANT_HEADER] = tenantId;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response: normalize errors + handle 401
// ---------------------------------------------------------------------------
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    // Network / timeout / no response
    if (!error.response) {
      const isTimeout = error.code === "ECONNABORTED";
      return Promise.reject(
        new ApiClientError({
          statusCode: 0,
          message: isTimeout
            ? "زمان پاسخ سرور به پایان رسید. لطفاً دوباره تلاش کنید."
            : "ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.",
          isNetworkError: true,
        })
      );
    }

    const { status, data } = error.response;

    if (status === 401) {
      // Session invalid — clear local auth; Auth Guard (T05) will redirect.
      tokenStorage.clearAuth();
    }

    const message =
      (data && typeof data.message === "string" && data.message) ||
      defaultMessageForStatus(status);

    const errors =
      data && data.errors && typeof data.errors === "object"
        ? data.errors
        : undefined;

    return Promise.reject(
      new ApiClientError({
        statusCode: status,
        message,
        errors,
      })
    );
  }
);

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return "درخواست نامعتبر است.";
    case 401:
      return "نشست شما منقضی شده یا احراز هویت نشده‌اید.";
    case 403:
      return "شما مجوز انجام این عملیات را ندارید.";
    case 404:
      return "منبع مورد نظر یافت نشد.";
    case 422:
      return "خطای اعتبارسنجی.";
    case 429:
      return "تعداد درخواست‌ها زیاد است. کمی بعد تلاش کنید.";
    case 500:
    case 502:
    case 503:
      return "خطای داخلی سرور. لطفاً بعداً تلاش کنید.";
    default:
      return "خطای غیرمنتظره رخ داد.";
  }
}

// ---------------------------------------------------------------------------
// Typed helpers (optional convenience for services)
// ---------------------------------------------------------------------------

export async function apiGet<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await apiClient.get<T>(url, config);
  return res.data;
}

export async function apiPost<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await apiClient.post<T>(url, body, config);
  return res.data;
}

export async function apiPut<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await apiClient.put<T>(url, body, config);
  return res.data;
}

export async function apiPatch<T>(
  url: string,
  body?: unknown,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await apiClient.patch<T>(url, body, config);
  return res.data;
}

export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await apiClient.delete<T>(url, config);
  return res.data;
}

export default apiClient;
