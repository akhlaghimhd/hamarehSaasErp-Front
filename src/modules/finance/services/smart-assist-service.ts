import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export type AccountSuggestion = {
  account_id: string;
  account_code: string;
  name: string;
  score: number;
  reason: string;
};

export type PlInsight = {
  code: string;
  severity: string;
  text: string;
};

export const smartAssistService = {
  async suggestAccounts(payload: {
    company_id: string;
    description?: string;
    side?: 1 | 2;
  }) {
    const envelope = await apiPost(financePaths.smartSuggestAccounts, payload);
    return unwrapData<{
      suggestions: AccountSuggestion[];
      override_allowed: boolean;
    }>(envelope);
  },

  async recordDecision(payload: {
    decision: "ACCEPTED" | "REJECTED" | "OVERRIDDEN";
    suggested_account_id?: string;
    chosen_account_id?: string;
  }) {
    await apiPost(financePaths.smartAccountDecision, payload);
  },

  async nlDraft(payload: {
    company_id: string;
    ledger_id: string;
    period_id: string;
    command: string;
  }) {
    const envelope = await apiPost(financePaths.smartNlDraft, payload);
    return unwrapData<{
      journal_entry_id: string;
      status: string;
      explanation: string;
    }>(envelope);
  },

  async plInsights(companyId: string, periodId: string) {
    const q = new URLSearchParams({
      company_id: companyId,
      period_id: periodId,
    });
    const envelope = await apiGet(`${financePaths.plInsights}?${q.toString()}`);
    return unwrapData<{ insights: PlInsight[]; pl: unknown }>(envelope);
  },
};
