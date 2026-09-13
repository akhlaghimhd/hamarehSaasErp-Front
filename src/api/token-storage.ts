/**
 * FE-P0-T01 — Thin token / tenant storage accessor.
 * Intentionally framework-agnostic so FE-P0-T02 (Zustand Auth Store) can replace
 * the backing store without changing the API client interceptors.
 *
 * Keys are stable; do not rename without a migration plan.
 */

const ACCESS_TOKEN_KEY = "access_token";
const TENANT_ID_KEY = "active_tenant_id";

function canUseDom(): boolean {
  return typeof window !== "undefined";
}

export const tokenStorage = {
  getAccessToken(): string | null {
    if (!canUseDom()) return null;
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setAccessToken(token: string | null): void {
    if (!canUseDom()) return;
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  },

  getTenantId(): string | null {
    if (!canUseDom()) return null;
    return localStorage.getItem(TENANT_ID_KEY);
  },

  setTenantId(tenantId: string | null): void {
    if (!canUseDom()) return;
    if (tenantId) {
      localStorage.setItem(TENANT_ID_KEY, tenantId);
    } else {
      localStorage.removeItem(TENANT_ID_KEY);
    }
  },

  /** Clears auth-related keys only (not unrelated app prefs). */
  clearAuth(): void {
    if (!canUseDom()) return;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(TENANT_ID_KEY);
    // Legacy key from the previous minimal client
    localStorage.removeItem("refresh_token");
  },
};
