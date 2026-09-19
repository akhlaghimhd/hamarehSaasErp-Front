/** Display labels for permission module_name (DB may still store English keys). */

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
  documentmanagement: "مدیریت اسناد",
  Manufacturing: "تولید",
  manufacturing: "تولید",
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

export function localizeModuleName(name?: string | null): string {
  const raw = (name ?? "").trim();
  if (!raw) return "سایر";
  return MODULE_FA[raw] ?? MODULE_FA[raw.toLowerCase()] ?? raw;
}
