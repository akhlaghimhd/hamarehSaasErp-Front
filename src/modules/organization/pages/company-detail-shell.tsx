"use client";

import { useParams } from "next/navigation";
import { CompanyDetailPage } from "./company-detail";
import { CompanyAddressContactPanel } from "./company-address-contact-panel";
import { CompanyOwnershipPanel } from "./company-ownership-panel";
import { CompanyExtendedPanels } from "./company-extended-panels";

export function CompanyDetailShell() {
  const params = useParams();
  const companyId = typeof params?.id === "string" ? params.id : "";

  return (
    <div className="space-y-8">
      <CompanyDetailPage />
      {companyId ? (
        <>
          <CompanyAddressContactPanel companyId={companyId} />
          <CompanyOwnershipPanel companyId={companyId} />
          <CompanyExtendedPanels companyId={companyId} />
        </>
      ) : null}
    </div>
  );
}
