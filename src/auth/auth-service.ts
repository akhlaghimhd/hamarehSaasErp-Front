/**
 * FE-P0-T03 — Auth Service (aligned with Backend identifier + OTP login)
 * Tenant id is never typed by the user; resolved by Backend / org picker.
 */

import { apiGet, apiPost, ApiClientError } from "@/api";
import type { ApiSuccessResponse, LoginResponseData } from "@/api/types";
import { useAuthStore } from "./auth-store";
import { tokenStorage } from "@/api/token-storage";
import type { ActiveOrganization, AuthUser, UserProfile } from "./types";

const LOGIN_PATH = "/identity-core/identity/auth/login";
const LOGOUT_PATH = "/identity-core/identity/auth/logout";
const OTP_REQUEST_PATH = "/identity-core/identity/auth/otp/request";
const OTP_VERIFY_PATH = "/identity-core/identity/auth/otp/verify";
const SELECT_TENANT_PATH = "/identity-core/identity/auth/select-tenant";
const PROFILE_ME_PATH = "/identity-core/identity/profiles/me";
const SET_PASSWORD_PATH = "/identity-core/identity/auth/set-password";
const CHANGE_PASSWORD_PATH = "/identity-core/identity/auth/change-password";
const FORGOT_REQUEST_PATH = "/identity-core/identity/auth/forgot-password/request";
const FORGOT_CONFIRM_PATH = "/identity-core/identity/auth/forgot-password/confirm";

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
    }
  | {
      kind: "must_set_password";
      accessToken: string;
      user: AuthUser;
    };

function unwrapData<T extends Record<string, unknown>>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

function organizationFromLogin(data: LoginResponseData): ActiveOrganization | null {
  const org = data.organization;
  if (org?.tenant_id) {
    return {
      tenant_id: org.tenant_id,
      tenant_name: org.tenant_name ?? null,
      tenant_code: org.tenant_code ?? null,
    };
  }
  if (data.active_tenant_id) {
    return {
      tenant_id: data.active_tenant_id,
      tenant_name: null,
      tenant_code: null,
    };
  }
  return null;
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
    organization: organizationFromLogin(data),
  });
}

function interpretLoginPayload(raw: Record<string, unknown>): LoginResult {
  // First-login: limited token — do not open full dashboard session
  if (raw.must_set_password === true && typeof raw.access_token === "string") {
    const userRaw = (raw.user ?? {}) as Record<string, unknown>;
    const user: AuthUser = {
      user_id: String(userRaw.user_id ?? ""),
      tenant_user_id: (userRaw.tenant_user_id as string | null) ?? null,
      first_name: String(userRaw.first_name ?? ""),
      last_name: String(userRaw.last_name ?? ""),
      email: String(userRaw.email ?? ""),
      mobile: (userRaw.mobile as string | null | undefined) ?? null,
    };
    // Store token only for the set-password call (not full auth snapshot)
    tokenStorage.setAccessToken(String(raw.access_token));
    useAuthStore.setState({
      accessToken: String(raw.access_token),
      user,
      isAuthenticated: false,
      isHydrated: true,
      securityContext: null,
      activeTenantId: null,
      organization: null,
    });
    return {
      kind: "must_set_password",
      accessToken: String(raw.access_token),
      user,
    };
  }

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

  async requestOtp(
    mobile: string,
    opts?: { forceResend?: boolean }
  ): Promise<{
    expires_in: number;
    resend_available_in: number;
    debug_code?: string;
  }> {
    const body: Record<string, unknown> = { mobile: mobile.trim() };
    if (opts?.forceResend) {
      body.force_resend = true;
    }
    const envelope = await apiPost(OTP_REQUEST_PATH, body);
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
    const prevOrg = store.organization;

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
      if (prevToken) {
        tokenStorage.setAccessToken(prevToken);
        tokenStorage.setTenantId(prevTenant);
        useAuthStore.setState({
          accessToken: prevToken,
          user: prevUser,
          securityContext: prevCtx,
          activeTenantId: prevTenant,
          organization: prevOrg,
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

  /**
   * First-login set password (limited token). Backend revokes all tokens after success.
   */
  async setPassword(password: string, passwordConfirmation: string): Promise<void> {
    await apiPost(SET_PASSWORD_PATH, {
      password,
      password_confirmation: passwordConfirmation,
    });
    // Always clear — user must re-login
    useAuthStore.getState().clearSession();
  },

  /** Profile change-password (full session + tenant header). */
  async changePassword(
    currentPassword: string,
    password: string,
    passwordConfirmation: string
  ): Promise<void> {
    await apiPost(CHANGE_PASSWORD_PATH, {
      current_password: currentPassword,
      password,
      password_confirmation: passwordConfirmation,
    });
  },

  async forgotPasswordRequest(
    mobile: string,
    reg?: { forceResend?: boolean }
  ): Promise<{ expires_in: number; resend_available_in: number; debug_code?: string }> {
    const body: Record<string, unknown> = { mobile: mobile.trim() };
    if (reg?.forceResend) body.force_resend = true;
    const envelope = await apiPost(FORGOT_REQUEST_PATH, body);
    return unwrapData(envelope);
  },

  async forgotPasswordConfirm(
    mobile: string,
    code: string,
    password: string,
    passwordConfirmation: string
  ): Promise<void> {
    await apiPost(FORGOT_CONFIRM_PATH, {
      mobile: mobile.trim(),
      code: code.trim(),
      password,
      password_confirmation: passwordConfirmation,
    });
  },

  async getProfile(): Promise<UserProfile> {
    const envelope = await apiGet(PROFILE_ME_PATH);
    return unwrapData<UserProfile>(envelope as unknown);
  },

  async logout(): Promise<void> {
    try {
      await apiPost(LOGOUT_PATH, {});
    } catch {
      // ignore network/session errors on logout
    } finally {
      useAuthStore.getState().clearSession();
      // OTP one-time code was already consumed on login; clear any stale UI timer/session
      try {
        if (typeof sessionStorage !== "undefined") {
          sessionStorage.removeItem("hamareh.login.otp_session");
        }
      } catch {
        /* ignore */
      }
    }
  },
};
