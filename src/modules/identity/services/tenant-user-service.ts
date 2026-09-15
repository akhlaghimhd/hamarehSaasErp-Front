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
    membership: MembershipListFilter = "active"
  ): Promise<TenantUserDto[]> {
    const qs = membership === "deleted" ? "?membership=deleted" : "";
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

  async getById(tenantUserId: string): Promise<TenantUserDto | null> {
    try {
      const envelope = await apiGet(identityPaths.user(tenantUserId));
      return unwrapData<TenantUserDto>(envelope);
    } catch (e) {
      if (e instanceof ApiClientError && e.statusCode === 404) {
        return null;
      }
      throw e;
    }
  },

  async create(payload: CreateTenantUserPayload): Promise<TenantUserDto> {
    const body = {
      email: payload.email,
      password: payload.password,
      first_name: payload.first_name,
      last_name: payload.last_name,
      mobile: payload.mobile ?? null,
      is_owner: payload.is_owner ?? false,
      role_ids: payload.role_ids ?? [],
    };
    const envelope = await apiPost(identityPaths.users, body);
    return unwrapData<TenantUserDto>(envelope);
  },

  async update(
    tenantUserId: string,
    payload: UpdateTenantUserPayload
  ): Promise<TenantUserDto> {
    const body: Record<string, unknown> = {};
    if (payload.first_name !== undefined) body.first_name = payload.first_name;
    if (payload.last_name !== undefined) body.last_name = payload.last_name;
    if (payload.mobile !== undefined) body.mobile = payload.mobile;
    if (payload.is_owner !== undefined) body.is_owner = payload.is_owner;
    if (payload.status !== undefined) body.status = payload.status;

    const envelope = await apiPut(identityPaths.user(tenantUserId), body);
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
