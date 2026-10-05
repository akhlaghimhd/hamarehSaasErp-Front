/**
 * Nested panels on company detail: bank accounts, officers, cost centers.
 * Banks + Officers restored from baseline; Cost centers = CostCentersPanel v1.0.
 */
"use client";

import { CostCentersPanel } from "./cost-centers-panel";
import { CompanyBankOfficerPanels } from "./company-bank-officer-panels";

export function CompanyExtendedPanels({
  companyId,
  readOnly = false,
}: {
  companyId: string;
  readOnly?: boolean;
}) {
  return (
    <div className="space-y-3">
      <CompanyBankOfficerPanels companyId={companyId} readOnly={readOnly} />
      <CostCentersPanel companyId={companyId} readOnly={readOnly} />
    </div>
  );
}
