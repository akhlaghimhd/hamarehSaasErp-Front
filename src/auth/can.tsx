/**
 * FE-P0 — UI permission gate (display only; Backend remains SoT).
 */

"use client";

import type { ReactNode } from "react";
import { useAuthStore } from "./auth-store";

export function usePermission(code: string): boolean {
  return useAuthStore((s) => s.hasPermission(code));
}

export function useAnyPermission(codes: string[]): boolean {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  return codes.some((c) => hasPermission(c));
}

/** Renders children only when the session has the given permission code. */
export function Can({
  permission,
  anyOf,
  fallback = null,
  children,
}: {
  permission?: string;
  anyOf?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const allowed = permission
    ? hasPermission(permission)
    : anyOf
      ? anyOf.some((c) => hasPermission(c))
      : true;

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
