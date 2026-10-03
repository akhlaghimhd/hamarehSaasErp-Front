import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { identityPaths } from "./paths";

export type RoleAssignmentRequestDto = {
  request_id: string;
  user_id?: string;
  tenant_role_id?: string;
  role_name?: string | null;
  request_action?: string | null;
  status?: string;
  reason?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  requested_by?: string | null;
  reviewed_by?: string | null;
  review_note?: string | null;
  created_at?: string | null;
  [key: string]: unknown;
};

export type CreateRoleAssignmentRequestPayload = {
  user_id: string;
  tenant_role_id: string;
  reason?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
};

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const roleAssignmentRequestService = {
  async listPending(): Promise<RoleAssignmentRequestDto[]> {
    const envelope = await apiGet<unknown>(identityPaths.roleAssignmentRequests);
    const root = envelope as Record<string, unknown> | unknown[] | null;
    if (Array.isArray(root)) return root as RoleAssignmentRequestDto[];
    if (root && typeof root === "object") {
      const d = (root as { data?: unknown }).data;
      if (Array.isArray(d)) return d as RoleAssignmentRequestDto[];
      if (
        d &&
        typeof d === "object" &&
        Array.isArray((d as { data?: unknown }).data)
      ) {
        return (d as { data: RoleAssignmentRequestDto[] }).data;
      }
    }
    return [];
  },

  async create(
    payload: CreateRoleAssignmentRequestPayload
  ): Promise<RoleAssignmentRequestDto> {
    const envelope = await apiPost(identityPaths.roleAssignmentRequests, payload);
    return unwrapData<RoleAssignmentRequestDto>(envelope);
  },

  async approve(
    id: string,
    reviewNote?: string
  ): Promise<RoleAssignmentRequestDto> {
    const envelope = await apiPost(identityPaths.roleAssignmentApprove(id), {
      review_note: reviewNote ?? null,
    });
    return unwrapData<RoleAssignmentRequestDto>(envelope);
  },

  async reject(
    id: string,
    reviewNote?: string
  ): Promise<RoleAssignmentRequestDto> {
    const envelope = await apiPost(identityPaths.roleAssignmentReject(id), {
      review_note: reviewNote ?? null,
    });
    return unwrapData<RoleAssignmentRequestDto>(envelope);
  },
};
