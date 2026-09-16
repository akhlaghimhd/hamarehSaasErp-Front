/**
 * افزودن کاربر — ویزارد فشرده دو مرحله‌ای (هویت → دسترسی)
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Check, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  useCreateTenantUser,
  useUpdateTenantUser,
} from "../hooks/use-tenant-users";
import { tenantUserService } from "../services/tenant-user-service";
import { roleService, type RoleDto } from "../services/role-service";
import { IdentityPermissions, type TenantUserDto } from "../types";
import {
  createMemberSchema,
  normalizeIranMobile,
  type CreateMemberFormValues,
} from "../validations/member-schema";
import {
  slugNamePart,
  suggestEmailLocalPart,
} from "../lib/transliterate-fa";
import { MSG_GENERIC_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import { cn, toFaDigits } from "@/shared/lib/utils";

type Step = "identity" | "access";

const breadcrumbs = [
  { label: "داشبورد", href: "/dashboard" },
  { label: "هویت و دسترسی", href: "/dashboard/identity" },
  { label: "کاربران", href: "/dashboard/identity/members" },
  { label: "افزودن" },
];

export function MemberCreatePage() {
  const router = useRouter();
  const canCreate = usePermission(IdentityPermissions.userCreate);
  const canAssignRole = usePermission(IdentityPermissions.roleAssign);
  const canUpdate = usePermission(IdentityPermissions.userUpdate);

  const createMutation = useCreateTenantUser();
  const updateMutation = useUpdateTenantUser();

  const [step, setStep] = useState<Step>("identity");
  const [emailHost, setEmailHost] = useState<string | null>(null);
  const [hostLoading, setHostLoading] = useState(true);
  const [hostError, setHostError] = useState<string | null>(null);
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
    mode: "onTouched",
  });

  const firstName = useWatch({ control: form.control, name: "first_name" });
  const lastName = useWatch({ control: form.control, name: "last_name" });

  const latinFirst = slugNamePart(firstName ?? "");
  const latinLast = slugNamePart(lastName ?? "");

  useEffect(() => {
    let cancelled = false;
    setHostLoading(true);
    tenantUserService
      .getEmailHost()
      .then((data) => {
        if (!cancelled) {
          setEmailHost(data.email_host);
          setHostError(null);
        }
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

  useEffect(() => {
    if (step !== "identity" || created) return;
    form.setValue(
      "email_local_part",
      suggestEmailLocalPart(firstName ?? "", lastName ?? ""),
      { shouldValidate: false, shouldDirty: false }
    );
  }, [firstName, lastName, form, step, created]);

  const resyncEmail = () => {
    form.setValue(
      "email_local_part",
      suggestEmailLocalPart(
        form.getValues("first_name"),
        form.getValues("last_name")
      ),
      { shouldValidate: true }
    );
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
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        mobile: values.mobile,
        email_local_part: values.email_local_part.trim().toLowerCase(),
        is_owner: false,
        role_ids: [],
      });
      setCreated(member);
      setStep("access");
      loadRoles();
      toast.success("کاربر ثبت شد");
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_GENERIC_ERROR
      );
    }
  });

  const finishToDetail = () => {
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
      finishToDetail();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_GENERIC_ERROR
      );
    } finally {
      setAccessSaving(false);
    }
  };

  const resetForAnother = () => {
    setCreated(null);
    setStep("identity");
    setSelectedRoleId(undefined);
    setMakeOwner(false);
    form.reset();
  };

  if (!canCreate) {
    return (
      <div className="space-y-6">
        <PageHeader title="افزودن کاربر" breadcrumbs={breadcrumbs} />
        <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  const hostBlocked = !hostLoading && !emailHost;
  const u = created?.user;

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <PageHeader
        title="افزودن کاربر"
        description="ثبت هویت، سپس نقش اختیاری"
        breadcrumbs={breadcrumbs}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/identity/members">بازگشت</Link>
          </Button>
        }
      />

      {/* Stepper */}
      <nav
        aria-label="مراحل افزودن کاربر"
        className="flex gap-1 rounded-lg border border-border/60 bg-muted/25 p-1"
      >
        <div
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-sm",
            step === "identity"
              ? "bg-background font-medium shadow-sm"
              : "text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
              created
                ? "bg-emerald-600 text-white"
                : step === "identity"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted-foreground/25"
            )}
          >
            {created ? <Check className="h-3 w-3" /> : "۱"}
          </span>
          هویت
        </div>
        <div
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-md px-2 py-2 text-sm",
            step === "access"
              ? "bg-background font-medium shadow-sm"
              : "text-muted-foreground"
          )}
        >
          <span
            className={cn(
              "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
              step === "access"
                ? "bg-primary text-primary-foreground"
                : "bg-muted-foreground/25"
            )}
          >
            ۲
          </span>
          دسترسی
        </div>
      </nav>

      {hostBlocked && step === "identity" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {hostError}
        </div>
      )}

      {step === "identity" && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>اطلاعات هویتی</CardTitle>
            <CardDescription>
              نام، موبایل و ایمیل سازمانی برای عضویت در سازمان
            </CardDescription>
          </CardHeader>

          <Form {...form}>
            <form onSubmit={onSubmitIdentity} noValidate>
              <CardContent className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>نام</FormLabel>
                        <FormControl>
                          <Input
                            className="h-9"
                            autoComplete="given-name"
                            {...field}
                          />
                        </FormControl>
                        {latinFirst ? (
                          <p
                            className="truncate font-mono text-[10px] text-muted-foreground"
                            dir="ltr"
                            title={latinFirst}
                          >
                            {latinFirst}
                          </p>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>نام خانوادگی</FormLabel>
                        <FormControl>
                          <Input
                            className="h-9"
                            autoComplete="family-name"
                            {...field}
                          />
                        </FormControl>
                        {latinLast ? (
                          <p
                            className="truncate font-mono text-[10px] text-muted-foreground"
                            dir="ltr"
                            title={latinLast}
                          >
                            {latinLast}
                          </p>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>موبایل</FormLabel>
                      <FormControl>
                        <Input
                          className="h-9 tabular-nums"
                          dir="ltr"
                          inputMode="numeric"
                          autoComplete="tel"
                          placeholder="09121234567"
                          maxLength={11}
                          value={field.value}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          onChange={(e) => {
                            const next = normalizeIranMobile(e.target.value);
                            field.onChange(next);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        ۱۱ رقم، شروع با ۰۹ — ورود با کد یک‌بارمصرف
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email_local_part"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel required>ایمیل سازمانی</FormLabel>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                          onClick={resyncEmail}
                        >
                          <RefreshCw className="h-3 w-3" />
                          از نام
                        </button>
                      </div>
                      <div
                        className="flex h-9 overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1"
                        dir="ltr"
                      >
                        <FormControl>
                          <input
                            className="h-full min-w-0 flex-1 border-0 bg-transparent px-2.5 font-mono text-sm outline-none disabled:opacity-50"
                            autoComplete="off"
                            placeholder="first.last"
                            disabled={hostBlocked || hostLoading}
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9._-]/g, "")
                              )
                            }
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <span className="flex shrink-0 items-center border-l border-input bg-muted/40 px-2.5 font-mono text-xs text-muted-foreground">
                          @{hostLoading ? "…" : emailHost ?? "—"}
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>

              <CardFooter className="justify-end gap-2 border-t border-border/50 pt-3">
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href="/dashboard/identity/members">انصراف</Link>
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={hostBlocked || hostLoading || createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      در حال ثبت…
                    </>
                  ) : (
                    "ثبت و ادامه"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      )}

      {step === "access" && created && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>دسترسی</CardTitle>
            <CardDescription>
              اختیاری — بعداً از جزئیات کاربر هم قابل تنظیم است
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3.5">
            <div className="rounded-md border border-border/50 bg-muted/15 px-3 py-2.5">
              <p className="text-sm font-medium">
                {[u?.first_name, u?.last_name].filter(Boolean).join(" ")}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground" dir="ltr">
                {u?.email}
              </p>
              {u?.mobile ? (
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  {toFaDigits(u.mobile)}
                </p>
              ) : null}
            </div>

            {canAssignRole ? (
              <div className="space-y-1.5">
                <Label>نقش</Label>
                <Select
                  value={selectedRoleId ?? "__none__"}
                  onValueChange={(v) =>
                    setSelectedRoleId(v === "__none__" ? undefined : v)
                  }
                  disabled={rolesLoading}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue
                      placeholder={rolesLoading ? "بارگذاری…" : "بدون نقش"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">بدون نقش</SelectItem>
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
            ) : null}

            {canUpdate ? (
              <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border/50 px-3 py-2.5">
                <Checkbox
                  className="mt-0.5"
                  checked={makeOwner}
                  onCheckedChange={(v) => setMakeOwner(Boolean(v))}
                />
                <span className="text-sm leading-snug">
                  <span className="font-medium">مدیر اصلی سازمان</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    فقط در صورت نیاز فعال کنید
                  </span>
                </span>
              </label>
            ) : null}
          </CardContent>

          <CardFooter className="flex flex-wrap justify-end gap-2 border-t border-border/50 pt-3">
            <Button type="button" variant="ghost" size="sm" onClick={resetForAnother}>
              کاربر دیگر
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={finishToDetail}>
              بعداً
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => void onSaveAccess()}
              disabled={accessSaving || (!selectedRoleId && !makeOwner)}
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
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
