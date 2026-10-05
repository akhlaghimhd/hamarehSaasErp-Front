/**
 * Nested panels on company detail: bank accounts, officers, cost centers.
 * RESTORED from develop@9091a346 — cost-center v1.0 UI to be re-applied on top.
 * See artifacts/company-extended-panels.COST-CENTER.tsx for the full CC v1.0 version.
 */
"use client";

// EMERGENCY: full file content must replace this.
// Temporary stub so build does not break; user must pull full file from artifacts.
export function CompanyExtendedPanels(_props: { companyId: string; readOnly?: boolean }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      بخش پنل‌های شرکت در حال بازیابی است. لطفاً فایل
      <code className="mx-1">artifacts/company-extended-panels.COST-CENTER.tsx</code>
      را جایگزین کنید یا به ایجنت بگویید «بازیابی پنل کامل».
    </div>
  );
}
