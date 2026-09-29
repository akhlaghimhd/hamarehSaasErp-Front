import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { identityPaths } from "./paths";
import type { RoleDto } from "./role-service";

export type PrivilegedGrantDto = {
  grant_id: string;
  user_id?: string;
  tenant_role_id?: string;
  status?: string;
  reason?: string | null;
  duration_minutes?: number | null;
  requested_by?: string | null;
  approved_by?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  [key: string]: unknown;
};

export type RequestPrivilegedGrantPayload = {
  user_id: string;
  tenant_role_id: string;
  reason: string;
  duration_minutes?: number;
};

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const privilegedAccessService = {
  async list(status?: string): Promise<PrivilegedGrantDto[]> {
    const q = status ? `?status=${encodeURIComponent(status)}` : "";
    const envelope = await apiGet(`${identityPaths.privilegedAccess}${q}`);
    const data = unwrapData<PrivilegedGrantDto[] | { data: PrivilegedGrantDto[] }>(envelope);
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
      return (data as { data: PrivilegedGrantDto[] }).data;
    }
    return [];
  },

  async request(payload: RequestPrivilegedGrantPayload): Promise<PrivilegedGrantDto> {
    const envelope = await apiPost(identityPaths.privilegedRequest, payload);
    return unwrapData<PrivilegedGrantDto>(envelope);
  },

  async approve(id: string): Promise<PrivilegedGrantDto> {
    const envelope = await apiPost(identityPaths.privilegedApprove(id), {});
    return unwrapData<PrivilegedGrantDto>(envelope);
  },

  async deny(id: string, note?: string | null): Promise<PrivilegedGrantDto> {
    const envelope = await apiPost(identityPaths.privilegedDeny(id), {
      note: note ?? null,
    });
    return unwrapData<PrivilegedGrantDto>(envelope);
  },

  async revoke(id: string, reason?: string | null): Promise<PrivilegedGrantDto> {
    const envelope = await apiPost(identityPaths.privilegedRevoke(id), {
      reason: reason ?? null,
    });
    return unwrapData<PrivilegedGrantDto>(envelope);
  },

  /** Mark / unmark a role as privileged (break-glass eligible). */
  async markRole(tenantRoleId: string, isPrivileged: boolean): Promise<RoleDto> {
    const envelope = await apiPost(identityPaths.privilegedMarkRole, {
      tenant_role_id: tenantRoleId,
      is_privileged: isPrivileged,
    });
    return unwrapData<RoleDto>(envelope);
  },
};
