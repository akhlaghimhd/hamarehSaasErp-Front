/** Organization module DTOs — aligned with Backend Layer 5 */

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

export type CompanyDto = {
  company_id: string;
  tenant_id: string;
  code: string;
  name: string;
  registration_number?: string | null;
  economic_code?: string | null;
  is_active: boolean;
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
  is_active: boolean;
  row_version?: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type DepartmentDto = {
  department_id: string;
  tenant_id: string;
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
  registration_number?: string | null;
  economic_code?: string | null;
  is_active?: boolean;
};

export type UpdateCompanyPayload = CreateCompanyPayload;

export type CreateBranchPayload = {
  company_id: string;
  code: string;
  name: string;
  address?: string | null;
  is_active?: boolean;
};

export type UpdateBranchPayload = {
  code: string;
  name: string;
  address?: string | null;
  is_active?: boolean;
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
};
