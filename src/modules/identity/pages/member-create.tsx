/** افزودن کاربر — لایه‌بندی: هویت → ایمیل سازمانی (بدون نقش در این مرحله) */

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
import { tenantUserService } from "../services/tenant-user-service";
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

export function MemberCreatePage() {
  const router = useRouter();
  const canCreate = usePermission(IdentityPermissions.userCreate);
  const createMutation = useCreateTenantUser();

  const [emailHost, setEmailHost] = useState<string | null>(null);
  const [hostLoading, setHostLoading] = useState(true);
  const [hostError, setHostError] = useState<string | null>(null);

  /** When user edits local-part manually, stop auto-sync from names. */
  const localPartTouched = useRef(false);

  const form = useForm<CreateMemberFormValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      mobile: "",
      email_local_part: "",
      is_owner: false,
    },
    mode: "onBlur",
  });

  const firstName = useWatch({ control: form.control, name: "first_name" });
  const lastName = useWatch({ control: form.control, name: "last_name" });

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
        role_ids: [],
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

  const hostBlocked = !hostLoading && !emailHost;

  return (
    <div className="space-y-6">
      <PageHeader
        title="افزودن کاربر"
        description="ثبت هویت و ایمیل سازمانی؛ نقش و مجوزها در مرحله بعد از صفحه جزئیات کاربر"
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
        <div className="max-w-3xl rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {hostError ??
            "دامنه ایمیل سازمانی تنظیم نشده است. تا زمان پیکربندی دامنه، افزودن کاربر ممکن نیست."}
        </div>
      )}

      <Form {...form}>
        <form onSubmit={onSubmit} className="max-w-3xl space-y-5" noValidate>
          {/* لایه ۱: هویت */}
          <Card>
            <CardHeader className="space-y-1 pb-3">
              <CardTitle className="text-base">۱. هویت کاربر</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                نام فارسی را وارد کنید؛ معادل انگلیسی برای ساخت ایمیل پیشنهاد
                می‌شود.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
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
                      {latinFirst ? (
                        <p className="text-xs text-muted-foreground dir-ltr font-mono">
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
                        <p className="text-xs text-muted-foreground dir-ltr font-mono">
                          {latinLast}
                        </p>
                      ) : null}
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
              </FormGrid>
            </CardContent>
          </Card>

          {/* لایه ۲: ایمیل سازمانی */}
          <Card>
            <CardHeader className="space-y-1 pb-3">
              <CardTitle className="text-base">۲. ایمیل سازمانی</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                بخش ابتدایی قابل ویرایش است؛ دامنه سازمان ثابت و غیرقابل تغییر
                است.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <FormField
                control={form.control}
                name="email_local_part"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>آدرس ایمیل</FormLabel>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                      <FormControl>
                        <Input
                          className="h-9 flex-1 font-mono"
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
                        className="flex h-9 shrink-0 items-center rounded-md border border-input bg-muted/40 px-3 font-mono text-sm text-muted-foreground"
                        dir="ltr"
                      >
                        @
                        {hostLoading
                          ? "…"
                          : emailHost ?? "—"}
                      </div>
                    </div>
                    <FormDescription>
                      پیشنهاد از نام فارسی ساخته می‌شود؛ در صورت نیاز اصلاح کنید.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* لایه ۳: گزینه‌های عضویت */}
          <Card>
            <CardHeader className="space-y-1 pb-3">
              <CardTitle className="text-base">۳. عضویت</CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                نقش و مجوزها پس از ایجاد، از صفحه جزئیات کاربر قابل تخصیص هستند.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="is_owner"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-lg border border-border/60 bg-muted/10 px-3 py-3">
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
                        فقط اگر این فرد باید بالاترین سطح مدیریت سازمان را داشته
                        باشد علامت بزنید.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              type="submit"
              size="sm"
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
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/dashboard/identity/members">انصراف</Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
