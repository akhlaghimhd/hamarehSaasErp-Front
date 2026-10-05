import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { organizationPaths } from "./paths";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

function asArray<T>(data: T[] | { data?: T[] } | null | undefined): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { data?: T[] }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

export type BusinessUnitCompanyAssignmentDto = {
  assignment_id?: string;
  company_id: string;
  is_primary?: boolean;
  is_active?: boolean;
  company?: {
    company_id?: string;
    name?: string;
    legal_name?: string | null;
  } | null;
};

export type BusinessUnitDto = {
  business_unit_id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  company_assignments?: BusinessUnitCompanyAssignmentDto[];
};

export type HierarchyDto = {
  hierarchy_id: string;
  code: string;
  name: string;
  purpose: string;
  is_active?: boolean;
  is_system?: boolean;
  nodes_count?: number;
  valid_from?: string | null;
  valid_to?: string | null;
  deleted_at?: string | null;
};

export type HierarchyNodeDto = {
  node_id: string;
  hierarchy_id: string;
  parent_node_id?: string | null;
  entity_type: string;
  entity_id: string;
  entity_label?: string | null;
  entity_code?: string | null;
  node_origin?: "SYSTEM" | "MANUAL" | string;
  sort_order?: number;
  is_active?: boolean;
  deleted_at?: string | null;
};

export type IcPartnerDto = {
  ic_partner_id: string;
  code?: string;
  from_company_id: string;
  to_company_id: string;
  from_company_name?: string | null;
  from_company_code?: string | null;
  to_company_name?: string | null;
  to_company_code?: string | null;
  partner_customer_id?: string | null;
  partner_vendor_id?: string | null;
  is_active?: boolean;
  notes?: string | null;
  row_version?: number;
};

export type IcRuleDto = {
  ic_rule_id: string;
  code: string;
  name: string;
  source_doc_type: string;
  target_doc_type: string;
  auto_create_mirror?: boolean;
  is_active?: boolean;
  notes?: string | null;
  row_version?: number;
};

export type IcDocumentTypeDto = {
  code: string;
  label_fa: string;
};

export type BankAccountDto = {
  bank_account_id: string;
  company_id: string;
  bank_name: string;
  /** Iranian account kind: CURRENT, SAVINGS, SHORT_TERM, LONG_TERM, QARD_HASAN, INVESTMENT */
  account_type?: string | null;
  account_number: string;
  iban?: string | null;
  currency_code?: string | null;
  is_primary?: boolean;
  is_active?: boolean;
};

export type OfficerDto = {
  officer_id: string;
  company_id: string;
  full_name: string;
  role_code?: string | null;
  role_title?: string | null;
  title?: string | null;
  national_id?: string | null;
  person_user_id?: string | null;
  ownership_id?: string | null;
  has_signing_authority?: boolean;
  mandate_from?: string | null;
  mandate_to?: string | null;
  mandate_notes?: string | null;
  is_active?: boolean;
  is_shareholder?: boolean;
  ownership?: {
    ownership_id?: string;
    owner_kind?: string | null;
    owner_display_name?: string | null;
    owner_company_id?: string | null;
    ownership_percent?: number | null;
  } | null;
};

export type CostCenterDto = {
  cost_center_id: string;
  company_id: string;
  code: string;
  name: string;
  cost_center_type?: string | null;
  parent_cost_center_id?: string | null;
  department_id?: string | null;
  manager_user_id?: string | null;
  description?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  is_active?: boolean;
};

export const COST_CENTER_TYPES = [
  { value: "ADMIN", label: "اداری" },
  { value: "SALES", label: "فروش" },
  { value: "PRODUCTION", label: "تولید" },
  { value: "SUPPORT", label: "پشتیبانی" },
  { value: "R_AND_D", label: "تحقیق و توسعه" },
  { value: "SHARED", label: "مشترک / تسهیم" },
  { value: "OTHER", label: "سایر" },
] as const;

export type CostCenterPayload = {
  code: string;
  name: string;
  cost_center_type?: string;
  parent_cost_center_id?: string | null;
  department_id?: string | null;
  manager_user_id?: string | null;
  description?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  is_active?: boolean;
};

export type OwnershipDto = {
  ownership_id: string;
  company_id: string;
  owner_kind?: string | null;
  owner_company_id?: string | null;
  owner_display_name?: string | null;
  owner_identifier?: string | null;
  ownership_percent: number;
  relation_type?: string;
};

export type OrgAssignmentDto = {
  assignment_id: string;
  company_id?: string | null;
  branch_id?: string | null;
  is_active?: boolean;
  sales_org_id?: string;
  purch_org_id?: string;
};

