/** گزارش PDF بازبینی دسترسی — وضعیت اولیه + تصمیم مدیر */

import { toast } from "sonner";
import { toFaDigits } from "@/shared/lib/utils";
import type {
  AccessCertCampaignDto,
  AccessCertItemDto,
} from "../services/access-certification-service";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  OPEN: "در حال بررسی",
  COMPLETED: "پایان‌یافته",
  CANCELLED: "لغو شده",
};

const DECISION_FA: Record<string, string> = {
  PENDING: "هنوز باز (بدون تصمیم نهایی)",
  APPROVED: "پذیرش استثنا (عمداً پذیرفته شد)",
  REVOKE_REQUESTED: "در صف اصلاح نقش",
  DEFERRED: "موکول به دوره بعد",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, """);
}

function formatFaDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return toFaDigits(
      new Intl.DateTimeFormat("fa-IR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    );
  } catch {
    return "—";
  }
}

export async function openAccessCertReport(opts: {
  campaign: AccessCertCampaignDto;
  items: AccessCertItemDto[];
  userLabel: Map<string, string>;
  roleLabel: Map<string, string>;
}) {
  const { campaign, items, userLabel, roleLabel } = opts;
  const st = String(campaign.status || "").toUpperCase();

  const openCount = items.filter((i) => {
    const d = String(i.decision || "PENDING").toUpperCase();
    return d === "PENDING" || d === "REVOKE_REQUESTED";
  }).length;
  const exception = items.filter(
    (i) => String(i.decision || "").toUpperCase() === "APPROVED"
  ).length;
  const deferred = items.filter(
    (i) => String(i.decision || "").toUpperCase() === "DEFERRED"
  ).length;
  const blocks = items.filter((i) => i.sod_has_block).length;
  const warns = items.filter((i) => i.sod_has_warn && !i.sod_has_block).length;

  const rows = [...items]
    .sort((a, b) => {
      const sa = a.sod_has_block ? 2 : a.sod_has_warn ? 1 : 0;
      const sb = b.sod_has_block ? 2 : b.sod_has_warn ? 1 : 0;
      return sb - sa;
    })
    .map((i) => {
      const name =
        userLabel.get(String(i.user_id ?? "")) || String(i.user_id || "—");
      const roles = (i.role_ids_snapshot || [])
        .map((id) => roleLabel.get(String(id)) || "نقش")
        .join("، ");
      const d = String(i.decision || "PENDING").toUpperCase();
      const severity = i.sod_has_block
        ? "تضاد جدی"
        : i.sod_has_warn
          ? "هشدار"
          : "—";
      const conflicts = Array.isArray(i.sod_conflicts)
        ? i.sod_conflicts
            .map((c) => c.name || c.code || "قانون")
            .filter(Boolean)
            .join("؛ ")
        : "";
      const note = String(
        (i as { decision_note?: string; note?: string }).decision_note ||
          i.note ||
          ""
      ).trim();
      return `<tr>
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(roles || "بدون نقش")}</td>
        <td><strong>${escapeHtml(severity)}</strong>${
          conflicts
            ? `<div style="color:#555;font-size:11px;margin-top:4px">${escapeHtml(conflicts)}</div>`
            : ""
        }</td>
        <td>${escapeHtml(DECISION_FA[d] || d)}${
          note
            ? `<div style="color:#555;font-size:11px;margin-top:4px">یادداشت: ${escapeHtml(note)}</div>`
            : ""
        }</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html lang="fa" dir="rtl"><head>
<meta charset="utf-8"/>
<title>گزارش بازبینی دسترسی — ${escapeHtml(campaign.name || "")}</title>
<style>
  body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#111;font-size:13px;line-height:1.6}
  h1{font-size:18px;margin:0 0 6px}
  h2{font-size:14px;margin:18px 0 8px}
  .meta{color:#444;margin-bottom:14px}
  .cards{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 18px}
  .card{border:1px solid #ddd;border-radius:8px;padding:10px 12px;min-width:88px;text-align:center}
  .card b{display:block;font-size:17px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #ccc;padding:8px;text-align:right;vertical-align:top}
  th{background:#f3f3f3}
  .note{color:#555;font-size:12px;margin-top:16px}
  @media print{button{display:none}}
</style></head><body>
<h1>گزارش بازبینی دسترسی</h1>
<div class="meta">
  <div><strong>کمپین:</strong> ${escapeHtml(campaign.name || "—")}
    <span style="color:#888">(${escapeHtml(campaign.code || "—")})</span></div>
  <div><strong>وضعیت کمپین:</strong> ${escapeHtml(STATUS_LABEL[st] || st)}</div>
  <div><strong>ایجاد:</strong> ${escapeHtml(formatFaDate(String(campaign.created_at || "")))}</div>
  <div><strong>شروع بررسی:</strong> ${escapeHtml(formatFaDate(campaign.opened_at ? String(campaign.opened_at) : null))}</div>
  <div><strong>پایان:</strong> ${escapeHtml(formatFaDate(campaign.completed_at ? String(campaign.completed_at) : null))}</div>
  <div><strong>تاریخ تهیه گزارش:</strong> ${escapeHtml(formatFaDate(new Date().toISOString()))}</div>
</div>
<p style="margin:0 0 8px;color:#333">
  این گزارش <strong>شکاف‌های نقش</strong> در لحظهٔ اسکن و <strong>تصمیم مدیر</strong> روی هر مورد را نشان می‌دهد.
</p>
<div class="cards">
  <div class="card"><b>${toFaDigits(items.length)}</b>کل شکاف‌ها</div>
  <div class="card"><b>${toFaDigits(blocks)}</b>تضاد جدی</div>
  <div class="card"><b>${toFaDigits(warns)}</b>هشدار</div>
  <div class="card"><b>${toFaDigits(openCount)}</b>باز</div>
  <div class="card"><b>${toFaDigits(exception)}</b>استثنا</div>
  <div class="card"><b>${toFaDigits(deferred)}</b>موکول</div>
</div>
<h2>جزئیات موارد</h2>
<table>
  <thead>
    <tr>
      <th style="width:18%">عضو</th>
      <th style="width:28%">نقش‌ها در زمان اسکن</th>
      <th style="width:28%">اشکال / قانون</th>
      <th style="width:26%">تصمیم مدیر</th>
    </tr>
  </thead>
  <tbody>${rows || "<tr><td colspan='4'>موردی ثبت نشده</td></tr>"}</tbody>
</table>
<p class="note">
  «پذیرش استثنا» یعنی مدیر آگاهانه ریسک باقی‌مانده را پذیرفته است.
  «موکول» یعنی بررسی به دوره بعد منتقل شده.
  برای ذخیره PDF از پنجره چاپ، گزینه Save as PDF را انتخاب کنید.
</p>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) {
    toast.error("لطفاً باز شدن پنجرهٔ جدید را در مرورگر مجاز کنید.");
    return;
  }
  w.document.write(html);
  w.document.close();
}
