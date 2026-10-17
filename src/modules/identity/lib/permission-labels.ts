/** Persian display helpers for permissions (module, title, description, use-case group). */

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
  Finance: "حسابداری مالی",
  finance: "حسابداری مالی",
  FinancialAccounting: "حسابداری مالی",
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
  "حسابداری مالی": "حسابداری مالی",
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
  manage: "مدیریت و اجرا",
  restore: "بازگردانی",
  start: "شروع",
  complete: "انجام",
  reverse: "برگشت از ثبت",
  close: "بستن",
  reopen: "بازگشایی",
  depreciate: "استهلاک",
  decide: "تصمیم",
  nl: "پیش‌نویس هوشمند",
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
  finance: "حسابداری مالی",
  journal: "اسناد حسابداری",
  coa: "سرفصل حساب‌ها",
  period: "دوره مالی",
  report: "گزارش‌های مالی",
  treasury: "خزانه‌داری",
  ar: "حساب‌های دریافتنی",
  ap: "حساب‌های پرداختنی",
  fa: "دارایی ثابت",
  ic: "بین‌شرکتی",
  moodian: "سامانه مؤدیان",
  compliance: "انطباق و هشدار",
  suggest: "پیشنهاد سند",
  smart: "دستیار هوشمند",
  cheque: "چک",
  recon: "مغایرت‌گیری بانکی",
  numbering: "شماره‌گذاری اسناد",
};

const CODE_TITLE_FA: Record<string, string> = {
  "finance.ap.view": "مشاهده حساب‌های پرداختنی",
  "finance.ap.manage": "مدیریت حساب‌های پرداختنی",
  "finance.ar.view": "مشاهده حساب‌های دریافتنی",
  "finance.ar.manage": "مدیریت حساب‌های دریافتنی",
  "finance.journal.view": "مشاهده اسناد حسابداری",
  "finance.journal.create": "ایجاد پیش‌نویس سند حسابداری",
  "finance.journal.update": "ویرایش پیش‌نویس سند حسابداری",
  "finance.journal.delete": "حذف پیش‌نویس سند حسابداری",
  "finance.journal.post": "ثبت قطعی سند حسابداری",
  "finance.journal.reverse": "برگشت از ثبت سند حسابداری",
  "finance.coa.view": "مشاهده سرفصل حساب‌ها",
  "finance.coa.create": "ایجاد سرفصل حساب",
  "finance.coa.update": "ویرایش سرفصل حساب",
  "finance.coa.delete": "حذف سرفصل حساب",
  "finance.period.view": "مشاهده دوره‌ها و وضعیت بستن",
  "finance.period.close": "بستن دوره مالی",
  "finance.period.reopen": "بازگشایی دوره مالی",
  "finance.report.view": "مشاهده گزارش‌های مالی",
  "finance.treasury.view": "مشاهده خزانه‌داری",
  "finance.treasury.manage": "مدیریت اسناد خزانه",
  "finance.treasury.post": "ثبت نهایی اسناد خزانه",
  "finance.tax.view": "مشاهده مالیات و نرخ‌ها",
  "finance.tax.manage": "مدیریت پیکربندی مالیات",
  "finance.moodian.view": "مشاهده ارسال‌های سامانه مؤدیان",
  "finance.moodian.submit": "ارسال به سامانه مؤدیان",
  "finance.compliance.view": "مشاهده هشدارهای انطباق",
  "finance.compliance.manage": "مدیریت هشدارهای انطباق",
  "finance.suggest.view": "مشاهده پیشنهادهای سند",
  "finance.suggest.manage": "مدیریت پیشنهادهای سند",
  "finance.suggest.decide": "تأیید یا رد پیشنهاد سند",
  "finance.fa.view": "مشاهده دارایی‌های ثابت",
  "finance.fa.manage": "مدیریت دارایی‌های ثابت",
  "finance.fa.depreciate": "ثبت استهلاک دارایی ثابت",
  "finance.ic.view": "مشاهده عملیات بین‌شرکتی",
  "finance.ic.manage": "مدیریت عملیات بین‌شرکتی",
  "finance.smart.view": "مشاهده دستیار هوشمند مالی",
  "finance.smart.decide": "تصمیم روی پیشنهاد دستیار هوشمند",
  "finance.smart.nl": "پیش‌نویس سند با زبان طبیعی",
};

