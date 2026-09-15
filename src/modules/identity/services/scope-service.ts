/**
 * FE-P1 Sprint 4 — Scope API client.
 */

import { apiDelete, apiGet, apiPost, apiPut } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { identityPaths } from "./paths";

export type ScopeType =
  | "COMPANY"
  | "BRANCH"
  | "WAREHOUSE"
  | "DEPARTMENT"
  | "COST_CENTER"
  | "CUSTOM";

export interface ScopeDto {
  scope_id: string;
  tenant_id?: string;
  scope_name: string;
  scope_type: string;
  reference_id?: string | null;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateScopePayload {
  scope_name: string;
  scope_type: ScopeType | string;
  reference_id?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export interface UpdateScopePayload {
  scope_name?: string;
  scope_type?: string;
  reference_id?: string | null;
  description?: string | null;
  is_active?: boolean;
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

export const scopeService = {
  async list(scopeType?: string): Promise<ScopeDto[]> {
    const qs = scopeType
      ? `?scope_type=${encodeURIComponent(scopeType)}`
      : "";
    const envelope = await apiGet(`${identityPaths.scopes}${qs}`);
    return asList(unwrapData(envelope));
  },

  async getById(id: string): Promise<ScopeDto> {
    const envelope = await apiGet(identityPaths.scope(id));
    return unwrapData<ScopeDto>(envelope);
  },

  async create(payload: CreateScopePayload): Promise<ScopeDto> {
    const envelope = await apiPost(identityPaths.scopes, payload);
    return unwrapData<ScopeDto>(envelope);
  },

  async update(id: string, payload: UpdateScopePayload): Promise<ScopeDto> {
    const envelope = await apiPut(identityPaths.scope(id), payload);
    return unwrapData<ScopeDto>(envelope);
  },

  async softDelete(id: string): Promise<void> {
    await apiDelete(identityPaths.scope(id));
  },

  async listForUser(tenantUserId: string): Promise<ScopeDto[]> {
    const envelope = await apiGet(identityPaths.scopeUser(tenantUserId));
    return asList(unwrapData(envelope));
  },

  async assignToUser(tenantUserId: string, scopeIds: string[]): Promise<void> {
    await apiPost(identityPaths.scopeAssign, {
      tenant_user_id: tenantUserId,
      scope_ids: scopeIds,
    });
  },

  async unassignFromUser(
    tenantUserId: string,
    scopeIds: string[]
  ): Promise<void> {
    await apiPost(identityPaths.scopeUnassign, {
      tenant_user_id: tenantUserId,
      scope_ids: scopeIds,
    });
  },
};
