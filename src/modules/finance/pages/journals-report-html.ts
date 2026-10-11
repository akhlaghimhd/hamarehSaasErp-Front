"use client";

import { toFaDigits } from "@/shared/lib/utils";

export type JournalReportLine = {
  accountLabel: string;
  description: string;
  debit: number;
  credit: number;
  costCenterLabel: string;
  businessUnitLabel: string;
  isSystemBalance?: boolean;
};

export type JournalReportMeta = {
  companyName: string;
  orgName: string;
  entryNumber: string | null;
  documentDate: string;
  periodLabel: string;
  userLabel: string;
  exportedAt: string;
  description: string;
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
  totalDiff: number;
};

function formatMoney(n: number): string {
  return toFaDigits(
    n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  );
}

export function buildJournalReportHtml(
  meta: JournalReportMeta,
  lines: JournalReportLine[]
): string {
  const rowsHtml = lines
    .map((l, idx) => {
      const bg = l.isSystemBalance ? "#fffbeb" : idx % 2 === 1 ? "#e2e8f0" : "#ffffff";
      return `<tr style="background:${bg}">
        <td class="c">${toFaDigits(idx + 1)}</td>
        <td>${l.accountLabel || "—"}</td>
        <td>${l.description || "—"}</td>
        <td class="n debit">${l.debit ? formatMoney(l.debit) : "—"}</td>
        <td class="n credit">${l.credit ? formatMoney(l.credit) : "—"}</td>
        <td>${l.costCenterLabel || "—"}</td>
        <td>${l.businessUnitLabel || "—"}</td>
        <td class="c">${l.isSystemBalance ? "تراز" : "—"}</td>
      </tr>`;
    })
    .join("");

  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>سند حسابداری ${meta.entryNumber ? toFaDigits(meta.entryNumber) : "پیش‌نویس"}</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/vazirmatn@33.003/Vazirmatn-font-face.css"/>
<style>
  *{box-sizing:border-box}
  body{font-family:Vazirmatn,Tahoma,Arial,sans-serif;padding:16px 18px;color:#111;font-size:11px;margin:0}
  h1{font-size:15px;margin:0 0 10px;text-align:center;font-weight:700}
  .meta{width:100%;border-collapse:collapse;margin-bottom:10px}
  .meta td{border:1px solid #94a3b8;padding:5px 8px;vertical-align:top}
  .meta td.k{width:16%;background:#f1f5f9;font-weight:600;white-space:nowrap}
  .meta td.v{width:34%}
  table.lines{width:100%;border-collapse:collapse;font-size:10.5px}
  table.lines th,table.lines td{border:1px solid #64748b;padding:5px 6px;text-align:right}
  table.lines th{background:#e2e8f0;font-weight:600}
  th.debit,td.debit{color:#075985;background:#f0f9ff}
  th.credit,td.credit{color:#065f46;background:#ecfdf5}
  td.n,th.n{text-align:left;font-variant-numeric:tabular-nums;direction:ltr}
  td.c,th.c{text-align:center}
  .totals{margin-top:10px;width:50%;border-collapse:collapse}
  .totals td{border:1px solid #64748b;padding:5px 8px}
  .totals td.k{background:#f1f5f9;font-weight:600;width:40%}
  .totals td.debit{color:#075985;font-weight:700}
  .totals td.credit{color:#065f46;font-weight:700}
  @media print{body{padding:8px}}
</style>
</head>
<body>
  <h1>سند حسابداری</h1>
  <table class="meta">
    <tr>
      <td class="k">شرکت</td><td class="v">${meta.companyName}</td>
      <td class="k">سازمان</td><td class="v">${meta.orgName}</td>
    </tr>
    <tr>
      <td class="k">شماره سند</td><td class="v">${meta.entryNumber ? toFaDigits(meta.entryNumber) : "پیش‌نویس"}</td>
      <td class="k">تاریخ سند</td><td class="v">${meta.documentDate ? toFaDigits(meta.documentDate) : "—"}</td>
    </tr>
    <tr>
      <td class="k">دوره مالی</td><td class="v">${meta.periodLabel}</td>
      <td class="k">کاربر</td><td class="v">${meta.userLabel}</td>
    </tr>
    <tr>
      <td class="k">زمان خروجی</td><td class="v">${meta.exportedAt}</td>
      <td class="k">وضعیت تراز</td><td class="v">${meta.isBalanced ? "تراز ✓" : "نامتراز"}</td>
    </tr>
    <tr>
      <td class="k">شرح سند</td><td class="v" colspan="3">${meta.description || "—"}</td>
    </tr>
  </table>
  <table class="lines">
    <thead>
      <tr>
        <th class="c">#</th>
        <th>حساب</th>
        <th>شرح سطر</th>
        <th class="n debit">بدهکار</th>
        <th class="n credit">بستانکار</th>
        <th>مرکز هزینه</th>
        <th>واحد کسب‌وکار</th>
        <th class="c">نوع</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <table class="totals">
    <tr><td class="k">جمع بدهکار</td><td class="n debit">${formatMoney(meta.totalDebit)}</td></tr>
    <tr><td class="k">جمع بستانکار</td><td class="n credit">${formatMoney(meta.totalCredit)}</td></tr>
    <tr><td class="k">اختلاف</td><td class="n">${formatMoney(meta.totalDiff)}</td></tr>
  </table>
</body>
</html>`;
}
