"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
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
import { AssignRolesCard } from "./assign-roles-card";
import { MembershipHistoryPanel } from "./membership-history-panel";
import { MSG_GENERIC_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import { decodeMemberRef } from "../lib/member-ref";
import { profileService } from "../services/profile-service";
import { normalizeIranMobile } from "../validations/member-schema";

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

export function MemberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id;
  const rawSegment =
    typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";
  const tenantUserId = decodeMemberRef(rawSegment) ?? "";

  const canView = usePermission(IdentityPermissions.userView);
  const canUpdate = usePermission(IdentityPermissions.userUpdate);
  const isSessionOwner = useAuthStore((s) => s.securityContext?.is_owner === true);
  const canManageOwner = isSessionOwner;
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
          ...(canManageOwner ? { is_owner: isOwner } : {}),
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
          <p className="font-medium">بارگذاری ممکن نشد</p>
          <p className="mt-1 text-xs">
            {error instanceof ApiClientError && error.message
              ? error.message
              : MSG_GENERIC_ERROR}
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

  const displayName =
    [data.user?.first_name, data.user?.last_name].filter(Boolean).join(" ") ||
    "کاربر";

  return (
    <div className="space-y-6">
      <PageHeader
        title={displayName}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "کاربران", href: "/dashboard/identity/members" },
          { label: displayName },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {canUpdate ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={updateMutation.isPending}
                onClick={() => void onToggleStatus()}
              >
                {active ? "غیرفعال‌سازی" : "فعال‌سازی"}
              </Button>
            ) : null}
            {canDelete && !isSelf ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base">هویت و عضویت</CardTitle>
            <div className="flex items-center gap-2">
              <StatusChip
                label={active ? "فعال" : "غیرفعال"}
                tone={active ? "success" : "neutral"}
              />
              {data.is_owner ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
                  <Shield className="h-3 w-3" />
                  مدیر اصلی
                </span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {canUpdate && !editingIdentity ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1"
                  onClick={startEditIdentity}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  ویرایش
                </Button>
              </div>
            ) : null}

            {editingIdentity ? (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">نام</label>
                    <Input
                      className="h-9"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      نام خانوادگی
                    </label>
                    <Input
                      className="h-9"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">موبایل</label>
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
                {canManageOwner ? (
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border/60 px-3 py-3">
                    <Checkbox
                      className="mt-0.5"
                      checked={isOwner}
                      onCheckedChange={(v) => setIsOwner(Boolean(v))}
                    />
                    <span className="space-y-0.5 text-sm">
                      <span className="font-medium">مدیر اصلی سازمان</span>
                      <span className="block text-xs text-muted-foreground">
                        فقط مالک فعلی می‌تواند مالک جدید تعیین کند. مالک bypass
                        کامل دسترسی و حفاظت «آخرین مالک» دارد.
                      </span>
                    </span>
                  </label>
                ) : null}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={updateMutation.isPending}
                    onClick={cancelEditIdentity}
                  >
                    <X className="me-1 h-3.5 w-3.5" />
                    انصراف
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={updateMutation.isPending}
                    onClick={() => void saveIdentity()}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="me-1 h-3.5 w-3.5" />
                    )}
                    ذخیره
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <FieldLine label="نام" value={data.user?.first_name ?? ""} />
                <FieldLine
                  label="نام خانوادگی"
                  value={data.user?.last_name ?? ""}
                />
                <FieldLine
                  label="موبایل"
                  value={data.user?.mobile ?? ""}
                  dir="ltr"
                />
                <FieldLine
                  label="ایمیل"
                  value={data.user?.email ?? ""}
                  dir="ltr"
                />
                <FieldLine
                  label="عضویت از"
                  value={formatDate(data.created_at)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <AssignRolesCard tenantUserId={data.tenant_user_id} userId={data.user_id} />
      </div>

      {canViewHistory ? (
        <MembershipHistoryPanel
          items={historyQuery.data ?? []}
          isLoading={historyQuery.isLoading}
        />
      ) : null}

      {canViewProfile && profile ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">پروفایل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <FieldLine label="عنوان شغلی" value={profile.job_title ?? ""} />
            <FieldLine label="درباره" value={profile.bio ?? ""} />
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف از سازمان</DialogTitle>
            <DialogDescription>
              عضویت «{displayName}» از فهرست جاری سازمان حذف نرم می‌شود. این عمل
              قابل بازگردانی از فهرست حذف‌شده‌ها است.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deleteMutation.isPending}
            >
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => void onDelete()}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="me-1 h-3.5 w-3.5 animate-spin" />
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
