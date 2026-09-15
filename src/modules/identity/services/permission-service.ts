/**
 * FE-P1 Sprint 3 — Permission API client.
 */

import { apiDelete, apiGet, apiPost, apiPut } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { identityPaths } from "./paths";

export interface PermissionDto {
  tenant_permission_id: string;
  tenant_id?: string;
  code: string;
  name: string;
  module_name?: string | null;
  action_type?: string | null;
  description?: string | null;
  status?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePermissionPayload {
  code: string;
  name: string;
  module_name: string;
  action_type?: string | null;
  description?: string | null;
}

export interface UpdatePermissionPayload {
  name?: string;
  module_name?: string;
  action_type?: string | null;
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

export const permissionService = {
  async list(): Promise<PermissionDto[]> {
    const envelope = await apiGet(identityPaths.permissions);
    return asList(unwrapData(envelope));
  },

  async getById(id: string): Promise<PermissionDto> {
    const envelope = await apiGet(identityPaths.permission(id));
    return unwrapData<PermissionDto>(envelope);
  },

  async create(payload: CreatePermissionPayload): Promise<PermissionDto> {
    const envelope = await apiPost(identityPaths.permissions, payload);
    return unwrapData<PermissionDto>(envelope);
  },

  async update(
    id: string,
    payload: UpdatePermissionPayload
  ): Promise<PermissionDto> {
    const envelope = await apiPut(identityPaths.permission(id), payload);
    return unwrapData<PermissionDto>(envelope);
  },

  async softDelete(id: string): Promise<void> {
    await apiDelete(identityPaths.permission(id));
  },
};
