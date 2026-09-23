/** Backend ModuleServiceProvider maps Organization → /api/v1/organization */

export const ORGANIZATION_BASE = "/organization";

export const organizationPaths = {
  companies: `${ORGANIZATION_BASE}/companies`,
  company: (id: string) => `${ORGANIZATION_BASE}/companies/${id}`,
  companyBranches: (companyId: string) =>
    `${ORGANIZATION_BASE}/companies/${companyId}/branches`,
  companyDepartments: (companyId: string) =>
    `${ORGANIZATION_BASE}/companies/${companyId}/departments`,
  branch: (id: string) => `${ORGANIZATION_BASE}/branches/${id}`,
  department: (id: string) => `${ORGANIZATION_BASE}/departments/${id}`,
} as const;
