/**
 * افزودن کاربر:
 * مرحله ۱ — هویت + ایمیل (تمام‌عرض)
 * مرحله ۲ — پس از ثبت: نمایش خلاصه + نقش/مالک اختیاری یا رد شدن
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2, RefreshCw } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/form/form";
import { Label } from "@/shared/components/ui/label";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { useCreateTenantUser, useUpdateTenantUser } from "../hooks/use-tenant-users";
import { tenantUserService } from "../services/tenant-user-service";
import { roleService, type RoleDto } from "../services/role-service";
import { IdentityPermissions, type TenantUserDto } from "../types";
import {
  createMemberSchema,
  type CreateMemberFormValues,
} from "../validations/member-schema";
import {
  slugNamePart,
  suggestEmailLocalPart,
} from "../lib/transliterate-fa";
import { MSG_GENERIC_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import { toFaDigits } from "@/shared/lib/utils";

export function MemberCreatePage() {
  const router = useRouter();
  const canCreate = usePermission(IdentityPermissions.userCreate);
  const canAssignRole = usePermission(IdentityPermissions.roleAssign);
  const canUpdate = usePermission(IdentityPermissions.userUpdate);

  const createMutation = useCreateTenantUser();
  const updateMutation = useUpdateTenantUser();

  const [emailHost, setEmailHost] = useState<string | null>(null);
  const [hostLoading, setHostLoading] = useState(true);
  const [hostError, setHostError] = useState<string | null>(null);

  /** پس از ثبت موفق هویت */
  const [created, setCreated] = useState<TenantUserDto | null>(null);

  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>();
  const [makeOwner, setMakeOwner] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);

  const form = useForm<CreateMemberFormValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      mobile: "",
      email_local_part: "",
    },
    mode: "onBlur",
  });

  const firstName = useWatch({ control: form.control, name: "first_name" });
  const lastName = useWatch({ control: form.control, name: "last_name" });
  const emailLocal = useWatch({
    control: form.control,
    name: "email_local_part",
  });

  const latinFirst = slugNamePart(firstName ?? "");
  const latinLast = slugNamePart(lastName ?? "");

  useEffect(() => {
    let cancelled = false;
    setHostLoading(true);
    setHostError(null);
    tenantUserService
      .getEmailHost()
      .then((data) => {
        if (!cancelled) setEmailHost(data.email_host);
      })
      .catch((e) => {
        if (!cancelled) {
          setEmailHost(null);
          setHostError(
            e instanceof ApiClientError
              ? e.message
              : "دامنه ایمیل سازمانی در دسترس نیست."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setHostLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** همیشه با تغییر نام، پیشنهاد ایمیل تازه شود (کاربر می‌تواند بعداً دستی اصلاح کند) */
  useEffect(() => {
    if (created) return;
    const suggested = suggestEmailLocalPart(firstName ?? "", lastName ?? "");
    form.setValue("email_local_part", suggested, {
      shouldValidate: false,
      shouldDirty: false,
    });
  }, [firstName, lastName, form, created]);

  const resyncEmail = () => {
    const suggested = suggestEmailLocalPart(
      form.getValues("first_name"),
      form.getValues("last_name")
    );
    form.setValue("email_local_part", suggested, { shouldValidate: true });
  };

  const loadRoles = () => {
    setRolesLoading(true);
    roleService
      .list()
      .then((list) =>
        setRoles(
          list.filter((r) => r.status === undefined || Number(r.status) === 1)
        )
      )
      .catch(() => setRoles([]))
      .finally(() => setRolesLoading(false));
  };

  const onSubmitIdentity = form.handleSubmit(async (values) => {
    if (!emailHost) {
      toast.error(hostError ?? "دامنه ایمیل سازمانی در دسترس نیست.");
      return;
    }
    try {
      const member = await createMutation.mutateAsync({
        first_name: values.first_name,
        last_name: values.last_name,
        mobile: values.mobile,
        email_local_part: values.email_local_part,
        is_owner: false,
        role_ids: [],
      });
      toast.success("کاربر ثبت شد. در صورت تمایل نقش را همین‌جا تنظیم کنید.");
      setCreated(member);
      loadRoles();
    } catch (e) {
      const msg =
        e instanceof ApiClientError && e.message
          ? e.message
          : MSG_GENERIC_ERROR;
      toast.error(msg);
      if (e instanceof ApiClientError && e.errors) {
        Object.entries(e.errors).forEach(([key, messages]) => {
          const field = key as keyof CreateMemberFormValues;
          if (messages?.[0] && field in form.getValues()) {
            form.setError(field, { message: messages[0] });
          }
        });
      }
    }
  });

  const goToDetail = () => {
    if (created?.tenant_user_id) {
      router.push(`/dashboard/identity/members/${created.tenant_user_id}`);
    }
  };

  const onSaveAccess = async () => {
    if (!created) return;
    setAccessSaving(true);
    try {
      if (selectedRoleId && canAssignRole && created.user_id) {
        await roleService.assignToUser(created.user_id, [selectedRoleId]);
      }
      if (makeOwner && canUpdate) {
        await updateMutation.mutateAsync({
          tenantUserId: created.tenant_user_id,
          payload: { is_owner: true },
        });
      }
      toast.success("دسترسی ذخیره شد");
      goToDetail();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_GENERIC_ERROR
      );
    } finally {
      setAccessSaving(false);
    }
  };

  if (!canCreate) {
    return (
      <div className="w-full space-y-6">
        <PageHeader
          title="افزودن کاربر"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "کاربران", href: "/dashboard/identity/members" },
            { label: "افزودن" },
          ]}
        />
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  const hostBlocked = !hostLoading && !emailHost;

  /* ——— مرحله ۲: بعد از ثبت ——— */
  if (created) {
    const u = created.user;
    const fullName = [u?.first_name, u?.last_name].filter(Boolean).join(" ");

    return (
      <div className="w-full space-y-6">
        <PageHeader
          title="کاربر ثبت شد"
          description="هویت ذخیره شد. نقش و دسترسی را همین‌جا تنظیم کنید یا بعداً از جزئیات کاربر."
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "کاربران", href: "/dashboard/identity/members" },
            { label: "افزودن" },
          ]}
        />

        <Card className="w-full border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
            <CheckCircle2 className="h-8 w-8 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-semibold">{fullName || "کاربر جدید"}</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                <span dir="ltr" className="font-mono">
                  {u?.email}
                </span>
                <span>{u?.mobile ? toFaDigits(u.mobile) : "—"}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={goToDetail}>
              مشاهده جزئیات
            </Button>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base">دسترسی و نقش</CardTitle>
            <CardDescription>
              اختیاری است. می‌توانید رد شوید و بعداً از صفحه جزئیات تنظیم کنید.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {(canAssignRole || canUpdate) && (
              <>
                {canAssignRole && (
                  <div className="space-y-2">
                    <Label>نقش</Label>
                    <Select
                      value={selectedRoleId ?? "__none__"}
                      onValueChange={(v) =>
                        setSelectedRoleId(v === "__none__" ? undefined : v)
                      }
                      disabled={rolesLoading}
                    >
                      <SelectTrigger className="h-10 w-full max-w-lg">
                        <SelectValue
                          placeholder={
                            rolesLoading
                              ? "بارگذاری…"
                              : "بدون نقش — بعداً"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">بدون نقش — بعداً</SelectItem>
                        {roles.map((r) => (
                          <SelectItem
                            key={r.tenant_role_id}
                            value={r.tenant_role_id}
                          >
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {canUpdate && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-muted/10 px-4 py-3">
                    <Checkbox
                      className="mt-0.5"
                      checked={makeOwner}
                      onCheckedChange={(v) => setMakeOwner(Boolean(v))}
                    />
                    <span className="space-y-0.5">
                      <span className="block text-sm font-medium">
                        مدیر اصلی سازمان (Owner)
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        فقط در صورت نیاز؛ بعداً هم از جزئیات کاربر قابل تغییر است.
                      </span>
                    </span>
                  </label>
                )}
              </>
            )}

            <div className="flex flex-wrap gap-2 border-t border-border/50 pt-4">
              <Button
                type="button"
                onClick={() => void onSaveAccess()}
                disabled={
                  accessSaving ||
                  (!selectedRoleId && !makeOwner)
                }
              >
                {accessSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    ذخیره…
                  </>
                ) : (
                  "ذخیره دسترسی"
                )}
              </Button>
              <Button type="button" variant="outline" onClick={goToDetail}>
                بعداً تنظیم می‌کنم
              </Button>
              <Button type="button" variant="ghost" asChild>
                <Link href="/dashboard/identity/members">فهرست کاربران</Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCreated(null);
                  form.reset();
                }}
              >
                افزودن کاربر دیگر
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ——— مرحله ۱: فرم هویت ——— */
  return (
    <div className="w-full space-y-6">
      <PageHeader
        title="افزودن کاربر"
        description="ابتدا هویت و ایمیل سازمانی را ثبت کنید؛ نقش در مرحله بعد یا از جزئیات کاربر."
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "کاربران", href: "/dashboard/identity/members" },
          { label: "افزودن" },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/identity/members">انصراف</Link>
          </Button>
        }
      />

      {hostBlocked && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {hostError ?? "دامنه ایمیل سازمانی در دسترس نیست."}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={onSubmitIdentity} className="w-full space-y-0" noValidate>
          <Card className="w-full">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base">اطلاعات هویتی</CardTitle>
              <CardDescription>
                با تغییر نام، پیشنهاد ایمیل به‌روز می‌شود. می‌توانید بخش قبل از @ را
                دستی اصلاح کنید.
              </CardDescription>
            </CardHeader>
            <CardContent className="w-full space-y-5 pt-6">
              {/* ردیف نام */}
              <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-2">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem className="w-full space-y-2">
                      <FormLabel required>نام</FormLabel>
                      <FormControl>
                        <Input className="h-10 w-full" {...field} />
                      </FormControl>
                      <p className="h-4 font-mono text-xs text-muted-foreground" dir="ltr">
                        {latinFirst || "\u00a0"}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem className="w-full space-y-2">
                      <FormLabel required>نام خانوادگی</FormLabel>
                      <FormControl>
                        <Input className="h-10 w-full" {...field} />
                      </FormControl>
                      <p className="h-4 font-mono text-xs text-muted-foreground" dir="ltr">
                        {latinLast || "\u00a0"}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* موبایل تمام‌عرض */}
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem className="w-full space-y-2">
                    <FormLabel required>موبایل</FormLabel>
                    <FormControl>
                      <Input
                        className="h-10 w-full"
                        dir="ltr"
                        inputMode="tel"
                        placeholder="09xxxxxxxxx"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      ورود اول با همین شماره و کد یک‌بارمصرف انجام می‌شود.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ایمیل: گروه LTR یک‌پارچه — local | @domain */}
              <FormField
                control={form.control}
                name="email_local_part"
                render={({ field }) => (
                  <FormItem className="w-full space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <FormLabel required>ایمیل سازمانی</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={resyncEmail}
                        disabled={!firstName && !lastName}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        همگام با نام
                      </Button>
                    </div>
                    <div
                      className="flex h-10 w-full overflow-hidden rounded-md border border-input bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                      dir="ltr"
                    >
                      <FormControl>
                        <input
                          className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 font-mono text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                          autoComplete="off"
                          placeholder="first.last"
                          disabled={hostBlocked || hostLoading}
                          value={field.value}
                          onChange={(e) =>
                            field.onChange(e.target.value.toLowerCase())
                          }
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                        />
                      </FormControl>
                      <div className="flex h-full shrink-0 items-center border-l border-input bg-muted/40 px-3 font-mono text-sm text-muted-foreground">
                        @{hostLoading ? "…" : emailHost ?? "—"}
                      </div>
                    </div>
                    <FormDescription>
                      سمت چپ (در حالت LTR) قابل ویرایش است؛ دامنه بعد از @ ثابت
                      سازمان است.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3 pt-6">
            <Button
              type="submit"
              disabled={
                hostBlocked ||
                hostLoading ||
                createMutation.isPending ||
                form.formState.isSubmitting
              }
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ثبت…
                </>
              ) : (
                "ثبت کاربر و ادامه"
              )}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/identity/members">انصراف</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
