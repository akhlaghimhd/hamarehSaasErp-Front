"use client";

import { useEffect, useMemo, useState } from "react";
import { useCompanies } from "@/modules/organization/hooks/use-companies";

/**
 * ADR-FIN-002 list/create company UX:
 * - multi company → selector, default primary
 * - single company → fixed that id, no "all"
 * - never leave empty when companies loaded
 */
export function useFinanceCompanyScope() {
  const { data: companies, isLoading } = useCompanies();
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

  return {
    companies: list,
    isLoading,
    multiCompany,
    primaryCompanyId,
    companyId: effectiveCompanyId,
    setCompanyId,
  };
}
