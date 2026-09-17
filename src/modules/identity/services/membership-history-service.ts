/**
 * Membership history API client.
 */

import { apiGet } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { identityPaths } from "./paths";

export interface MembershipHistoryDto {
  history_id: string;
  tenant_id: string;
  tenant_user_id: string;
  previous_status?: number | null;
  new_status: number;
  reason_code?: string | null;
  description?: string | null;
  effective_date?: string | null;
  created_at?: string;
  created_by?: string | null;
  actor_name?: string | null;
  row_version?: number;
}

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const membershipHistoryService = {
  async listByTenantUser(
    tenantUserId: string
  ): Promise<MembershipHistoryDto[]> {
    const envelope = await apiGet(
      identityPaths.membershipHistoryByUser(tenantUserId)
    );
    const data = unwrapData<
      MembershipHistoryDto[] | { data?: MembershipHistoryDto[] }
    >(envelope);
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray(data.data)) {
      return data.data;
    }
    return [];
  },
};
