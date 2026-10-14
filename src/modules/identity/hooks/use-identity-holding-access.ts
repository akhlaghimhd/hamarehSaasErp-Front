"use client";

import { useMemo } from "react";
import { useAuthStore } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";

/**
 * IDORG-T14 / ADR-ID-ORG-004 G25 — Identity holding actor flags for members UX.
 * - group observer: list/read only (no create/update/delete/assign)
 * - technical owner: may mutate Identity (catalog/members) even without COMPANY scopes
 * - company operator: backend enforces COMPANY scope; FE hides nothing extra beyond perms
 */
export function useIdentityHoldingAccess() {
  const securityContext = useAuthStore((s) => s.securityContext);
  const { data: companies } = useCompanies("active");
  const list = companies ?? [];
  const multiCompany = list.length > 1;

  const isOwner = securityContext?.is_owner === true;

  const operateCompanyIds = useMemo(() => {
    const scopes = securityContext?.scopes ?? [];
    return Array.from(
      new Set(
        scopes
          .filter(
            (s) =>
              String(s.scope_type || "").toUpperCase() === "COMPANY" &&
              s.reference_id
          )
          .map((s) => String(s.reference_id))
      )
    );
  }, [securityContext]);

  const isGroupObserver = useMemo(() => {
    if (isOwner) return false;
    const roles = securityContext?.roles ?? [];
    if (roles.some((r) => r.code === "group-observer")) return true;
    const perms = securityContext?.permissions ?? [];
    return perms.includes("identity.group.observe");
  }, [securityContext, isOwner]);

  /** Matches BE isIdentityMutateGroupWide for soft SME path. */
  const isSoftSme =
    !isOwner && operateCompanyIds.length === 0 && list.length <= 1;

  /**
   * Identity member mutate (create/update/delete/assign roles&scopes).
   * Observer is always read-only. Owner and soft SME may mutate; company ops use perms + BE scope.
   */
  const canMutateMembers = !isGroupObserver;

  /** Role catalog create/update — owner / soft SME only (IDORG-T04/T12). */
  const canMutateRoleCatalog = isOwner || isSoftSme;

  return {
    isOwner,
    isGroupObserver,
    isSoftSme,
    multiCompany,
    operateCompanyIds,
    canMutateMembers,
    canMutateRoleCatalog,
  };
}