const CODE_DESC_FA: Record<string, string> = {
  "finance.ap.view":
    "اجازه می‌دهد فهرست بدهی‌ها به تأمین‌کنندگان، فاکتورهای خرید باز، و وضعیت تسویه را فقط ببینید. بدون این مجوز صفحه حساب‌های پرداختنی در دسترس نیست. امکان ثبت پرداخت یا تغییر مانده وجود ندارد.",
  "finance.ap.manage":
    "اجازه می‌دهد علاوه بر مشاهده، پرداخت‌ها و تعدیلات مربوط به بستانکاران را ثبت و پیگیری کنید. روی مانده بدهی شرکت و گزارش‌های تعهدات اثر مستقیم دارد؛ فقط به افراد مسئول تسویه با تأمین‌کننده داده شود.",
  "finance.ar.view":
    "اجازه می‌دهد مطالبات از مشتریان، فاکتورهای فروش باز و وضعیت وصول را فقط مشاهده کنید. بدون آن صفحه حساب‌های دریافتنی قفل است و تغییری در وصول ثبت نمی‌شود.",
  "finance.ar.manage":
    "اجازه می‌دهد وصول مطالبات، تخصیص دریافت‌ها و تعدیل مانده مشتریان را انجام دهید. مستقیماً روی نقدینگی و گزارش فروش اعتباری اثر می‌گذارد.",
  "finance.journal.view":
    "مشاهده فهرست اسناد حسابداری (پیش‌نویس، ثبت‌شده و برگشتی) و جزئیات سطرها. بدون مجوز ایجاد یا ثبت قطعی؛ فقط خواندن برای کنترل و گزارش.",
  "finance.journal.create":
    "ایجاد پیش‌نویس سند حسابداری جدید برای شرکت‌هایی که مجاز به عملیات هستید. تا وقتی ثبت قطعی نشود در دفتر کل اثر ندارد.",
  "finance.journal.update":
    "ویرایش پیش‌نویس‌های ذخیره‌شده (تاریخ، شرح، سطرها). اسناد ثبت‌شده با این مجوز قابل تغییر نیستند.",
  "finance.journal.delete":
    "حذف نرم پیش‌نویس‌هایی که خودتان ایجاد کرده‌اید (با رعایت قوانین سیستمی). اسناد ثبت‌شده حذف نمی‌شوند.",
  "finance.journal.post":
    "ثبت قطعی پیش‌نویس و انتقال مبالغ به دفتر کل و گزارش‌ها. برگشت فقط با مجوز برگشت از ثبت ممکن است؛ این مجوز حساس است.",
  "finance.journal.reverse":
    "صدور سند برگشتی برای اسناد ثبت‌شده و خنثی‌کردن اثر آن‌ها در دفتر کل. برای اصلاح اشتباهات پس از ثبت قطعی استفاده می‌شود.",
  "finance.coa.view":
    "مشاهده درخت سرفصل حساب‌ها و جزئیات هر حساب. برای گزارش و انتخاب حساب در اسناد لازم است؛ تغییری در ساختار حساب ایجاد نمی‌کند.",
  "finance.coa.create":
    "افزودن حساب جدید در سلسله‌مراتب سرفصل. روی کدینگ و گزارش‌های آتی اثر دارد؛ فقط افراد مسلط به ساختار حسابداری.",
  "finance.coa.update":
    "ویرایش نام و ویژگی‌های حساب‌های غیرریشه. حساب ریشه سیستم قفل است و قابل ویرایش نیست.",
  "finance.coa.delete":
    "حذف نرم حساب‌هایی که در اسناد استفاده نشده‌اند. حساب ریشه و حساب‌های دارای گردش قابل حذف نیستند.",
  "finance.period.view":
    "مشاهده وضعیت دوره‌های مالی و چک‌لیست بستن دوره. برای برنامه‌ریزی بستن ماه/سال بدون انجام خود بستن.",
  "finance.period.close":
    "اجرای بستن دوره پس از رفع موارد مسدودکننده. پس از بستن، ثبت سند عملیاتی در آن دوره محدود می‌شود.",
  "finance.period.reopen":
    "بازگشایی دوره بسته‌شده برای اصلاح اضطراری. باید با کنترل مدیریتی استفاده شود چون دوباره امکان ثبت باز می‌شود.",
  "finance.report.view":
    "دسترسی به تراز آزمایشی، سود و زیان، ترازنامه و گزارش‌های مشابه در محدوده شرکت‌های مجاز شما.",
  "finance.treasury.view":
    "مشاهده اسناد خزانه، صندوق و وضعیت نقدینگی بدون امکان ثبت یا تأیید پرداخت.",
  "finance.treasury.manage":
    "ایجاد و ویرایش اسناد دریافت و پرداخت خزانه تا مرحله قبل از ثبت نهایی.",
  "finance.treasury.post":
    "ثبت نهایی اسناد خزانه و اثرگذاری روی موجودی نقد و بانک. مجوز حساس مالی است.",
  "finance.tax.view":
    "مشاهده نرخ‌ها و تراکنش‌های مالیاتی ثبت‌شده برای گزارش و کنترل.",
  "finance.tax.manage":
    "تعریف و به‌روزرسانی نرخ و بازه اعتبار مالیات. روی محاسبه مالیات اسناد بعدی اثر می‌گذارد.",
  "finance.moodian.view":
    "مشاهده وضعیت ارسال صورتحساب‌ها به سامانه مؤدیان و پیام خطا در صورت رد.",
  "finance.moodian.submit":
    "ارسال یا تلاش مجدد ارسال صورتحساب به سامانه مؤدیان. مسئولیت قانونی ارسال با دارنده این مجوز است.",
  "finance.compliance.view":
    "مشاهده هشدارهای انطباق مالی (مثلاً ناترازی یا دوره باز) بدون رفع آن‌ها.",
  "finance.compliance.manage":
    "رفع، بستن یا پیگیری هشدارهای انطباق پس از اقدام اصلاحی.",
  "finance.suggest.view":
    "مشاهده پیشنهادهای خودکار سند که از رویدادهای عملیاتی آمده‌اند.",
  "finance.suggest.manage":
    "مدیریت صف پیشنهادها (اولویت، توضیح) قبل از تصمیم نهایی.",
  "finance.suggest.decide":
    "پذیرش یا رد پیشنهاد سند؛ در صورت پذیرش ممکن است پیش‌نویس سند ساخته شود.",
  "finance.fa.view":
    "مشاهده کارت دارایی ثابت، بهای تمام‌شده و استهلاک انباشته.",
  "finance.fa.manage":
    "ثبت و به‌روزرسانی دارایی ثابت (خرید، انتقال، خروج).",
  "finance.fa.depreciate":
    "اجرای محاسبه و ثبت سند استهلاک دوره‌ای برای دارایی‌های مشمول.",
  "finance.ic.view":
    "مشاهده تراکنش‌ها و وضعیت تطبیق بین شرکت‌های گروه.",
  "finance.ic.manage":
    "ثبت و مدیریت اسناد و قواعد بین‌شرکتی در چارچوب دسترسی هلدینگ.",
  "finance.smart.view":
    "مشاهده پیشنهادها و بینش‌های دستیار هوشمند مالی.",
  "finance.smart.decide":
    "تأیید یا رد پیشنهادهای دستیار هوشمند برای اعمال در سیستم.",
  "finance.smart.nl":
    "ساخت پیش‌نویس سند از توضیح متنی به زبان طبیعی؛ نتیجه همچنان نیاز به بررسی و ثبت دارد.",
};

