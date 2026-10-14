"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";

/**
 * ADR-FIN-002 list/create company UX + FIN-HOLD-W2 (ADR-FIN-003 L03/L06):
 * - multi company → selector, default primary
 * - single company → fixed that id, no "all"
 * - never leave empty when companies loaded
 * - canOperateCompany ≠ canReadCompany (owner is technical, not super-operator)
 */
export function useFinanceCompanyScope() {
  const { data: companies, isLoading } = useCompanies();
  const securityContext = useAuthStore((s) => s.securityContext);
  const list = companies ?? [];
  const multiCompany = list.length > 1;

  const primaryCompanyId = useMemo(() => {
    const p = list.find((c) => c.is_primary) ?? list[0];
    return p?.company_id ?? "";
  }, [list]);

  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    if (!list.length) return;
    if (!multiCompany) {
      setCompanyId(list[0]?.company_id ?? "");
      return;
    }
    setCompanyId((prev) => prev || primaryCompanyId);
  }, [list, multiCompany, primaryCompanyId]);

  const effectiveCompanyId = companyId || primaryCompanyId;

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

  const isOwner = securityContext?.is_owner === true;

  const isGroupObserver = useMemo(() => {
    if (isOwner) return false;
    const roles = securityContext?.roles ?? [];
    if (roles.some((r) => r.code === "group-observer")) return true;
    const perms = securityContext?.permissions ?? [];
    return perms.includes("identity.group.observe");
  }, [securityContext, isOwner]);

  /** Soft SME: no COMPANY scopes, not owner, tenant has ≤1 company. */
  const isSoftSme =
    !isOwner && operateCompanyIds.length === 0 && list.length <= 1;

  /**
   * FIN-HOLD-L06: technical owner without explicit COMPANY scopes is group-wide READ only.
   */
  const isTechnicalOwnerReadOnly =
    isOwner && operateCompanyIds.length === 0 && multiCompany;

  const canOperateCompany = useCallback(
    (id: string) => {
      if (!id) return false;
      if (isSoftSme) return true;
      return operateCompanyIds.includes(id);
    },
    [isSoftSme, operateCompanyIds]
  );

  const canReadCompany = useCallback(
    (id: string) => {
      if (!id) return false;
      if (isOwner || isGroupObserver || isSoftSme) return true;
      if (operateCompanyIds.length === 0 && list.length <= 1) return true;
      return operateCompanyIds.includes(id);
    },
    [isOwner, isGroupObserver, isSoftSme, operateCompanyIds, list.length]
  );

  const canOperateSelected = canOperateCompany(effectiveCompanyId);

  return {
    companies: list,
    isLoading,
    multiCompany,
    primaryCompanyId,
    companyId: effectiveCompanyId,
    setCompanyId,
    operateCompanyIds,
    isOwner,
    isGroupObserver,
    isSoftSme,
    isTechnicalOwnerReadOnly,
    canOperateCompany,
    canReadCompany,
    canOperateSelected,
  };
}
