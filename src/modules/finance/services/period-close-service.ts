import { apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";
import type { PeriodCloseChecklistDto } from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const periodCloseService = {
  async evaluate(companyId: string, periodId: string): Promise<PeriodCloseChecklistDto> {
    const envelope = await apiPost(financePaths.periodCloseEvaluate, {
      company_id: companyId,
      period_id: periodId,
    });
    return unwrapData<PeriodCloseChecklistDto>(envelope);
  },

  async softClose(companyId: string, periodId: string): Promise<unknown> {
    const envelope = await apiPost(financePaths.periodCloseSoft, {
      company_id: companyId,
      period_id: periodId,
    });
    return unwrapData(envelope);
  },

  async hardClose(companyId: string, periodId: string): Promise<unknown> {
    const envelope = await apiPost(financePaths.periodCloseHard, {
      company_id: companyId,
      period_id: periodId,
    });
    return unwrapData(envelope);
  },
};
