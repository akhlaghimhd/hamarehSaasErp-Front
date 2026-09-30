import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { identityPaths } from "./paths";

export type AccessCertCampaignDto = {
  campaign_id: string;
  code?: string;
  name?: string;
  description?: string | null;
  status?: string;
  due_at?: string | null;
  opened_at?: string | null;
  completed_at?: string | null;
  items_total?: number;
  items_pending?: number;
  [key: string]: unknown;
};

export type AccessCertItemDto = {
  item_id: string;
  campaign_id?: string;
  user_id?: string;
  tenant_role_id?: string;
  role_ids_snapshot?: string[] | null;
  sod_has_block?: boolean;
  sod_has_warn?: boolean;
  sod_conflicts?: Array<{
    sod_rule_id?: string;
    code?: string;
    name?: string;
    enforcement?: string;
    severity?: number;
  }> | null;
  decision?: string | null;
  note?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  [key: string]: unknown;
};

export type CreateAccessCertCampaignPayload = {
  code: string;
  name: string;
  description?: string | null;
  due_at?: string | null;
};

export type CertifyItemPayload = {
  decision: "APPROVED" | "REVOKE_REQUESTED" | "DEFERRED";
  note?: string | null;
};

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

export const accessCertificationService = {
  async list(): Promise<AccessCertCampaignDto[]> {
    const envelope = await apiGet(identityPaths.accessCertifications);
    return asList(unwrapData(envelope));
  },

  async create(payload: CreateAccessCertCampaignPayload): Promise<AccessCertCampaignDto> {
    const envelope = await apiPost(identityPaths.accessCertifications, payload);
    return unwrapData<AccessCertCampaignDto>(envelope);
  },

  async show(id: string): Promise<AccessCertCampaignDto> {
    const envelope = await apiGet(identityPaths.accessCertification(id));
    return unwrapData<AccessCertCampaignDto>(envelope);
  },

  async open(id: string): Promise<AccessCertCampaignDto> {
    const envelope = await apiPost(identityPaths.accessCertificationOpen(id), {});
    return unwrapData<AccessCertCampaignDto>(envelope);
  },

  async complete(id: string): Promise<AccessCertCampaignDto> {
    const envelope = await apiPost(identityPaths.accessCertificationComplete(id), {});
    return unwrapData<AccessCertCampaignDto>(envelope);
  },

  async listItems(campaignId: string, decision?: string): Promise<AccessCertItemDto[]> {
    const q = decision ? `?decision=${encodeURIComponent(decision)}` : "";
    const envelope = await apiGet(
      `${identityPaths.accessCertificationItems(campaignId)}${q}`
    );
    return asList(unwrapData(envelope));
  },

  async certifyItem(itemId: string, payload: CertifyItemPayload): Promise<AccessCertItemDto> {
    const envelope = await apiPost(identityPaths.accessCertifyItem(itemId), payload);
    return unwrapData<AccessCertItemDto>(envelope);
  },
};
