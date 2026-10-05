"use client";

import { CompanyDetailPage } from "./company-detail";

/**
 * Route entry for /dashboard/organization/companies/detail.
 * Panels (address/contact, ownership, extended) live inside CompanyDetailPage —
 * do not re-render them here or they appear twice.
 */
export function CompanyDetailShell() {
  return <CompanyDetailPage />;
}
