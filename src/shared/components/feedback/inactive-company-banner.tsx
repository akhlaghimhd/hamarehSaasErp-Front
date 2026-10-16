"use client";

import { AlertTriangle } from "lucide-react";
import { useIdentityHoldingAccess } from "@/modules/identity/hooks/use-identity-holding-access";

/**
 * Product B: company operator whose COMPANY scope is inactive can still log in
 * and read history, but must not operate. Show a clear persistent banner.
 */
export function InactiveCompanyBanner() {
  const { hasInactiveOperateCompany, isOwner } = useIdentityHoldingAccess();

  if (isOwner || !hasInactiveOperateCompany) {
    return null;
  }

  return (
    <div
      role="status"
      className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-foreground"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
      <div className="min-w-0 leading-relaxed">
        <p className="font-medium">شرکت شما غیرفعال است</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          ورود و مشاهده سوابق مجاز است، اما ثبت یا ویرایش عملیات روی این شرکت تا زمان فعال‌سازی مجدد ممکن نیست.
        </p>
      </div>
    </div>
  );
}
