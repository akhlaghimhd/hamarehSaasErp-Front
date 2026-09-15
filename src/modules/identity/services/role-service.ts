/**
 * Minimal Role API client — list for member form (T08).
 * Full Role CRUD UI is Sprint 3 (T11+).
 */

import { apiGet } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { identityPaths } from "./paths";

export interface RoleDto {
  tenant_role_id: string;
  tenant_id?: string;
  code?: string;
  name: string;
  description?: string | null;
  status?: number;
  row_version?: number;
  created_at?: string;
  updated_at?: string;
}

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const roleService = {
  async list(): Promise<RoleDto[]> {
    const envelope = await apiGet(identityPaths.roles);
    const data = unwrapData<RoleDto[] | { data?: RoleDto[] }>(envelope);
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  },
};