export type SalesOrgDto = {
  sales_org_id: string;
  code: string;
  name: string;
  company_id?: string | null;
  is_active?: boolean;
  assignment_count?: number;
  assignments?: OrgAssignmentDto[];
};

export type PurchOrgDto = {
  purch_org_id: string;
  code: string;
  name: string;
  company_id?: string | null;
  is_active?: boolean;
  is_reference?: boolean;
  assignment_count?: number;
  assignments?: OrgAssignmentDto[];
};

export type ConsolRunDto = {
  consolidation_run_id: string;
  code: string;
  name: string;
  status?: string;
  hierarchy_id?: string | null;
};

export const businessUnitService = {
  async list(): Promise<BusinessUnitDto[]> {
    const env = await apiGet(organizationPaths.businessUnits);
    return asArray(unwrapData(env));
  },
  async show(id: string): Promise<BusinessUnitDto> {
    const env = await apiGet(organizationPaths.businessUnit(id));
    return unwrapData<BusinessUnitDto>(env);
  },
  async create(payload: {
    code: string;
    name: string;
    description?: string;
    is_active?: boolean;
  }) {
    const env = await apiPost(organizationPaths.businessUnits, payload);
    return unwrapData<BusinessUnitDto>(env);
  },
  async update(
    id: string,
    payload: {
      code?: string;
      name?: string;
      description?: string | null;
      is_active?: boolean;
      row_version?: number;
    }
  ) {
    const env = await apiPut(organizationPaths.businessUnit(id), payload);
    return unwrapData<BusinessUnitDto>(env);
  },
  async softDelete(id: string) {
    await apiDelete(organizationPaths.businessUnit(id));
  },
  async restore(id: string) {
    const env = await apiPost(organizationPaths.businessUnitRestore(id), {});
    return unwrapData<BusinessUnitDto>(env);
  },
  async assignCompany(
    buId: string,
    payload: { company_id: string; is_primary?: boolean }
  ) {
    const env = await apiPost(organizationPaths.businessUnitCompanies(buId), payload);
    return unwrapData(env);
  },
  async unassignCompany(buId: string, companyId: string) {
    await apiDelete(organizationPaths.businessUnitCompany(buId, companyId));
  },
};

export const hierarchyService = {
  async list(): Promise<HierarchyDto[]> {
    const env = await apiGet(organizationPaths.hierarchies);
    return asArray(unwrapData(env));
  },
  async show(id: string): Promise<HierarchyDto> {
    const env = await apiGet(organizationPaths.hierarchy(id));
    return unwrapData<HierarchyDto>(env);
  },
  async create(payload: {
    code: string;
    name: string;
    purpose: string;
    is_active?: boolean;
  }) {
    const env = await apiPost(organizationPaths.hierarchies, payload);
    return unwrapData<HierarchyDto>(env);
  },
  async update(
    id: string,
    payload: {
      code?: string;
      name?: string;
      purpose?: string;
      is_active?: boolean;
      row_version?: number;
    }
  ) {
    const env = await apiPut(organizationPaths.hierarchy(id), payload);
    return unwrapData<HierarchyDto>(env);
  },
  async softDelete(id: string) {
    await apiDelete(organizationPaths.hierarchy(id));
  },
  async restore(id: string) {
    const env = await apiPost(organizationPaths.hierarchyRestore(id), {});
    return unwrapData<HierarchyDto>(env);
  },
  async setActive(id: string, is_active: boolean) {
    const env = await apiPatch(organizationPaths.hierarchyActive(id), { is_active });
    return unwrapData<HierarchyDto>(env);
  },
  async listNodes(hierarchyId: string): Promise<HierarchyNodeDto[]> {
    const env = await apiGet(organizationPaths.hierarchyNodes(hierarchyId));
    return asArray(unwrapData(env));
  },
  async addNode(
    hierarchyId: string,
    payload: {
      parent_node_id?: string | null;
      entity_type: string;
      entity_id: string;
      sort_order?: number;
    }
  ) {
    const env = await apiPost(organizationPaths.hierarchyNodes(hierarchyId), payload);
    return unwrapData<HierarchyNodeDto>(env);
  },
  async reorderNodes(hierarchyId: string, node_ids: string[]) {
    const env = await apiPost(organizationPaths.hierarchyNodesReorder(hierarchyId), {
      node_ids,
    });
    return unwrapData(env);
  },
  async softDeleteNode(nodeId: string) {
    await apiDelete(organizationPaths.hierarchyNode(nodeId));
  },
  async restoreNode(nodeId: string) {
    const env = await apiPost(organizationPaths.hierarchyNodeRestore(nodeId), {});
    return unwrapData<HierarchyNodeDto>(env);
  },
  async setNodeActive(nodeId: string, is_active: boolean) {
    const env = await apiPatch(organizationPaths.hierarchyNodeActive(nodeId), { is_active });
    return unwrapData<HierarchyNodeDto>(env);
  },
  async health() {
    const env = await apiGet(organizationPaths.hierarchyHealth);
    return unwrapData(env);
  },
  async rebuildPreview() {
    const env = await apiGet(organizationPaths.hierarchyRebuildPreview);
    return unwrapData(env);
  },
  async rebuild() {
    const env = await apiPost(organizationPaths.hierarchyRebuild, {});
    return unwrapData(env);
  },
};

