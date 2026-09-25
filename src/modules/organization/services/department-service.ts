import { apiGet, apiPost, apiPut, apiDelete, ApiClientError } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { organizationPaths } from "./paths";
import type {
  DepartmentDto,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
} from "../types";

export type DepartmentListFilter = "active" | "deleted";

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

export const departmentService = {
  async listByCompany(
    companyId: string,
    membership: DepartmentListFilter = "active"
  ): Promise<DepartmentDto[]> {
    const qs = membership === "deleted" ? "?membership=deleted" : "";
    const envelope = await apiGet(
      `${organizationPaths.companyDepartments(companyId)}${qs}`
    );
    return asArray(
      unwrapData<DepartmentDto[] | { data?: DepartmentDto[] }>(envelope)
    );
  },

  async getById(departmentId: string): Promise<DepartmentDto | null> {
    try {
      const envelope = await apiGet(organizationPaths.department(departmentId));
      return unwrapData<DepartmentDto>(envelope);
    } catch (e) {
      if (e instanceof ApiClientError && e.statusCode === 404) return null;
      throw e;
    }
  },

  async create(
    companyId: string,
    payload: CreateDepartmentPayload
  ): Promise<DepartmentDto> {
    const envelope = await apiPost(organizationPaths.companyDepartments(companyId), {
      branch_id: payload.branch_id,
      code: payload.code.trim(),
      name: payload.name.trim(),
      parent_department_id: payload.parent_department_id || null,
      manager_user_id: payload.manager_user_id || null,
      is_active: payload.is_active ?? true,
    });
    return unwrapData<DepartmentDto>(envelope);
  },

  async update(
    departmentId: string,
    payload: UpdateDepartmentPayload
  ): Promise<DepartmentDto> {
    const body: Record<string, unknown> = {
      code: payload.code.trim(),
      name: payload.name.trim(),
      parent_department_id: payload.parent_department_id || null,
      manager_user_id: payload.manager_user_id || null,
      is_active: payload.is_active ?? true,
    };
    if (payload.branch_id) body.branch_id = payload.branch_id;
    const envelope = await apiPut(organizationPaths.department(departmentId), body);
    return unwrapData<DepartmentDto>(envelope);
  },

  async softDelete(departmentId: string): Promise<void> {
    await apiDelete(organizationPaths.department(departmentId));
  },

  async restore(departmentId: string): Promise<DepartmentDto> {
    const envelope = await apiPost(organizationPaths.departmentRestore(departmentId), {});
    return unwrapData<DepartmentDto>(envelope);
  },
};
