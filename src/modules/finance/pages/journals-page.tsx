"use client";

import { FileText } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";

/**
 * Temporary stub. Full page is on commit 052df6197ca66f3a7b9542d299e67493b219bc3b.
 * Restore locally:
 *   git fetch origin
 *   git checkout 052df6197ca66f3a7b9542d299e67493b219bc3b -- src/modules/finance/pages/journals-page.tsx
 * Then apply UX2 patch from patches/ once published.
 */
export function JournalsPage() {
  return (
    <div className="space-y-4 p-4" dir="rtl">
      <PageHeader
        title="اسناد حسابداری"
        description="بازیابی صفحه کامل از گیت…"
        icon={<FileText className="h-4 w-4" />}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "اسناد" },
        ]}
      />
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 space-y-2">
        <p className="font-medium">صفحه کامل موقتاً به stub تبدیل شده است (payload فشرده خراب بود).</p>
        <p>در ریشه فرانت این دستورها را بزنید تا نسخه سالم F1 برگردد:</p>
        <pre className="rounded bg-white/80 p-2 text-xs dir-ltr overflow-x-auto">{`git fetch origin
git checkout 052df6197ca66f3a7b9542d299e67493b219bc3b -- src/modules/finance/pages/journals-page.tsx`}</pre>
        <p className="text-muted-foreground">سپس گزارش دهید تا پچ UX2 (شماره فارسی، کامپکت، خروجی/ستون نزدیک جدول، لینک برگشت) اعمال شود.</p>
      </div>
    </div>
  );
}
