/** Organization module DTOs — aligned with Backend Layer 5 (P0–P7) */

export type OrganizationPermissionCode =
  | "organization.company.view"
  | "organization.company.create"
  | "organization.company.update"
  | "organization.company.delete"
  | "organization.branch.view"
  | "organization.branch.create"
  | "organization.branch.update"
  | "organization.branch.delete"
  | "organization.department.view"
  | "organization.department.create"
  | "organization.department.update"
  | "organization.department.delete";

export const OrganizationPermissions = {
  companyView: "organization.company.view",
  companyCreate: "organization.company.create",
  companyUpdate: "organization.company.update",
  companyDelete: "organization.company.delete",
  branchView: "organization.branch.view",
  branchCreate: "organization.branch.create",
  branchUpdate: "organization.branch.update",
  branchDelete: "organization.branch.delete",
  departmentView: "organization.department.view",
  departmentCreate: "organization.department.create",
  departmentUpdate: "organization.department.update",
  departmentDelete: "organization.department.delete",
} as const;

export type EntityKind = "OPERATING" | "CONSOLIDATION" | "ELIMINATION";

export type ConsolRateType = "CURRENT" | "AVERAGE" | "HISTORICAL";

export type BranchKind =
  | "OFFICE"
  | "PLANT"
  | "WAREHOUSE_SITE"
  | "DISTRIBUTION"
  | "MIXED";

export type CompanyDto = {
  company_id: string;
  tenant_id: string;
  code: string;
  name: string;
  legal_name?: string | null;
  trade_name?: string | null;
  company_type?: number | null;
  registration_number?: string | null;
  registration_date?: string | null;
  registration_place?: string | null;
  incorporation_country_id?: string | null;
  economic_code?: string | null;
  tax_identifier?: string | null;
  national_id?: string | null;
  vat_registration?: string | null;
  is_active: boolean;
  status?: number | null;
  is_primary?: boolean;
  parent_company_id?: string | null;
  entity_kind?: EntityKind | string | null;
  base_currency_id?: string | null;
  chart_of_accounts_id?: string | null;
  default_consol_rate_type?: ConsolRateType | string | null;
  row_version?: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BranchDto = {
  branch_id: string;
  tenant_id: string;
  company_id: string;
  code: string;
  name: string;
  address?: string | null;
  branch_kind?: BranchKind | string | null;
  parent_branch_id?: string | null;
  default_warehouse_id?: string | null;
  supports_shipping?: boolean;
  supports_receiving?: boolean;
  is_manufacturing_site?: boolean;
  is_active: boolean;
  row_version?: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DepartmentDto = {
  department_id: string;
  tenant_id: string;
  company_id?: string | null;
  branch_id: string;
  parent_department_id?: string | null;
  code: string;
  name: string;
  manager_user_id?: string | null;
  is_active: boolean;
  row_version?: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateCompanyPayload = {
  code: string;
  name: string;
  legal_name?: string | null;
  trade_name?: string | null;
  company_type?: number | null;
  registration_number?: string | null;
  registration_date?: string | null;
  registration_place?: string | null;
  incorporation_country_id?: string | null;
  economic_code?: string | null;
  tax_identifier?: string | null;
  national_id?: string | null;
  vat_registration?: string | null;
  is_active?: boolean;
  status?: number | null;
  is_primary?: boolean;
  parent_company_id?: string | null;
  entity_kind?: EntityKind | string | null;
  base_currency_id?: string | null;
  chart_of_accounts_id?: string | null;
  default_consol_rate_type?: ConsolRateType | string | null;
};

export type UpdateCompanyPayload = CreateCompanyPayload;

export type CreateBranchPayload = {
  company_id: string;
  code: string;
  name: string;
  address?: string | null;
  is_active?: boolean;
  branch_kind?: BranchKind | string | null;
  parent_branch_id?: string | null;
  default_warehouse_id?: string | null;
  supports_shipping?: boolean;
  supports_receiving?: boolean;
  is_manufacturing_site?: boolean;
};

export type UpdateBranchPayload = {
  code: string;
  name: string;
  address?: string | null;
  is_active?: boolean;
  branch_kind?: BranchKind | string | null;
  parent_branch_id?: string | null;
  default_warehouse_id?: string | null;
  supports_shipping?: boolean;
  supports_receiving?: boolean;
  is_manufacturing_site?: boolean;
  company_id?: string | null;
};

export type CreateDepartmentPayload = {
  branch_id: string;
  code: string;
  name: string;
  parent_department_id?: string | null;
  manager_user_id?: string | null;
  is_active?: boolean;
};

export type UpdateDepartmentPayload = {
  code: string;
  name: string;
  parent_department_id?: string | null;
  manager_user_id?: string | null;
  is_active?: boolean;
  branch_id?: string | null;
};

/** Short labels for tables/chips */
export const ENTITY_KIND_LABELS: Record<string, string> = {
  OPERATING: "شرکت عملیاتی",
  CONSOLIDATION: "سطح تجمیع گروه",
  ELIMINATION: "حذف معاملات درون‌گروه",
};

/** One-line help under each option (user-facing) */
export const ENTITY_KIND_DESCRIPTIONS: Record<string, string> = {
  OPERATING:
    "کسب‌وکار واقعی؛ فروش، خرید و عملیات روزمره روی این شرکت ثبت می‌شود. برای بیشتر سازمان‌ها همین گزینه کافی است.",
  CONSOLIDATION:
    "ردیف کمکی برای گزارش تجمیعی هلدینگ؛ معمولاً خودش عملیات روزمره ندارد.",
  ELIMINATION:
    "فقط برای حذف اثر معاملات بین شرکت‌های هم‌گروه در تلفیق مالی (پیشرفته).",
};

export const ENTITY_KIND_FIELD_LABEL = "نقش شرکت در گروه";

export const ENTITY_KIND_FIELD_HINT =
  "اگر یک شرکت معمولی دارید، «شرکت عملیاتی» را انتخاب کنید. دو گزینه دیگر مخصوص هلدینگ و گزارش تلفیقی‌اند و بعداً می‌توانند با پلن اشتراک محدود شوند.";

export const BRANCH_KIND_LABELS: Record<string, string> = {
  OFFICE: "دفتر",
  PLANT: "کارخانه",
  WAREHOUSE_SITE: "سایت انبار",
  DISTRIBUTION: "توزیع",
  MIXED: "ترکیبی",
};

export const STATUS_LABELS: Record<number, string> = {
  1: "فعال",
  2: "معلق",
  3: "در حال انحلال",
  4: "منحل‌شده",
};
