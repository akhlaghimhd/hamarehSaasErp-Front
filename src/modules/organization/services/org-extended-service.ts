import { apiGet, apiPost, apiDelete } from "@/api";
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

export type BusinessUnitDto = {
  business_unit_id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
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

export const businessUnitService = {
  async list(): Promise<BusinessUnitDto[]> {
    const env = await apiGet(organizationPaths.businessUnits);
    return asArray(unwrapData(env));
  },
  async create(payload: { code: string; name: string; description?: string }) {
    const env = await apiPost(organizationPaths.businessUnits, payload);
    return unwrapData<BusinessUnitDto>(env);
  },
  async assignCompany(buId: string, companyId: string, isPrimary = false) {
    const env = await apiPost(organizationPaths.businessUnitCompanies(buId), {
      company_id: companyId,
      is_primary: isPrimary,
    });
    return unwrapData(env);
  },
};

export const hierarchyService = {
  async list(): Promise<HierarchyDto[]> {
    const env = await apiGet(organizationPaths.hierarchies);
    return asArray(unwrapData(env));
  },
  async create(payload: {
    code: string;
    name: string;
    purpose: string;
  }) {
    const env = await apiPost(organizationPaths.hierarchies, payload);
    return unwrapData<HierarchyDto>(env);
  },
  async listNodes(hierarchyId: string): Promise<HierarchyNodeDto[]> {
    const env = await apiGet(organizationPaths.hierarchyNodes(hierarchyId));
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
  async create(
    companyId: string,
    payload: { code: string; name: string }
  ) {
    const env = await apiPost(organizationPaths.companyCostCenters(companyId), payload);
    return unwrapData<CostCenterDto>(env);
  },
};
