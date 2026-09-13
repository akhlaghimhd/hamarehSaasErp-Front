/**
 * FE-P0-T02 — Auth Store + Session (Zustand)
 *
 * Holds in-memory session. Persistence of token/tenant stays in tokenStorage (T01)
 * so the API client interceptors remain independent of React.
 */

"use client";

import { create } from "zustand";
import { tokenStorage } from "@/api/token-storage";
import type { AuthSessionSnapshot, AuthUser, SecurityContext } from "./types";

const SESSION_SNAPSHOT_KEY = "auth_session_snapshot";

function canUseDom(): boolean {
  return typeof window !== "undefined";
}

function readSnapshot(): AuthSessionSnapshot | null {
  if (!canUseDom()) return null;
  try {
    const raw = localStorage.getItem(SESSION_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSessionSnapshot;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: AuthSessionSnapshot | null): void {
  if (!canUseDom()) return;
  if (!snapshot) {
    localStorage.removeItem(SESSION_SNAPSHOT_KEY);
    return;
  }
  localStorage.setItem(SESSION_SNAPSHOT_KEY, JSON.stringify(snapshot));
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  securityContext: SecurityContext | null;
  activeTenantId: string | null;
  isHydrated: boolean;
  isAuthenticated: boolean;

  hydrate: () => void;
  setSession: (params: {
    accessToken: string;
    user: AuthUser;
    securityContext: SecurityContext;
    activeTenantId: string | null;
  }) => void;
  clearSession: () => void;
  setActiveTenantId: (tenantId: string | null) => void;
  hasPermission: (code: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  securityContext: null,
  activeTenantId: null,
  isHydrated: false,
  isAuthenticated: false,

  hydrate: () => {
    const token = tokenStorage.getAccessToken();
    const tenantId = tokenStorage.getTenantId();
    const snapshot = readSnapshot();

    if (!token) {
      writeSnapshot(null);
      set({
        accessToken: null,
        user: null,
        securityContext: null,
        activeTenantId: null,
        isHydrated: true,
        isAuthenticated: false,
      });
      return;
    }

    set({
      accessToken: token,
      user: snapshot?.user ?? null,
      securityContext: snapshot?.security_context ?? null,
      activeTenantId: tenantId ?? snapshot?.active_tenant_id ?? null,
      isHydrated: true,
      isAuthenticated: true,
    });
  },

  setSession: ({ accessToken, user, securityContext, activeTenantId }) => {
    tokenStorage.setAccessToken(accessToken);
    tokenStorage.setTenantId(activeTenantId);
    writeSnapshot({
      user,
      security_context: securityContext,
      active_tenant_id: activeTenantId,
    });
    set({
      accessToken,
      user,
      securityContext,
      activeTenantId,
      isHydrated: true,
      isAuthenticated: true,
    });
  },

  clearSession: () => {
    tokenStorage.clearAuth();
    writeSnapshot(null);
    set({
      accessToken: null,
      user: null,
      securityContext: null,
      activeTenantId: null,
      isHydrated: true,
      isAuthenticated: false,
    });
  },

  setActiveTenantId: (tenantId) => {
    tokenStorage.setTenantId(tenantId);
    const { user, securityContext } = get();
    if (user && securityContext) {
      writeSnapshot({
        user,
        security_context: {
          ...securityContext,
          tenant_id: tenantId,
        },
        active_tenant_id: tenantId,
      });
    }
    set({ activeTenantId: tenantId });
  },

  hasPermission: (code) => {
    const perms = get().securityContext?.permissions ?? [];
    return perms.includes(code);
  },
}));
