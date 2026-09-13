/**
 * FE-P0-T03 — Auth Service Layer
 * Component → Service → apiClient → Backend
 * No business rules beyond transport and session wiring.
 */

import { apiPost, ApiClientError } from "@/api";
import type { ApiSuccessResponse, LoginResponseData } from "@/api/types";
import { TENANT_HEADER } from "@/api/client";
import { useAuthStore } from "./auth-store";
import type { LoginCredentials } from "./types";

const LOGIN_PATH = "/identity/auth/login";
const LOGOUT_PATH = "/identity/auth/logout";

export const authService = {
  /**
   * Login against IdentityCore.
   * Tenant header is required by TenantContextMiddleware even on the login route.
   */
  async login(credentials: LoginCredentials): Promise<LoginResponseData> {
    const envelope = await apiPost<
      ApiSuccessResponse<LoginResponseData> | LoginResponseData
    >(
      LOGIN_PATH,
      {
        email: credentials.email,
        password: credentials.password,
        tenant_id: credentials.tenant_id,
      },
      {
        headers: {
          [TENANT_HEADER]: credentials.tenant_id,
        },
      }
    );

    // Support both enveloped and raw data shapes
    const data =
      envelope && typeof envelope === "object" && "data" in envelope
        ? (envelope as ApiSuccessResponse<LoginResponseData>).data
        : (envelope as LoginResponseData);

    if (!data?.access_token) {
      throw new ApiClientError({
        statusCode: 500,
        message: "پاسخ ورود از سرور ناقص است.",
      });
    }

    const activeTenantId = data.active_tenant_id ?? credentials.tenant_id;

    useAuthStore.getState().setSession({
      accessToken: data.access_token,
      user: data.user,
      securityContext: data.security_context,
      activeTenantId,
    });

    return data;
  },

  /**
   * Logout: best-effort call to Backend, always clear local session.
   */
  async logout(): Promise<void> {
    try {
      await apiPost(LOGOUT_PATH, {});
    } catch {
      // Network/401 after partial clear — still wipe local session
    } finally {
      useAuthStore.getState().clearSession();
    }
  },
};
