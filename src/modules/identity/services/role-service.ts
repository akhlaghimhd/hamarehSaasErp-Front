/**
 * FE-P1 Sprint 3 — Role API client.
 */

import { apiDelete, apiGet, apiPost, apiPut } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { identityPaths } from "./paths";

export interface RoleDto {
  tenant_role_id: string;
  tenant_id?: string;
  code?: string;
  name: string;
  description?: string | null;
  status?: number;
  is_system_default?: boolean;
  row_version?: number;
  created_at?: string;
  updated_at?: string;
  permissions?: Array<{
    tenant_permission_id: string;
    code?: string;
    name?: string;
  }>;
}

export interface CreateRolePayload {
  role_name: string;
  description?: string | null;
  permission_ids?: string[];
}

export interface UpdateRolePayload {
  name?: string;
  description?: string | null;
  status?: number;
}

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

function asList<T>(data: T[] | { data?: T[] } | null | undefined): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray(data.data)) return data.data;
  return [];
}

export const roleService = {
  async list(): Promise<RoleDto[]> {
    const envelope = await apiGet(identityPaths.roles);
    return asList(unwrapData(envelope));
  },

  async getById(id: string): Promise<RoleDto> {
    const envelope = await apiGet(identityPaths.role(id));
    return unwrapData<RoleDto>(envelope);
  },

  async create(payload: CreateRolePayload): Promise<RoleDto> {
    const envelope = await apiPost(identityPaths.roles, payload);
    return unwrapData<RoleDto>(envelope);
  },

  async update(id: string, payload: UpdateRolePayload): Promise<RoleDto> {
    const envelope = await apiPut(identityPaths.role(id), payload);
    return unwrapData<RoleDto>(envelope);
  },

  async softDelete(id: string): Promise<void> {
    await apiDelete(identityPaths.role(id));
  },

  async assignToUser(userId: string, roleIds: string[]): Promise<void> {
    await apiPost(identityPaths.roleAssign, {
      user_id: userId,
      role_ids: roleIds,
    });
  },

  async assignPermissions(
    tenantRoleId: string,
    permissionIds: string[]
  ): Promise<void> {
    await apiPost(identityPaths.roleAssignPermissions, {
      tenant_role_id: tenantRoleId,
      permission_ids: permissionIds,
    });
  },
};
