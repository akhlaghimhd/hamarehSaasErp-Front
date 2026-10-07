import { apiClient } from "@/shared/lib/api-client";
import { financePaths } from "./paths";
import type { PeriodCloseChecklistDto } from "../types";

export const periodCloseService = {
  async evaluate(companyId: string, periodId: string): Promise<PeriodCloseChecklistDto> {
    const res = await apiClient.post<{ data: PeriodCloseChecklistDto }>(
      financePaths.periodCloseEvaluate,
      { company_id: companyId, period_id: periodId }
    );
    return res.data.data;
  },

  async softClose(companyId: string, periodId: string): Promise<unknown> {
    const res = await apiClient.post(financePaths.periodCloseSoft, {
      company_id: companyId,
      period_id: periodId,
    });
    return res.data;
  },

  async hardClose(companyId: string, periodId: string): Promise<unknown> {
    const res = await apiClient.post(financePaths.periodCloseHard, {
      company_id: companyId,
      period_id: periodId,
    });
    return res.data;
  },
};
