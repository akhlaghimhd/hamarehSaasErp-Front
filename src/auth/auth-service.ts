/**
 * FE-P0-T03 — Auth Service (aligned with Backend identifier + OTP login)
 * Tenant id is never typed by the user; resolved by Backend / org picker.
 */

import { apiPost, ApiClientError } from "@/api";
import type { ApiSuccessResponse, LoginResponseData } from "@/api/types";
import { useAuthStore } from "./auth-store";
import { tokenStorage } from "@/api/token-storage";

const LOGIN_PATH = "/identity-core/identity/auth/login";
const LOGOUT_PATH = "/identity-core/identity/auth/logout";
const OTP_REQUEST_PATH = "/identity-core/identity/auth/otp/request";
const OTP_VERIFY_PATH = "/identity-core/identity/auth/otp/verify";
const SELECT_TENANT_PATH = "/identity-core/identity/auth/select-tenant";

export interface OrganizationOption {
  tenant_id: string;
  tenant_code: string;
  tenant_name: string;
  slug: string | null;
}

export type LoginResult =
  | { kind: "session"; data: LoginResponseData }
  | {
      kind: "select_org";
      preAuthToken: string;
      organizations: OrganizationOption[];
      user: LoginResponseData["user"];
    };

function unwrapData<T extends Record<string, unknown>>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

function applySession(data: LoginResponseData) {
  if (!data?.access_token) {
    throw new ApiClientError({
      statusCode: 500,
      message: "پاسخ ورود از سرور ناقص است.",
    });
  }

  useAuthStore.getState().setSession({
    accessToken: data.access_token,
    user: data.user,
    securityContext: data.security_context,
    activeTenantId: data.active_tenant_id,
  });
}

function interpretLoginPayload(raw: Record<string, unknown>): LoginResult {
  if (raw.requires_tenant_selection === true) {
    return {
      kind: "select_org",
      preAuthToken: String(raw.pre_auth_token ?? ""),
      organizations: (raw.organizations as OrganizationOption[]) ?? [],
      user: raw.user as LoginResponseData["user"],
    };
  }

  const data = raw as unknown as LoginResponseData;
  applySession(data);
  return { kind: "session", data };
}

export const authService = {
  async loginWithPassword(identifier: string, password: string): Promise<LoginResult> {
    const envelope = await apiPost(LOGIN_PATH, {
      identifier: identifier.trim(),
      password,
    });
    const raw = unwrapData<Record<string, unknown>>(envelope);
    return interpretLoginPayload(raw);
  },

  async requestOtp(mobile: string): Promise<{
    expires_in: number;
    resend_available_in: number;
    debug_code?: string;
  }> {
    const envelope = await apiPost(OTP_REQUEST_PATH, { mobile: mobile.trim() });
    return unwrapData(envelope);
  },

  async verifyOtp(mobile: string, code: string): Promise<LoginResult> {
    const envelope = await apiPost(OTP_VERIFY_PATH, {
      mobile: mobile.trim(),
      code: code.trim(),
    });
    const raw = unwrapData<Record<string, unknown>>(envelope);
    return interpretLoginPayload(raw);
  },

  async selectOrganization(preAuthToken: string, tenantId: string): Promise<void> {
    const store = useAuthStore.getState();
    const prevToken = store.accessToken;
    const prevUser = store.user;
    const prevCtx = store.securityContext;
    const prevTenant = store.activeTenantId;

    // Temporarily put pre-auth token for this single call (do not persist snapshot)
    tokenStorage.setAccessToken(preAuthToken);
    useAuthStore.setState({
      accessToken: preAuthToken,
      activeTenantId: null,
    });

    try {
      const envelope = await apiPost(SELECT_TENANT_PATH, { tenant_id: tenantId });
      const raw = unwrapData<Record<string, unknown>>(envelope);
      const result = interpretLoginPayload(raw);
      if (result.kind !== "session") {
        throw new ApiClientError({
          statusCode: 500,
          message: "انتخاب سازمان کامل نشد.",
        });
      }
    } catch (e) {
      // Restore previous session state fully on failure
      if (prevToken) {
        tokenStorage.setAccessToken(prevToken);
        tokenStorage.setTenantId(prevTenant);
        useAuthStore.setState({
          accessToken: prevToken,
          user: prevUser,
          securityContext: prevCtx,
          activeTenantId: prevTenant,
          isAuthenticated: true,
          isHydrated: true,
        });
      } else {
        tokenStorage.clearAuth();
        useAuthStore.getState().clearSession();
      }
      throw e;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiPost(LOGOUT_PATH, {});
    } catch {
      // ignore
    } finally {
      useAuthStore.getState().clearSession();
    }
  },
};
