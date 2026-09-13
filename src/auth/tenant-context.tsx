/**
 * FE-P0-T06 — Tenant Context Provider
 * Exposes active tenant + security snapshot to the React tree.
 * Source of truth for API headers remains tokenStorage (fed by auth store).
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useAuthStore } from "./auth-store";
import type { AuthScope, AuthUser, SecurityContext } from "./types";

interface TenantContextValue {
  tenantId: string | null;
  user: AuthUser | null;
  securityContext: SecurityContext | null;
  scopes: AuthScope[];
  permissions: string[];
  isOwner: boolean;
  isAuthenticated: boolean;
  isHydrated: boolean;
  hasPermission: (code: string) => boolean;
}

const TenantReactContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const user = useAuthStore((s) => s.user);
  const securityContext = useAuthStore((s) => s.securityContext);
  const hasPermission = useAuthStore((s) => s.hasPermission);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const value = useMemo<TenantContextValue>(
    () => ({
      tenantId: activeTenantId,
      user,
      securityContext,
      scopes: securityContext?.scopes ?? [],
      permissions: securityContext?.permissions ?? [],
      isOwner: securityContext?.is_owner ?? false,
      isAuthenticated,
      isHydrated,
      hasPermission,
    }),
    [
      activeTenantId,
      user,
      securityContext,
      isAuthenticated,
      isHydrated,
      hasPermission,
    ]
  );

  return (
    <TenantReactContext.Provider value={value}>
      {children}
    </TenantReactContext.Provider>
  );
}

export function useTenantContext(): TenantContextValue {
  const ctx = useContext(TenantReactContext);
  if (!ctx) {
    throw new Error("useTenantContext must be used within TenantProvider");
  }
  return ctx;
}
