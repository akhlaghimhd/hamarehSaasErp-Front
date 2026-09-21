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
import { AssignScopesCard } from "./assign-scopes-card";
import { MembershipHistoryPanel } from "./membership-history-panel";
import { MSG_GENERIC_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import { decodeMemberRef } from "../lib/member-ref";
import { profileService } from "../services/profile-service";
import { tenantUserService } from "../services/tenant-user-service";
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

function splitEmail(email?: string | null): { local: string; host: string } {
  if (!email || !email.includes("@")) return { local: "", host: "" };
  const i = email.lastIndexOf("@");
  return { local: email.slice(0, i), host: email.slice(i + 1) };
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
  const canManageOwner = useAuthStore((s) => s.securityContext?.is_owner === true);
  const canDelete = usePermission(IdentityPermissions.userDelete);
  const canViewHistory = usePermission(
    IdentityPermissions.membershipHistoryView
  );
  const canViewProfile = usePermission(IdentityPermissions.profileView);

  const currentUserId = useAuthStore((s) => s.user?.user_id);
  const patchUser = useAuthStore((s) => s.patchUser);

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
  const [emailLocalPart, setEmailLocalPart] = useState("");
  const [emailHost, setEmailHost] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setFirstName(data.user?.first_name ?? "");
    setLastName(data.user?.last_name ?? "");
    setMobile(data.user?.mobile ?? "");
    setIsOwner(Boolean(data.is_owner));
    setEmailLocalPart(splitEmail(data.user?.email).local);
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
    setEmailLocalPart(splitEmail(data.user?.email).local);
    setEditingIdentity(true);
    void tenantUserService
      .getEmailHost()
      .then((d) => setEmailHost(d.email_host))
      .catch(() => setEmailHost(splitEmail(data.user?.email).host || null));
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
    const local = emailLocalPart.trim().toLowerCase();
    if (!local) {
      toast.error("بخش ابتدایی ایمیل الزامی است.");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        tenantUserId: data.tenant_user_id,
        payload: {
          first_name: fn,
          last_name: ln,
          mobile: mob || null,
          email_local_part: local,
          ...(canManageOwner ? { is_owner: isOwner } : {}),
        },
      });
      // Keep header/session in sync when editing self (no re-login needed)
      if (isSelf) {
        const host = emailHost ?? splitEmail(data.user?.email).host;
        patchUser({
          first_name: fn,
          last_name: ln,
          mobile: mob || null,
          email: host ? `${local}@${host}` : (data.user?.email ?? ""),
        });
      }
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

  const fullName =
    [data.user?.first_name, data.user?.last_name].filter(Boolean).join(" ") ||
    "کاربر";
  const bioText =
    (profile as { bio?: string | null } | null | undefined)?.bio?.trim() ?? "";

  return (
    <div className="space-y-6">
      <PageHeader
        title={fullName}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "کاربران", href: "/dashboard/identity/members" },
          { label: fullName },
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
            <div className="flex items-center gap-2">
              <StatusChip
                label={active ? "فعال" : "غیرفعال"}
                tone={active ? "success" : "neutral"}
              />
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
            </div>
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
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs text-muted-foreground">
                      ایمیل سازمانی
                    </label>
                    <div
                      className="flex h-9 overflow-hidden rounded-md border border-input bg-background"
                      dir="ltr"
                    >
                      <input
                        className="h-full min-w-0 flex-1 border-0 bg-transparent px-2.5 font-mono text-sm outline-none"
                        value={emailLocalPart}
                        onChange={(e) =>
                          setEmailLocalPart(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9._-]/g, "")
                          )
                        }
                        placeholder="first.last"
                        autoComplete="off"
                      />
                      <span className="flex shrink-0 items-center border-l border-input bg-muted/40 px-2.5 font-mono text-xs text-muted-foreground">
                        @
                        {emailHost ??
                          (splitEmail(data.user?.email).host || "—")}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      فقط بخش قبل از @ قابل ویرایش است.
                    </p>
                  </div>
                  {canManageOwner ? (
                    <label className="flex items-center gap-2 text-sm sm:col-span-2">
                      <Checkbox
                        checked={isOwner}
                        onCheckedChange={(v) => setIsOwner(v === true)}
                      />
                      مدیر اصلی سازمان
                    </label>
                  ) : null}
                </div>
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
              <div className="space-y-3">
                <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
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
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border/40 pt-3 text-[11px] text-muted-foreground">
                  <span className="whitespace-nowrap">
                    عضویت از {formatDate(data.created_at as string | null)}
                  </span>
                  <span className="whitespace-nowrap">
                    آخرین تغییر {formatDate(data.updated_at as string | null)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AssignRolesCard userId={data.user_id!} />

      <AssignScopesCard tenantUserId={data.tenant_user_id} />

      {canViewHistory ? (
        <MembershipHistoryPanel
          items={historyQuery.data ?? []}
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
              بازگردانی است. این عمل حذف فیزیکی حساب نیست.
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
