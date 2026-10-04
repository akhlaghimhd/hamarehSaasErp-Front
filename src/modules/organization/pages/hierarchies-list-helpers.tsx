/**
 * FE-ORG hierarchies list — shared helpers (derived map FULL)
 */
"use client";

import { tokenStorage } from "@/api";

export const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";

export const PURPOSE_LABEL: Record<string, string> = {
  LEGAL: "حقوقی",
  MANAGEMENT: "مدیریتی",
  TAX: "مالیاتی",
  ESTABLISHMENT: "استقرار",
  CUSTOM: "سفارشی",
};

export const ENTITY_LABEL: Record<string, string> = {
  COMPANY: "شرکت",
  BRANCH: "شعبه",
  DEPARTMENT: "دپارتمان",
  BUSINESS_UNIT: "واحد کسب‌وکار",
  COST_CENTER: "مرکز هزینه",
};

export type CatalogItem = { id: string; label: string; sub?: string };
export type HierForm = { code: string; name: string };
export type NodeForm = { entity_type: string; entity_id: string; parent_node_id: string };

export function isSystemHierarchy(h: { code?: string; is_system?: boolean }): boolean {
  if (h.is_system === true) return true;
  return String(h.code ?? "").startsWith("SYS-");
}

export function purposeLabel(p?: string) {
  return PURPOSE_LABEL[p ?? ""] ?? p ?? "—";
}

export function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}
