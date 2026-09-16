/** افزودن کاربر — چیدمان تمام‌عرض، فینگیلیش بهبودیافته، نقش اختیاری در انتها */

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { useCreateTenantUser } from "../hooks/use-tenant-users";
import { tenantUserService } from "../services/tenant-user-service";
import { roleService, type RoleDto } from "../services/role-service";
import { IdentityPermissions } from "../types";
import {
  createMemberSchema,
  type CreateMemberFormValues,
} from "../validations/member-schema";
import {
  slugNamePart,
  suggestEmailLocalPart,
} from "../lib/transliterate-fa";
import { MSG_GENERIC_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import { cn } from "@/shared/lib/utils";

export function MemberCreatePage() {
  const router = useRouter();
  const canCreate = usePermission(IdentityPermissions.userCreate);
  const createMutation = useCreateTenantUser();

  const [emailHost, setEmailHost] = useState<string | null>(null);
  const [hostLoading, setHostLoading] = useState(true);
  const [hostError, setHostError] = useState<string | null>(null);

  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const localPartTouched = useRef(false);

  const form = useForm<CreateMemberFormValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      mobile: "",
      email_local_part: "",
      is_owner: false,
      role_id: undefined,
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

  useEffect(() => {
    let cancelled = false;
    setRolesLoading(true);
    roleService
      .list()
      .then((list) => {
        if (!cancelled) {
          setRoles(
            list.filter((r) => r.status === undefined || Number(r.status) === 1)
          );
        }
      })
      .catch(() => {
        if (!cancelled) setRoles([]);
      })
      .finally(() => {
        if (!cancelled) setRolesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (localPartTouched.current) return;
    const suggested = suggestEmailLocalPart(firstName ?? "", lastName ?? "");
    form.setValue("email_local_part", suggested, {
      shouldValidate: false,
      shouldDirty: false,
    });
  }, [firstName, lastName, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    if (!emailHost) {
      toast.error(
        hostError ??
          "دامنه ایمیل سازمانی تنظیم نشده است. ابتدا دامنه را پیکربندی کنید."
      );
      return;
    }
    try {
      const member = await createMutation.mutateAsync({
        first_name: values.first_name,
        last_name: values.last_name,
        mobile: values.mobile,
        email_local_part: values.email_local_part,
        is_owner: values.is_owner ?? false,
        role_ids: values.role_id ? [values.role_id] : [],
      });
      const generatedEmail = member.user?.email;
      toast.success(
        generatedEmail
          ? `کاربر اضافه شد. ایمیل: ${generatedEmail}`
          : "کاربر با موفقیت به سازمان اضافه شد"
      );
      router.push(`/dashboard/identity/members/${member.tenant_user_id}`);
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

  if (!canCreate) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
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
  const previewEmail =
    emailLocal && emailHost ? `${emailLocal}@${emailHost}` : null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="افزودن کاربر"
        description="اطلاعات هویتی و ایمیل سازمانی را تکمیل کنید. نقش اختیاری است و بعداً هم از جزئیات کاربر قابل تنظیم است."
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
          {hostError ??
            "دامنه ایمیل سازمانی در دسترس نیست. پس از pull بک‌اند و seed، دوباره تلاش کنید."}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          {/* هویت + تماس + ایمیل در یک کارت تمام‌عرض */}
          <Card className="w-full">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-semibold">
                اطلاعات هویتی
              </CardTitle>
              <CardDescription>
                نام فارسی را وارد کنید؛ معادل لاتین و پیشنهاد ایمیل به‌صورت
                خودکار ساخته می‌شود.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel required>نام</FormLabel>
                      <FormControl>
                        <Input
                          className="h-10 w-full"
                          autoComplete="given-name"
                          {...field}
                        />
                      </FormControl>
                      <p
                        className={cn(
                          "min-h-[1.25rem] font-mono text-xs text-muted-foreground",
                          !latinFirst && "invisible"
                        )}
                        dir="ltr"
                      >
                        {latinFirst || "—"}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel required>نام خانوادگی</FormLabel>
                      <FormControl>
                        <Input
                          className="h-10 w-full"
                          autoComplete="family-name"
                          {...field}
                        />
                      </FormControl>
                      <p
                        className={cn(
                          "min-h-[1.25rem] font-mono text-xs text-muted-foreground",
                          !latinLast && "invisible"
                        )}
                        dir="ltr"
                      >
                        {latinLast || "—"}
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem className="w-full md:col-span-2">
                      <FormLabel required>موبایل</FormLabel>
                      <FormControl>
                        <Input
                          className="h-10 w-full max-w-md"
                          dir="ltr"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="09xxxxxxxxx"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        شناسه ورود اولیه؛ کد یک‌بارمصرف به این شماره ارسال
                        می‌شود.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email_local_part"
                  render={({ field }) => (
                    <FormItem className="w-full md:col-span-2">
                      <FormLabel required>ایمیل سازمانی</FormLabel>
                      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                        <FormControl>
                          <Input
                            className="h-10 w-full flex-1 font-mono"
                            dir="ltr"
                            autoComplete="off"
                            placeholder="first.last"
                            disabled={hostBlocked || hostLoading}
                            {...field}
                            onChange={(e) => {
                              localPartTouched.current = true;
                              field.onChange(e.target.value.toLowerCase());
                            }}
                          />
                        </FormControl>
                        <div
                          className="flex h-10 shrink-0 items-center justify-center rounded-md border border-input bg-muted/50 px-3 font-mono text-sm text-muted-foreground sm:min-w-[11rem]"
                          dir="ltr"
                        >
                          @
                          {hostLoading ? "…" : emailHost ?? "—"}
                        </div>
                      </div>
                      {previewEmail ? (
                        <p className="font-mono text-xs text-muted-foreground" dir="ltr">
                          پیش‌نمایش: {previewEmail}
                        </p>
                      ) : (
                        <FormDescription>
                          بخش قبل از @ قابل ویرایش است؛ دامنه ثابت سازمان است.
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* دسترسی — اختیاری؛ بعداً هم از جزئیات کاربر */}
          <Card className="w-full">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-semibold">
                دسترسی و نقش
                <span className="mr-2 text-xs font-normal text-muted-foreground">
                  (اختیاری)
                </span>
              </CardTitle>
              <CardDescription>
                می‌توانید الان نقش بدهید یا بعداً از صفحه جزئیات کاربر تنظیم
                کنید. مدیر اصلی فقط در صورت نیاز علامت زده شود.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <FormField
                control={form.control}
                name="role_id"
                render={({ field }) => (
                  <FormItem className="w-full max-w-md">
                    <FormLabel>نقش اولیه</FormLabel>
                    <Select
                      value={field.value ?? "__none__"}
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? undefined : v)
                      }
                      disabled={rolesLoading}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 w-full">
                          <SelectValue
                            placeholder={
                              rolesLoading
                                ? "بارگذاری نقش‌ها…"
                                : "بدون نقش — بعداً تنظیم شود"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">
                          بدون نقش — بعداً تنظیم شود
                        </SelectItem>
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
                    <FormDescription>
                      خالی بگذارید اگر نقش را بعداً از جزئیات کاربر می‌دهید.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_owner"
                render={({ field }) => (
                  <FormItem className="flex w-full flex-row items-start gap-3 rounded-lg border border-border/60 bg-muted/15 px-4 py-3">
                    <FormControl>
                      <Checkbox
                        className="mt-0.5"
                        checked={Boolean(field.value)}
                        onCheckedChange={(v) => field.onChange(Boolean(v))}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-snug">
                      <FormLabel className="font-medium">
                        مدیر اصلی سازمان (Owner)
                      </FormLabel>
                      <FormDescription className="text-xs">
                        بالاترین سطح مدیریتی Tenant. معمولاً فقط برای یک یا چند
                        نفر محدود استفاده شود؛ بعداً از جزئیات کاربر هم قابل
                        تغییر است.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
            <Button
              type="submit"
              size="default"
              className="min-w-[8rem]"
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
                  در حال ذخیره…
                </>
              ) : (
                "افزودن کاربر"
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
