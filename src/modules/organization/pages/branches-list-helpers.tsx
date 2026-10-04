/**
 * FE-ORG branches list — shared helpers
 */
"use client";

import { toFaDigits } from "@/shared/lib/utils";
import type { BranchDto } from "../types";

export const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";
export const MSG_NO_ACCESS = "برای مشاهده این بخش مجوز لازم را ندارید.";
export const COL_STORAGE = "organization.branches.columns.v2";
export const ALL = "__all__";

export type StatusFilter = "all" | "active" | "inactive";
export type SortKey = "name" | "code" | "company" | "kind" | "address" | "status" | "created";
export type SortDir = "asc" | "desc";
export type ColumnId =
  | "name"
  | "code"
  | "company"
  | "kind"
  | "address"
  | "status"
  | "created"
  | "actions";
export type BulkKind = "activate" | "deactivate" | "delete" | "restore";
export type BranchRow = BranchDto & { company_name: string };

export type BranchForm = {
  company_id: string;
  code: string;
  name: string;
  address: string;
  branch_kind: string;
  parent_branch_id: string;
  default_warehouse_id: string;
  is_active: boolean;
  supports_shipping: boolean;
  supports_receiving: boolean;
  is_manufacturing_site: boolean;
};

export const COLS: { id: ColumnId; label: string; hideable?: boolean; sort?: SortKey }[] = [
  { id: "name", label: "نام شعبه", hideable: false, sort: "name" },
  { id: "code", label: "کد", sort: "code" },
  { id: "company", label: "شرکت", sort: "company" },
  { id: "kind", label: "نوع", sort: "kind" },
  { id: "address", label: "آدرس", sort: "address" },
  { id: "status", label: "وضعیت", sort: "status" },
  { id: "created", label: "تاریخ ایجاد", sort: "created" },
  { id: "actions", label: "عملیات", hideable: false },
];

export const emptyForm = (): BranchForm => ({
  company_id: "",
  code: "",
  name: "",
  address: "",
  branch_kind: "OFFICE",
  parent_branch_id: "",
  default_warehouse_id: "",
  is_active: true,
  supports_shipping: false,
  supports_receiving: false,
  is_manufacturing_site: false,
});

export function rowToForm(r: BranchRow): BranchForm {
  return {
    company_id: r.company_id,
    code: r.code ?? "",
    name: r.name ?? "",
    address: r.address ?? "",
    branch_kind: (r.branch_kind as string) || "OFFICE",
    parent_branch_id: r.parent_branch_id ?? "",
    default_warehouse_id: r.default_warehouse_id ?? "",
    is_active: r.is_active !== false,
    supports_shipping: Boolean(r.supports_shipping),
    supports_receiving: Boolean(r.supports_receiving),
    is_manufacturing_site: Boolean(r.is_manufacturing_site),
  };
}

export function formatCodeDisplay(code?: string | null): { text: string; dir: "ltr" | "rtl" } {
  const s = (code ?? "").trim();
  if (!s) return { text: "—", dir: "rtl" };
  if (/[A-Za-z]/.test(s)) return { text: s, dir: "ltr" };
  return { text: toFaDigits(s), dir: "rtl" };
}
