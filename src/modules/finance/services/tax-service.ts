import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";
import type { TaxRateConfigDto, TaxTransactionDto } from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const taxService = {
  async listRates(): Promise<TaxRateConfigDto[]> {
    const envelope = await apiGet(financePaths.taxRates);
    const data = unwrapData<TaxRateConfigDto[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },

  async createRate(payload: {
    tax_code: string;
    name: string;
    rate_percent: number;
    valid_from: string;
    valid_to?: string | null;
    is_default?: boolean;
  }): Promise<TaxRateConfigDto> {
    const envelope = await apiPost(financePaths.taxRates, payload);
    return unwrapData<TaxRateConfigDto>(envelope);
  },

  async listTransactions(companyId?: string): Promise<TaxTransactionDto[]> {
    const q = companyId ? `?company_id=${encodeURIComponent(companyId)}` : "";
    const envelope = await apiGet(financePaths.taxTransactions + q);
    const data = unwrapData<TaxTransactionDto[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },
};
