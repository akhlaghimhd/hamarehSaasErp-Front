import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import type { TaxRateConfigDto } from "../types";
import { financePaths } from "./paths";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export type VatSummary = {
  company_id: string;
  from: string;
  to: string;
  by_code: Array<{
    tax_code: string;
    direction: string;
    txn_count: number;
    taxable: string;
    tax: string;
  }>;
  totals: {
    output_tax: string;
    input_tax: string;
    net_payable: string;
    txn_count: number;
  };
};

export type MoodianRecon = {
  company_id: string;
  from: string;
  to: string;
  tax_txn_count: number;
  tax_amount_total: string;
  moodian: Record<string, number>;
  gaps: Array<{
    tax_transaction_id: string;
    tax_code: string;
    tax_amount: string;
    transaction_date: string;
    reason: string;
  }>;
  gap_count: number;
};

export const taxService = {
  async listRates() {
    const envelope = await apiGet(financePaths.taxRates);
    return unwrapData<TaxRateConfigDto[]>(envelope);
  },

  async createRate(payload: {
    tax_code: string;
    name: string;
    rate_percent: number;
    valid_from: string;
    valid_to?: string;
    is_default?: boolean;
  }) {
    const envelope = await apiPost(financePaths.taxRates, payload);
    return unwrapData<TaxRateConfigDto>(envelope);
  },

  async vatSummary(companyId: string, from: string, to: string) {
    const q = new URLSearchParams({ company_id: companyId, from, to });
    const envelope = await apiGet(`${financePaths.taxVatSummary}?${q}`);
    return unwrapData<VatSummary>(envelope);
  },

  async moodianRecon(companyId: string, from: string, to: string) {
    const q = new URLSearchParams({ company_id: companyId, from, to });
    const envelope = await apiGet(`${financePaths.taxMoodianRecon}?${q}`);
    return unwrapData<MoodianRecon>(envelope);
  },
};
