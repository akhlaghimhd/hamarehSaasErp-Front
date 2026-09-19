/** Persian display helpers for permissions (module, title, module icon). */

import type { LucideIcon } from "lucide-react";
import {
  Calculator,
  Package,
  Database,
  Building2,
  Handshake,
  ShoppingCart,
  Shield,
  Workflow,
  LayoutGrid,
  Server,
} from "lucide-react";

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
  SaasPlatform: "مدیریت پلتفرم",
  saasplatform: "مدیریت پلتفرم",
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
};

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
  platform: "پلتفرم",
  master: "پایه",
  data: "داده",
};

/** Module header → Lucide icon (until permission.icon is stored in DB). */
export const MODULE_ICONS: Record<string, LucideIcon> = {
  "هویت و دسترسی": Shield,
  حسابداری: Calculator,
  انبار: Package,
  "داده‌های پایه": Database,
  سازمان: Building2,
  "شرکای تجاری": Handshake,
  "خرید و فروش": ShoppingCart,
  "مدیریت پلتفرم": Server,
  "گردش کار": Workflow,
  "مدیریت اسناد": LayoutGrid,
  تولید: Package,
};

export function localizeModuleName(name?: string | null): string {
  const raw = (name ?? "").trim();
  if (!raw) return "سایر";
  return MODULE_FA[raw] ?? MODULE_FA[raw.toLowerCase()] ?? raw;
}

export function moduleIcon(moduleName?: string | null): LucideIcon {
  const fa = localizeModuleName(moduleName);
  return MODULE_ICONS[fa] ?? LayoutGrid;
}

function translateWords(raw: string): string {
  const parts = raw
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return parts.map((w) => WORD_FA[w] ?? w).join(" ");
}

/** Always prefer pure Persian title; rebuild from code when Latin remains. */
export function displayPermissionName(
  name?: string | null,
  code?: string | null
): string {
  const n = (name ?? "").trim();
  const hasLatin = /[A-Za-z]{2,}/.test(n);

  if (n && !hasLatin) return n;

  if (code) {
    const parts = code.split(".");
    const action = parts[parts.length - 1] ?? "";
    const entityParts = parts.slice(0, -1);
    const entity =
      entityParts.length > 1
        ? entityParts.slice(1).join(" ")
        : entityParts[0] ?? "";
    const a = ACTION_FA[action] ?? action;
    const e = translateWords(entity);
    const built = `${a} ${e}`.replace(/\s+/g, " ").trim();
    if (built && !/[A-Za-z]{2,}/.test(built)) return built;
    if (built) return built.replace(/[A-Za-z]+/g, (m) => WORD_FA[m.toLowerCase()] ?? m);
  }

  if (n && hasLatin) {
    return n
      .split(/(\s+)/)
      .map((tok) => (/[A-Za-z]/.test(tok) ? translateWords(tok) : tok))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
  }

  return n || "—";
}
