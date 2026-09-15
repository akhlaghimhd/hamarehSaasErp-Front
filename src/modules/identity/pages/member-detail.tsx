/**
 * FE-P1-T07 — Tenant member detail.
 * Shows membership + user fields from GET /users/{tenant_user_id}.
 * Assigned roles: no dedicated read API yet → empty state + note for T15.
 */

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Shield, UserRound } from "lucide-react";
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
import { Can, usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { useTenantUser } from "../hooks/use-tenant-users";
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
  const rawId = params?.id;
  const tenantUserId =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const canView = usePermission(IdentityPermissions.userView);
  const { data, isLoading, isError, error, refetch } =
    useTenantUser(tenantUserId || null);

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
            <Can permission={IdentityPermissions.userUpdate}>
              <Button variant="outline" size="sm" disabled title="در T09">
                تغییر وضعیت
              </Button>
            </Can>
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
    </div>
  );
}
