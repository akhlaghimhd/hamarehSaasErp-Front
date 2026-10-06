/**
 * Tenant feature packs (PLT-W1 / SAASADM-P0) — read entitlements for UI gates.
 * Backend: GET /saas-platform/feature-entitlements
 */

import { apiGet } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";

export const FEATURE_PACK_CODES = {
  multiCompany: "multi_company",
  multiBranch: "multi_branch",
  multiBusinessUnit: "multi_business_unit",
  customOrgHierarchy: "custom_org_hierarchy",
  orgIntercompany: "org.intercompany",
  orgSalesStructure: "org.sales_structure",
  orgPurchStructure: "org.purch_structure",
} as const;

export type FeaturePackCode =
  (typeof FEATURE_PACK_CODES)[keyof typeof FEATURE_PACK_CODES];

export type FeatureEntitlementsPayload = {
  tenant_id?: string;
  enabled_codes?: string[];
  entitlements?: Array<{
    feature_code?: string;
    is_enabled?: boolean;
    source?: string;
    [key: string]: unknown;
  }>;
};

const FEATURE_ENTITLEMENTS_PATH = "/saas-platform/feature-entitlements";

function unwrapData<T>(envelope: unknown): T {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    return (envelope as ApiSuccessResponse<T>).data;
  }
  return envelope as T;
}

export const featureEntitlementsService = {
  async mine(): Promise<FeatureEntitlementsPayload> {
    const envelope = await apiGet(FEATURE_ENTITLEMENTS_PATH);
    return unwrapData<FeatureEntitlementsPayload>(envelope);
  },

  isEnabled(payload: FeatureEntitlementsPayload | undefined, code: string): boolean {
    const codes = payload?.enabled_codes ?? [];
    return codes.map(String).includes(code);
  },
};
