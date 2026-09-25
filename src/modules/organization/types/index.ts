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
  | "organization.department.delete"
  | "organization.business_unit.view"
  | "organization.business_unit.manage";

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
  businessUnitView: "organization.business_unit.view",
  businessUnitManage: "organization.business_unit.manage",
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
  /** List API withCount */
  branches_count?: number;
  departments_count?: number;
  children_count?: number;
  row_version?: number;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
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

/** Short labels for tables / option text */
export const ENTITY_KIND_LABELS: Record<string, string> = {
  OPERATING: "شرکت عملیاتی",
  CONSOLIDATION: "تجمیع گروه",
  ELIMINATION: "حذف معاملات داخلی گروه",
};

/** Tooltip text per option — end-user language only */
export const ENTITY_KIND_TOOLTIPS: Record<string, string> = {
  OPERATING:
    "روی این شرکت فروش، خرید و کارهای روزمره ثبت می‌شود. انتخاب مناسب برای اکثر سازمان‌ها.",
  CONSOLIDATION:
    "برای جمع‌زدن گزارش چند شرکت زیر یک هلدینگ. معمولاً سند عملیاتی روی آن ثبت نمی‌شود.",
  ELIMINATION:
    "برای خنثی‌کردن خرید و فروش بین شرکت‌های یک گروه در گزارش تلفیقی.",
};

/** Field title: what the user is choosing */
export const ENTITY_KIND_FIELD_LABEL = "کاربرد این شرکت";

export const ENTITY_KIND_OPTIONS: Array<{
  value: EntityKind;
  label: string;
  tooltip: string;
}> = [
  {
    value: "OPERATING",
    label: ENTITY_KIND_LABELS.OPERATING,
    tooltip: ENTITY_KIND_TOOLTIPS.OPERATING,
  },
  {
    value: "CONSOLIDATION",
    label: ENTITY_KIND_LABELS.CONSOLIDATION,
    tooltip: ENTITY_KIND_TOOLTIPS.CONSOLIDATION,
  },
  {
    value: "ELIMINATION",
    label: ENTITY_KIND_LABELS.ELIMINATION,
    tooltip: ENTITY_KIND_TOOLTIPS.ELIMINATION,
  },
];

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
