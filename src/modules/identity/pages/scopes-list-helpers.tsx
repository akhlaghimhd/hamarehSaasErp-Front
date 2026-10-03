/** Helpers for scopes list page */
import type { ScopeDto } from "@/modules/identity/services/scope-service";
import * as XLSX from "xlsx";

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

function statusLabel(r: ScopeDto) {
  if ((r as { deleted_at?: string | null }).deleted_at) return "حذف‌شده";
  if (r.is_active === false) return "غیرفعال";
  return "فعال";
}

export function exportScopesExcel(rows: ScopeDto[]) {
  const aoa: (string | number)[][] = [
    ["نام", "نوع", "تعداد مرجع", "وضعیت", "توضیح"],
  ];
  for (const r of rows) {
    aoa.push([
      r.scope_name,
      scopeTypeLabel(r.scope_type),
      refCount(r),
      statusLabel(r),
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

/** Escape for print-window HTML without literal entity syntax (API-safe). */
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&" + "amp;")
    .replace(/</g, "&" + "lt;")
    .replace(/>/g, "&" + "gt;")
    .replace(/"/g, "&" + "quot;");
}

/** PDF via print window (same pattern as members list) */
export function exportScopesPdf(rows: ScopeDto[]) {
  const body = rows
    .map((r) => {
      const cells = [
        escapeHtml(r.scope_name ?? "—"),
        escapeHtml(scopeTypeLabel(r.scope_type)),
        escapeHtml(String(refCount(r))),
        escapeHtml(statusLabel(r)),
        escapeHtml(r.description || "—"),
      ];
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    })
    .join("");
  const html = `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>محدوده‌های دسترسی</title>
<style>
body{font-family:Tahoma,Arial,sans-serif;font-size:12px;padding:16px;direction:rtl}
h1{font-size:16px;margin:0 0 12px}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #ccc;padding:6px 8px;text-align:right}
th{background:#f3f4f6}
</style></head><body>
<h1>محدوده‌های دسترسی</h1>
<table>
<thead><tr><th>نام</th><th>نوع</th><th>مرجع</th><th>وضعیت</th><th>توضیح</th></tr></thead>
<tbody>${body}</tbody>
</table>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) {
    throw new Error("مرورگر پنجره چاپ را مسدود کرد");
  }
  w.document.write(html);
  w.document.close();
}
