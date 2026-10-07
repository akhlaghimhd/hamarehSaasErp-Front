import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";
import type { SuggestedJournalDto } from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const suggestedJournalService = {
  async list(params?: { company_id?: string; status?: string }) {
    const q = new URLSearchParams();
    if (params?.company_id) q.set("company_id", params.company_id);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString() ? `?${q.toString()}` : "";
    const envelope = await apiGet(financePaths.suggestedJournals + qs);
    const data = unwrapData<SuggestedJournalDto[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },

  async show(id: string) {
    const envelope = await apiGet(financePaths.suggestedJournal(id));
    return unwrapData<SuggestedJournalDto>(envelope);
  },

  async accept(id: string, note?: string) {
    const envelope = await apiPost(financePaths.suggestedJournalAccept(id), {
      note: note ?? null,
    });
    return unwrapData<SuggestedJournalDto>(envelope);
  },

  async reject(id: string, note?: string) {
    const envelope = await apiPost(financePaths.suggestedJournalReject(id), {
      note: note ?? null,
    });
    return unwrapData<SuggestedJournalDto>(envelope);
  },
};
