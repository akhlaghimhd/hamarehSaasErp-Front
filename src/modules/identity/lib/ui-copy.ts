/**
 * User-facing Persian copy for Identity UI.
 * Prefer business language over technical terms (tenant → سازمان, owner → مدیر اصلی).
 * Do not expose internal IDs or permission codes in the UI.
 */

export const ACTION_TYPE_FA: Record<string, string> = {
  CREATE: "ایجاد",
  READ: "مشاهده",
  UPDATE: "ویرایش",
  DELETE: "حذف",
  APPROVE: "تأیید",
  EXECUTE: "اجرا",
};

export const SCOPE_TYPE_FA: Record<string, string> = {
  COMPANY: "شرکت",
  BRANCH: "شعبه",
  WAREHOUSE: "انبار",
  DEPARTMENT: "واحد سازمانی",
  COST_CENTER: "مرکز هزینه",
  CUSTOM: "سفارشی",
};

export function actionTypeLabel(code?: string | null): string {
  if (!code) return "—";
  return ACTION_TYPE_FA[code] ?? code;
}

export function scopeTypeLabel(code?: string | null): string {
  if (!code) return "—";
  return SCOPE_TYPE_FA[String(code).toUpperCase()] ?? String(code);
}

/** Friendly message when user lacks access (no internal permission codes). */
export const MSG_NO_ACCESS =
  "برای مشاهده این بخش مجوز لازم را ندارید. در صورت نیاز با مدیر اصلی سازمان هماهنگ کنید.";

export const MSG_GENERIC_ERROR =
  "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";

export const MSG_LOAD_ERROR =
  "بارگذاری اطلاعات ممکن نشد. اتصال را بررسی کنید یا دوباره تلاش کنید.";
