"use client";

import { EmptyState } from "@/shared/components/feedback/empty-state";
import { PageHeader } from "@/shared/components/layout/page-header";

/**
 * Remote temporarily incomplete due to file-size push limits.
 * Restore full page locally:
 *   git checkout b4167968d0fc7b7c4cf6da8ecadebdbe927078b7 -- src/modules/identity/pages/access-certification-detail.tsx
 */
export function AccessCertificationDetailPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="جزئیات بازبینی"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          {
            label: "بازبینی دسترسی",
            href: "/dashboard/identity/access-certifications",
          },
          { label: "جزئیات" },
        ]}
      />
      <EmptyState
        title="نسخهٔ کامل این صفحه را از گیت بازیابی کنید"
        description="در ریشهٔ Front این دستور را اجرا کنید: git checkout b4167968d0fc7b7c4cf6da8ecadebdbe927078b7 -- src/modules/identity/pages/access-certification-detail.tsx"
      />
    </div>
  );
}
