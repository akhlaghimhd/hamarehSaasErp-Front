/**
 * FE-ORG — جزئیات شرکت
 * Emergency stub — full implementation being restored.
 */
"use client";

import { PageHeader } from "@/shared/components/layout/page-header";

export function CompanyDetailPage() {
  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="جزئیات شرکت"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "شرکت‌ها", href: "/dashboard/organization/companies" },
          { label: "جزئیات" },
        ]}
      />
      <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
        در حال بازگردانی صفحه جزئیات شرکت… صفحه را چند لحظه دیگر تازه کنید.
      </div>
    </div>
  );
}
