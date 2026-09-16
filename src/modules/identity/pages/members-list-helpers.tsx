"use client";

import type { ReactNode } from "react";
import { Sparkles, UserCheck, UserMinus, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { cn, toFaDigits } from "@/shared/lib/utils";
import type { TenantUserDto } from "../types";

export type StatusFilter = "all" | "active" | "inactive";
export type SortKey = "name" | "email" | "mobile" | "status" | "joined" | "lastChange";
export type SortDir = "asc" | "desc";
export type ColumnId = "name" | "email" | "mobile" | "status" | "joined" | "lastChange" | "actions";
export type BulkKind = "activate" | "deactivate" | "delete" | "restore";
export type ConfirmState = null | { kind: BulkKind; count: number; targets: TenantUserDto[] };
export type ActivityKind = "new" | "activated" | "deactivated" | "removed" | "restored" | null;

export const COLS: { id: ColumnId; label: string; hideable?: boolean; sort?: SortKey }[] = [
  { id: "name", label: "نام", hideable: false, sort: "name" },
  { id: "email", label: "ایمیل", sort: "email" },
  { id: "mobile", label: "موبایل", sort: "mobile" },
  { id: "status", label: "وضعیت", sort: "status" },
  { id: "joined", label: "تاریخ عضویت", sort: "joined" },
  { id: "lastChange", label: "آخرین تغییر وضعیت", sort: "lastChange" },
  { id: "actions", label: "عملیات", hideable: false },
];

export const SKY = "identity.members.columns.v3";
export const DAY_MS = 24 * 60 * 60 * 1000;
export const RECENT_DAYS = 7;

export function dn(r: TenantUserDto) {
  const u = r.user;
  if (!u) return "—";
  const n = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return n || u.email || "—";
}

export function fd(v?: string | null) {
  if (!v) return "—";
  try {
    return toFaDigits(new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(v)));
  } catch {
    return toFaDigits(v);
  }
}

export function fdt(v?: string | null) {
  if (!v) return "—";
  try {
    return toFaDigits(new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(v)));
  } catch {
    return toFaDigits(v);
  }
}

export function lastChangeAt(r: TenantUserDto): string | null {
  if (r.deleted_at) return r.deleted_at;
  return r.updated_at ?? r.created_at ?? null;
}

export function isRecent(iso?: string | null, days = RECENT_DAYS): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * DAY_MS;
}

export function activityOf(r: TenantUserDto, deletedView: boolean): ActivityKind {
  const createdMs = r.created_at ? new Date(r.created_at).getTime() : NaN;
  const updatedMs = r.updated_at ? new Date(r.updated_at).getTime() : NaN;
  const statusChanged = Number.isFinite(createdMs) && Number.isFinite(updatedMs) && updatedMs - createdMs > 90_000;
  if (deletedView && r.deleted_at && isRecent(r.deleted_at, 7)) return "removed";
  if (!deletedView && r.updated_at && isRecent(r.updated_at, 7) && statusChanged) {
    if (Number(r.status) === 1) return "activated";
    if (Number(r.status) === 0) return "deactivated";
  }
  if (!deletedView && r.created_at && isRecent(r.created_at, 3) && !statusChanged) return "new";
  return null;
}

export const ACTIVITY_LABEL: Record<Exclude<ActivityKind, null>, string> = {
  new: "عضو جدید (حداکثر ۳ روز از عضویت، بدون تغییر وضعیت بعدی)",
  activated: "اخیراً فعال شده (۷ روز اخیر)",
  deactivated: "اخیراً غیرفعال شده (۷ روز اخیر)",
  removed: "اخیراً از سازمان حذف شده (۷ روز اخیر)",
  restored: "اخیراً بازگردانی شده",
};

export const ACTIVITY_CLASS: Record<Exclude<ActivityKind, null>, string> = {
  new: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  activated: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  deactivated: "bg-amber-500/15 text-amber-800 dark:text-amber-200",
  removed: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  restored: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

export function ActivityBadge({ kind }: { kind: Exclude<ActivityKind, null> }) {
  const Icon = kind === "new" ? Sparkles : kind === "activated" ? UserCheck : kind === "deactivated" ? UserMinus : kind === "removed" ? Trash2 : RotateCcw;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full", ACTIVITY_CLASS[kind])} aria-label={ACTIVITY_LABEL[kind]}>
          <Icon className="h-3 w-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[16rem] text-xs">{ACTIVITY_LABEL[kind]}</TooltipContent>
    </Tooltip>
  );
}

