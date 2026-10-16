import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export type CompanyNumberingDto = {
  company_id: string;
  branch_series_enabled: boolean;
  branch_series_from_fiscal_year: string | null;
  row_version: number;
};

export const companyNumberingService = {
  async get(companyId: string): Promise<CompanyNumberingDto> {
    const qs = `?company_id=${encodeURIComponent(companyId)}`;
    const envelope = await apiGet(financePaths.companyNumbering + qs);
    return unwrapData<CompanyNumberingDto>(envelope);
  },

  async enableBranchSeries(
    companyId: string,
    fromFiscalYear: string
  ): Promise<CompanyNumberingDto> {
    const envelope = await apiPost(financePaths.companyNumberingEnableBranch, {
      company_id: companyId,
      branch_series_from_fiscal_year: fromFiscalYear,
    });
    return unwrapData<CompanyNumberingDto>(envelope);
  },

  async disableBranchSeries(companyId: string): Promise<CompanyNumberingDto> {
    const envelope = await apiPost(financePaths.companyNumberingDisableBranch, {
      company_id: companyId,
    });
    return unwrapData<CompanyNumberingDto>(envelope);
  },
};
