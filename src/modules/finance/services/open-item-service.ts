import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";
import type { AgingBucketDto, OpenItemDto } from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const openItemService = {
  async list(companyId: string, side?: string) {
    const q = new URLSearchParams({ company_id: companyId });
    if (side) q.set("side", side);
    const envelope = await apiGet(`${financePaths.openItems}?${q}`);
    const data = unwrapData<OpenItemDto[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },

  async create(payload: Record<string, unknown>) {
    const envelope = await apiPost(financePaths.openItems, payload);
    return unwrapData<OpenItemDto>(envelope);
  },

  async aging(companyId: string, side: string) {
    const q = new URLSearchParams({ company_id: companyId, side });
    const envelope = await apiGet(`${financePaths.openItemsAging}?${q}`);
    const data = unwrapData<AgingBucketDto[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },
};
