import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";
import type { TreasuryDocumentDto } from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const treasuryService = {
  async listDocuments(params?: { company_id?: string; status?: string }) {
    const q = new URLSearchParams();
    if (params?.company_id) q.set("company_id", params.company_id);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    const envelope = await apiGet(
      qs ? `${financePaths.treasuryDocuments}?${qs}` : financePaths.treasuryDocuments
    );
    const data = unwrapData<TreasuryDocumentDto[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },

  async createDocument(payload: Record<string, unknown>) {
    const envelope = await apiPost(financePaths.treasuryDocuments, payload);
    return unwrapData<TreasuryDocumentDto>(envelope);
  },

  async postDocument(id: string, ledgerId: string, offsetAccountId: string) {
    const envelope = await apiPost(financePaths.treasuryPost(id), {
      ledger_id: ledgerId,
      offset_account_id: offsetAccountId,
    });
    return unwrapData<TreasuryDocumentDto>(envelope);
  },
};
