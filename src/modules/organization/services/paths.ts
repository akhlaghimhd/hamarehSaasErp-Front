/** Backend ModuleServiceProvider maps Organization → /api/v1/organization */

export const ORGANIZATION_BASE = "/organization";

export const organizationPaths = {
  companies: `${ORGANIZATION_BASE}/companies`,
  company: (id: string) => `${ORGANIZATION_BASE}/companies/${id}`,
  companyBranches: (companyId: string) =>
    `${ORGANIZATION_BASE}/companies/${companyId}/branches`,
  companyDepartments: (companyId: string) =>
    `${ORGANIZATION_BASE}/companies/${companyId}/departments`,
  companyBankAccounts: (companyId: string) =>
    `${ORGANIZATION_BASE}/companies/${companyId}/bank-accounts`,
  companyOfficers: (companyId: string) =>
    `${ORGANIZATION_BASE}/companies/${companyId}/officers`,
  companyCostCenters: (companyId: string) =>
    `${ORGANIZATION_BASE}/companies/${companyId}/cost-centers`,
  branch: (id: string) => `${ORGANIZATION_BASE}/branches/${id}`,
  department: (id: string) => `${ORGANIZATION_BASE}/departments/${id}`,
  bankAccount: (id: string) => `${ORGANIZATION_BASE}/bank-accounts/${id}`,
  officer: (id: string) => `${ORGANIZATION_BASE}/officers/${id}`,
  businessUnits: `${ORGANIZATION_BASE}/business-units`,
  businessUnitCompanies: (buId: string) =>
    `${ORGANIZATION_BASE}/business-units/${buId}/companies`,
  hierarchies: `${ORGANIZATION_BASE}/hierarchies`,
  hierarchyNodes: (hierarchyId: string) =>
    `${ORGANIZATION_BASE}/hierarchies/${hierarchyId}/nodes`,
  icPartners: `${ORGANIZATION_BASE}/intercompany/partners`,
  icRules: `${ORGANIZATION_BASE}/intercompany/rules`,
} as const;
