"use client";

import { FileText } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";

/** Temporary stub while full UX2 payload is applied via scripts/apply_journals_ux2.py */
export function JournalsPage() {
  return (
    <div className="space-y-4 p-4" dir="rtl">
      <PageHeader
        title="اسناد حسابداری"
        description="در حال بازیابی صفحه کامل…"
        icon={<FileText className="h-4 w-4" />}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "اسناد" },
        ]}
      />
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">صفحه در حال بازیابی از گیت است.</p>
        <p className="mt-2 text-muted-foreground">
          پس از تکمیل parts، در ریشه فرانت اجرا کنید:
        </p>
        <pre className="mt-2 rounded bg-white/80 p-2 text-xs dir-ltr">python scripts/apply_journals_ux2.py</pre>
      </div>
    </div>
  );
}