export const intercompanyService = {
  async listDocumentTypes(): Promise<IcDocumentTypeDto[]> {
    const env = await apiGet(organizationPaths.icDocumentTypes);
    return asArray(unwrapData(env));
  },
  async listPartners(): Promise<IcPartnerDto[]> {
    const env = await apiGet(organizationPaths.icPartners);
    return asArray(unwrapData(env));
  },
  async createPartner(payload: {
    from_company_id: string;
    to_company_id: string;
    partner_customer_id?: string;
    partner_vendor_id?: string;
    notes?: string;
    is_active?: boolean;
  }) {
    const env = await apiPost(organizationPaths.icPartners, payload);
    return unwrapData<IcPartnerDto>(env);
  },
  async updatePartner(
    id: string,
    payload: {
      from_company_id?: string;
      to_company_id?: string;
      partner_customer_id?: string | null;
      partner_vendor_id?: string | null;
      notes?: string | null;
      is_active?: boolean;
    }
  ) {
    const env = await apiPut(organizationPaths.icPartner(id), payload);
    return unwrapData<IcPartnerDto>(env);
  },
  async deletePartner(id: string) {
    await apiDelete(organizationPaths.icPartner(id));
  },
  async listRules(): Promise<IcRuleDto[]> {
    const env = await apiGet(organizationPaths.icRules);
    return asArray(unwrapData(env));
  },
  async createRule(payload: {
    code: string;
    name: string;
    source_doc_type: string;
    target_doc_type: string;
    auto_create_mirror?: boolean;
    is_active?: boolean;
    notes?: string;
  }) {
    const env = await apiPost(organizationPaths.icRules, payload);
    return unwrapData<IcRuleDto>(env);
  },
  async updateRule(
    id: string,
    payload: {
      code?: string;
      name?: string;
      source_doc_type?: string;
      target_doc_type?: string;
      auto_create_mirror?: boolean;
      is_active?: boolean;
      notes?: string | null;
    }
  ) {
    const env = await apiPut(organizationPaths.icRule(id), payload);
    return unwrapData<IcRuleDto>(env);
  },
  async deleteRule(id: string) {
    await apiDelete(organizationPaths.icRule(id));
  },
};

export const bankAccountService = {
  async list(companyId: string): Promise<BankAccountDto[]> {
    const env = await apiGet(organizationPaths.companyBankAccounts(companyId));
    return asArray(unwrapData(env));
  },
  async create(
    companyId: string,
    payload: {
      bank_name: string;
      account_type?: string;
      account_number: string;
      iban?: string;
      currency_code?: string;
      is_primary?: boolean;
    }
  ) {
    const env = await apiPost(organizationPaths.companyBankAccounts(companyId), payload);
    return unwrapData<BankAccountDto>(env);
  },
  async softDelete(id: string) {
    await apiDelete(organizationPaths.bankAccount(id));
  },
};

export const officerService = {
  async list(companyId: string): Promise<OfficerDto[]> {
    const env = await apiGet(organizationPaths.companyOfficers(companyId));
    return asArray(unwrapData(env));
  },
  async create(
    companyId: string,
    payload: {
      role_code: string;
      full_name: string;
      national_id?: string;
      ownership_id?: string | null;
      person_user_id?: string | null;
      has_signing_authority?: boolean;
      mandate_from?: string | null;
      mandate_to?: string | null;
      mandate_notes?: string | null;
      is_active?: boolean;
    }
  ) {
    const env = await apiPost(organizationPaths.companyOfficers(companyId), payload);
    return unwrapData<OfficerDto>(env);
  },
  async softDelete(id: string) {
    await apiDelete(organizationPaths.officer(id));
  },
};

