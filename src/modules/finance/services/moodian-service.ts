import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";
import type { MoodianSubmissionDto } from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const moodianService = {
  async list(params?: { company_id?: string; status?: string }) {
    const q = new URLSearchParams();
    if (params?.company_id) q.set("company_id", params.company_id);
    if (params?.status) q.set("status", params.status);
    const qs = q.toString();
    const envelope = await apiGet(
      qs ? `${financePaths.moodianSubmissions}?${qs}` : financePaths.moodianSubmissions
    );
    const data = unwrapData<MoodianSubmissionDto[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },

  async poll(id: string) {
    const envelope = await apiPost(financePaths.moodianPoll(id), {});
    return unwrapData<MoodianSubmissionDto>(envelope);
  },
};
