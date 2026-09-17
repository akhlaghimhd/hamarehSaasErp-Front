/**
 * Member detail — profile-like layout: avatar+bio | identity | roles | history
 * Edit: inline on identity & roles (no drawer). History is read-only.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Check,
  X,
  UserRound,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useAuthStore, usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import {
  useTenantUser,
  useUpdateTenantUser,
  useSoftDeleteTenantUser,
} from "../hooks/use-tenant-users";
import { useMembershipHistory } from "../hooks/use-membership-history";
import { IdentityPermissions } from "../types";
import type { MembershipHistoryDto } from "../services/membership-history-service";
import { AssignRolesCard } from "./assign-roles-card";
import { MSG_GENERIC_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import { decodeMemberRef } from "../lib/member-ref";
import { profileService } from "../services/profile-service";
import { normalizeIranMobile } from "../validations/member-schema";

function FieldLine({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  const text = value?.trim() ? value : "—";
  return (
    <div className="min-w-0 text-sm leading-relaxed">
      <span className="text-muted-foreground">{label}:</span>{" "}
      {dir === "ltr" ? (
        <bdi className="break-all font-medium text-foreground" dir="ltr">
          {text}
        </bdi>
      ) : (
        <span className="font-medium text-foreground">{text}</span>
      )}
    </div>
  );
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  try {
    const s = new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
    return toFaDigits(s);
  } catch {
    return toFaDigits(value);
  }
}

function statusLabel(code: number | null | undefined): string {
  if (code === 1) return "فعال";
  if (code === 0) return "غیرفعال";
  if (code == null) return "—";
  return toFaDigits(code);
}

function reasonLabel(code?: string | null): string {
  if (!code) return "—";
  const map: Record<string, string> = {
    JOIN: "عضویت در سازمان",
    STATUS_CHANGE: "تغییر وضعیت",
    IDENTITY_UPDATE: "ویرایش اطلاعات",
    SOFT_DELETE: "حذف از سازمان",
    RESTORE: "بازگردانی",
  };
  return map[code] ?? "سایر";
}

function historyDetail(h: MembershipHistoryDto): string {
  const desc = h.description?.trim();
  if (desc) return desc;
  if (h.reason_code === "STATUS_CHANGE") {
    return `از «${statusLabel(h.previous_status ?? null)}» به «${statusLabel(h.new_status)}»`;
  }
  return "";
}

function historySummaryLine(h: MembershipHistoryDto): string {
  const when = formatDate(h.created_at ?? h.effective_date);
  const what = reasonLabel(h.reason_code);
  const who = h.actor_name?.trim();
  const detail = historyDetail(h);
  const parts = [when, what];
  if (detail) parts.push(detail);
  if (who) parts.push(`توسط ${who}`);
  return parts.join(" · ");
}

function HistorySection({
  items,
  isLoading,
  isError,
}: {
  items: MembershipHistoryDto[];
  isLoading: boolean;
  isError: boolean;
}) {
  const [open, setOpen] = useState(false);
  const latest = items[0];

  return (
    <Card className="border-border/50 bg-muted/10 shadow-none">
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-3 text-start transition hover:bg-muted/20"
        onClick={() => setOpen((v) => !v)}
        disabled={isLoading || isError || items.length === 0}
      >
        <History className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-sm font-medium text-muted-foreground">تاریخچه فعالیت</p>
          {isLoading ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              در حال بارگذاری…
            </p>
          ) : isError ? (
            <p className="text-xs text-destructive">بارگذاری تاریخچه ممکن نشد.</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-muted-foreground">هنوز تغییری ثبت نشده است.</p>
          ) : (
            <p className="truncate text-xs text-muted-foreground">
              آخرین تغییر: {historySummaryLine(latest)}
            </p>
          )}
        </div>
        {items.length > 0 && !isLoading && !isError ? (
          open ? (
            <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : null}
      </button>

      {open && items.length > 0 ? (
        <div className="border-t border-border/40 px-4 pb-3 pt-2">
          <ul className="space-y-2.5">
            {items.map((h, i) => (
              <li
                key={h.history_id ?? i}
                className="text-xs leading-relaxed text-muted-foreground"
              >
                <span className="tabular-nums">
                  {formatDate(h.created_at ?? h.effective_date)}
                </span>
                <span className="mx-1.5 text-border">·</span>
                <span className="text-foreground/80">{reasonLabel(h.reason_code)}</span>
                {historyDetail(h) ? (
                  <>
                    <span className="mx-1.5 text-border">·</span>
                    <span>{historyDetail(h)}</span>
                  </>
                ) : null}
                {h.actor_name?.trim() ? (
                  <>
                    <span className="mx-1.5 text-border">·</span>
                    <span>توسط {h.actor_name.trim()}</span>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
