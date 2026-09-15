/**
 * FE-P1-T07 + T09 — Tenant member detail.
 * T09: change membership status (PUT status 0|1) + soft-delete membership.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Shield, UserRound } from "lucide-react";
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
import { Can, usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import {
  useTenantUser,
  useUpdateTenantUser,
  useSoftDeleteTenantUser,
} from "../hooks/use-tenant-users";
import { IdentityPermissions, type TenantUserDto } from "../types";

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
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
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
                <StatusChip label="مالک مستأجر" tone="primary" />
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
          <CardTitle className="text-base">اطلاعات عضویت و کاربر</CardTitle>
          <CardDescription>
            داده‌ها از API عضویت مستأجر (TenantUser + User)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
            <FieldLine label="نام" value={u?.first_name ?? ""} />
            <FieldLine label="نام خانوادگی" value={u?.last_name ?? ""} />
            <FieldLine label="ایمیل" value={u?.email ?? ""} dir="ltr" />
            <FieldLine label="موبایل" value={u?.mobile ?? ""} dir="ltr" />
            <FieldLine
              label="شناسه عضویت"
              value={member.tenant_user_id}
              dir="ltr"
            />
            <FieldLine label="شناسه کاربر" value={member.user_id} dir="ltr" />
            <FieldLine
              label="وضعیت عضویت"
              value={Number(member.status) === 1 ? "فعال" : "غیرفعال"}
            />
            <FieldLine
              label="مالک مستأجر"
              value={member.is_owner ? "بله" : "خیر"}
            />
            <FieldLine
              label="نسخه ردیف"
              value={
                member.row_version != null ? String(member.row_version) : "—"
              }
              dir="ltr"
            />
            <FieldLine
              label="آخرین به‌روزرسانی"
              value={formatDate(member.updated_at)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-12">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">نقش‌های تخصیص‌یافته</CardTitle>
          <CardDescription>
            نمایش نقش‌های عضو پس از آماده‌شدن API خواندن نقش‌های کاربر (T15)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={Shield}
            title="لیست نقش‌ها هنوز از API در دسترس نیست"
            description="بک‌اند فعلاً endpoint فهرست نقش‌های یک TenantUser را ندارد. تخصیص نقش در T15 و اسپرینت ۳ تکمیل می‌شود."
          />
        </CardContent>
      </Card>
    </div>
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

  const { data, isLoading, isError, error, refetch } =
    useTenantUser(tenantUserId || null);
  const updateMutation = useUpdateTenantUser();
  const deleteMutation = useSoftDeleteTenantUser();

  const [statusOpen, setStatusOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isActive = data != null && Number(data.status) === 1;
  const nextStatus = isActive ? 0 : 1;

  const onConfirmStatus = async () => {
    if (!data) return;
    try {
      await updateMutation.mutateAsync({
        tenantUserId: data.tenant_user_id,
        payload: { status: nextStatus },
      });
      toast.success(
        nextStatus === 1 ? "عضویت فعال شد" : "عضویت غیرفعال شد"
      );
      setStatusOpen(false);
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : "تغییر وضعیت ناموفق بود."
      );
    }
  };

  const onConfirmDelete = async () => {
    if (!data) return;
    try {
      await deleteMutation.mutateAsync(data.tenant_user_id);
      toast.success("عضویت با حذف نرم از مستأجر برداشته شد");
      setDeleteOpen(false);
      router.push("/dashboard/identity/members");
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : "حذف عضویت ناموفق بود."
      );
    }
  };

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="جزئیات عضو"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "اعضا", href: "/dashboard/identity/members" },
            { label: "جزئیات" },
          ]}
        />
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
          دسترسی مشاهده اعضا (identity.user.view) برای این حساب فعال نیست.
        </div>
      </div>
    );
  }

  const title =
    data?.user != null
      ? [data.user.first_name, data.user.last_name].filter(Boolean).join(" ") ||
        data.user.email ||
        "جزئیات عضو"
      : "جزئیات عضو";

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description="وضعیت عضویت و اطلاعات پایه عضو در مستأجر جاری"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "اعضا", href: "/dashboard/identity/members" },
          { label: "جزئیات" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/identity/members">بازگشت به لیست</Link>
            </Button>
            {canUpdate && data ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusOpen(true)}
                disabled={updateMutation.isPending}
              >
                {isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
              </Button>
            ) : null}
            {canDelete && data ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
                disabled={deleteMutation.isPending}
              >
                حذف عضویت
              </Button>
            ) : null}
            <Can permission={IdentityPermissions.membershipHistoryView}>
              <Button variant="ghost" size="sm" disabled title="در T10">
                تاریخچه عضویت
              </Button>
            </Can>
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
              {error instanceof ApiClientError
                ? error.message
                : data === null
                  ? "عضو یافت نشد یا به این مستأجر تعلق ندارد."
                  : "بارگذاری ناموفق بود."}
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
        <MemberSummary member={data} />
      )}

      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isActive ? "غیرفعال‌سازی عضویت" : "فعال‌سازی عضویت"}
            </DialogTitle>
            <DialogDescription>
              {isActive
                ? "با غیرفعال‌سازی، این کاربر دیگر نمی‌تواند با این مستأجر وارد شود تا دوباره فعال شود."
                : "عضویت دوباره فعال می‌شود و کاربر می‌تواند وارد این مستأجر شود."}
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
            <DialogTitle>حذف نرم عضویت</DialogTitle>
            <DialogDescription>
              عضویت از مستأجر حذف نرم می‌شود (بدون حذف فیزیکی). این عمل از لیست
              اعضای فعال خارج می‌کند. کاربر سراسری حذف نمی‌شود.
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
