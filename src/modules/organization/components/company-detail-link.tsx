"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  COMPANY_DETAIL_HREF,
  setCompanyFocus,
  type CompanyDetailFrom,
} from "../lib/company-ref";

/** Link to company detail without putting ids/codes in the URL. */
export function CompanyDetailLink({
  companyId,
  from = "companies",
  className,
  children,
}: {
  companyId: string;
  from?: CompanyDetailFrom;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={COMPANY_DETAIL_HREF}
      className={className}
      onClick={() => setCompanyFocus(companyId, from)}
    >
      {children}
    </Link>
  );
}
