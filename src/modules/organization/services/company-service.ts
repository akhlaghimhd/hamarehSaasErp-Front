import { apiGet, apiPost, apiPut, apiDelete, ApiClientError } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { organizationPaths } from "./paths";
import type {
  CompanyDto,
  CreateCompanyPayload,
  UpdateCompanyPayload,
} from "../types";

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

function companyBody(payload: CreateCompanyPayload | UpdateCompanyPayload) {
  return {
    code: payload.code.trim(),
    name: payload.name.trim(),
    legal_name: payload.legal_name?.trim() || payload.name.trim(),
    trade_name: payload.trade_name?.trim() || null,
    company_type: payload.company_type ?? null,
    registration_number: payload.registration_number?.trim() || null,
    registration_date: payload.registration_date || null,
    registration_place: payload.registration_place?.trim() || null,
    incorporation_country_id: payload.incorporation_country_id || null,
    economic_code: payload.economic_code?.trim() || null,
    tax_identifier: payload.tax_identifier?.trim() || null,
    national_id: payload.national_id?.trim() || null,
    vat_registration: payload.vat_registration?.trim() || null,
    is_active: payload.is_active ?? true,
    status: payload.status ?? (payload.is_active === false ? 2 : 1),
    is_primary: payload.is_primary ?? false,
    parent_company_id: payload.parent_company_id || null,
    entity_kind: payload.entity_kind || "OPERATING",
    base_currency_id: payload.base_currency_id || null,
    chart_of_accounts_id: payload.chart_of_accounts_id || null,
    default_consol_rate_type: payload.default_consol_rate_type || null,
  };
}

export const companyService = {
  async list(): Promise<CompanyDto[]> {
    const envelope = await apiGet(organizationPaths.companies);
    return asArray(unwrapData<CompanyDto[] | { data?: CompanyDto[] }>(envelope));
  },

  async getById(companyId: string): Promise<CompanyDto | null> {
    try {
      const envelope = await apiGet(organizationPaths.company(companyId));
      return unwrapData<CompanyDto>(envelope);
    } catch (e) {
      if (e instanceof ApiClientError && e.statusCode === 404) return null;
      throw e;
    }
  },

  async create(payload: CreateCompanyPayload): Promise<CompanyDto> {
    const envelope = await apiPost(organizationPaths.companies, companyBody(payload));
    return unwrapData<CompanyDto>(envelope);
  },

  async update(companyId: string, payload: UpdateCompanyPayload): Promise<CompanyDto> {
    const envelope = await apiPut(
      organizationPaths.company(companyId),
      companyBody(payload)
    );
    return unwrapData<CompanyDto>(envelope);
  },

  async softDelete(companyId: string): Promise<void> {
    await apiDelete(organizationPaths.company(companyId));
  },
};
