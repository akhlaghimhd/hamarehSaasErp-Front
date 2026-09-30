/** گزارش PDF بازبینی دسترسی */

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
  PENDING: "در انتظار",
  APPROVED: "تأیید",
  REVOKE_REQUESTED: "نیاز به اصلاح",
  DEFERRED: "موکول",
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** گزارش قابل چاپ / ذخیره PDF از پنجره چاپ مرورگر */
export async function openAccessCertReport(opts: {
  campaign: AccessCertCampaignDto;
  items: AccessCertItemDto[];
  userLabel: Map<string, string>;
  roleLabel: Map<string, string>;
}) {
  const { campaign, items, userLabel, roleLabel } = opts;
  const st = String(campaign.status || "").toUpperCase();
  const pending = items.filter(
    (i) => String(i.decision || "PENDING").toUpperCase() === "PENDING"
  ).length;
  const approved = items.filter(
    (i) => String(i.decision || "").toUpperCase() === "APPROVED"
  ).length;
  const revoke = items.filter(
    (i) => String(i.decision || "").toUpperCase() === "REVOKE_REQUESTED"
  ).length;
  const deferred = items.filter(
    (i) => String(i.decision || "").toUpperCase() === "DEFERRED"
  ).length;
  const blocks = items.filter((i) => i.sod_has_block).length;

  const rows = items
    .map((i) => {
      const name =
        userLabel.get(String(i.user_id ?? "")) || String(i.user_id || "—");
      const roles = (i.role_ids_snapshot || [])
        .map((id) => roleLabel.get(String(id)) || "نقش")
        .join("، ");
      const d = String(i.decision || "PENDING").toUpperCase();
      const sod = i.sod_has_block
        ? "تضاد جدی"
        : i.sod_has_warn
          ? "هشدار"
          : "بدون تضاد";
      return `<tr>
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(roles || "بدون نقش")}</td>
        <td>${escapeHtml(sod)}</td>
        <td>${escapeHtml(DECISION_FA[d] || d)}</td>
      </tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html lang="fa" dir="rtl"><head>
<meta charset="utf-8"/>
<title>گزارش بازبینی دسترسی — ${escapeHtml(campaign.name || "")}</title>
<style>
  body{font-family:Tahoma,Arial,sans-serif;padding:24px;color:#111;font-size:13px}
  h1{font-size:18px;margin:0 0 8px}
  .meta{color:#555;margin-bottom:16px;line-height:1.7}
  .cards{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0 20px}
  .card{border:1px solid #ddd;border-radius:8px;padding:10px 14px;min-width:90px;text-align:center}
  .card b{display:block;font-size:18px}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #ccc;padding:8px;text-align:right}
  th{background:#f5f5f5}
  @media print{button{display:none}}
</style></head><body>
<h1>گزارش بازبینی دسترسی</h1>
<div class="meta">
  <div><strong>نام کمپین:</strong> ${escapeHtml(campaign.name || "—")}</div>
  <div><strong>کد:</strong> ${escapeHtml(campaign.code || "—")}</div>
  <div><strong>وضعیت:</strong> ${escapeHtml(STATUS_LABEL[st] || st)}</div>
  <div><strong>تاریخ گزارش:</strong> ${escapeHtml(
    toFaDigits(
      new Intl.DateTimeFormat("fa-IR", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date())
    )
  )}</div>
</div>
<div class="cards">
  <div class="card"><b>${toFaDigits(items.length)}</b>کل اعضا</div>
  <div class="card"><b>${toFaDigits(pending)}</b>در انتظار</div>
  <div class="card"><b>${toFaDigits(approved)}</b>تأیید</div>
  <div class="card"><b>${toFaDigits(revoke)}</b>نیاز به اصلاح</div>
  <div class="card"><b>${toFaDigits(deferred)}</b>موکول</div>
  <div class="card"><b>${toFaDigits(blocks)}</b>تضاد جدی نقش</div>
</div>
<table>
  <thead><tr><th>عضو</th><th>نقش‌ها</th><th>تضاد نقش</th><th>تصمیم</th></tr></thead>
  <tbody>${rows || "<tr><td colspan='4'>موردی ثبت نشده</td></tr>"}</tbody>
</table>
<p style="margin-top:20px;color:#666;font-size:12px">
  برای ذخیره PDF از پنجره چاپ، گزینه «Save as PDF» / «ذخیره به صورت PDF» را انتخاب کنید.
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
