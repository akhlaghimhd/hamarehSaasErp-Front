/**
 * FE-P0-T02 — Auth Store + Session (Zustand)
 *
 * Holds in-memory session. Persistence of token/tenant stays in tokenStorage (T01)
 * so the API client interceptors remain independent of React.
 */

"use client";

import { create } from "zustand";
import { tokenStorage } from "@/api/token-storage";
import type {
  ActiveOrganization,
  AuthSessionSnapshot,
  AuthUser,
  SecurityContext,
} from "./types";

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
  organization: ActiveOrganization | null;
  isHydrated: boolean;
  isAuthenticated: boolean;

  hydrate: () => void;
  setSession: (params: {
    accessToken: string;
    user: AuthUser;
    securityContext: SecurityContext;
    activeTenantId: string | null;
    organization?: ActiveOrganization | null;
  }) => void;
  clearSession: () => void;
  setActiveTenantId: (tenantId: string | null) => void;
  setOrganization: (org: ActiveOrganization | null) => void;
  hasPermission: (code: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  securityContext: null,
  activeTenantId: null,
  organization: null,
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
        organization: null,
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
      organization: snapshot?.organization ?? null,
      isHydrated: true,
      isAuthenticated: true,
    });
  },

  setSession: ({ accessToken, user, securityContext, activeTenantId, organization }) => {
    tokenStorage.setAccessToken(accessToken);
    tokenStorage.setTenantId(activeTenantId);
    const org = organization ?? null;
    writeSnapshot({
      user,
      security_context: securityContext,
      active_tenant_id: activeTenantId,
      organization: org,
    });
    set({
      accessToken,
      user,
      securityContext,
      activeTenantId,
      organization: org,
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
      organization: null,
      isHydrated: true,
      isAuthenticated: false,
    });
  },

  setActiveTenantId: (tenantId) => {
    tokenStorage.setTenantId(tenantId);
    const { user, securityContext, organization } = get();
    if (user && securityContext) {
      writeSnapshot({
        user,
        security_context: {
          ...securityContext,
          tenant_id: tenantId,
        },
        active_tenant_id: tenantId,
        organization,
      });
    }
    set({ activeTenantId: tenantId });
  },

  setOrganization: (org) => {
    const { user, securityContext, activeTenantId } = get();
    if (user && securityContext) {
      writeSnapshot({
        user,
        security_context: securityContext,
        active_tenant_id: activeTenantId,
        organization: org,
      });
    }
    set({ organization: org });
  },

  hasPermission: (code) => {
    const perms = get().securityContext?.permissions ?? [];
    return perms.includes(code);
  },
}));
