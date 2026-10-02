/**
 * Axios API client — auth header, tenant header, unified error handling.
 */

import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { tokenStorage } from "@/auth/token-storage";

const TENANT_HEADER = "X-Tenant-Id";

export class ApiClientError extends Error {
  statusCode: number;
  errors?: Record<string, string[] | string>;
  isNetworkError?: boolean;

  constructor(args: {
    statusCode: number;
    message: string;
    errors?: Record<string, string[] | string>;
    isNetworkError?: boolean;
  }) {
    super(args.message);
    this.name = "ApiClientError";
    this.statusCode = args.statusCode;
    this.errors = args.errors;
    this.isNetworkError = args.isNetworkError;
  }
}

function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return "درخواست نامعتبر است.";
    case 401:
      return "نشست شما منقضی شده یا احراز هویت نشده‌اید. لطفاً دوباره وارد شوید.";
    case 403:
      return "شما مجوز انجام این عملیات را ندارید.";
    case 404:
      return "منبع مورد نظر یافت نشد.";
    case 422:
      return "لطفاً اطلاعات فرم را بررسی و اصلاح کنید.";
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

function looksEnglishOnly(msg: string): boolean {
  if (!msg.trim()) return true;
  if (/[\u0600-\u06FF]/.test(msg)) return false;
  return /^[\x00-\x7F]+$/.test(msg);
}

function firstValidationError(
  errors: Record<string, string[] | string> | undefined
): string | undefined {
  if (!errors || typeof errors !== "object") return undefined;
  for (const key of Object.keys(errors)) {
    const v = errors[key];
    if (Array.isArray(v) && v[0]) return String(v[0]);
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

function humanizeApiMessage(
  raw: string | undefined,
  status: number,
  errors?: Record<string, string[] | string>
): string {
  const fromErrors = firstValidationError(errors);
  let msg = (raw ?? "").trim();
  if ((!msg || looksEnglishOnly(msg)) && fromErrors) {
    msg = fromErrors.trim();
  }
  const lower = msg.toLowerCase();

  if (
    !msg ||
    lower === "unauthenticated." ||
    lower === "unauthenticated" ||
    lower.includes("unauthenticated")
  ) {
    return defaultMessageForStatus(status === 401 ? 401 : status || 401);
  }

  if (lower.includes("unauthorized or missing tenant")) {
    return "نشست یا شناسه سازمان ناقص است. دوباره وارد شوید.";
  }

  if (lower.includes("the code field is required")) {
    return "کد الزامی است.";
  }
  if (lower.includes("the name field is required")) {
    return "نام الزامی است.";
  }
  if (lower.includes("the given data was invalid")) {
    return fromErrors && !looksEnglishOnly(fromErrors)
      ? fromErrors
      : "لطفاً اطلاعات فرم را بررسی و اصلاح کنید.";
  }

  if (looksEnglishOnly(msg) && status === 422) {
    return "لطفاً اطلاعات فرم را بررسی و اصلاح کنید.";
  }

  return msg;
}

const baseURL =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : "";

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 60_000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

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

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[] | string> }>) => {
    const config = error.config;

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
      const authHeader = config?.headers?.Authorization;
      const hadToken =
        typeof authHeader === "string" && authHeader.startsWith("Bearer ");
      if (hadToken) {
        tokenStorage.clearAuth();
      }
    }

    const errors =
      data && data.errors && typeof data.errors === "object"
        ? (data.errors as Record<string, string[] | string>)
        : undefined;

    const rawMessage =
      data && typeof data.message === "string" ? data.message : undefined;
    const message = humanizeApiMessage(rawMessage, status, errors);

    return Promise.reject(
      new ApiClientError({
        statusCode: status,
        message,
        errors,
      })
    );
  }
);

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

export async function apiDelete<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const res = await apiClient.delete<T>(url, config);
  return res.data;
}
