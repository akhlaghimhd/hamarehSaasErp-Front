/**
 * FE-ORG — Organization module public surface
 */

export { OrganizationHome } from "./pages/organization-home";
export { CompaniesListPage } from "./pages/companies-list";
export { CompanyDetailPage } from "./pages/company-detail";
export { companyService } from "./services/company-service";
export { branchService } from "./services/branch-service";
export { departmentService } from "./services/department-service";
export { organizationPaths } from "./services/paths";
export {
  useCompanies,
  useCompany,
  useCreateCompany,
  useUpdateCompany,
  useSoftDeleteCompany,
  useRestoreCompany,
  companiesQueryKey,
} from "./hooks/use-companies";
export {
  useBranches,
  useCreateBranch,
  useUpdateBranch,
  useSoftDeleteBranch,
  branchesQueryKey,
} from "./hooks/use-branches";
export {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useSoftDeleteDepartment,
  departmentsQueryKey,
} from "./hooks/use-departments";
export {
  OrganizationPermissions,
  type CompanyDto,
  type BranchDto,
  type DepartmentDto,
  type OrganizationPermissionCode,
} from "./types";
