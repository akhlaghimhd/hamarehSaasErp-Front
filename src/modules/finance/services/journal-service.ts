import { apiGet, apiPost, apiPut, apiDelete } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";
import type { CreateJournalPayload, JournalEntryDto } from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const journalService = {
  async list(params?: {
    company_id?: string;
    period_id?: string;
    status?: string;
  }): Promise<JournalEntryDto[]> {
    const q = new URLSearchParams();
    if (params?.company_id) q.set("company_id", params.company_id);
    if (params?.period_id) q.set("period_id", params.period_id);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    const envelope = await apiGet(
      qs ? `${financePaths.journals}?${qs}` : financePaths.journals
    );
    const data = unwrapData<JournalEntryDto[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },

  async getById(id: string): Promise<JournalEntryDto> {
    const envelope = await apiGet(financePaths.journal(id));
    return unwrapData<JournalEntryDto>(envelope);
  },

  async createDraft(payload: CreateJournalPayload): Promise<JournalEntryDto> {
    const envelope = await apiPost(financePaths.journals, payload);
    return unwrapData<JournalEntryDto>(envelope);
  },

  async updateDraft(
    id: string,
    payload: Partial<CreateJournalPayload>
  ): Promise<JournalEntryDto> {
    const envelope = await apiPut(financePaths.journal(id), payload);
    return unwrapData<JournalEntryDto>(envelope);
  },

  async deleteDraft(id: string): Promise<void> {
    await apiDelete(financePaths.journal(id));
  },

  async post(id: string): Promise<JournalEntryDto> {
    const envelope = await apiPost(financePaths.journalPost(id), {});
    return unwrapData<JournalEntryDto>(envelope);
  },

  async reverse(id: string, description?: string): Promise<JournalEntryDto> {
    const envelope = await apiPost(financePaths.journalReverse(id), {
      description: description ?? null,
    });
    return unwrapData<JournalEntryDto>(envelope);
  },
};
