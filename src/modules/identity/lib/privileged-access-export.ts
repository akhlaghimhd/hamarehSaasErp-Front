/** Client-side Excel + PDF export for privileged-access grants. */

import * as XLSX from "xlsx";
import { toast } from "sonner";
import { toFaDigits, formatJalaliDateTime } from "@/shared/lib/utils";
import type { PrivilegedGrantDto } from "../services/privileged-access-service";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "در انتظار",
  APPROVED: "تأیید شده",
  ACTIVE: "فعال",
  DENIED: "رد شده",
  REVOKED: "لغو شده",
  EXPIRED: "منقضی",
};

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function jalaliStamp(): string {
  try {
    return toFaDigits(
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date())
    ).replace(/\//g, "-");
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
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

export function exportPrivilegedExcel(
  rows: PrivilegedGrantDto[],
  userLabel: Map<string, string>,
  roleLabel: Map<string, string>
) {
  const aoa: (string | number)[][] = [
    ["وضعیت", "کاربر", "نقش", "مدت (دقیقه)", "شروع / ثبت", "پایان", "دلیل"],
  ];
  for (const r of rows) {
    const st = String(r.status ?? "").toUpperCase();
    aoa.push([
      STATUS_LABEL[st] ?? st,
      userLabel.get(String(r.user_id ?? "")) ?? String(r.user_id ?? ""),
      roleLabel.get(String(r.tenant_role_id ?? "")) ?? String(r.tenant_role_id ?? ""),
      r.duration_minutes != null ? Number(r.duration_minutes) : "",
      formatJalaliDateTime(
        (r as { created_at?: string }).created_at ?? r.starts_at ?? null
      ),
      formatJalaliDateTime(r.ends_at ?? null),
      r.reason ?? "",
    ]);
  }
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
  XLSX.utils.book_append_sheet(wb, ws, "دسترسی اضطراری");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  downloadArrayBuffer(
    `privileged-access-${jalaliStamp()}.xlsx`,
    out,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  toast.success("فایل اکسل آماده شد");
}

export function exportPrivilegedPdf(
  rows: PrivilegedGrantDto[],
  userLabel: Map<string, string>,
  roleLabel: Map<string, string>
) {
  const body = rows
    .map((r) => {
      const st = String(r.status ?? "").toUpperCase();
      const cells = [
        escapeHtml(STATUS_LABEL[st] ?? (st || "—")),
        escapeHtml(userLabel.get(String(r.user_id ?? "")) ?? String(r.user_id ?? "—")),
        escapeHtml(roleLabel.get(String(r.tenant_role_id ?? "")) ?? String(r.tenant_role_id ?? "—")),
        escapeHtml(
          r.duration_minutes != null ? `${toFaDigits(r.duration_minutes)} دقیقه` : "—"
        ),
        escapeHtml(
          formatJalaliDateTime(
            (r as { created_at?: string }).created_at ?? r.starts_at ?? null
          )
        ),
        escapeHtml(formatJalaliDateTime(r.ends_at ?? null)),
        escapeHtml(r.reason ?? "—"),
      ];
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>دسترسی اضطراری</title>
<style>
body{font-family:Tahoma,Arial,sans-serif;font-size:12px;padding:16px;direction:rtl;color:#111}
h1{font-size:16px;margin:0 0 4px}
.meta{font-size:11px;color:#666;margin:0 0 12px}
table{width:100%;border-collapse:collapse}
th,td{border:1px solid #ccc;padding:6px 8px;text-align:right;vertical-align:top}
th{background:#f3f4f6}
@media print{body{padding:0}}
</style></head><body>
<h1>گزارش دسترسی اضطراری</h1>
<p class="meta">${escapeHtml(toFaDigits(rows.length))} مورد · ${escapeHtml(jalaliStamp())}</p>
<table>
<thead><tr>
<th>وضعیت</th><th>کاربر</th><th>نقش</th><th>مدت</th><th>شروع / ثبت</th><th>پایان</th><th>دلیل</th>
</tr></thead>
<tbody>${body || `<tr><td colspan="7">موردی نیست</td></tr>`}</tbody>
</table>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    toast.error("مرورگر پنجره چاپ را مسدود کرد");
    return;
  }
  w.document.write(html);
  w.document.close();
}
