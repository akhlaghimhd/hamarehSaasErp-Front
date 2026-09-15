/**
 * FE-P1-T08 — Invite / add tenant member form.
 * RHF + Zod, UI-04 field errors, permission identity.user.create.
 */

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
      email: "",
      password: "",
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
              : "بارگذاری نقش‌ها ناموفق بود."
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
        email: values.email,
        password: values.password,
        first_name: values.first_name,
        last_name: values.last_name,
        mobile: values.mobile || null,
        is_owner: values.is_owner ?? false,
        role_ids: values.role_id ? [values.role_id] : [],
      });
      toast.success("عضو با موفقیت اضافه شد");
      router.push(
        `/dashboard/identity/members/${member.tenant_user_id}`
      );
    } catch (e) {
      const msg =
        e instanceof ApiClientError
          ? e.message
          : "افزودن عضو ناموفق بود.";
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
          title="افزودن عضو"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "اعضا", href: "/dashboard/identity/members" },
            { label: "افزودن" },
          ]}
        />
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
          دسترسی ایجاد عضو (identity.user.create) برای این حساب فعال نیست.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="افزودن عضو"
        description="دعوت یا ایجاد کاربر و عضویت در مستأجر جاری"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "اعضا", href: "/dashboard/identity/members" },
          { label: "افزودن" },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/identity/members">انصراف</Link>
          </Button>
        }
      />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">اطلاعات عضو جدید</CardTitle>
          <CardDescription>
            در صورت وجود کاربر با همان ایمیل، فقط عضویت مستأجر ایجاد می‌شود.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <FormGrid columns={2}>
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>نام</FormLabel>
                      <FormControl>
                        <Input className="h-9" autoComplete="given-name" {...field} />
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
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>ایمیل</FormLabel>
                      <FormControl>
                        <Input
                          className="h-9"
                          type="email"
                          dir="ltr"
                          autoComplete="email"
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
                    <FormItem>
                      <FormLabel>موبایل</FormLabel>
                      <FormControl>
                        <Input
                          className="h-9"
                          dir="ltr"
                          autoComplete="tel"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>اختیاری</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel required>رمز عبور اولیه</FormLabel>
                      <FormControl>
                        <Input
                          className="h-9"
                          type="password"
                          dir="ltr"
                          autoComplete="new-password"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>حداقل ۸ کاراکتر</FormDescription>
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
                              {r.code ? ` (${r.code})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {rolesError ? (
                        <p className="text-xs text-muted-foreground">
                          نقش‌ها بارگذاری نشد ({rolesError}). می‌توانید بدون نقش
                          ادامه دهید.
                        </p>
                      ) : (
                        <FormDescription>اختیاری — قابل تغییر بعداً</FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="is_owner"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 space-y-0 sm:col-span-2">
                      <FormControl>
                        <Checkbox
                          checked={Boolean(field.value)}
                          onCheckedChange={(v) => field.onChange(Boolean(v))}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="font-normal">مالک مستأجر</FormLabel>
                        <FormDescription>
                          فقط در صورت نیاز سازمانی علامت بزنید.
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
                  disabled={createMutation.isPending || form.formState.isSubmitting}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      در حال ذخیره…
                    </>
                  ) : (
                    "افزودن عضو"
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
