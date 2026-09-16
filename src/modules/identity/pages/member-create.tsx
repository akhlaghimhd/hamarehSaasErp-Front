/** FE-P1-T08 — افزودن کاربر به سازمان (بدون رمز؛ ایمیل سازمانی خودکار) */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
  FormGrid,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/form/form";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { useCreateTenantUser } from "../hooks/use-tenant-users";
import { roleService, type RoleDto } from "../services/role-service";
import { IdentityPermissions } from "../types";
import {
  createMemberSchema,
  type CreateMemberFormValues,
} from "../validations/member-schema";
import { MSG_GENERIC_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";

export function MemberCreatePage() {
  const router = useRouter();
  const canCreate = usePermission(IdentityPermissions.userCreate);
  const createMutation = useCreateTenantUser();

  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);

  const form = useForm<CreateMemberFormValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      mobile: "",
      is_owner: false,
      role_id: undefined,
    },
    mode: "onBlur",
  });

  useEffect(() => {
    let cancelled = false;
    setRolesLoading(true);
    setRolesError(null);
    roleService
      .list()
      .then((list) => {
        if (!cancelled) {
          setRoles(
            list.filter((r) => r.status === undefined || Number(r.status) === 1)
          );
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setRolesError(
            e instanceof ApiClientError
              ? e.message
              : "بارگذاری نقش‌ها ممکن نشد."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setRolesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const member = await createMutation.mutateAsync({
        first_name: values.first_name,
        last_name: values.last_name,
        mobile: values.mobile,
        is_owner: values.is_owner ?? false,
        role_ids: values.role_id ? [values.role_id] : [],
      });
      const generatedEmail = member.user?.email;
      toast.success(
        generatedEmail
          ? `کاربر اضافه شد. ایمیل سازمانی: ${generatedEmail}`
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
      <div className="space-y-6">
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="افزودن کاربر"
        description="ثبت عضویت جدید؛ ورود اول با موبایل و کد یک‌بارمصرف، سپس تعیین رمز توسط خود کاربر"
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

      <Card className="max-w-3xl">
        <CardHeader className="space-y-1.5">
          <CardTitle className="text-base">اطلاعات کاربر جدید</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            ایمیل سازمانی به‌صورت خودکار ساخته می‌شود. رمز عبور را مدیر وارد
            نمی‌کند؛ کاربر در اولین ورود با موبایل، رمز خود را تعیین می‌کند. اگر
            دامنه ایمیل سازمان تنظیم نشده باشد، افزودن کاربر ممکن نیست.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-6" noValidate>
              <FormGrid columns={2} className="gap-x-4 gap-y-5">
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel required>موبایل</FormLabel>
                      <FormControl>
                        <Input
                          className="h-9"
                          dir="ltr"
                          inputMode="tel"
                          autoComplete="tel"
                          placeholder="09xxxxxxxxx"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        شناسه ورود اولیه؛ کد تأیید به این شماره ارسال می‌شود
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role_id"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>نقش اولیه</FormLabel>
                      <Select
                        value={field.value ?? "__none__"}
                        onValueChange={(v) =>
                          field.onChange(v === "__none__" ? undefined : v)
                        }
                        disabled={rolesLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue
                              placeholder={
                                rolesLoading
                                  ? "در حال بارگذاری نقش‌ها…"
                                  : "بدون نقش اولیه"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">بدون نقش اولیه</SelectItem>
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
                      {rolesError ? (
                        <p className="text-xs text-muted-foreground">
                          نقش‌ها بارگذاری نشد. می‌توانید بدون نقش ادامه دهید و
                          بعداً نقش بدهید.
                        </p>
                      ) : (
                        <FormDescription>
                          اختیاری — بعداً هم قابل تغییر است
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_owner"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 space-y-0 sm:col-span-2 rounded-lg border border-border/60 bg-muted/10 px-3 py-3">
                      <FormControl>
                        <Checkbox
                          checked={Boolean(field.value)}
                          onCheckedChange={(v) => field.onChange(Boolean(v))}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">
                          مدیر اصلی سازمان
                        </FormLabel>
                        <FormDescription>
                          فقط اگر این فرد باید بالاترین سطح مدیریت سازمان را
                          داشته باشد علامت بزنید.
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </FormGrid>

              <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
                <Button
                  type="submit"
                  size="sm"
                  disabled={
                    createMutation.isPending || form.formState.isSubmitting
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
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href="/dashboard/identity/members">انصراف</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
