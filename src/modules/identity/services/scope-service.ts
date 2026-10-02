/**
 * Scope API client — list / create / update / soft-delete / restore.
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
  | "CUSTOM"
  | "BUSINESS_UNIT";

export type ScopeMembershipFilter = "active" | "deleted";

export interface ScopeDto {
  scope_id: string;
  tenant_id?: string;
  scope_name: string;
  scope_type: string;
  /** Primary/first reference (BC). Prefer reference_ids. */
  reference_id?: string | null;
  /** Same-type entity ids covered by this named scope (1..n). */
  reference_ids?: string[];
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface CreateScopePayload {
  scope_name: string;
  scope_type: ScopeType | string;
  /** Prefer reference_ids; reference_id kept for older callers. */
  reference_id?: string | null;
  reference_ids?: string[];
  description?: string | null;
  is_active?: boolean;
}

export interface UpdateScopePayload {
  scope_name?: string;
  scope_type?: string;
  reference_id?: string | null;
  reference_ids?: string[];
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
  async list(options?: {
    scopeType?: string;
    membership?: ScopeMembershipFilter;
  }): Promise<ScopeDto[]> {
    const params = new URLSearchParams();
    if (options?.scopeType) params.set("scope_type", options.scopeType);
    if (options?.membership) params.set("membership", options.membership);
    const qs = params.toString() ? `?${params.toString()}` : "";
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

  async restore(id: string): Promise<ScopeDto> {
    const envelope = await apiPost(identityPaths.scopeRestore(id), {});
    return unwrapData<ScopeDto>(envelope);
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
