/** Client-side Excel (.xlsx) + PDF export for organization members. */

import * as XLSX from "xlsx";
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

function downloadArrayBuffer(filename: string, data: ArrayBuffer, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function writeXlsxDownload(filename: string, sheetName: string, aoa: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // عرض تقریبی ستون‌ها برای خوانایی در اکسل
  const colCount = aoa[0]?.length ?? 1;
  ws["!cols"] = Array.from({ length: colCount }, (_, i) => {
    let max = 10;
    for (const row of aoa) {
      const cell = row[i];
      const len = cell == null ? 0 : String(cell).length;
      if (len > max) max = len;
    }
    return { wch: Math.min(Math.max(max + 2, 12), 40) };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  // bookType xlsx = فرمت واقعی Office Open XML
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  downloadArrayBuffer(
    filename,
    out,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

/**
 * خروجی واقعی Excel (.xlsx)
 * - هر ستون یک سلول جدا
 * - تاریخ عضویت شمسی
 * - بدون وابستگی به HTML جعلی
 */
export function exportMembersExcel(rows: TenantUserDto[]) {
  const aoa: (string | number)[][] = [
    ["نام", "ایمیل", "موبایل", "وضعیت", "مدیر اصلی", "تاریخ عضویت"],
  ];
  for (const r of rows) {
    aoa.push([
      memberDisplayName(r),
      r.user?.email ?? "",
      r.user?.mobile ?? "",
      Number(r.status) === 1 ? "فعال" : "غیرفعال",
      r.is_owner ? "بله" : "خیر",
      r.created_at ? formatJalaliDate(r.created_at) : "",
    ]);
  }
  const stamp = formatJalaliDate(new Date().toISOString()).replace(/\//g, "-");
  writeXlsxDownload(`karbaran-sazman-${stamp}.xlsx`, "کاربران", aoa);
  toast.success("فایل اکسل آماده شد");
}

/**
 * الگوی ثبت گروهی — فایل واقعی .xlsx
 * ستون‌ها: نام | نام خانوادگی | ایمیل | موبایل
 */
export function downloadMembersImportTemplate() {
  const aoa: (string | number)[][] = [
    ["نام", "نام خانوادگی", "ایمیل", "موبایل"],
    ["علی", "رضایی", "ali.rezaei.import@example.com", "09121234567"],
    ["سارا", "محمدی", "sara.mohammadi.import@example.com", "09129876543"],
  ];
  writeXlsxDownload("olgu-karbaran.xlsx", "الگو", aoa);
  toast.message(
    "الگوی اکسل دانلود شد. ردیف‌های نمونه را پاک کنید، کاربران را وارد کنید و همان فایل .xlsx را بارگذاری کنید."
  );
}

/**
 * خواندن جدول از فایل اکسل واقعی (.xlsx / .xls) یا CSV
 */
export async function readSpreadsheetTable(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  const isExcel =
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsm") ||
    file.type.includes("spreadsheet") ||
    file.type.includes("excel");

  if (isExcel || name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".txt")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, {
      type: "array",
      codepage: 65001, // UTF-8
      cellDates: false,
      raw: false,
    });
    if (!wb.SheetNames.length) {
      throw new Error("فایل برگه‌ای ندارد.");
    }
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
    });
    return aoa.map((row) =>
      (row ?? []).map((cell) => String(cell ?? "").trim())
    );
  }

  throw new Error(
    "فرمت پشتیبانی‌شده نیست. فایل .xlsx (اکسل) یا در صورت نیاز CSV بارگذاری کنید."
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
