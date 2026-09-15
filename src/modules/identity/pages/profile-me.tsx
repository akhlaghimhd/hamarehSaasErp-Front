/**
 * FE-P1 — Profile me (self-service policy locked):
 * - Identity fields: read-only (admin-managed)
 * - display_bio: self-editable
 * - address: self request → pending manager approval
 * - avatar: single image upload only
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UserRound, Loader2, Save, Camera, ImageIcon } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/shared/components/form";
import { Button } from "@/shared/components/ui/button";
import { useAuthStore } from "@/auth";
import { ApiClientError } from "@/api";
import {
  useProfileMe,
  useUpsertProfileMe,
  useUploadAvatarMe,
} from "../hooks/use-profile-me";
import {
  ADDRESS_STATUS_LABELS,
  GENDER_LABELS,
  selfProfileSchema,
  toJalaliDisplay,
  type SelfProfileFormValues,
} from "../validations/profile-schema";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function ReadOnlyField({
  label,
  value,
  dir,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div
        className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm"
        dir={dir}
      >
        {value || "—"}
      </div>
    </div>
  );
}

export function ProfileMePage() {
  const user = useAuthStore((s) => s.user);
  const { data: profile, isLoading, isError, error, refetch } = useProfileMe();
  const upsert = useUpsertProfileMe();
  const uploadAvatar = useUploadAvatarMe();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const form = useForm<SelfProfileFormValues>({
    resolver: zodResolver(selfProfileSchema),
    defaultValues: {
      display_bio: "",
      address: "",
    },
  });

  useEffect(() => {
    if (profile === undefined) return;
    const pending =
      profile?.address_change_status === 1 && profile?.pending_address
        ? profile.pending_address
        : profile?.address ?? "";
    form.reset({
      display_bio: profile?.display_bio ?? profile?.description ?? "",
      address: pending ?? "",
    });
    setPreview(profile?.avatar_url ?? null);
  }, [profile, form]);

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : "کاربر";

  const addressStatus = Number(profile?.address_change_status ?? 0);
  const addressStatusLabel = ADDRESS_STATUS_LABELS[addressStatus] ?? "";

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await upsert.mutateAsync({
        display_bio: values.display_bio || null,
        address: values.address || null,
      });
      toast.success(
        values.address && values.address !== (profile?.address ?? "")
          ? "ذخیره شد. تغییر آدرس پس از تأیید مدیر اعمال می‌شود."
          : "پروفایل ذخیره شد"
      );
    } catch (e) {
      const msg =
        e instanceof ApiClientError
          ? e.message
          : "ذخیره پروفایل ناموفق بود.";
      toast.error(msg);
    }
  });

  const onPickAvatar = async (file: File | null) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("فقط فایل‌های JPG، PNG یا WebP مجاز است.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("حجم تصویر حداکثر ۲ مگابایت باشد.");
      return;
    }

    // Client-side dimension check (optional soft limit)
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      await uploadAvatar.mutateAsync(file);
      toast.success("تصویر پروفایل به‌روز شد");
    } catch (e) {
      setPreview(profile?.avatar_url ?? null);
      const msg =
        e instanceof ApiClientError ? e.message : "آپلود تصویر ناموفق بود.";
      toast.error(msg);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="پروفایل من"
        description="ویرایش محدود اطلاعات شخصی — فیلدهای هویتی توسط مدیر سیستم مدیریت می‌شود"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "پروفایل من" },
        ]}
      />

      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-[var(--shadow-xs)] sm:p-6">
        {/* Avatar + bio header */}
        <div className="mb-6 flex flex-col items-center gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-start sm:gap-4">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="آواتار"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute -bottom-1 -start-1 h-8 w-8 rounded-full shadow"
              disabled={uploadAvatar.isPending}
              onClick={() => fileRef.current?.click()}
              aria-label="تغییر تصویر پروفایل"
              title="آپلود تصویر (حداکثر ۲ مگابایت)"
            >
              {uploadAvatar.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                void onPickAvatar(f);
                e.target.value = "";
              }}
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1 text-center sm:text-start">
            <div className="text-lg font-semibold">{displayName}</div>
            {(profile?.display_bio || profile?.description) && (
              <p className="text-sm text-muted-foreground">
                {profile?.display_bio ?? profile?.description}
              </p>
            )}
            <p className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground sm:justify-start">
              <ImageIcon className="h-3 w-3" />
              یک تصویر JPG/PNG/WebP — حداکثر ۲ مگابایت
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
            >
              تلاش مجدد
            </Button>
          </div>
        ) : (
          <>
            {/* Read-only identity */}
            <div className="mb-6 space-y-3">
              <h2 className="text-sm font-semibold">اطلاعات هویتی</h2>
              <p className="text-[11px] text-muted-foreground">
                این بخش فقط نمایش است و توسط مدیر سیستم / پرسنل ویرایش می‌شود.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <ReadOnlyField label="نام" value={user?.first_name ?? ""} />
                <ReadOnlyField
                  label="نام خانوادگی"
                  value={user?.last_name ?? ""}
                />
                <ReadOnlyField
                  label="کد ملی"
                  value={profile?.national_id ?? ""}
                  dir="ltr"
                />
                <ReadOnlyField
                  label="تاریخ تولد (شمسی)"
                  value={toJalaliDisplay(profile?.birth_date)}
                  dir="ltr"
                />
                <ReadOnlyField
                  label="جنسیت"
                  value={
                    profile?.gender
                      ? GENDER_LABELS[profile.gender] ?? "—"
                      : "—"
                  }
                />
                <ReadOnlyField
                  label="موبایل ورود"
                  value={user?.mobile ?? ""}
                  dir="ltr"
                />
                <ReadOnlyField
                  label="ایمیل ورود"
                  value={user?.email ?? ""}
                  dir="ltr"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                تغییر موبایل/ایمیل ورود فقط از مسیر احراز هویت (OTP) امکان‌پذیر است.
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={onSubmit} className="space-y-5" noValidate>
                <FormField
                  control={form.control}
                  name="display_bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>متن زیر عکس (Bio)</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={2}
                          maxLength={500}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder="جمله‌ای کوتاه که دیگران زیر تصویر شما می‌بینند"
                        />
                      </FormControl>
                      <FormDescription>حداکثر ۵۰۰ کاراکتر</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>آدرس</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={3}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder="آدرس محل سکونت"
                        />
                      </FormControl>
                      <FormDescription>
                        تغییر آدرس پس از تأیید مدیر اعمال می‌شود.
                        {addressStatusLabel ? (
                          <span className="ms-1 font-medium text-primary">
                            ({addressStatusLabel}
                            {profile?.pending_address
                              ? ` — پیشنهادی: ${profile.pending_address}`
                              : ""}
                            )
                          </span>
                        ) : null}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-end gap-2 border-t border-border/60 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!form.formState.isDirty || upsert.isPending}
                    onClick={() => form.reset()}
                  >
                    انصراف
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
                    ذخیره
                  </Button>
                </div>
              </form>
            </Form>
          </>
        )}
      </div>
    </div>
  );
}
