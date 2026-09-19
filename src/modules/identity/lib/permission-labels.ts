/** Persian display for permission module + permission titles (fallback when DB still mixed). */

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
  PartnerLayer: "شرکای تجاری",
  partnerlayer: "شرکای تجاری",
  Partner: "شرکای تجاری",
  partner: "شرکای تجاری",
  "لایه شریک": "شرکای تجاری",
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
  "شرکای تجاری": "شرکای تجاری",
  "خرید و فروش": "خرید و فروش",
  "مدیریت پلتفرم": "مدیریت پلتفرم",
  "گردش کار": "گردش کار",
};

const ACTION_FA: Record<string, string> = {
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
  READ: "مشاهده",
  CREATE: "ایجاد",
  UPDATE: "ویرایش",
  DELETE: "حذف",
  EXECUTE: "اجرا",
};

/** Word-level entity translation for code segments / leftover English in names. */
const WORD_FA: Record<string, string> = {
  user: "کاربر",
  users: "کاربران",
  role: "نقش",
  roles: "نقش‌ها",
  permission: "مجوز",
  permissions: "مجوزها",
  scope: "محدوده دسترسی",
  profile: "پروفایل",
  company: "شرکت",
  branch: "شعبه",
  department: "واحد سازمانی",
  partner: "طرف تجاری",
  partners: "طرف‌های تجاری",
  item: "قلم",
  items: "اقلام",
  warehouse: "انبار",
  document: "سند",
  documents: "اسناد",
  voucher: "سند حسابداری",
  account: "حساب",
  accounts: "حساب‌ها",
  invoice: "فاکتور",
  order: "سفارش",
  tax: "مالیات",
  transaction: "تراکنش",
  transactions: "تراکنش‌ها",
  cash: "نقدی",
  payment: "پرداخت",
  schedule: "برنامه",
  purchase: "خرید",
  sales: "فروش",
  salesorder: "سفارش فروش",
  receipt: "رسید",
  requisition: "درخواست",
  delivery: "حواله",
  quotation: "پیش‌فاکتور",
  return: "مرجوعی",
  tenant: "سازمان",
  plan: "طرح",
  subscription: "اشتراک",
  task: "وظیفه",
  instance: "نمونه",
  definition: "تعریف",
  workflow: "گردش‌کار",
  membership: "عضویت",
  history: "تاریخچه",
  business: "تجاری",
  contact: "مخاطب",
  commission: "کمیسیون",
  rule: "قاعده",
  payout: "تسویه",
  agreement: "توافق‌نامه",
  assignment: "تخصیص",
  bank: "بانکی",
  activity: "فعالیت",
  log: "لاگ",
  admin: "مدیریت",
  saas: "پلتفرم",
};

export function localizeModuleName(name?: string | null): string {
  const raw = (name ?? "").trim();
  if (!raw) return "سایر";
  return MODULE_FA[raw] ?? MODULE_FA[raw.toLowerCase()] ?? raw;
}

function translateWords(raw: string): string {
  const parts = raw
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return parts.map((w) => WORD_FA[w] ?? w).join(" ");
}

/**
 * Prefer DB Persian name. If name is missing, pure English, or mixed (FA action + EN entity),
 * rebuild from code with full Persian words.
 */
export function displayPermissionName(
  name?: string | null,
  code?: string | null
): string {
  const n = (name ?? "").trim();
  const hasPersian = /[\u0600-\u06FF]/.test(n);
  const hasLatin = /[A-Za-z]{2,}/.test(n);

  // Clean Persian-only title from DB
  if (n && hasPersian && !hasLatin) return n;

  if (code) {
    const parts = code.split(".");
    const action = parts[parts.length - 1] ?? "";
    const entityRaw = parts.slice(0, -1).join(".") || parts[0] || "";
    // drop module prefix if present (identity.user.view → user)
    const entityParts = entityRaw.split(".");
    const entity =
      entityParts.length > 1
        ? entityParts.slice(1).join(" ")
        : entityParts[0] ?? "";
    const a = ACTION_FA[action] ?? action;
    const e = translateWords(entity);
    const built = `${a} ${e}`.replace(/\s+/g, " ").trim();
    if (built) return built;
  }

  // Last resort: translate leftover English words inside name
  if (n) {
    if (hasLatin) {
      return n
        .split(/(\s+)/)
        .map((tok) =>
          /[A-Za-z]/.test(tok) ? translateWords(tok) : tok
        )
        .join("")
        .replace(/\s+/g, " ")
        .trim();
    }
    return n;
  }
  return "—";
}
