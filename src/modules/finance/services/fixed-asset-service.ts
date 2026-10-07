import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";
import type { FixedAssetDto } from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export type CreateFixedAssetPayload = {
  company_id: string;
  asset_code: string;
  name: string;
  asset_account_id: string;
  accum_depr_account_id: string;
  depr_expense_account_id: string;
  cost_center_id?: string | null;
  acquisition_date: string;
  acquisition_cost: number;
  salvage_value?: number;
  useful_life_months: number;
  depreciation_method?: string;
};

export const fixedAssetService = {
  async list(companyId: string): Promise<FixedAssetDto[]> {
    const envelope = await apiGet(
      `${financePaths.fixedAssets}?company_id=${encodeURIComponent(companyId)}`
    );
    const data = unwrapData<FixedAssetDto[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },

  async create(payload: CreateFixedAssetPayload): Promise<FixedAssetDto> {
    const envelope = await apiPost(financePaths.fixedAssets, payload);
    return unwrapData<FixedAssetDto>(envelope);
  },

  async runDepreciation(payload: {
    company_id: string;
    period_id: string;
    ledger_id: string;
  }): Promise<{ journal_entry_id?: string; run?: unknown }> {
    const envelope = await apiPost(financePaths.fixedAssetsRunDepreciation, payload);
    return unwrapData<{ journal_entry_id?: string; run?: unknown }>(envelope);
  },
};
