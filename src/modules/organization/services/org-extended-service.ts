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
};

export type HierarchyNodeDto = {
  node_id: string;
  hierarchy_id: string;
  parent_node_id?: string | null;
  entity_type: string;
  entity_id: string;
  sort_order?: number;
  is_active?: boolean;
  deleted_at?: string | null;
};

export type IcPartnerDto = {
  ic_partner_id: string;
  from_company_id: string;
  to_company_id: string;
  is_active?: boolean;
  notes?: string | null;
};

export type IcRuleDto = {
  ic_rule_id: string;
  code: string;
  name: string;
  source_doc_type: string;
  target_doc_type: string;
  auto_create_mirror?: boolean;
  is_active?: boolean;
};

export type BankAccountDto = {
  bank_account_id: string;
  company_id: string;
  bank_name: string;
  account_number: string;
  iban?: string | null;
  is_primary?: boolean;
  is_active?: boolean;
};

export type OfficerDto = {
  officer_id: string;
  company_id: string;
  role_code: string;
  full_name: string;
  role_title?: string | null;
  is_active?: boolean;
};

export type CostCenterDto = {
  cost_center_id: string;
  company_id: string;
  code: string;
  name: string;
  is_active?: boolean;
};

export type OwnershipDto = {
  ownership_id: string;
  company_id: string;
  owner_company_id: string;
  ownership_percent: number;
  relation_type?: string;
};

export type SalesOrgDto = {
  sales_org_id: string;
  code: string;
  name: string;
  company_id?: string | null;
  is_active?: boolean;
};

export type PurchOrgDto = {
  purch_org_id: string;
  code: string;
  name: string;
  company_id?: string | null;
  is_active?: boolean;
};

export type ConsolRunDto = {
  consol_run_id: string;
  code: string;
  name: string;
  status?: string;
  hierarchy_id?: string | null;
};

export const businessUnitService = {
  async list(opts?: { membership?: "active" | "deleted" }): Promise<BusinessUnitDto[]> {
    const membership = opts?.membership ?? "active";
    const q = membership === "deleted" ? "?membership=deleted" : "";
    const env = await apiGet(`${organizationPaths.businessUnits}${q}`);
    return asArray(unwrapData(env));
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
      code: string;
      name: string;
      description?: string;
      is_active?: boolean;
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
  async assignCompany(buId: string, companyId: string, isPrimary = false) {
    const env = await apiPost(organizationPaths.businessUnitCompanies(buId), {
      company_id: companyId,
      is_primary: isPrimary,
    });
    return unwrapData(env);
  },
  async unassignCompany(buId: string, companyId: string) {
    await apiDelete(organizationPaths.businessUnitCompany(buId, companyId));
  },
  async syncCompanies(
    buId: string,
    companyIds: string[],
    primaryCompanyId?: string | null
  ) {
    const env = await apiPut(organizationPaths.businessUnitCompanies(buId), {
      company_ids: companyIds,
      primary_company_id: primaryCompanyId || null,
    });
    return unwrapData<{ attached: number; detached: number }>(env);
  },
};

export const hierarchyService = {
  async list(opts?: { membership?: "active" | "deleted" }): Promise<HierarchyDto[]> {
    const membership = opts?.membership ?? "active";
    const q = membership === "deleted" ? "?membership=deleted" : "";
    const env = await apiGet(`${organizationPaths.hierarchies}${q}`);
    return asArray(unwrapData(env));
  },
  async create(payload: { code: string; name: string; purpose: string }) {
    const env = await apiPost(organizationPaths.hierarchies, payload);
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
  async listNodes(
    hierarchyId: string,
    opts?: { membership?: "active" | "deleted" }
  ): Promise<HierarchyNodeDto[]> {
    const membership = opts?.membership ?? "active";
    const q = membership === "deleted" ? "?membership=deleted" : "";
    const env = await apiGet(`${organizationPaths.hierarchyNodes(hierarchyId)}${q}`);
    return asArray(unwrapData(env));
  },
  async addNode(
    hierarchyId: string,
    payload: {
      entity_type: string;
      entity_id: string;
      parent_node_id?: string | null;
      sort_order?: number;
    }
  ) {
    const env = await apiPost(organizationPaths.hierarchyNodes(hierarchyId), payload);
    return unwrapData<HierarchyNodeDto>(env);
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
  async bulkNodes(nodeIds: string[], action: "activate" | "deactivate" | "delete") {
    const env = await apiPost(organizationPaths.hierarchyNodesBulk, {
      node_ids: nodeIds,
      action,
    });
    return unwrapData<{ affected: number; action: string }>(env);
  },
  async rebuild() {
    const env = await apiPost(organizationPaths.hierarchyRebuild, {});
    return unwrapData(env);
  },
  async health() {
    const env = await apiGet(organizationPaths.hierarchyHealth);
    return unwrapData(env);
  },
};

export const intercompanyService = {
  async listPartners(): Promise<IcPartnerDto[]> {
    const env = await apiGet(organizationPaths.icPartners);
    return asArray(unwrapData(env));
  },
  async createPartner(payload: {
    from_company_id: string;
    to_company_id: string;
    notes?: string;
  }) {
    const env = await apiPost(organizationPaths.icPartners, payload);
    return unwrapData<IcPartnerDto>(env);
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
  }) {
    const env = await apiPost(organizationPaths.icRules, payload);
    return unwrapData<IcRuleDto>(env);
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
      account_number: string;
      iban?: string;
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
    payload: { role_code: string; full_name: string; role_title?: string }
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
  async create(companyId: string, payload: { code: string; name: string }) {
    const env = await apiPost(organizationPaths.companyCostCenters(companyId), payload);
    return unwrapData<CostCenterDto>(env);
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
      owner_company_id: string;
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
  async create(payload: { code: string; name: string; company_id?: string }) {
    const env = await apiPost(organizationPaths.salesOrganizations, payload);
    return unwrapData<SalesOrgDto>(env);
  },
};

export const purchOrgService = {
  async list(): Promise<PurchOrgDto[]> {
    const env = await apiGet(organizationPaths.purchasingOrganizations);
    return asArray(unwrapData(env));
  },
  async create(payload: { code: string; name: string; company_id?: string }) {
    const env = await apiPost(organizationPaths.purchasingOrganizations, payload);
    return unwrapData<PurchOrgDto>(env);
  },
};

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
