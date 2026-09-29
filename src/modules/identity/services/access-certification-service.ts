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
  [key: string]: unknown;
};

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const accessCertificationService = {
  async list(): Promise<AccessCertCampaignDto[]> {
    const envelope = await apiGet(identityPaths.accessCertifications);
    const data = unwrapData<AccessCertCampaignDto[] | { data: AccessCertCampaignDto[] }>(envelope);
    if (Array.isArray(data)) return data;
    if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
      return (data as { data: AccessCertCampaignDto[] }).data;
    }
    return [];
  },

  async open(id: string): Promise<AccessCertCampaignDto> {
    const envelope = await apiPost(identityPaths.accessCertificationOpen(id), {});
    return unwrapData<AccessCertCampaignDto>(envelope);
  },

  async complete(id: string): Promise<AccessCertCampaignDto> {
    const envelope = await apiPost(identityPaths.accessCertificationComplete(id), {});
    return unwrapData<AccessCertCampaignDto>(envelope);
  },
};
