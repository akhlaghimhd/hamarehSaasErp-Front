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
    const envelope = await apiPost(organizationPaths.companies, {
      code: payload.code.trim(),
      name: payload.name.trim(),
      registration_number: payload.registration_number?.trim() || null,
      economic_code: payload.economic_code?.trim() || null,
      is_active: payload.is_active ?? true,
    });
    return unwrapData<CompanyDto>(envelope);
  },

  async update(companyId: string, payload: UpdateCompanyPayload): Promise<CompanyDto> {
    const envelope = await apiPut(organizationPaths.company(companyId), {
      code: payload.code.trim(),
      name: payload.name.trim(),
      registration_number: payload.registration_number?.trim() || null,
      economic_code: payload.economic_code?.trim() || null,
      is_active: payload.is_active ?? true,
    });
    return unwrapData<CompanyDto>(envelope);
  },

  async softDelete(companyId: string): Promise<void> {
    await apiDelete(organizationPaths.company(companyId));
  },
};
