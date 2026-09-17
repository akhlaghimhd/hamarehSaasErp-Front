/**
 * FE-P1-T07 + T09 + T10 + T15 — جزئیات کاربر سازمان
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { History, Loader2, UserRound } from "lucide-react";
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
import { IdentityPermissions, type TenantUserDto } from "../types";
import type { MembershipHistoryDto } from "../services/membership-history-service";
import { AssignRolesCard } from "./assign-roles-card";
import { MSG_GENERIC_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import { decodeMemberRef } from "../lib/member-ref";

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
    JOIN: "پیوستن به سازمان",
    STATUS_CHANGE: "تغییر وضعیت",
    SOFT_DELETE: "حذف از سازمان",
  };
  return map[code] ?? "سایر";
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
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          تاریخچه عضویت
        </CardTitle>
        <CardDescription>رویدادهای عضویت و تغییر وضعیت</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            در حال بارگذاری…
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">دریافت تاریخچه ممکن نشد.</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">رویدادی ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b text-start text-xs text-muted-foreground">
                  <th className="px-2 py-2 font-medium">زمان</th>
                  <th className="px-2 py-2 font-medium">رویداد</th>
                  <th className="px-2 py-2 font-medium">از</th>
                  <th className="px-2 py-2 font-medium">به</th>
                </tr>
              </thead>
              <tbody>
                {items.map((h, i) => (
                  <tr key={h.membership_history_id ?? i} className="border-b border-border/50">
                    <td className="px-2 py-2 tabular-nums text-muted-foreground">
                      {formatDate(h.created_at)}
                    </td>
                    <td className="px-2 py-2">{reasonLabel(h.reason_code ?? h.event_type)}</td>
                    <td className="px-2 py-2">{statusLabel(h.from_status as number | null)}</td>
                    <td className="px-2 py-2">{statusLabel(h.to_status as number | null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const rawSegment =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";
  const tenantUserId = decodeMemberRef(rawSegment) ?? "";

  const canView = usePermission(IdentityPermissions.userView);
  const canUpdate = usePermission(IdentityPermissions.userUpdate);
  const canDelete = usePermission(IdentityPermissions.userDelete);
  const canViewHistory = usePermission(
    IdentityPermissions.membershipHistoryView
  );

  const currentUserId = useAuthStore((s) => s.user?.user_id);

  const { data, isLoading, isError, error, refetch } =
    useTenantUser(tenantUserId || null);
  const updateMutation = useUpdateTenantUser();
  const deleteMutation = useSoftDeleteTenantUser();
  const historyQuery = useMembershipHistory(
    canViewHistory && tenantUserId ? tenantUserId : null
  );

  const [confirmDelete, setConfirmDelete] = useState(false);

  const isSelf = Boolean(
    data && currentUserId && data.user_id === currentUserId
  );
  const active = data ? Number(data.status) === 1 : false;

  const onToggleStatus = async () => {
    if (!data) return;
    if (isSelf && active) {
      toast.error("نمی‌توانید خودتان را غیرفعال کنید.");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        tenantUserId: data.tenant_user_id,
        payload: { status: active ? 0 : 1 },
      });
      toast.success(active ? "کاربر غیرفعال شد." : "کاربر فعال شد.");
      void refetch();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_GENERIC_ERROR
      );
    }
  };

  const onDelete = async () => {
    if (!data) return;
    if (isSelf) {
      toast.error("نمی‌توانید خودتان را حذف کنید.");
      return;
    }
    try {
      await deleteMutation.mutateAsync(data.tenant_user_id);
      toast.success("کاربر از سازمان حذف شد (حذف نرم).");
      setConfirmDelete(false);
      router.push("/dashboard/identity/members");
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_GENERIC_ERROR
      );
    }
  };

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="جزئیات کاربر"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "کاربران", href: "/dashboard/identity/members" },
            { label: "جزئیات" },
          ]}
        />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  if (!tenantUserId) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="جزئیات کاربر"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "کاربران", href: "/dashboard/identity/members" },
            { label: "جزئیات" },
          ]}
        />
        <EmptyState
          icon={UserRound}
          title="شناسه نامعتبر"
          description="لینک جزئیات قابل خواندن نیست. از فهرست کاربران وارد شوید."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/identity/members">بازگشت به فهرست</Link>
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        در حال بارگذاری…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="جزئیات کاربر"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "کاربران", href: "/dashboard/identity/members" },
            { label: "جزئیات" },
          ]}
        />
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">کاربر یافت نشد یا دسترسی ندارید</p>
          <p className="mt-1 text-xs">
            {error instanceof Error ? error.message : MSG_GENERIC_ERROR}
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 h-8"
            onClick={() => void refetch()}
          >
            تلاش مجدد
          </Button>
        </div>
      </div>
    );
  }

  const u = data.user;
  const fullName = [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim() || "—";

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <PageHeader
        title={fullName}
        description="عضویت در سازمان، وضعیت و دسترسی‌ها"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "کاربران", href: "/dashboard/identity/members" },
          { label: fullName },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/identity/members">بازگشت</Link>
            </Button>
            {canUpdate ? (
              <Button
                type="button"
                size="sm"
                variant={active ? "outline" : "default"}
                disabled={updateMutation.isPending || (isSelf && active)}
                onClick={() => void onToggleStatus()}
              >
                {active ? "غیرفعال‌سازی" : "فعال‌سازی"}
              </Button>
            ) : null}
            {canDelete && !isSelf ? (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => setConfirmDelete(true)}
              >
                حذف از سازمان
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">اطلاعات عضویت</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <FieldLine label="نام" value={fullName} />
            <FieldLine label="ایمیل" value={u?.email ?? ""} dir="ltr" />
            <FieldLine
              label="موبایل"
              value={u?.mobile ? toFaDigits(u.mobile) : ""}
              dir="ltr"
            />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">وضعیت:</span>
              <StatusChip
                status={active ? "active" : "inactive"}
                label={active ? "فعال" : "غیرفعال"}
              />
              {data.is_owner ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-200">
                  مدیر اصلی
                </span>
              ) : null}
            </div>
            <FieldLine label="تاریخ عضویت" value={formatDate(data.created_at)} />
            <FieldLine label="آخرین به‌روزرسانی" value={formatDate(data.updated_at)} />
          </CardContent>
        </Card>

        <AssignRolesCard tenantUserId={data.tenant_user_id} />
      </div>

      {canViewHistory ? (
        <HistorySection
          items={(historyQuery.data ?? []) as MembershipHistoryDto[]}
          isLoading={historyQuery.isLoading}
          isError={historyQuery.isError}
        />
      ) : null}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأیید حذف از سازمان</DialogTitle>
            <DialogDescription>
              حذف نرم است؛ کاربر به فهرست حذف‌شده‌ها منتقل می‌شود و قابل بازگردانی است.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(false)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => void onDelete()}
            >
              حذف نرم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
