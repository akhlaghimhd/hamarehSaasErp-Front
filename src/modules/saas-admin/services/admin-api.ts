/**
 * Platform Admin API — /api/v1/saas-admin/*
 * Uses admin session token; never injects X-Tenant-ID.
 */

import axios, { type AxiosInstance } from "axios";
import { adminTokenStorage, type AdminUserSnapshot } from "../lib/admin-token-storage";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

export const adminApiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/saas-admin`,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 30_000,
});

adminApiClient.interceptors.request.use((config) => {
  const token = adminTokenStorage.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      adminTokenStorage.clear();
    }
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "خطای ارتباط با سرور ادمین";
    return Promise.reject(new Error(String(msg)));
  }
);

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as { data: T }).data;
  }
  return envelope as T;
}

export type AdminLoginResult = {
  admin_user: AdminUserSnapshot;
  session_id: string;
  token: string;
  expires_at?: string;
};

export const adminAuthService = {
  async login(username: string, password: string): Promise<AdminLoginResult> {
    const res = await adminApiClient.post("/auth/login", { username, password });
    const data = unwrapData<AdminLoginResult>(res.data);
    adminTokenStorage.setToken(data.token);
    adminTokenStorage.setUser(data.admin_user ?? null);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await adminApiClient.post("/auth/logout");
    } finally {
      adminTokenStorage.clear();
    }
  },
};

export type FeatureCatalogItem = {
  feature_id?: string;
  code: string;
  name?: string;
  module?: string;
  is_active?: boolean;
};

export type TenantEntitlementsPayload = {
  tenant_id: string;
  enabled_codes: string[];
  entitlements: Array<{
    feature_code?: string;
    is_enabled?: boolean;
    source?: string;
    notes?: string;
  }>;
};

export const adminFeatureService = {
  async catalog(): Promise<FeatureCatalogItem[]> {
    const res = await adminApiClient.get("/feature-catalog");
    const data = unwrapData<FeatureCatalogItem[] | { data?: FeatureCatalogItem[] }>(res.data);
    if (Array.isArray(data)) return data;
    return [];
  },

  async listEntitlements(tenantId: string): Promise<TenantEntitlementsPayload> {
    const res = await adminApiClient.get(`/tenants/${tenantId}/feature-entitlements`);
    return unwrapData<TenantEntitlementsPayload>(res.data);
  },

  async setEntitlement(
    tenantId: string,
    featureCode: string,
    isEnabled: boolean,
    notes?: string
  ): Promise<unknown> {
    const res = await adminApiClient.post(`/tenants/${tenantId}/feature-entitlements`, {
      feature_code: featureCode,
      is_enabled: isEnabled,
      notes: notes ?? undefined,
    });
    return unwrapData(res.data);
  },
};

export type AdminTenantRow = {
  tenant_id: string;
  tenant_code?: string;
  tenant_name?: string;
  legal_name?: string | null;
  slug?: string;
  status?: number;
  created_at?: string;
};

export type AdminTenantsListResult = {
  data: AdminTenantRow[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type AdminTenantDetail = {
  tenant: AdminTenantRow;
  enabled_codes: string[];
  entitlements: unknown;
  member_count: number;
};

export const adminTenantService = {
  async list(params?: {
    search?: string;
    status?: number;
    per_page?: number;
  }): Promise<AdminTenantsListResult> {
    const res = await adminApiClient.get("/tenants", { params });
    const body = res.data as {
      data?: AdminTenantRow[];
      meta?: AdminTenantsListResult["meta"];
    };
    return {
      data: Array.isArray(body?.data) ? body.data : [],
      meta: body?.meta ?? {
        current_page: 1,
        last_page: 1,
        per_page: 20,
        total: 0,
      },
    };
  },

  async show(tenantId: string): Promise<AdminTenantDetail> {
    const res = await adminApiClient.get(`/tenants/${tenantId}`);
    return unwrapData<AdminTenantDetail>(res.data);
  },
};

export type SystemSettingRow = {
  system_setting_id: string;
  setting_key: string;
  setting_value?: string | null;
  description?: string | null;
  row_version?: number;
};

export const adminSystemSettingService = {
  async list(): Promise<SystemSettingRow[]> {
    const res = await adminApiClient.get("/system-settings");
    const data = unwrapData<SystemSettingRow[]>(res.data);
    return Array.isArray(data) ? data : [];
  },

  async upsert(payload: {
    setting_key: string;
    setting_value?: string | null;
    description?: string | null;
  }): Promise<SystemSettingRow> {
    const res = await adminApiClient.post("/system-settings", payload);
    return unwrapData<SystemSettingRow>(res.data);
  },
};
