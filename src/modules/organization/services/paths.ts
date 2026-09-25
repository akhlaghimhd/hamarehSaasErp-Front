/** Backend ModuleServiceProvider maps Organization → /api/v1/organization */

export const ORGANIZATION_BASE = "/organization";

export const organizationPaths = {
  companies: `${ORGANIZATION_BASE}/companies`,
  company: (id: string) => `${ORGANIZATION_BASE}/companies/${id}`,
  companyRestore: (id: string) => `${ORGANIZATION_BASE}/companies/${id}/restore`,
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
  companyOwnerships: (companyId: string) =>
    `${ORGANIZATION_BASE}/companies/${companyId}/ownerships`,
  companyFiscalAssignments: (companyId: string) =>
    `${ORGANIZATION_BASE}/companies/${companyId}/fiscal-assignments`,
  branch: (id: string) => `${ORGANIZATION_BASE}/branches/${id}`,
  branchRestore: (id: string) => `${ORGANIZATION_BASE}/branches/${id}/restore`,
  department: (id: string) => `${ORGANIZATION_BASE}/departments/${id}`,
  departmentRestore: (id: string) =>
    `${ORGANIZATION_BASE}/departments/${id}/restore`,
  bankAccount: (id: string) => `${ORGANIZATION_BASE}/bank-accounts/${id}`,
  officer: (id: string) => `${ORGANIZATION_BASE}/officers/${id}`,
  ownership: (id: string) => `${ORGANIZATION_BASE}/ownerships/${id}`,
  fiscalAssignment: (id: string) => `${ORGANIZATION_BASE}/fiscal-assignments/${id}`,
  businessUnits: `${ORGANIZATION_BASE}/business-units`,
  businessUnit: (id: string) => `${ORGANIZATION_BASE}/business-units/${id}`,
  businessUnitRestore: (id: string) =>
    `${ORGANIZATION_BASE}/business-units/${id}/restore`,
  businessUnitCompanies: (buId: string) =>
    `${ORGANIZATION_BASE}/business-units/${buId}/companies`,
  businessUnitCompany: (buId: string, companyId: string) =>
    `${ORGANIZATION_BASE}/business-units/${buId}/companies/${companyId}`,
  hierarchies: `${ORGANIZATION_BASE}/hierarchies`,
  hierarchyNodes: (hierarchyId: string) =>
    `${ORGANIZATION_BASE}/hierarchies/${hierarchyId}/nodes`,
  icPartners: `${ORGANIZATION_BASE}/intercompany/partners`,
  icRules: `${ORGANIZATION_BASE}/intercompany/rules`,
  salesOrganizations: `${ORGANIZATION_BASE}/sales-organizations`,
  salesOrgAssignments: (id: string) =>
    `${ORGANIZATION_BASE}/sales-organizations/${id}/assignments`,
  purchasingOrganizations: `${ORGANIZATION_BASE}/purchasing-organizations`,
  purchOrgAssignments: (id: string) =>
    `${ORGANIZATION_BASE}/purchasing-organizations/${id}/assignments`,
  consolidationRuns: `${ORGANIZATION_BASE}/consolidation-runs`,
  consolidationSnapshot: (id: string) =>
    `${ORGANIZATION_BASE}/consolidation-runs/${id}/snapshot`,
  structureApplyTemplate: `${ORGANIZATION_BASE}/structure/apply-template`,
} as const;
