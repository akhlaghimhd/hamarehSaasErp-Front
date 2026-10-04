/**
 * FE-ORG departments list — shared helpers
 */
"use client";

import { toFaDigits } from "@/shared/lib/utils";
import type { DepartmentDto } from "../types";

export const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";
export const MSG_NO_ACCESS = "برای مشاهده این بخش مجوز لازم را ندارید.";
export const COL_STORAGE = "organization.departments.columns.v1";
export const ALL = "__all__";

export type StatusFilter = "all" | "active" | "inactive";
export type SortKey = "name" | "code" | "company" | "branch" | "status" | "created";
export type SortDir = "asc" | "desc";
export type ColumnId = "name" | "code" | "company" | "branch" | "status" | "created" | "actions";
export type BulkKind = "activate" | "deactivate" | "delete" | "restore";
export type DeptRow = DepartmentDto & { company_name: string; branch_name: string };

export type DeptForm = {
  company_id: string;
  branch_id: string;
  code: string;
  name: string;
  is_active: boolean;
};

export const COLS: { id: ColumnId; label: string; hideable?: boolean; sort?: SortKey }[] = [
  { id: "name", label: "نام واحد", hideable: false, sort: "name" },
  { id: "code", label: "کد", sort: "code" },
  { id: "company", label: "شرکت", sort: "company" },
  { id: "branch", label: "شعبه", sort: "branch" },
  { id: "status", label: "وضعیت", sort: "status" },
  { id: "created", label: "تاریخ ایجاد", sort: "created" },
  { id: "actions", label: "عملیات", hideable: false },
];

export const emptyForm = (): DeptForm => ({
  company_id: "",
  branch_id: "",
  code: "",
  name: "",
  is_active: true,
});

export function rowToForm(r: DeptRow): DeptForm {
  return {
    company_id: r.company_id ?? "",
    branch_id: r.branch_id,
    code: r.code ?? "",
    name: r.name ?? "",
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
