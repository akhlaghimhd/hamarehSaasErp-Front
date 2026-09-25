/**
 * FE-ORG — فهرست سراسری شعب
 * Emergency stub — full implementation being restored.
 */
"use client";

import { PageHeader } from "@/shared/components/layout/page-header";
import { GitBranch } from "lucide-react";

export function BranchesListPage() {
  return (
    <div className="space-y-4 p-1">
      <PageHeader
        title="شعب / سایت"
        icon={<GitBranch className="h-4 w-4" />}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "شعب" },
        ]}
      />
      <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
        در حال بازگردانی فهرست کامل شعب و عملیات گروهی… صفحه را چند لحظه دیگر تازه کنید.
      </div>
    </div>
  );
}
