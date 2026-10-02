/**
 * FE-P1-T02 — Tenant membership (TenantUser) API client.
 */

import { apiGet, apiPost, apiPut, apiDelete, ApiClientError } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { identityPaths } from "./paths";
import type {
  CreateTenantUserPayload,
  TenantUserDto,
  UpdateTenantUserPayload,
} from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export type MembershipListFilter = "active" | "deleted";

export const tenantUserService = {
  async list(
    membership: MembershipListFilter = "active",
    opts?: { companyId?: string | null }
  ): Promise<TenantUserDto[]> {
    const params = new URLSearchParams();
    if (membership === "deleted") params.set("membership", "deleted");
    if (opts?.companyId) params.set("company_id", opts.companyId);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const envelope = await apiGet(`${identityPaths.users}${qs}`);
    const data = unwrapData<TenantUserDto[] | { data?: TenantUserDto[] }>(
      envelope
    );
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  },

  /**
   * Server typeahead — does not load full roster.
   * Backend requires min 2 chars; returns up to `limit` (default 25).
   */
  async search(
    q: string,
    opts?: { membership?: MembershipListFilter; limit?: number }
  ): Promise<TenantUserDto[]> {
    const term = q.trim();
    if (term.length < 2) return [];
    const membership = opts?.membership ?? "active";
    const limit = opts?.limit ?? 25;
    const params = new URLSearchParams();
    if (membership === "deleted") params.set("membership", "deleted");
    params.set("q", term);
    params.set("limit", String(limit));
    const envelope = await apiGet(`${identityPaths.users}?${params.toString()}`);
    const data = unwrapData<TenantUserDto[] | { data?: TenantUserDto[] }>(envelope);
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  },

  async getEmailHost(): Promise<{ email_host: string }> {
    const envelope = await apiGet(identityPaths.usersEmailHost);
    return unwrapData<{ email_host: string }>(envelope);
  },

  async getById(tenantUserId: string): Promise<TenantUserDto | null> {
    try {
      const envelope = await apiGet(identityPaths.user(tenantUserId));
      return unwrapData<TenantUserDto>(envelope);
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 404) return null;
      throw e;
    }
  },

  async create(payload: CreateTenantUserPayload): Promise<TenantUserDto> {
    const envelope = await apiPost(identityPaths.users, payload);
    return unwrapData<TenantUserDto>(envelope);
  },

  async update(
    tenantUserId: string,
    payload: UpdateTenantUserPayload
  ): Promise<TenantUserDto> {
    const envelope = await apiPut(identityPaths.user(tenantUserId), payload);
    return unwrapData<TenantUserDto>(envelope);
  },

  async softDelete(tenantUserId: string): Promise<void> {
    await apiDelete(identityPaths.user(tenantUserId));
  },

  async restore(tenantUserId: string): Promise<TenantUserDto> {
    const envelope = await apiPost(identityPaths.userRestore(tenantUserId), {});
    return unwrapData<TenantUserDto>(envelope);
  },
};
