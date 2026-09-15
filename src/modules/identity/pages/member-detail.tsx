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

function MemberSummary({ member }: { member: TenantUserDto }) {
  const u = member.user;
  const fullName = u
    ? [u.first_name, u.last_name].filter(Boolean).join(" ").trim() || u.email
    : "—";

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Card className="lg:col-span-4">
        <CardContent className="flex items-start gap-4 p-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-border/80 bg-muted">
            <UserRound className="h-7 w-7 text-muted-foreground/70" />
          </div>
          <div className="min-w-0 space-y-2">
            <div className="text-base font-semibold leading-tight">{fullName}</div>
            <div className="flex flex-wrap items-center gap-1.5">
              {Number(member.status) === 1 ? (
                <StatusChip label="فعال" tone="success" />
              ) : (
                <StatusChip label="غیرفعال" tone="neutral" />
              )}
              {member.is_owner ? (
                <StatusChip label="مدیر اصلی سازمان" tone="primary" />
              ) : null}
            </div>
            <p className="text-[11px] text-muted-foreground">
              عضویت از {formatDate(member.created_at)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">اطلاعات کاربر</CardTitle>
          <CardDescription>اطلاعات پایه و وضعیت عضویت در سازمان</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <FieldLine label="نام" value={u?.first_name ?? ""} />
            <FieldLine label="نام خانوادگی" value={u?.last_name ?? ""} />
            <FieldLine label="ایمیل" value={u?.email ?? ""} dir="ltr" />
            <FieldLine
              label="موبایل"
              value={u?.mobile ? toFaDigits(u.mobile) : ""}
            />
            <FieldLine
              label="وضعیت عضویت"
              value={Number(member.status) === 1 ? "فعال" : "غیرفعال"}
            />
            <FieldLine
              label="مدیر اصلی سازمان"
              value={member.is_owner ? "بله" : "خیر"}
            />
            <FieldLine
              label="آخرین به‌روزرسانی"
              value={formatDate(member.updated_at)}
            />
          </div>
        </CardContent>
      </Card>

      <AssignRolesCard userId={member.user_id} />
    </div>
  );
}

