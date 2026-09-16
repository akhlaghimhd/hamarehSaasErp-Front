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

/** تاریخ شمسی با ارقام فارسی */
export function formatJalaliDate(value?: string | null): string {
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
    return toFaDigits(String(value));
  }
}

export function formatJalaliDateTime(value?: string | null): string {
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
    return toFaDigits(String(value));
  }
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** CSV cell: quote when needed (Excel-compatible) */
function csvCell(value: string): string {
  const v = String(value ?? "");
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function downloadBlob(filename: string, content: string | Blob, mime: string) {
  const blob =
    typeof content === "string" ? new Blob([content], { type: mime }) : content;
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
 * خروجی اکسل استاندارد:
 * - فایل CSV با BOM UTF-8 (اکسل ویندوز/مک بدون خطا باز می‌کند)
 * - تاریخ عضویت شمسی
 */
export function exportMembersExcel(rows: TenantUserDto[]) {
  const header = [
    "نام",
    "ایمیل",
    "موبایل",
    "وضعیت",
    "مدیر اصلی",
    "تاریخ عضویت",
  ];
  const lines: string[] = [header.map(csvCell).join(",")];

  for (const r of rows) {
    const cells = [
      memberDisplayName(r),
      r.user?.email ?? "",
      r.user?.mobile ?? "",
      Number(r.status) === 1 ? "فعال" : "غیرفعال",
      r.is_owner ? "بله" : "خیر",
      r.created_at ? formatJalaliDate(r.created_at) : "",
    ];
    lines.push(cells.map(csvCell).join(","));
  }

  // BOM برای تشخیص UTF-8 توسط اکسل
  const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";
  const stamp = formatJalaliDate(new Date().toISOString()).replace(/\//g, "-");
  downloadBlob(
    `karbaran-sazman-${stamp}.csv`,
    csv,
    "text/csv;charset=utf-8"
  );
  toast.success("فایل اکسل (CSV) آماده شد — با اکسل باز کنید");
}

/**
 * الگوی ثبت گروهی — CSV UTF-8 استاندارد برای اکسل
 */
export function downloadMembersImportTemplate() {
  const lines = [
    ["نام", "نام خانوادگی", "ایمیل", "موبایل"].map(csvCell).join(","),
    ["علی", "رضایی", "ali.rezaei.import@example.com", "09121234567"]
      .map(csvCell)
      .join(","),
    ["سارا", "محمدی", "sara.mohammadi.import@example.com", "09129876543"]
      .map(csvCell)
      .join(","),
  ];
  const csv = "\uFEFF" + lines.join("\r\n") + "\r\n";
  downloadBlob("olgu-karbaran.csv", csv, "text/csv;charset=utf-8");
  toast.message(
    "الگوی CSV دانلود شد. در اکسل پر کنید، با همان فرمت CSV (UTF-8) ذخیره کنید، سپس «ورود از اکسل»."
  );
}

/**
 * PDF / چاپ با فونت وزیرمتن (Vazirmatn)
 */
export function exportMembersPdf(rows: TenantUserDto[]) {
  const body = rows
    .map((r) => {
      const cells = [
        escapeHtml(memberDisplayName(r)),
        escapeHtml(r.user?.email ?? "—"),
        escapeHtml(r.user?.mobile ? toFaDigits(r.user.mobile) : "—"),
        Number(r.status) === 1 ? "فعال" : "غیرفعال",
        r.is_owner ? "بله" : "خیر",
        escapeHtml(formatJalaliDate(r.created_at)),
      ];
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>فهرست کاربران سازمان</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Vazirmatn", Tahoma, Arial, sans-serif;
      padding: 24px;
      color: #111;
      background: #fff;
      direction: rtl;
    }
    h1 { font-size: 18px; font-weight: 700; margin: 0 0 8px; }
    p { font-size: 12px; color: #555; margin: 0 0 16px; font-weight: 400; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td {
      border: 1px solid #ccc;
      padding: 8px 10px;
      text-align: right;
      font-family: "Vazirmatn", Tahoma, Arial, sans-serif;
    }
    th { background: #f3f4f6; font-weight: 600; }
    @media print {
      body { padding: 0; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
  <h1>فهرست کاربران سازمان</h1>
  <p>تاریخ تهیه: ${escapeHtml(formatJalaliDateTime(new Date().toISOString()))} · تعداد: ${toFaDigits(rows.length)}</p>
  <table>
    <thead>
      <tr>
        <th>نام</th><th>ایمیل</th><th>موبایل</th><th>وضعیت</th><th>مدیر اصلی</th><th>عضویت</th>
      </tr>
    </thead>
    <tbody>${body}</tbody>
  </table>
  <script>
    document.fonts.ready.then(function () {
      setTimeout(function () {
        try { window.focus(); window.print(); } catch (e) {}
      }, 300);
    });
  </script>
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
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