export function sv(r: TenantUserDto, k: SortKey): string | number {
  if (k === "name") return dn(r).toLowerCase();
  if (k === "email") return (r.user?.email ?? "").toLowerCase();
  if (k === "mobile") return r.user?.mobile ?? "";
  if (k === "status") return Number(r.status) === 1 ? 1 : 0;
  if (k === "lastChange") {
    const v = lastChangeAt(r);
    return v ? new Date(v).getTime() : 0;
  }
  return r.created_at ? new Date(r.created_at).getTime() : 0;
}

export const BULK_SUCCESS: Record<BulkKind, (n: number) => string> = {
  activate: (n) => `${toFaDigits(n)} کاربر فعال شد`,
  deactivate: (n) => `${toFaDigits(n)} کاربر غیرفعال شد`,
  delete: (n) => `${toFaDigits(n)} کاربر به فهرست حذف‌شده‌ها منتقل شد`,
  restore: (n) => `${toFaDigits(n)} کاربر به فهرست سازمان برگشت؛ برای ورود به سامانه وضعیتشان را فعال کنید`,
};

export const RESTORE_ONE_MSG = "کاربر به فهرست سازمان برگشت؛ برای ورود به سامانه وضعیتش را فعال کنید.";

export type ImportRow = { first_name: string; last_name: string; email: string; mobile?: string; password: string };

export function normalizeHeader(h: string) {
  return h.replace(/\s+/g, "").toLowerCase();
}

export function mapImportRows(table: string[][]): ImportRow[] {
  if (table.length < 2) return [];
  const headers = table[0].map(normalizeHeader);
  const idx = (names: string[]) => headers.findIndex((h) => names.some((n) => h.includes(n)));
  const iFirst = idx(["firstname", "first_name", "نام", "name"]);
  const iLast = idx(["lastname", "last_name", "نام‌خانوادگی", "نامخانوادگی", "family"]);
  const iEmail = idx(["email", "ایمیل", "پست"]);
  const iMobile = idx(["mobile", "phone", "موبایل", "تلفن"]);
  const iPass = idx(["password", "رمز", "password"]);
  const out: ImportRow[] = [];
  for (let r = 1; r < table.length; r++) {
    const row = table[r];
    const email = (iEmail >= 0 ? row[iEmail] : row[2] ?? "").trim();
    const first = (iFirst >= 0 ? row[iFirst] : row[0] ?? "").trim() || "کاربر";
    let last = (iLast >= 0 ? row[iLast] : row[1] ?? "").trim();
    if (!last && iFirst < 0 && row[0]) {
      const parts = String(row[0]).trim().split(/\s+/);
      if (parts.length > 1) last = parts.slice(1).join(" ");
    }
    if (!last) last = "سازمان";
    if (!email || !email.includes("@")) continue;
    let mobile = (iMobile >= 0 ? row[iMobile] : "").trim() || undefined;
    if (mobile) {
      mobile = mobile
        .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
        .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
        .replace(/[^0-9+]/g, "");
      if (!mobile) mobile = undefined;
    }
    const emailNorm = email.toLowerCase().replace(/\s+/g, "");
    const passwordRaw = (iPass >= 0 ? row[iPass] : "").trim();
    const password = passwordRaw.length >= 8 ? passwordRaw : `Im${Math.random().toString(36).slice(2, 8)}Aa1!`;
    out.push({ first_name: first, last_name: last, email: emailNorm, mobile, password });
  }
  return out;
}

export function IconAction({ label, onClick, disabled, variant = "ghost", className, children }: {
  label: string; onClick: () => void; disabled?: boolean; variant?: "ghost" | "destructive"; className?: string; children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className={cn("h-7 w-7 shrink-0", variant === "destructive" && "text-destructive hover:bg-destructive/10 hover:text-destructive", className)} disabled={disabled} onClick={(e) => { e.stopPropagation(); onClick(); }} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}
