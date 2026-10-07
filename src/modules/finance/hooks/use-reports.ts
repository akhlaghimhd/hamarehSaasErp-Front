"use client";

import { useQuery } from "@tanstack/react-query";
import { reportService } from "../services/report-service";

export function useTrialBalance(companyId: string | null, periodId: string | null) {
  return useQuery({
    queryKey: ["finance", "tb", companyId, periodId],
    queryFn: () => reportService.trialBalance(companyId!, periodId!),
    enabled: Boolean(companyId && periodId),
  });
}

export function useProfitAndLoss(companyId: string | null, periodId: string | null) {
  return useQuery({
    queryKey: ["finance", "pl", companyId, periodId],
    queryFn: () => reportService.profitAndLoss(companyId!, periodId!),
    enabled: Boolean(companyId && periodId),
  });
}

export function useBalanceSheet(companyId: string | null, periodId: string | null) {
  return useQuery({
    queryKey: ["finance", "bs", companyId, periodId],
    queryFn: () => reportService.balanceSheet(companyId!, periodId!),
    enabled: Boolean(companyId && periodId),
  });
}
