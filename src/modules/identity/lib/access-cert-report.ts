/** گزارش PDF بازبینی دسترسی — برندینگ مستاجر + تصمیم‌گیرنده */

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

/** Avoid literal HTML entities in source (GitHub content API can decode them and break JS). */
function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    "&": "&" + "amp;",
    "<": "&" + "lt;",
    ">": "&" + "gt;",
    '"': "&" + "quot;",
  };
  return s.replace(/[&<>"]/g, (ch) => map[ch] ?? ch);
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

function reviewerIdOf(item: AccessCertItemDto): string {
  const raw = item as {
    reviewer_user_id?: string | null;
    reviewed_by?: string | null;
  };
  return String(raw.reviewer_user_id || raw.reviewed_by || "").trim();
}

function decidedAtOf(item: AccessCertItemDto): string | null {
  const raw = item as { decided_at?: string | null; reviewed_at?: string | null };
  if (raw.decided_at) return String(raw.decided_at);
  if (raw.reviewed_at) return String(raw.reviewed_at);
  return null;
}

export async function openAccessCertReport(opts: {
  campaign: AccessCertCampaignDto;
  items: AccessCertItemDto[];
  userLabel: Map<string, string>;
  roleLabel: Map<string, string>;
  /** نام سازمان / مستاجر برای سربرگ */
  tenantName?: string | null;
  tenantCode?: string | null;
  /** نام و نام خانوادگی تهیه‌کننده گزارش */
  reporterName?: string | null;
}) {
  const {
    campaign,
    items,
    userLabel,
    roleLabel,
    tenantName,
    tenantCode,
    reporterName,
  } = opts;
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

  const orgTitle = String(tenantName || "").trim() || "سازمان";
  const orgCode = String(tenantCode || "").trim();
  const reporter =
    String(reporterName || "").trim() || "کاربر سامانه";

  const rows = [...items]
    .sort((a, b) => {
      const sa = a.sod_has_block ? 2 : a.sod_has_warn ? 1 : 0;
      const sb = b.sod_has_block ? 2 : b.sod_has_warn ? 1 : 0;
      return sb - sa;
    })
    .map((i, idx) => {
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

      const reviewerUid = reviewerIdOf(i);
      const reviewerName = reviewerUid
        ? userLabel.get(reviewerUid) || reviewerUid
        : d === "PENDING"
          ? "—"
          : "ثبت‌نشده";
      const decidedAt = formatFaDate(decidedAtOf(i));

      return (
        "<tr>" +
        "<td class=\"num\">" +
        toFaDigits(idx + 1) +
        "</td>" +
        "<td>" +
        escapeHtml(name) +
        "</td>" +
        "<td>" +
        escapeHtml(roles || "بدون نقش") +
        "</td>" +
        "<td><strong>" +
        escapeHtml(severity) +
        "</strong>" +
        (conflicts
          ? '<div class=\"sub\">' +
            escapeHtml(conflicts) +
            "</div>"
          : "") +
        "</td>" +
        "<td>" +
        escapeHtml(DECISION_FA[d] || d) +
        (note
          ? '<div class=\"sub\">یادداشت: ' +
            escapeHtml(note) +
            "</div>"
          : "") +
        "</td>" +
        "<td>" +
        escapeHtml(reviewerName) +
        (decidedAt !== "—"
          ? '<div class=\"sub\">' + escapeHtml(decidedAt) + "</div>"
          : "") +
        "</td>" +
        "</tr>"
      );
    })
    .join("");

  const html =
    "<!DOCTYPE html><html lang=\"fa\" dir=\"rtl\"><head>" +
    "<meta charset=\"utf-8\"/>" +
    "<title>گزارش بازبینی دسترسی — " +
    escapeHtml(campaign.name || "") +
    "</title>" +
    '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"/>' +
    "<style>" +
    "*{box-sizing:border-box}" +
    "body{font-family:Vazirmatn,Vazir,Tahoma,sans-serif;padding:28px 32px;color:#111;font-size:13px;line-height:1.75}" +
    ".brand{border-bottom:2px solid #1e3a5f;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between;gap:16px;align-items:flex-start}" +
    ".brand h1{font-size:18px;margin:0 0 4px;color:#1e3a5f}" +
    ".brand .org{font-size:15px;font-weight:700;color:#0f172a}" +
    ".brand .code{font-size:12px;color:#64748b;font-family:ui-monospace,monospace;direction:ltr;text-align:left}" +
    ".meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin-bottom:14px;color:#334155}" +
    ".meta div{padding:2px 0}" +
    ".meta strong{color:#0f172a;margin-left:6px}" +
    "h2{font-size:14px;margin:18px 0 8px;color:#1e3a5f}" +
    ".cards{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 18px}" +
    ".card{border:1px solid #cbd5e1;border-radius:10px;padding:10px 14px;min-width:92px;text-align:center;background:#f8fafc}" +
    ".card b{display:block;font-size:18px;color:#0f172a}" +
    ".card span{font-size:11px;color:#64748b}" +
    "table{width:100%;border-collapse:collapse}" +
    "th,td{border:1px solid #cbd5e1;padding:8px 10px;text-align:right;vertical-align:top}" +
    "th{background:#e2e8f0;font-weight:600;color:#0f172a}" +
    "td.num{text-align:center;width:40px;color:#64748b}" +
    ".sub{color:#64748b;font-size:11px;margin-top:4px;line-height:1.5}" +
    ".note{color:#475569;font-size:12px;margin-top:18px;border-top:1px solid #e2e8f0;padding-top:12px}" +
    ".footer{margin-top:20px;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between;gap:12px}" +
    "@media print{body{padding:12px} .no-print{display:none}}" +
    "</style></head><body>" +
    '<div class="brand">' +
    "<div>" +
    '<div class="org">' +
    escapeHtml(orgTitle) +
    "</div>" +
    (orgCode
      ? '<div class="code">' + escapeHtml(orgCode) + "</div>"
      : "") +
    "<h1>گزارش بازبینی دسترسی</h1>" +
    "</div>" +
    "<div style=\"text-align:left;font-size:12px;color:#64748b\">" +
    "<div>تهیه‌کننده گزارش</div>" +
    "<div style=\"font-weight:700;color:#0f172a\">" +
    escapeHtml(reporter) +
    "</div>" +
    "<div>" +
    escapeHtml(formatFaDate(new Date().toISOString())) +
    "</div>" +
    "</div>" +
    "</div>" +
    '<div class="meta">' +
    "<div><strong>کمپین:</strong> " +
    escapeHtml(campaign.name || "—") +
    (campaign.code
      ? ' <span style="color:#64748b">(' +
        escapeHtml(String(campaign.code)) +
        ")</span>"
      : "") +
    "</div>" +
    "<div><strong>وضعیت کمپین:</strong> " +
    escapeHtml(STATUS_LABEL[st] || st) +
    "</div>" +
    "<div><strong>ایجاد:</strong> " +
    escapeHtml(formatFaDate(String(campaign.created_at || ""))) +
    "</div>" +
    "<div><strong>شروع بررسی:</strong> " +
    escapeHtml(
      formatFaDate(campaign.opened_at ? String(campaign.opened_at) : null)
    ) +
    "</div>" +
    "<div><strong>پایان:</strong> " +
    escapeHtml(
      formatFaDate(
        campaign.completed_at ? String(campaign.completed_at) : null
      )
    ) +
    "</div>" +
    "<div><strong>تاریخ تهیه گزارش:</strong> " +
    escapeHtml(formatFaDate(new Date().toISOString())) +
    "</div>" +
    "</div>" +
    "<p style=\"margin:0 0 8px;color:#334155\">" +
    "این گزارش <strong>شکاف‌های نقش</strong> در لحظهٔ اسکن و <strong>تصمیم مدیر</strong> روی هر مورد را نشان می‌دهد." +
    "</p>" +
    '<div class="cards">' +
    '<div class="card"><b>' +
    toFaDigits(items.length) +
    "</b><span>کل شکاف‌ها</span></div>" +
    '<div class="card"><b>' +
    toFaDigits(blocks) +
    "</b><span>تضاد جدی</span></div>" +
    '<div class="card"><b>' +
    toFaDigits(warns) +
    "</b><span>هشدار</span></div>" +
    '<div class="card"><b>' +
    toFaDigits(openCount) +
    "</b><span>باز</span></div>" +
    '<div class="card"><b>' +
    toFaDigits(exception) +
    "</b><span>استثنا</span></div>" +
    '<div class="card"><b>' +
    toFaDigits(deferred) +
    "</b><span>موکول</span></div>" +
    "</div>" +
    "<h2>جزئیات موارد</h2>" +
    "<table>" +
    "<thead><tr>" +
    '<th style="width:4%">#</th>' +
    '<th style="width:16%">عضو</th>' +
    '<th style="width:22%">نقش‌ها در زمان اسکن</th>' +
    '<th style="width:22%">اشکال / قانون</th>' +
    '<th style="width:20%">تصمیم</th>' +
    '<th style="width:16%">تصمیم‌گیرنده</th>' +
    "</tr></thead>" +
    "<tbody>" +
    (rows ||
      "<tr><td colspan='6' style='text-align:center'>موردی ثبت نشده</td></tr>") +
    "</tbody></table>" +
    '<p class="note">' +
    "«پذیرش استثنا» یعنی مدیر آگاهانه ریسک باقی‌مانده را پذیرفته است. " +
    "«موکول» یعنی بررسی به دوره بعد منتقل شده." +
    "</p>" +
    '<div class="footer">' +
    "<span>" +
    escapeHtml(orgTitle) +
    (orgCode ? " · " + escapeHtml(orgCode) : "") +
    "</span>" +
    "<span>تهیه‌کننده: " +
    escapeHtml(reporter) +
    "</span>" +
    "</div>" +
    "<script>window.onload=function(){window.print()}</script>" +
    "</body></html>";

  const w = window.open("", "_blank");
  if (!w) {
    toast.error("لطفاً باز شدن پنجرهٔ جدید را در مرورگر مجاز کنید.");
    return;
  }
  w.document.write(html);
  w.document.close();
}
