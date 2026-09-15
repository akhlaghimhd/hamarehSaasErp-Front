/** Client-side export helpers for organization members list. */

import { toast } from "sonner";
import { toFaDigits } from "@/shared/lib/utils";
import type { TenantUserDto } from "../types";

function memberDisplayName(row: TenantUserDto): string {
  const u = row.user;
  if (!u) return "—";
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return name || u.email || "—";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return toFaDigits(
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value))
    );
  } catch {
    return toFaDigits(value);
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  try {
    return toFaDigits(
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    );
  } catch {
    return toFaDigits(value);
  }
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * اکسل واقعی با جدول HTML/SpreadsheetML — هر فیلد یک سلول جدا
 * (روش قابل‌اعتماد برای اکسل فارسی ویندوز)
 */
export function exportMembersExcel(rows: TenantUserDto[]) {
  const header = ["نام", "ایمیل", "موبایل", "وضعیت", "مدیر اصلی", "تاریخ عضویت"];
  const headHtml = header.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const bodyHtml = rows
    .map((r) => {
      const cells = [
        memberDisplayName(r),
        r.user?.email ?? "",
        r.user?.mobile ?? "",
        Number(r.status) === 1 ? "فعال" : "غیرفعال",
        r.is_owner ? "بله" : "خیر",
        r.created_at ? new Date(r.created_at).toLocaleDateString("en-CA") : "",
      ];
      return `<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`;
    })
    .join("");

  const html = `\uFEFF<html xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8" />
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
<x:Name>کاربران</x:Name><x:WorksheetOptions><x:DisplayRightToLeft/></x:WorksheetOptions>
</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
</head>
<body dir="rtl">
<table border="1">
<thead><tr>${headHtml}</tr></thead>
<tbody>${bodyHtml}</tbody>
</table>
</body></html>`;

  downloadBlob(
    `karbaran-sazman-${new Date().toISOString().slice(0, 10)}.xls`,
    html,
    "application/vnd.ms-excel;charset=utf-8"
  );
  toast.success("فایل اکسل آماده شد");
}

export function exportMembersPdf(rows: TenantUserDto[]) {
  const body = rows
    .map((r) => {
      const cells = [
        escapeHtml(memberDisplayName(r)),
        escapeHtml(r.user?.email ?? "—"),
        escapeHtml(r.user?.mobile ? toFaDigits(r.user.mobile) : "—"),
        Number(r.status) === 1 ? "فعال" : "غیرفعال",
        r.is_owner ? "بله" : "خیر",
        escapeHtml(formatDate(r.created_at)),
      ];
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>فهرست کاربران سازمان</title>
  <style>
    body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#111;background:#fff}
    h1{font-size:18px;margin:0 0 8px}
    p{font-size:12px;color:#555;margin:0 0 16px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #ccc;padding:8px;text-align:right}
    th{background:#f3f4f6}
    @media print{body{padding:0}}
  </style>
</head>
<body>
  <h1>فهرست کاربران سازمان</h1>
  <p>تاریخ تهیه: ${escapeHtml(formatDateTime(new Date().toISOString()))} · تعداد: ${toFaDigits(rows.length)}</p>
  <table>
    <thead>
      <tr>
        <th>نام</th><th>ایمیل</th><th>موبایل</th><th>وضعیت</th><th>مدیر اصلی</th><th>عضویت</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer,width=960,height=720");
  if (!w) {
    URL.revokeObjectURL(url);
    toast.error("برای خروجی، باز شدن پنجره جدید را در مرورگر اجازه دهید.");
    return;
  }
  window.setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch {
      toast.error("چاپ ممکن نشد؛ از منوی مرورگر چاپ بگیرید.");
    }
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, 500);
}
