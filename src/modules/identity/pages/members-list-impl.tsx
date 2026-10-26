"use client";

import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";

/**
 * صفحهٔ فهرست کاربران روی develop ناقص شده بود.
 * نسخهٔ کامل تأییدشده با جدول/بالک/گیت Holding در کامیت:
 *   401be2a22d75aa8ff84b43a5674dae5bf51c712c
 *
 * بازیابی (روی لوکال Front):
 *   git fetch origin
 *   git checkout 401be2a22d75aa8ff84b43a5674dae5bf51c712c -- src/modules/identity/pages/members-list-impl.tsx
 *   git add src/modules/identity/pages/members-list-impl.tsx
 *   git commit -m "fix(identity): restore full members-list UI (table/columns/bulk) keeping holding gates"
 *   git push origin develop
 */
export function MembersListPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="کاربران سازمان"
        description="بازیابی رابط کامل از history در حال انجام است"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "کاربران" },
        ]}
      />
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">جدول این صفحه موقتاً از history گیت بازیابی می‌شود.</p>
        <p className="mt-1 text-xs leading-relaxed">
          فایل کامل (ستون‌ها، بالک، فیلتر شرکت، گیت Holding) در کامیت
          <code className="mx-1 rounded bg-amber-100 px-1">401be2a</code>
          موجود است. لطفاً دستور بازیابی را از گزارش عامل اجرا کنید تا ظاهر تأییدشده برگردد.
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => window.location.reload()}>
        تلاش مجدد
      </Button>
    </div>
  );
}
