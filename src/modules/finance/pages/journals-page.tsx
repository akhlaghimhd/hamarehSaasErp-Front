"use client";

/**
 * RECOVERY REQUIRED
 * -----------------
 * This file was accidentally overwritten during a large-file push.
 * Restore from known-good commit then apply the UX patch already on develop:
 *
 *   git fetch origin
 *   git checkout da7222c8efadde41ac6f11356980615237cef338 -- src/modules/finance/pages/journals-page.tsx
 *   git apply patches/finance-journals-list-ux.patch
 *   git add src/modules/finance/pages/journals-page.tsx
 *   git commit -m "fix(finance): restore journals page + list UX fixes"
 *   git push origin develop
 */

export function JournalsPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4 p-8 text-center" dir="rtl">
      <h1 className="text-lg font-semibold">بازیابی صفحه اسناد حسابداری</h1>
      <p className="text-sm text-muted-foreground leading-7">
        فایل صفحه به‌خاطر محدودیت اندازهٔ push خراب شده است. از ریشهٔ مخزن Front این دستورها را اجرا کنید
        (فقط git — بدون artifacts):
      </p>
      <pre className="rounded-lg border bg-muted/40 p-4 text-left text-xs leading-6 overflow-x-auto" dir="ltr">
{`git fetch origin
git checkout da7222c8efadde41ac6f11356980615237cef338 -- src/modules/finance/pages/journals-page.tsx
git apply patches/finance-journals-list-ux.patch
git add src/modules/finance/pages/journals-page.tsx
git commit -m "fix(finance): restore journals page + list UX fixes"
git push origin develop`}
      </pre>
      <p className="text-xs text-muted-foreground">
        پچ روی develop موجود است:{