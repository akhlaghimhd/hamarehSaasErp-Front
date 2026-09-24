"use client";

import { useParams } from "next/navigation";
import { CompanyDetailPage } from "./company-detail";
import { CompanyExtendedPanels } from "./company-extended-panels";
import { CompanyOwnershipPanel } from "./company-ownership-panel";

export function CompanyDetailShell() {
  const params = useParams();
  const companyId = typeof params?.id === "string" ? params.id : "";

  return (
    <div className="space-y-8">
      <CompanyDetailPage />
      {companyId ? (
        <>
          <CompanyOwnershipPanel companyId={companyId} />
          <CompanyExtendedPanels companyId={companyId} />
        </>
      ) : null}
    </div>
  );
}
