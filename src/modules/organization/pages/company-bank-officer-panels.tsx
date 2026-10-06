/**
 * Bank accounts + legal officers panels (company detail).
 */
"use client";

import { CompanyBankPanels } from "./company-bank-panels";
import { CompanyOfficerPanels } from "./company-officer-panels";

export function CompanyBankOfficerPanels({
  companyId,
  readOnly = false,
}: {
  companyId: string;
  readOnly?: boolean;
}) {
  return (
    <>
      <CompanyBankPanels companyId={companyId} readOnly={readOnly} />
      <CompanyOfficerPanels companyId={companyId} readOnly={readOnly} />
    </>
  );
}
