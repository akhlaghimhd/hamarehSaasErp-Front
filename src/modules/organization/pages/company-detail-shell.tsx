"use client";

import { useParams } from "next/navigation";
import { CompanyDetailPage } from "./company-detail";
import { CompanyExtendedPanels } from "./company-extended-panels";

/**
 * Shell that keeps CompanyDetailPage + bank/officer/cost-center panels.
 * Note: company-detail was briefly corrupted; this shell composes panels safely.
 */
export function CompanyDetailShell() {
  const params = useParams();
  const companyId = typeof params?.id === "string" ? params.id : "";

  return (
    <div className="space-y-8">
      <CompanyDetailPage />
      {companyId ? <CompanyExtendedPanels companyId={companyId} /> : null}
    </div>
  );
}
