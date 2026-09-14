/**
 * FE-P1-T04 — Current user profile page (self-service).
 * GET/PUT identity-core/identity/profiles/me — no extra permission beyond auth+tenant.
 */

"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UserRound, Loader2, Save } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormGrid,
  FormDescription,
} from "@/shared/components/form";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { useAuthStore } from "@/auth";
import { ApiClientError } from "@/api";
import { useProfileMe, useUpsertProfileMe } from "../hooks/use-profile-me";
import {
  GENDER_OPTIONS,
  profileUpsertSchema,
  type ProfileUpsertFormValues,
} from "../validations/profile-schema";

function formatBirthDate(value?: string | null): string {
  if (!value) return "";
  // Backend may return ISO datetime; form expects YYYY-MM-DD
  return value.slice(0, 10);
}

export function ProfileMePage() {
  const user = useAuthStore((s) => s.user);
  const { data: profile, isLoading, isError, error, refetch } = useProfileMe();
  const upsert = useUpsertProfileMe();

  const form = useForm<ProfileUpsertFormValues>({
    resolver: zodResolver(profileUpsertSchema),
    defaultValues: {
      national_id: "",
      birth_date: "",
      avatar_url: "",
      gender: null,
      address: "",
      phone: "",
      description: "",
    },
  });

  useEffect(() => {
    if (profile === undefined) return;
    form.reset({
      national_id: profile?.national_id ?? "",
      birth_date: formatBirthDate(profile?.birth_date),
      avatar_url: profile?.avatar_url ?? "",
      gender: (profile?.gender as 1 | 2 | 3 | null | undefined) ?? null,
      address: profile?.address ?? "",
      phone: profile?.phone ?? "",
      description: profile?.description ?? "",
    });
  }, [profile, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await upsert.mutateAsync({
        national_id: values.national_id || null,
        birth_date: values.birth_date || null,
        avatar_url: values.avatar_url || null,
        gender: values.gender ?? null,
        address: values.address || null,
        phone: values.phone || null,
        description: values.description || null,
      });
      toast.success("پروفایل ذخیره شد");
      form.reset(values);
    } catch (e) {
      const msg =
        e instanceof ApiClientError
          ? e.message
          : "ذخیره پروفایل ناموفق بود.";
      toast.error(msg);
      if (e instanceof ApiClientError && e.errors) {
        for (const [key, messages] of Object.entries(e.errors)) {
          const field = key as keyof ProfileUpsertFormValues;
          if (messages?.[0]) {
            form.setError(field, { message: messages[0] });
          }
        }
      }
    }
  });

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : "کاربر";

  return (
    <div className="space-y-6">
      <PageHeader
        title="پروفایل من"
        description="اطلاعات تکمیلی حساب کاربری شما در این مستأجر"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "پروفایل من" },
        ]}
      />

      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-[var(--shadow-xs)] sm:p-6">
        <div className="mb-5 flex items-start gap-3 border-b border-border/60 pb-4">
          <div className="brand-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm text-white">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-0.5">
            <div className="font-medium">{displayName}</div>
            {user?.email && (
              <div className="text-xs text-muted-foreground" dir="ltr">
                {user.email}
              </div>
            )}
            {user?.mobile && (
              <div className="text-xs text-muted-foreground" dir="ltr">
                {user.mobile}
              </div>
            )}
            <p className="pt-1 text-[11px] text-muted-foreground">
              نام، ایمیل و موبایل از حساب اصلی مدیریت می‌شوند؛ اینجا فقط جزئیات پروفایل.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            در حال بارگذاری پروفایل…
          </div>
        ) : isError &&
          !(error instanceof ApiClientError && error.statusCode === 404) ? (
          <div className="space-y-3 py-8 text-center">
            <p className="text-sm text-destructive">
              {error instanceof ApiClientError
                ? error.message
                : "بارگذاری پروفایل ناموفق بود."}
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
              تلاش مجدد
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-5" noValidate>
              <FormGrid columns={2}>
                <FormField
                  control={form.control}
                  name="national_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>کد ملی</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          dir="ltr"
                          className="h-9"
                          placeholder="اختیاری"
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birth_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تاریخ تولد</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          type="date"
                          dir="ltr"
                          className="h-9"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>تلفن تماس</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          dir="ltr"
                          className="h-9"
                          placeholder="مثلاً ۰۲۱…"
                          autoComplete="tel"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>جنسیت</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          value={
                            field.value === null || field.value === undefined
                              ? ""
                              : String(field.value)
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            field.onChange(v === "" ? null : Number(v));
                          }}
                        >
                          {GENDER_OPTIONS.map((o) => (
                            <option key={o.value || "empty"} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="avatar_url"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>آدرس تصویر پروفایل</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          dir="ltr"
                          className="h-9"
                          placeholder="https://…"
                        />
                      </FormControl>
                      <FormDescription>اختیاری — URL کامل تصویر</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>آدرس</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={2}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder="اختیاری"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>توضیحات</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={3}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder="اختیاری — حداکثر ۵۰۰ کاراکتر"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGrid>

              <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!form.formState.isDirty || upsert.isPending}
                  onClick={() => form.reset()}
                >
                  انصراف از تغییرات
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!form.formState.isDirty || upsert.isPending}
                  className="gap-1.5"
                >
                  {upsert.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  ذخیره پروفایل
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        تغییر رمز عبور در این فاز در دسترس نیست (endpoint بک‌اند هنوز تعریف نشده — بدهی FE-P1-T05).
      </p>
    </div>
  );
}
