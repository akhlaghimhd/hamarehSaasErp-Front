/** Backend ModuleServiceProvider maps Organization → /api/v1/organization */

export const ORGANIZATION_BASE = "/organization";

export const organizationPaths = {
  companies: `${ORGANIZATION_BASE}/companies`,
  company: (id: string) => `${ORGANIZATION_BASE}/companies/${id}`,
  companyRestore: (id: string) => `${ORGANIZATION_BASE}/companies/${id}/restore`,
  companyBranches: (companyId: string) =>
    `${ORGANIZATION_BASE}/companies/${companyId}/branches`,
  /** Tenant-wide branches list (no company nest) */
  branches: `${ORGANIZATION_BASE}/branches`,
  /** Tenant-wide departments list (no company nest) — avoids N+1 */
  departments: `${ORGANIZATION_BASE}/departments`,
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
  hierarchy: (id: string) => `${ORGANIZATION_BASE}/hierarchies/${id}`,
  hierarchyRestore: (id: string) =>
    `${ORGANIZATION_BASE}/hierarchies/${id}/restore`,
  hierarchyActive: (id: string) =>
    `${ORGANIZATION_BASE}/hierarchies/${id}/active`,
  hierarchyNodes: (hierarchyId: string) =>
    `${ORGANIZATION_BASE}/hierarchies/${hierarchyId}/nodes`,
  hierarchyNodesReorder: (hierarchyId: string) =>
    `${ORGANIZATION_BASE}/hierarchies/${hierarchyId}/nodes/reorder`,
  hierarchyHealth: `${ORGANIZATION_BASE}/hierarchies/health`,
  hierarchyRebuild: `${ORGANIZATION_BASE}/hierarchies/rebuild`,
  hierarchyRebuildPreview: `${ORGANIZATION_BASE}/hierarchies/rebuild/preview`,
  hierarchyNodesBulk: `${ORGANIZATION_BASE}/hierarchies/nodes/bulk`,
  hierarchyNode: (nodeId: string) =>
    `${ORGANIZATION_BASE}/hierarchies/nodes/${nodeId}`,
  hierarchyNodeRestore: (nodeId: string) =>
    `${ORGANIZATION_BASE}/hierarchies/nodes/${nodeId}/restore`,
  hierarchyNodeActive: (nodeId: string) =>
    `${ORGANIZATION_BASE}/hierarchies/nodes/${nodeId}/active`,
  icDocumentTypes: `${ORGANIZATION_BASE}/intercompany/document-types`,
  icPartners: `${ORGANIZATION_BASE}/intercompany/partners`,
  icPartner: (id: string) => `${ORGANIZATION_BASE}/intercompany/partners/${id}`,
  icRules: `${ORGANIZATION_BASE}/intercompany/rules`,
  icRule: (id: string) => `${ORGANIZATION_BASE}/intercompany/rules/${id}`,
  salesOrganizations: `${ORGANIZATION_BASE}/sales-organizations`,
  salesOrganization: (id: string) =>
    `${ORGANIZATION_BASE}/sales-organizations/${id}`,
  salesOrgRestore: (id: string) =>
    `${ORGANIZATION_BASE}/sales-organizations/${id}/restore`,
  salesOrgAssignments: (id: string) =>
    `${ORGANIZATION_BASE}/sales-organizations/${id}/assignments`,
  salesOrgAssignment: (assignmentId: string) =>
    `${ORGANIZATION_BASE}/sales-org-assignments/${assignmentId}`,
  purchasingOrganizations: `${ORGANIZATION_BASE}/purchasing-organizations`,
  purchasingOrganization: (id: string) =>
    `${ORGANIZATION_BASE}/purchasing-organizations/${id}`,
  purchOrgRestore: (id: string) =>
    `${ORGANIZATION_BASE}/purchasing-organizations/${id}/restore`,
  purchOrgAssignments: (id: string) =>
    `${ORGANIZATION_BASE}/purchasing-organizations/${id}/assignments`,
  purchOrgAssignment: (assignmentId: string) =>
    `${ORGANIZATION_BASE}/purch-org-assignments/${assignmentId}`,
  distributionChannels: `${ORGANIZATION_BASE}/distribution-channels`,
  distributionChannel: (id: string) =>
    `${ORGANIZATION_BASE}/distribution-channels/${id}`,
  productDivisions: `${ORGANIZATION_BASE}/product-divisions`,
  productDivision: (id: string) =>
    `${ORGANIZATION_BASE}/product-divisions/${id}`,
  salesAreas: `${ORGANIZATION_BASE}/sales-areas`,
  salesArea: (id: string) => `${ORGANIZATION_BASE}/sales-areas/${id}`,
  salesOffices: `${ORGANIZATION_BASE}/sales-offices`,
  salesOffice: (id: string) => `${ORGANIZATION_BASE}/sales-offices/${id}`,
  salesOfficeGroups: (officeId: string) =>
    `${ORGANIZATION_BASE}/sales-offices/${officeId}/groups`,
  salesGroup: (id: string) => `${ORGANIZATION_BASE}/sales-groups/${id}`,
  consolidationRuns: `${ORGANIZATION_BASE}/consolidation-runs`,
  consolidationSnapshot: (id: string) =>
    `${ORGANIZATION_BASE}/consolidation-runs/${id}/snapshot`,
  structureApplyTemplate: `${ORGANIZATION_BASE}/structure/apply-template`,
} as const;