export const MODULE_ICONS: Record<string, LucideIcon> = {
  "هویت و دسترسی": Shield,
  حسابداری: Calculator,
  "حسابداری مالی": Calculator,
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

const USE_CASE_ORDER: string[] = [
  "کاربران و عضویت",
  "نقش‌ها و تخصیص",
  "کاتالوگ مجوزها",
  "محدوده دسترسی (Scope)",
  "پروفایل",
  "امنیت و حاکمیت دسترسی",
  "شرکت‌ها",
  "شعب",
  "واحدهای سازمانی",
  "مالکیت و اطلاعات حقوقی شرکت",
  "واحد کسب‌وکار و مرکز هزینه",
  "سلسله‌مراتب",
  "ساختار فروش و خرید",
  "بین‌شرکتی و تلفیق",
  "طرف تجاری",
  "کاربران و تخصیص سازمان",
  "توافق و کمیسیون",
  "تسویه و پرداخت",
  "مخاطب، سند و حساب بانکی",
  "سابقه فعالیت",
  "اسناد حسابداری",
  "سرفصل حساب‌ها",
  "دوره مالی و بستن",
  "گزارش‌های مالی",
  "خزانه‌داری",
  "حساب‌های دریافتنی",
  "حساب‌های پرداختنی",
  "مالیات و سامانه مؤدیان",
  "دارایی ثابت",
  "بین‌شرکتی مالی",
  "انطباق و پیشنهاد سند",
  "دستیار هوشمند",
  "سایر",
];

export function localizeModuleName(name?: string | null): string {
  const raw = (name ?? "").trim();
  if (!raw) return "سایر";
  return MODULE_FA[raw] ?? MODULE_FA[raw.toLowerCase()] ?? raw;
}

export function moduleIcon(moduleName?: string | null): LucideIcon {
  const fa = localizeModuleName(moduleName);
  return MODULE_ICONS[fa] ?? LayoutGrid;
}

export function permissionUseCaseGroup(
  code?: string | null,
  _moduleName?: string | null
): string {
  const c = (code ?? "").toLowerCase().trim();

  if (c.startsWith("identity.user") || c.startsWith("identity.membership")) {
    return "کاربران و عضویت";
  }
  if (c.startsWith("identity.role")) return "نقش‌ها و تخصیص";
  if (c.startsWith("identity.permission")) return "کاتالوگ مجوزها";
  if (c.startsWith("identity.scope")) return "محدوده دسترسی (Scope)";
  if (c.startsWith("identity.profile")) return "پروفایل";
  if (
    c.startsWith("identity.sod") ||
    c.startsWith("identity.mfa") ||
    c.startsWith("identity.access_cert") ||
    c.startsWith("identity.privileged") ||
    c.startsWith("identity.sso")
  ) {
    return "امنیت و حاکمیت دسترسی";
  }
  if (c.startsWith("identity.")) return "امنیت و حاکمیت دسترسی";

  if (c.startsWith("organization.company")) return "شرکت‌ها";
  if (c.startsWith("organization.branch")) return "شعب";
  if (c.startsWith("organization.department")) return "واحدهای سازمانی";
  if (
    c.startsWith("organization.ownership") ||
    c.startsWith("organization.fiscal") ||
    c.startsWith("organization.bank") ||
    c.startsWith("organization.officer")
  ) {
    return "مالکیت و اطلاعات حقوقی شرکت";
  }
  if (
    c.startsWith("organization.business_unit") ||
    c.startsWith("organization.cost_center")
  ) {
    return "واحد کسب‌وکار و مرکز هزینه";
  }
  if (c.startsWith("organization.hierarchy")) return "سلسله‌مراتب";
  if (
    c.startsWith("organization.sales_org") ||
    c.startsWith("organization.purch_org") ||
    c.startsWith("organization.sales_structure")
  ) {
    return "ساختار فروش و خرید";
  }
  if (
    c.startsWith("organization.intercompany") ||
    c.startsWith("organization.consolidation") ||
    c.startsWith("organization.structure")
  ) {
    return "بین‌شرکتی و تلفیق";
  }
  if (c.startsWith("organization.")) return "سایر";

  if (c.startsWith("partner.partner_user")) return "کاربران و تخصیص سازمان";
  if (c.startsWith("partner.assignment")) return "کاربران و تخصیص سازمان";
  if (c.startsWith("partner.partner")) return "طرف تجاری";
  if (
    c.startsWith("partner.agreement") ||
    c.startsWith("partner.commission_rule") ||
    c.startsWith("partner.commission")
  ) {
    return "توافق و کمیسیون";
  }
  if (c.startsWith("partner.payout")) return "تسویه و پرداخت";
  if (
    c.startsWith("partner.contact") ||
    c.startsWith("partner.document") ||
    c.startsWith("partner.bank_account")
  ) {
    return "مخاطب، سند و حساب بانکی";
  }
  if (c.startsWith("partner.activity")) return "سابقه فعالیت";
  if (c.startsWith("partner.")) return "سایر";

  if (c.startsWith("finance.journal")) return "اسناد حسابداری";
  if (c.startsWith("finance.coa")) return "سرفصل حساب‌ها";
  if (c.startsWith("finance.period")) return "دوره مالی و بستن";
  if (c.startsWith("finance.report")) return "گزارش‌های مالی";
  if (c.startsWith("finance.treasury") || c.startsWith("finance.cheque")) {
    return "خزانه‌داری";
  }
  if (c.startsWith("finance.ar")) return "حساب‌های دریافتنی";
  if (c.startsWith("finance.ap")) return "حساب‌های پرداختنی";
  if (c.startsWith("finance.tax") || c.startsWith("finance.moodian")) {
    return "مالیات و سامانه مؤدیان";
  }
  if (c.startsWith("finance.fa")) return "دارایی ثابت";
  if (c.startsWith("finance.ic")) return "بین‌شرکتی مالی";
  if (c.startsWith("finance.compliance") || c.startsWith("finance.suggest")) {
    return "انطباق و پیشنهاد سند";
  }
  if (c.startsWith("finance.smart")) return "دستیار هوشمند";
  if (c.startsWith("finance.")) return "سایر";

  const parts = c.split(".");
  if (parts.length >= 2) {
    const entity = parts[1]?.replace(/[-_]/g, " ") ?? "";
    if (entity) {
      const translated = translateWords(entity);
      if (!/[A-Za-z]{2,}/.test(translated)) return translated;
      return WORD_FA[entity] ?? "سایر";
    }
  }
  return "سایر";
}

export function sortUseCaseGroups(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const ia = USE_CASE_ORDER.indexOf(a);
    const ib = USE_CASE_ORDER.indexOf(b);
    const oa = ia === -1 ? 999 : ia;
    const ob = ib === -1 ? 999 : ib;
    if (oa !== ob) return oa - ob;
    return a.localeCompare(b, "fa");
  });
}

