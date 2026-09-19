/** Display labels for permission module_name and action types (DB may still store English keys). */

const MODULE_FA: Record<string, string> = {
  Identity: "هویت و دسترسی",
  identity: "هویت و دسترسی",
  Accounting: "حسابداری",
  accounting: "حسابداری",
  Inventory: "انبار",
  inventory: "انبار",
  MasterData: "داده‌های پایه",
  masterdata: "داده‌های پایه",
  "Master Data": "داده‌های پایه",
  Organization: "سازمان",
  organization: "سازمان",
  PartnerLayer: "لایه شریک",
  partnerlayer: "لایه شریک",
  Partner: "لایه شریک",
  ProcurementSales: "خرید و فروش",
  procurementsales: "خرید و فروش",
  Procurement: "خرید و فروش",
  Sales: "خرید و فروش",
  SaasAdmin: "مدیریت پلتفرم",
  saasadmin: "مدیریت پلتفرم",
  SaasPlatform: "پلتفرم SaaS",
  saasplatform: "پلتفرم SaaS",
  Workflow: "گردش کار",
  workflow: "گردش کار",
  DocumentManagement: "مدیریت اسناد",
  Manufacturing: "تولید",
  "هویت و دسترسی": "هویت و دسترسی",
  حسابداری: "حسابداری",
  انبار: "انبار",
  "داده‌های پایه": "داده‌های پایه",
  سازمان: "سازمان",
  "لایه شریک": "لایه شریک",
  "خرید و فروش": "خرید و فروش",
  "مدیریت پلتفرم": "مدیریت پلتفرم",
  "گردش کار": "گردش کار",
};

const ACTION_FA: Record<string, string> = {
  READ: "مشاهده",
  CREATE: "ایجاد",
  UPDATE: "ویرایش",
  DELETE: "حذف",
  EXECUTE: "اجرا",
  view: "مشاهده",
  create: "ایجاد",
  update: "ویرایش",
  delete: "حذف",
  post: "ثبت نهایی",
  confirm: "تأیید",
  approve: "تأیید",
  submit: "ارسال",
  assign: "تخصیص",
  manage: "مدیریت",
  restore: "بازگردانی",
  start: "شروع",
  complete: "انجام",
};

export function localizeModuleName(name?: string | null): string {
  const raw = (name ?? "").trim();
  if (!raw) return "سایر";
  return MODULE_FA[raw] ?? MODULE_FA[raw.toLowerCase()] ?? raw;
}

/** Short pale secondary label next to permission title (action type). */
export function actionTypeLabel(
  actionType?: string | null,
  code?: string | null
): string {
  if (actionType) {
    const key = actionType.trim();
    if (ACTION_FA[key]) return ACTION_FA[key];
    if (ACTION_FA[key.toUpperCase()]) return ACTION_FA[key.toUpperCase()];
  }
  if (code) {
    const suffix = code.split(".").pop() ?? "";
    if (ACTION_FA[suffix]) return ACTION_FA[suffix];
  }
  return "";
}

/** If API still returns English name, build a Persian fallback from code. */
export function displayPermissionName(
  name?: string | null,
  code?: string | null
): string {
  const n = (name ?? "").trim();
  const hasPersian = /[\u0600-\u06FF]/.test(n);
  if (n && hasPersian) return n;
  if (!code) return n || "—";
  const parts = code.split(".");
  const action = parts[parts.length - 1] ?? "";
  const entity = (parts[parts.length - 2] ?? parts[0] ?? "").replace(
    /[-_]/g,
    " "
  );
  const a = ACTION_FA[action] ?? action;
  return `${a} ${entity}`.trim();
}