export const costCenterService = {
  async list(companyId: string): Promise<CostCenterDto[]> {
    const env = await apiGet(organizationPaths.companyCostCenters(companyId));
    return asArray(unwrapData(env));
  },
  async create(companyId: string, payload: CostCenterPayload) {
    const env = await apiPost(organizationPaths.companyCostCenters(companyId), payload);
    return unwrapData<CostCenterDto>(env);
  },
  async update(id: string, payload: Partial<CostCenterPayload>) {
    const env = await apiPut(organizationPaths.costCenter(id), payload);
    return unwrapData<CostCenterDto>(env);
  },
  async softDelete(id: string) {
    await apiDelete(organizationPaths.costCenter(id));
  },
};

export const ownershipService = {
  async list(companyId: string): Promise<OwnershipDto[]> {
    const env = await apiGet(organizationPaths.companyOwnerships(companyId));
    return asArray(unwrapData(env));
  },
  async create(
    companyId: string,
    payload: {
      owner_kind?: string;
      owner_company_id?: string | null;
      owner_display_name?: string | null;
      owner_identifier?: string | null;
      ownership_percent: number;
      relation_type?: string;
    }
  ) {
    const env = await apiPost(organizationPaths.companyOwnerships(companyId), payload);
    return unwrapData<OwnershipDto>(env);
  },
  async softDelete(id: string) {
    await apiDelete(organizationPaths.ownership(id));
  },
};

export const salesOrgService = {
  async list(): Promise<SalesOrgDto[]> {
    const env = await apiGet(organizationPaths.salesOrganizations);
    return asArray(unwrapData(env));
  },
  async create(payload: {
    code: string;
    name: string;
    company_id?: string;
    description?: string;
    is_active?: boolean;
  }) {
    const env = await apiPost(organizationPaths.salesOrganizations, payload);
    return unwrapData<SalesOrgDto>(env);
  },
  async softDelete(id: string) {
    await apiDelete(organizationPaths.salesOrganization(id));
  },
  async listAssignments(salesOrgId: string): Promise<OrgAssignmentDto[]> {
    const env = await apiGet(organizationPaths.salesOrgAssignments(salesOrgId));
    return asArray(unwrapData(env));
  },
  async assign(
    salesOrgId: string,
    payload: { company_id?: string | null; branch_id?: string | null }
  ) {
    const env = await apiPost(organizationPaths.salesOrgAssignments(salesOrgId), payload);
    return unwrapData<OrgAssignmentDto>(env);
  },
  async unassign(assignmentId: string) {
    await apiDelete(organizationPaths.salesOrgAssignment(assignmentId));
  },
};

export const purchOrgService = {
  async list(): Promise<PurchOrgDto[]> {
    const env = await apiGet(organizationPaths.purchasingOrganizations);
    return asArray(unwrapData(env));
  },
  async create(payload: {
    code: string;
    name: string;
    company_id?: string;
    description?: string;
    is_active?: boolean;
    is_reference?: boolean;
  }) {
    const env = await apiPost(organizationPaths.purchasingOrganizations, payload);
    return unwrapData<PurchOrgDto>(env);
  },
  async softDelete(id: string) {
    await apiDelete(organizationPaths.purchasingOrganization(id));
  },
  async listAssignments(purchOrgId: string): Promise<OrgAssignmentDto[]> {
    const env = await apiGet(organizationPaths.purchOrgAssignments(purchOrgId));
    return asArray(unwrapData(env));
  },
  async assign(
    purchOrgId: string,
    payload: { company_id?: string | null; branch_id?: string | null }
  ) {
    const env = await apiPost(organizationPaths.purchOrgAssignments(purchOrgId), payload);
    return unwrapData<OrgAssignmentDto>(env);
  },
  async unassign(assignmentId: string) {
    await apiDelete(organizationPaths.purchOrgAssignment(assignmentId));
  },
};

export type {
  DistributionChannelDto,
  ProductDivisionDto,
  SalesAreaDto,
} from "./sales-structure-service";
export { salesStructureService } from "./sales-structure-service";

export const consolidationService = {
  async list(): Promise<ConsolRunDto[]> {
    const env = await apiGet(organizationPaths.consolidationRuns);
    return asArray(unwrapData(env));
  },
  async create(payload: {
    code: string;
    name: string;
    hierarchy_id?: string;
  }) {
    const env = await apiPost(organizationPaths.consolidationRuns, payload);
    return unwrapData<ConsolRunDto>(env);
  },
  async snapshot(id: string) {
    const env = await apiPost(organizationPaths.consolidationSnapshot(id), {});
    return unwrapData<ConsolRunDto>(env);
  },
};

export const structureService = {
  async applyTemplate(payload: {
    hq_name?: string;
    hq_code?: string;
    create_legal_hierarchy?: boolean;
  }) {
    const env = await apiPost(organizationPaths.structureApplyTemplate, payload);
    return unwrapData(env);
  },
};