function translateWords(raw: string): string {
  const parts = raw
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  return parts.map((w) => WORD_FA[w] ?? w).join(" ");
}

export function displayPermissionName(
  name?: string | null,
  code?: string | null
): string {
  const codeKey = (code ?? "").trim().toLowerCase();
  if (codeKey && CODE_TITLE_FA[codeKey]) return CODE_TITLE_FA[codeKey];

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
    if (built)
      return built.replace(
        /[A-Za-z]+/g,
        (m) => WORD_FA[m.toLowerCase()] ?? m
      );
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

export function displayPermissionDescription(
  description?: string | null,
  name?: string | null,
  code?: string | null
): string {
  const title = displayPermissionName(name, code);
  const codeKey = (code ?? "").trim().toLowerCase();
  const fromDb = (description ?? "").trim();

  if (
    fromDb &&
    fromDb.length >= 40 &&
    fromDb !== title &&
    fromDb !== name?.trim()
  ) {
    return fromDb;
  }
  if (codeKey && CODE_DESC_FA[codeKey]) return CODE_DESC_FA[codeKey];

  return `با داشتن این مجوز، کاربر می‌تواند عملیات «${title}» را در محدوده شرکت و نقش خود انجام دهد. نبود این مجوز، دکمه و منوی مربوط را در رابط کاربری پنهان می‌کند و API نیز دسترسی را رد می‌کند.`;
}
