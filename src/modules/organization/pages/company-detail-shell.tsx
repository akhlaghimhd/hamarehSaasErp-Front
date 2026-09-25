"use client";

import { useParams } from "next/navigation";
import { decodeCompanyRef } from "../lib/company-ref";
import { useCompany } from "../hooks/use-companies";
import { CompanyDetailPage } from "./company-detail";
import { CompanyAddressContactPanel } from "./company-address-contact-panel";
import { CompanyOwnershipPanel } from "./company-ownership-panel";
import { CompanyExtendedPanels } from "./company-extended-panels";

export function CompanyDetailShell() {
  const params = useParams();
  const companyId =
    decodeCompanyRef(typeof params?.id === "string" ? params.id : "") ?? "";
  const { data: company } = useCompany(companyId || null);
  const readOnly =
    Boolean(company?.deleted_at) || company?.is_active === false;

  return (
    <div className="space-y-8">
      <CompanyDetailPage />
      {companyId ? (
        <>
          <CompanyAddressContactPanel companyId={companyId} readOnly={readOnly} />
          <CompanyOwnershipPanel companyId={companyId} readOnly={readOnly} />
          <CompanyExtendedPanels companyId={companyId} readOnly={readOnly} />
        </>
      ) : null}
    </div>
  );
}
