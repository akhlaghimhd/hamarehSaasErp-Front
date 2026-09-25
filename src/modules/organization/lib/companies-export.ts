/** Client-side Excel (.xlsx) + PDF export for organizations companies. */

import * as XLSX from "xlsx";
import { toast } from "sonner";
import { toFaDigits } from "@/shared/lib/utils";
import { ENTITY_KIND_LABELS, type CompanyDto } from "../types";

function displayName(row: CompanyDto): string {
  return (row.legal_name || row.name || "—").trim() || "—";
}

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
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
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
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  downloadArrayBuffer(
    filename,
    out,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}

export function exportCompaniesExcel(
  rows: CompanyDto[],
  parentMap: Map<string, string>
) {
  const aoa: (string | number)[][] = [
    [
      "نام",
      "کد",
      "کاربرد",
      "شماره ثبت",
      "شرکت والد",
      "شعب",
      "واحدها",
      "زیرمجموعه",
      "وضعیت",
      "شرکت اصلی",
      "تاریخ ایجاد",
    ],
  ];
  for (const r of rows) {
    aoa.push([
      displayName(r),
      r.code ?? "",
      ENTITY_KIND_LABELS[r.entity_kind ?? "OPERATING"] ?? r.entity_kind ?? "",
      r.registration_number ?? "",
      r.parent_company_id ? parentMap.get(r.parent_company_id) ?? "" : "",
      toFaDigits(Number(r.branches_count ?? 0)),
      toFaDigits(Number(r.departments_count ?? 0)),
      toFaDigits(Number(r.children_count ?? 0)),
      r.is_active !== false ? "فعال" : "غیرفعال",
      r.is_primary ? "بله" : "خیر",
      r.created_at ? formatJalaliDate(r.created_at) : "",
    ]);
  }
  const stamp = formatJalaliDate(new Date().toISOString()).replace(/\//g, "-");
  writeXlsxDownload(`sherkatha-${stamp}.xlsx`, "شرکت‌ها", aoa);
  toast.success("فایل اکسل آماده شد");
}

export function exportCompaniesPdf(
  rows: CompanyDto[],
  parentMap: Map<string, string>
) {
  const body = rows
    .map((r) => {
      const cells = [
        escapeHtml(displayName(r)),
        escapeHtml(r.code ?? "—"),
        escapeHtml(
          ENTITY_KIND_LABELS[r.entity_kind ?? "OPERATING"] ?? r.entity_kind ?? "—"
        ),
        escapeHtml(r.registration_number ?? "—"),
        escapeHtml(
          r.parent_company_id ? parentMap.get(r.parent_company_id) ?? "—" : "—"
        ),
        toFaDigits(Number(r.branches_count ?? 0)),
        toFaDigits(Number(r.departments_count ?? 0)),
        toFaDigits(Number(r.children_count ?? 0)),
        r.is_active !== false ? "فعال" : "غیرفعال",
        escapeHtml(formatJalaliDate(r.created_at)),
      ];
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>فهرست شرکت‌ها</title>
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
    p { font-size: 12px; color: #555; margin: 0 0 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td {
      border: 1px solid #ccc;
      padding: 6px 8px;
      text-align: right;
      font-family: "Vazirmatn", Tahoma, Arial, sans-serif;
    }
    th { background: #f3f4f6; font-weight: 600; }
    @media print {
      body { padding: 0; }
      @page { margin: 10mm; size: landscape; }
    }
  </style>
</head>
<body>
  <h1>فهرست شرکت‌های سازمان</h1>
  <p>تاریخ تهیه: ${"${"}escapeHtml(formatJalaliDateTime(new Date().toISOString()))} · تعداد: ${"${"}toFaDigits(rows.length)}</p>
  <table>
    <thead>
      <tr>
        <th>نام</th><th>کد</th><th>کاربرد</th><th>ثبت</th><th>والد</th>
        <th>شعب</th><th>واحد</th><th>زیرمجموعه</th><th>وضعیت</th><th>ایجاد</th>
      </tr>
    </thead>
    <tbody>${"${"}body}</tbody>
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
  const w = window.open(url, "_blank", "noopener,noreferrer,width=1100,height=720");
  if (!w) {
    URL.revokeObjectURL(url);
    toast.error("برای خروجی، باز شدن پنجره جدید را در مرورگر اجازه دهید.");
    return;
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
}