function HistoryPanel({
  rows,
  loading,
  errorMessage,
  onRetry,
}: {
  rows: MembershipHistoryDto[];
  loading: boolean;
  errorMessage?: string | null;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">سوابق عضویت</CardTitle>
        <CardDescription>
          تغییرات وضعیت و حذف از سازمان برای این کاربر
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            در حال بارگذاری سوابق…
          </div>
        ) : errorMessage ? (
          <div className="space-y-2 py-6 text-center">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              تلاش مجدد
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={History}
            title="سابقه‌ای ثبت نشده"
            description="پس از تغییر وضعیت یا حذف از سازمان، رویدادها اینجا دیده می‌شوند."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-border/70 text-right text-xs text-muted-foreground">
                  <th className="px-2 py-2 font-medium">تاریخ</th>
                  <th className="px-2 py-2 font-medium">از</th>
                  <th className="px-2 py-2 font-medium">به</th>
                  <th className="px-2 py-2 font-medium">رویداد</th>
                  <th className="px-2 py-2 font-medium">توضیح</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.history_id}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="px-2 py-2 tabular-nums">
                      {formatDate(row.effective_date ?? row.created_at)}
                    </td>
                    <td className="px-2 py-2">
                      {statusLabel(row.previous_status)}
                    </td>
                    <td className="px-2 py-2">{statusLabel(row.new_status)}</td>
                    <td className="px-2 py-2">{reasonLabel(row.reason_code)}</td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {row.description?.trim() || "—"}
                    </td>
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
  const tenantUserId =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

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

  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isActive = data != null && Number(data.status) === 1;
  const nextStatus = isActive ? 0 : 1;
  const isSelf = Boolean(
    data && currentUserId && data.user_id === currentUserId
  );

  const onConfirmStatus = async () => {
    if (!data) return;
    if (isSelf && nextStatus === 0) {
      toast.error("نمی‌توانید حساب خودتان را در سازمان غیرفعال کنید.");
      setStatusOpen(false);
      return;
    }
    try {
      await updateMutation.mutateAsync({
        tenantUserId: data.tenant_user_id,
        payload: { status: nextStatus },
      });
      toast.success(
        nextStatus === 1 ? "عضویت فعال شد" : "عضویت غیرفعال شد"
      );
      setStatusOpen(false);
      void historyQuery.refetch();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message
          ? e.message
          : MSG_GENERIC_ERROR
      );
    }
  };

  const onConfirmDelete = async () => {
    if (!data) return;
    if (isSelf) {
      toast.error("نمی‌توانید عضویت خودتان را حذف کنید.");
      setDeleteOpen(false);
      return;
    }
    try {
      await deleteMutation.mutateAsync(data.tenant_user_id);
      toast.success("کاربر از سازمان حذف شد");
      setDeleteOpen(false);
      router.push("/dashboard/identity/members");
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message
          ? e.message
          : MSG_GENERIC_ERROR
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
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  const title =
    data?.user != null
      ? [data.user.first_name, data.user.last_name].filter(Boolean).join(" ") ||
        data.user.email ||
        "جزئیات کاربر"
      : "جزئیات کاربر";

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description="وضعیت عضویت و اطلاعات پایه کاربر در سازمان"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "کاربران", href: "/dashboard/identity/members" },
          { label: "جزئیات" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/identity/members">بازگشت به فهرست</Link>
            </Button>
            {canUpdate && data ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusOpen(true)}
                disabled={updateMutation.isPending}
              >
                {isActive ? "غیرفعال کردن" : "فعال کردن"}
              </Button>
            ) : null}
            {canDelete && data ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                disabled={deleteMutation.isPending || isSelf}
                title={isSelf ? "حذف عضویت خود مجاز نیست" : undefined}
              >
                حذف از سازمان
              </Button>
            ) : null}
          </div>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال بارگذاری…
        </div>
      ) : isError || !data ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
            <p className="text-sm text-destructive">
              {error instanceof ApiClientError && error.message
                ? error.message
                : data === null
                  ? "کاربر پیدا نشد یا به این سازمان تعلق ندارد."
                  : MSG_GENERIC_ERROR}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
            >
              تلاش مجدد
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <MemberSummary member={data} />
          {canViewHistory ? (
            <HistoryPanel
              rows={historyQuery.data ?? []}
              loading={historyQuery.isLoading}
              errorMessage={
                historyQuery.isError
                  ? historyQuery.error instanceof ApiClientError &&
                    historyQuery.error.message
                    ? historyQuery.error.message
                    : "بارگذاری سوابق ممکن نشد."
                  : null
              }
              onRetry={() => void historyQuery.refetch()}
            />
          ) : null}
        </>
      )}

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isActive ? "غیرفعال کردن عضویت" : "فعال کردن عضویت"}
            </DialogTitle>
            <DialogDescription>
              {isActive
                ? "با غیرفعال کردن، این کاربر تا زمان فعال‌سازی دوباره نمی‌تواند وارد سازمان شود."
                : "عضویت دوباره فعال می‌شود و کاربر می‌تواند وارد سازمان شود."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStatusOpen(false)}
              disabled={updateMutation.isPending}
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void onConfirmStatus()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ذخیره…
                </>
              ) : (
                "تأیید"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف از سازمان</DialogTitle>
            <DialogDescription>
              عضویت این فرد از سازمان برداشته می‌شود. حساب کاربری سراسری او حذف
              نمی‌شود و در صورت نیاز می‌توان دوباره او را به سازمان افزود.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteMutation.isPending}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => void onConfirmDelete()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال حذف…
                </>
              ) : (
                "تأیید حذف"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
