import { apiGet, apiPost, apiPut, apiDelete, ApiClientError } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { organizationPaths } from "./paths";
import type {
  BranchDto,
  CreateBranchPayload,
  UpdateBranchPayload,
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

export const branchService = {
  async listByCompany(companyId: string): Promise<BranchDto[]> {
    const envelope = await apiGet(organizationPaths.companyBranches(companyId));
    return asArray(unwrapData<BranchDto[] | { data?: BranchDto[] }>(envelope));
  },

  async getById(branchId: string): Promise<BranchDto | null> {
    try {
      const envelope = await apiGet(organizationPaths.branch(branchId));
      return unwrapData<BranchDto>(envelope);
    } catch (e) {
      if (e instanceof ApiClientError && e.statusCode === 404) return null;
      throw e;
    }
  },

  async create(payload: CreateBranchPayload): Promise<BranchDto> {
    const envelope = await apiPost(
      organizationPaths.companyBranches(payload.company_id),
      {
        company_id: payload.company_id,
        code: payload.code.trim(),
        name: payload.name.trim(),
        address: payload.address?.trim() || null,
        is_active: payload.is_active ?? true,
      }
    );
    return unwrapData<BranchDto>(envelope);
  },

  async update(branchId: string, payload: UpdateBranchPayload): Promise<BranchDto> {
    const envelope = await apiPut(organizationPaths.branch(branchId), {
      code: payload.code.trim(),
      name: payload.name.trim(),
      address: payload.address?.trim() || null,
      is_active: payload.is_active ?? true,
    });
    return unwrapData<BranchDto>(envelope);
  },

  async softDelete(branchId: string): Promise<void> {
    await apiDelete(organizationPaths.branch(branchId));
  },
};
