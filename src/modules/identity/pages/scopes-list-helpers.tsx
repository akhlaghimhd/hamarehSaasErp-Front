/** Helpers for scopes list page */
import type { ScopeDto } from "@/modules/identity/services/scope-service";
import * as XLSX from "xlsx";
import { toFaDigits } from "@/shared/lib/utils";

export const STRUCTURAL = new Set([
  "COMPANY",
  "BRANCH",
  "WAREHOUSE",
  "DEPARTMENT",
  "COST_CENTER",
  "BUSINESS_UNIT",
]);

export const TYPE_LABEL: Record<string, string> = {
  COMPANY: "شرکت",
  BRANCH: "شعبه",
  WAREHOUSE: "انبار",
  DEPARTMENT: "واحد سازمانی",
  COST_CENTER: "مرکز هزینه",
  BUSINESS_UNIT: "واحد کسب‌وکار",
  CUSTOM: "سفارشی",
};

export const CREATE_TYPES = [
  { value: "COMPANY", label: "شرکت" },
  { value: "BRANCH", label: "شعبه" },
  { value: "DEPARTMENT", label: "واحد سازمانی" },
  { value: "BUSINESS_UNIT", label: "واحد کسب‌وکار" },
  { value: "COST_CENTER", label: "مرکز هزینه" },
] as const;

export type RefOption = { id: string; label: string };
export type SortKey = "name" | "type" | "refs" | "status";
export type SortDir = "asc" | "desc";

export function scopeTypeLabel(t: string) {
  return TYPE_LABEL[String(t).toUpperCase()] ?? t;
}

export function refCount(r: ScopeDto) {
  if (Array.isArray(r.reference_ids) && r.reference_ids.length > 0)
    return r.reference_ids.length;
  return r.reference_id ? 1 : 0;
}

export function exportScopesExcel(rows: ScopeDto[]) {
  const aoa: (string | number)[][] = [
    ["نام", "نوع", "تعداد مرجع", "وضعیت", "توضیح"],
  ];
  for (const r of rows) {
    const st = (r as { deleted_at?: string | null }).deleted_at
      ? "حذف‌شده"
      : r.is_active === false
        ? "غیرفعال"
        : "فعال";
    aoa.push([
      r.scope_name,
      scopeTypeLabel(r.scope_type),
      refCount(r),
      st,
      r.description || "",
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "محدوده‌ها");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `scopes-${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export { toFaDigits };
