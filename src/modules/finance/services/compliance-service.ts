import { apiGet, apiPost } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { financePaths } from "./paths";
import type { ComplianceAlertDto } from "../types";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const complianceService = {
  async listOpen(companyId?: string) {
    const q = companyId ? `?company_id=${encodeURIComponent(companyId)}` : "";
    const envelope = await apiGet(financePaths.complianceAlerts + q);
    const data = unwrapData<ComplianceAlertDto[] | unknown>(envelope);
    return Array.isArray(data) ? data : [];
  },

  async scan(companyId: string) {
    const envelope = await apiPost(financePaths.complianceScan, {
      company_id: companyId,
    });
    return unwrapData<{ raised: number; open: ComplianceAlertDto[] }>(envelope);
  },

  async resolve(alertId: string) {
    const envelope = await apiPost(financePaths.complianceResolve(alertId), {});
    return unwrapData<ComplianceAlertDto>(envelope);
  },
};
