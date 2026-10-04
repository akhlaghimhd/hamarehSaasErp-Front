/**
 * FE-ORG business units list — shared helpers
 */
"use client";

import { toFaDigits } from "@/shared/lib/utils";
import type { BusinessUnitDto } from "../services/org-extended-service";

export const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";
export const MSG_NO_ACCESS = "برای مشاهده این بخش مجوز لازم را ندارید.";
export const COL_STORAGE = "organization.business-units.columns.v1";
export const PAGE_SIZE = 20;

export type StatusFilter = "all" | "active" | "inactive";
export type MembershipFilter = "active" | "deleted";
export type SortKey = "name" | "code" | "status" | "created" | "companies";
export type SortDir = "asc" | "desc";
export type ColumnId = "name" | "code" | "companies" | "status" | "created" | "actions";
export type BulkKind = "activate" | "deactivate" | "delete" | "restore";
export type LinkConfirm =
  | { kind: "leave_all" }
  | { kind: "swap_primary" }
  | { kind: "bulk_disconnect_primary"; names: string[] };

export type BuForm = { code: string; name: string; description: string; is_active: boolean };

export const COLS: { id: ColumnId; label: string; hideable?: boolean; sort?: SortKey }[] = [
  { id: "name", label: "نام", hideable: false, sort: "name" },
  { id: "code", label: "کد", sort: "code" },
  { id: "companies", label: "شرکت‌های متصل", sort: "companies" },
  { id: "status", label: "وضعیت", sort: "status" },
  { id: "created", label: "تاریخ ایجاد", sort: "created" },
  { id: "actions", label: "عملیات", hideable: false },
];

export const emptyForm = (): BuForm => ({ code: "", name: "", description: "", is_active: true });

export function rowToForm(r: BusinessUnitDto): BuForm {
  return {
    code: r.code ?? "",
    name: r.name ?? "",
    description: r.description ?? "",
    is_active: r.is_active !== false,
  };
}

export function formatCodeDisplay(code?: string | null): { text: string; dir: "ltr" | "rtl" } {
  const s = (code ?? "").trim();
  if (!s) return { text: "—", dir: "rtl" };
  if (/[A-Za-z]/.test(s)) return { text: s, dir: "ltr" };
  return { text: toFaDigits(s), dir: "rtl" };
}

export function isRecentCreated(iso?: string | null, days = 3): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * 86_400_000;
}

export type CompanyLabelSource = {
  company_id: string;
  name?: string | null;
  legal_name?: string | null;
};

/** Prefer company catalog so nested assignment.company blanks (ScopeScoped) do not hide names. */
export function companyLabels(
  bu: BusinessUnitDto,
  companyCatalog?: CompanyLabelSource[] | null
): string {
  const rows = bu.company_assignments ?? [];
  if (!rows.length) return "—";
  const byId = new Map<string, CompanyLabelSource>();
  for (const c of companyCatalog ?? []) {
    if (c?.company_id) byId.set(c.company_id, c);
  }
  return rows
    .map((a) => {
      const fromCatalog = byId.get(a.company_id);
      const n =
        (fromCatalog?.legal_name || fromCatalog?.name || "").trim() ||
        (a.company?.legal_name || a.company?.name || "").trim() ||
        "شرکت";
      return a.is_primary ? `${n} (اصلی این واحد)` : n;
    })
    .join("، ");
}
