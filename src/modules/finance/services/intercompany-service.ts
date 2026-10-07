import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";
import type { TrialBalanceRow } from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const intercompanyService = {
  async upsertMap(payload: {
    from_company_id: string;
    to_company_id: string;
    due_from_account_id: string;
    due_to_account_id: string;
    description?: string;
  }) {
    const envelope = await apiPost(financePaths.icAccountMaps, payload);
    return unwrapData(envelope);
  },

  async createPair(payload: {
    from_company_id: string;
    to_company_id: string;
    from_ledger_id: string;
    to_ledger_id: string;
    period_id: string;
    amount: number;
    from_offset_account_id: string;
    to_offset_account_id: string;
    description?: string;
  }) {
    const envelope = await apiPost(financePaths.icPairs, payload);
    return unwrapData<{ from_journal_entry_id?: string; to_journal_entry_id?: string }>(
      envelope
    );
  },

  async createElimination(payload: {
    elimination_company_id: string;
    ledger_id: string;
    period_id: string;
    due_from_account_id: string;
    due_to_account_id: string;
    amount: number;
    description?: string;
  }) {
    const envelope = await apiPost(financePaths.icEliminations, payload);
    return unwrapData<{ journal_entry_id?: string }>(envelope);
  },

  async consolidatedTrialBalance(
    consolidationCompanyId: string,
    periodId: string
  ): Promise<TrialBalanceRow[]> {
    const q = new URLSearchParams({
      consolidation_company_id: consolidationCompanyId,
      period_id: periodId,
    });
    const envelope = await apiGet(
      `${financePaths.consolidatedTrialBalance}?${q.toString()}`
    );
    const data = unwrapData<TrialBalanceRow[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },
};
