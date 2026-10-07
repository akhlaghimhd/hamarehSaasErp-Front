import { apiGet } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";
import type { BalanceSheetDto, ProfitAndLossDto, TrialBalanceRow } from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

function qs(companyId: string, periodId: string) {
  return `?company_id=${encodeURIComponent(companyId)}&period_id=${encodeURIComponent(periodId)}`;
}

export const reportService = {
  async trialBalance(companyId: string, periodId: string): Promise<TrialBalanceRow[]> {
    const envelope = await apiGet(financePaths.trialBalance + qs(companyId, periodId));
    const data = unwrapData<TrialBalanceRow[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },

  async profitAndLoss(companyId: string, periodId: string): Promise<ProfitAndLossDto> {
    const envelope = await apiGet(financePaths.profitAndLoss + qs(companyId, periodId));
    return unwrapData<ProfitAndLossDto>(envelope);
  },

  async balanceSheet(companyId: string, periodId: string): Promise<BalanceSheetDto> {
    const envelope = await apiGet(financePaths.balanceSheet + qs(companyId, periodId));
    return unwrapData<BalanceSheetDto>(envelope);
  },
};
