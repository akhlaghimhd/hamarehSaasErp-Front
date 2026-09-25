import { apiGet, apiPost, apiPut, apiDelete, ApiClientError } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { organizationPaths } from "./paths";
import type {
  BranchDto,
  CreateBranchPayload,
  UpdateBranchPayload,
} from "../types";

export type BranchListFilter = "active" | "deleted";

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
  async listByCompany(
    companyId: string,
    membership: BranchListFilter = "active"
  ): Promise<BranchDto[]> {
    const q = membership === "deleted" ? "?membership=deleted" : "?membership=active";
    const envelope = await apiGet(
      `${organizationPaths.companyBranches(companyId)}${q}`
    );
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
        branch_kind: payload.branch_kind || "OFFICE",
        parent_branch_id: payload.parent_branch_id || null,
        default_warehouse_id: payload.default_warehouse_id || null,
        supports_shipping: payload.supports_shipping ?? false,
        supports_receiving: payload.supports_receiving ?? false,
        is_manufacturing_site: payload.is_manufacturing_site ?? false,
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
      branch_kind: payload.branch_kind || undefined,
      parent_branch_id: payload.parent_branch_id ?? undefined,
      default_warehouse_id: payload.default_warehouse_id ?? undefined,
      supports_shipping: payload.supports_shipping,
      supports_receiving: payload.supports_receiving,
      is_manufacturing_site: payload.is_manufacturing_site,
      company_id: payload.company_id ?? undefined,
    });
    return unwrapData<BranchDto>(envelope);
  },

  async softDelete(branchId: string): Promise<void> {
    await apiDelete(organizationPaths.branch(branchId));
  },

  async restore(branchId: string): Promise<BranchDto> {
    const envelope = await apiPost(organizationPaths.branchRestore(branchId), {});
    return unwrapData<BranchDto>(envelope);
  },
};
