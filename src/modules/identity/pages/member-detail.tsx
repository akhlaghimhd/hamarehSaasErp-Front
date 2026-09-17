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
    <Card className="border-border/50 bg-muted/10 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="h-3.5 w-3.5" />
          تاریخچه فعالیت
        </CardTitle>
        <CardDescription className="text-xs">
          تغییرات ثبت‌شده روی این کاربر
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            در حال بارگذاری…
          </div>
        ) : isError ? (
          <p className="text-xs text-destructive">بارگذاری تاریخچه ممکن نشد.</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground">هنوز تغییری ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] table-fixed text-xs">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground">
                  <th className="w-[22%] px-2 py-1.5 text-start font-normal">زمان</th>
                  <th className="w-[22%] px-2 py-1.5 text-start font-normal">رویداد</th>
                  <th className="w-[28%] px-2 py-1.5 text-start font-normal">توضیح</th>
                  <th className="w-[28%] px-2 py-1.5 text-start font-normal">توسط</th>
                </tr>
              </thead>
              <tbody>
                {items.map((h, i) => (
                  <tr
                    key={h.history_id ?? i}
                    className="border-b border-border/30 text-muted-foreground"
                  >
                    <td className="px-2 py-1.5 tabular-nums align-top">
                      {formatDate(h.created_at ?? h.effective_date)}
                    </td>
                    <td className="px-2 py-1.5 align-top text-foreground/80">
                      {reasonLabel(h.reason_code)}
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      {h.description?.trim()
                        || (h.reason_code === "STATUS_CHANGE"
                          ? `${statusLabel(h.previous_status ?? null)} → ${statusLabel(h.new_status)}`
                          : "—")}
                    </td>
                    <td className="px-2 py-1.5 align-top">
                      {h.actor_name?.trim() || "—"}
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
  const rawSegment =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";
  const tenantUserId = decodeMemberRef(rawSegment) ?? "";

  const canView = usePermission(IdentityPermissions.userView);
  const canUpdate = usePermission(IdentityPermissions.userUpdate);
  const canDelete = usePermission(IdentityPermissions.userDelete);
  const canViewHistory = usePermission(
    IdentityPermissions.membershipHistoryView
  );
  const canViewProfile = usePermission(IdentityPermissions.profileView);

  const currentUserId = useAuthStore((s) => s.user?.user_id);

  const { data, isLoading, isError, error, refetch } = useTenantUser(
    tenantUserId || null
  );
  const updateMutation = useUpdateTenantUser();
  const deleteMutation = useSoftDeleteTenantUser();
  const historyQuery = useMembershipHistory(
    canViewHistory && tenantUserId ? tenantUserId : null
  );

  const userId = data?.user_id;
  const profileQuery = useQuery({
    queryKey: ["identity", "profile", "user", userId ?? ""],
    queryFn: () =>
      userId ? profileService.getByUserId(userId) : Promise.resolve(null),
    enabled: Boolean(userId && canViewProfile),
    staleTime: 60_000,
    retry: 1,
  });
  const profile = profileQuery.data;

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobile, setMobile] = useState("");
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!data) return;
    setFirstName(data.user?.first_name ?? "");
    setLastName(data.user?.last_name ?? "");
    setMobile(data.user?.mobile ?? "");
    setIsOwner(Boolean(data.is_owner));
  }, [data]);

  const isSelf = Boolean(
    data && currentUserId && data.user_id === currentUserId
  );
  const active = data ? Number(data.status) === 1 : false;

  const startEditIdentity = () => {
    if (!data) return;
    setFirstName(data.user?.first_name ?? "");
    setLastName(data.user?.last_name ?? "");
    setMobile(data.user?.mobile ?? "");
    setIsOwner(Boolean(data.is_owner));
    setEditingIdentity(true);
  };

  const cancelEditIdentity = () => {
    setEditingIdentity(false);
  };

  const saveIdentity = async () => {
    if (!data) return;
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn || !ln) {
      toast.error("نام و نام خانوادگی الزامی است.");
      return;
    }
    const mob = mobile.trim() ? normalizeIranMobile(mobile) : "";
    if (mob && mob.length !== 11) {
      toast.error("موبایل باید ۱۱ رقم و با ۰۹ شروع شود.");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        tenantUserId: data.tenant_user_id,
        payload: {
          first_name: fn,
          last_name: ln,
          mobile: mob || null,
          is_owner: isOwner,
        },
      });
      toast.success("اطلاعات ذخیره شد.");
      setEditingIdentity(false);
      void refetch();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_GENERIC_ERROR
      );
    }
  };

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
      toast.success("کاربر از فهرست جاری سازمان خارج شد.");
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
          title="صفحه در دسترس نیست"
          description="از فهرست کاربران سازمان دوباره وارد این صفحه شوید."
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
          <p className="font-medium">اطلاعات این کاربر در دسترس نیست</p>
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
  const fullName =
    [u?.first_name, u?.last_name].filter(Boolean).join(" ").trim() || "—";
  const bioText =
    (profile?.display_bio || profile?.description)?.trim() || null;

  return (
    <div className="flex min-h-0 flex-col gap-4">
      <PageHeader
        title={fullName}
        description="وضعیت عضویت، اطلاعات تماس و نقش‌های کاربر"
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

      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-4">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-muted shadow-[var(--shadow-xs)]">
                  {profile?.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserRound className="h-9 w-9 text-muted-foreground/70" />
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-base font-semibold leading-tight">
                  {fullName}
                </p>
                {data.is_owner ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-200">
                    <Shield className="h-3 w-3" />
                    مدیر اصلی
                  </span>
                ) : null}
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {bioText || "بیویی ثبت نشده است."}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              تصویر و معرفی کوتاه از پروفایل شخصی کاربر است.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base">اطلاعات هویتی</CardTitle>
            {canUpdate && !editingIdentity ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5"
                onClick={startEditIdentity}
              >
                <Pencil className="h-3.5 w-3.5" />
                ویرایش
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {editingIdentity ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">نام</label>
                    <Input
                      className="h-9"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">
                      نام خانوادگی
                    </label>
                    <Input
                      className="h-9"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs text-muted-foreground">
                      موبایل
                    </label>
                    <Input
                      className="h-9 tabular-nums"
                      dir="ltr"
                      value={mobile}
                      onChange={(e) =>
                        setMobile(normalizeIranMobile(e.target.value))
                      }
                      placeholder="09121234567"
                      maxLength={11}
                    />
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border/60 px-3 py-3">
                  <Checkbox
                    className="mt-0.5"
                    checked={isOwner}
                    onCheckedChange={(v) => setIsOwner(Boolean(v))}
                  />
                  <span className="space-y-0.5 text-sm">
                    <span className="font-medium">مدیر اصلی سازمان</span>
                    <span className="block text-xs text-muted-foreground">
                      دسترسی کامل مدیریت سازمان
                    </span>
                  </span>
                </label>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={updateMutation.isPending}
                    onClick={cancelEditIdentity}
                  >
                    <X className="h-3.5 w-3.5" />
                    انصراف
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={updateMutation.isPending}
                    onClick={() => void saveIdentity()}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    ذخیره
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                  <FieldLine label="نام" value={u?.first_name ?? ""} />
                  <FieldLine label="نام خانوادگی" value={u?.last_name ?? ""} />
                  <FieldLine
                    label="موبایل"
                    value={u?.mobile ? toFaDigits(u.mobile) : ""}
                    dir="ltr"
                  />
                  <div className="sm:col-span-2">
                    <FieldLine
                      label="ایمیل سازمانی"
                      value={u?.email ?? ""}
                      dir="ltr"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">وضعیت:</span>
                    <StatusChip
                      status={active ? "active" : "inactive"}
                      label={active ? "فعال" : "غیرفعال"}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
                  <span className="whitespace-nowrap">
                    عضویت از {formatDate(data.created_at)}
                  </span>
                  <span className="whitespace-nowrap">
                    آخرین تغییر {formatDate(data.updated_at)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AssignRolesCard userId={data.user_id} />

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
              کاربر از فهرست جاری سازمان خارج می‌شود و در صورت نیاز قابل
              بازگردانی است.
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
              تأیید حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
