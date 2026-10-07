import { apiClient } from "@/shared/lib/api-client";
import { financePaths } from "./paths";
import type { FixedAssetDto } from "../types";

export const fixedAssetService = {
  async list(companyId: string): Promise<FixedAssetDto[]> {
    const res = await apiClient.get<{ data: FixedAssetDto[] }>(
      financePaths.fixedAssets,
      { params: { company_id: companyId } }
    );
    return res.data?.data ?? [];
  },

  async create(payload: Record<string, unknown>): Promise<FixedAssetDto> {
    const res = await apiClient.post<{ data: FixedAssetDto }>(
      financePaths.fixedAssets,
      payload
    );
    return res.data.data;
  },

  async runDepreciation(payload: {
    company_id: string;
    period_id: string;
    ledger_id: string;
  }): Promise<{ journal_entry_id?: string; run?: unknown }> {
    const res = await apiClient.post<{ data: { journal_entry_id?: string; run?: unknown } }>(
      financePaths.fixedAssetsRunDepreciation,
      payload
    );
    return res.data.data;
  },
};
