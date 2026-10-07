import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";
import type { ChequeDto } from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const chequeService = {
  async list(params?: { company_id?: string; status?: string }) {
    const q = new URLSearchParams();
    if (params?.company_id) q.set("company_id", params.company_id);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    const envelope = await apiGet(
      qs ? `${financePaths.cheques}?${qs}` : financePaths.cheques
    );
    const data = unwrapData<ChequeDto[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },

  async create(payload: Record<string, unknown>) {
    const envelope = await apiPost(financePaths.cheques, payload);
    return unwrapData<ChequeDto>(envelope);
  },

  async transition(id: string, status: string) {
    const envelope = await apiPost(financePaths.chequeTransition(id), { status });
    return unwrapData<ChequeDto>(envelope);
  },
};
