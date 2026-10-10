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

export type CreateOpenItemPayload = {
  company_id: string;
  side: "AR" | "AP";
  document_date: string;
  due_date?: string;
  counterparty_name: string;
  original_amount: number;
  document_number?: string;
  document_type?: string;
  gl_account_id?: string;
  description?: string;
};

export type AllocateOpenItemPayload = {
  amount: number;
  treasury_document_id?: string;
  journal_entry_id?: string;
  allocation_date?: string;
  description?: string;
};

export const openItemService = {
  async list(companyId: string, side?: string): Promise<OpenItemDto[]> {
    const q = new URLSearchParams({ company_id: companyId });
    if (side) q.set("side", side);
    const envelope = await apiGet(`${financePaths.openItems}?${q}`);
    const data = unwrapData<OpenItemDto[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },

  async create(payload: CreateOpenItemPayload): Promise<OpenItemDto> {
    const envelope = await apiPost(financePaths.openItems, payload);
    return unwrapData<OpenItemDto>(envelope);
  },

  async allocate(
    id: string,
    payload: AllocateOpenItemPayload
  ): Promise<OpenItemDto> {
    const envelope = await apiPost(financePaths.openItemAllocate(id), payload);
    return unwrapData<OpenItemDto>(envelope);
  },

  async aging(companyId: string, side: string): Promise<AgingBucketDto[]> {
    const q = new URLSearchParams({ company_id: companyId, side });
    const envelope = await apiGet(`${financePaths.openItemsAging}?${q}`);
    const data = unwrapData<AgingBucketDto[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },
};
