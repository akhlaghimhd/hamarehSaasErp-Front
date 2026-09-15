/**
 * Profile me — editable: avatar (crop+upload), bio, mobile (OTP).
 * Identity fields: non-form read-only display only.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { UserRound, Loader2, Save, Camera } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/shared/components/form";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useAuthStore } from "@/auth";
import { ApiClientError } from "@/api";
import {
  useProfileMe,
  useUpsertProfileMe,
  useUploadAvatarMe,
} from "../hooks/use-profile-me";
import { AvatarCropDialog } from "../components/avatar-crop-dialog";
import { profileService } from "../services/profile-service";
import {
  GENDER_LABELS,
  selfProfileSchema,
  toJalaliDisplay,
  type SelfProfileFormValues,
} from "../validations/profile-schema";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function InfoItem({
  label,
  value,
  dir,
  hint,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
  hint?: string;
}) {
  return (
    <div className="space-y-1" title={hint}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium" dir={dir}>
        {value || "—"}
      </div>
    </div>
  );
}

export function ProfileMePage() {
  const user = useAuthStore((s) => s.user);
  const setSession partial = useAuthStore.getState();
  const { data: profile, isLoading, isError, error, refetch } = useProfileMe();
  const upsert = useUpsertProfileMe();
  const uploadAvatar = useUploadAvatarMe();
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const [mobileStep, setMobileStep] = useState<"idle" | "code">("idle");
  const [newMobile, setNewMobile] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [mobileBusy, setMobileBusy] = useState(false);
  const [debugCode, setDebugCode] = useState<string | null>(null);

  const form = useForm<SelfProfileFormValues>({
    resolver: zodResolver(selfProfileSchema),
    defaultValues: { display_bio: "" },
  });

  useEffect(() => {
    if (profile === undefined) return;
    form.reset({
      display_bio: profile?.display_bio ?? profile?.description ?? "",
    });
    setPreview(profile?.avatar_url ?? null);
  }, [profile, form]);

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : "کاربر";

  const currentMobile = user?.mobile ?? profile?.user?.mobile ?? "";

  const onSubmitBio = form.handleSubmit(async (values) => {
    try {
      await upsert.mutateAsync({
        display_bio: values.display_bio || null,
      });
      toast.success("ذخیره شد");
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : "ذخیره ناموفق بود."
      );
    }
  });

  const onFileChosen = (file: File | null) => {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("فرمت تصویر مجاز نیست.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("حجم فایل بیش از حد مجاز است.");
      return;
    }
    setCropFile(file);
    setCropOpen(true);
  };

  const onCropConfirm = async (cropped: File) => {
    try {
      const updated = await uploadAvatar.mutateAsync(cropped);
      setPreview(updated.avatar_url ?? null);
      setCropOpen(false);
      setCropFile(null);
      toast.success("تصویر ذخیره شد");
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : "آپلود ناموفق بود."
      );
    }
  };

  const requestMobileOtp = async () => {
    setMobileBusy(true);
    setDebugCode(null);
    try {
      const res = await profileService.requestMobileChange(newMobile.trim());
      setMobileStep("code");
      if (res.debug_code) setDebugCode(res.debug_code);
      toast.success("کد تأیید ارسال شد");
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : "ارسال کد ناموفق بود."
      );
    } finally {
      setMobileBusy(false);
    }
  };

  const verifyMobileOtp = async () => {
    setMobileBusy(true);
    try {
      const res = await profileService.verifyMobileChange(
        newMobile.trim(),
        otpCode.trim()
      );
      // refresh auth store mobile
      const st = useAuthStore.getState();
      if (st.user) {
        st.setSession({
          accessToken: st.accessToken!,
          user: { ...st.user, mobile: res.mobile },
          securityContext: st.securityContext!,
          activeTenantId: st.activeTenantId,
          organization: st.organization,
        });
      }
      setMobileStep("idle");
      setNewMobile("");
      setOtpCode("");
      setDebugCode(null);
      toast.success("شماره موبایل به‌روز شد");
      void refetch();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : "تأیید کد ناموفق بود."
      );
    } finally {
      setMobileBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="پروفایل من"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "پروفایل من" },
        ]}
      />

      <div className="rounded-xl border border-border/80 bg-card p-4 shadow-[var(--shadow-xs)] sm:p-6">
        {/* Avatar */}
        <div className="mb-6 flex flex-col items-center gap-3 border-b border-border/60 pb-5 sm:flex-row sm:items-start sm:gap-4">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-border bg-muted">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt=""
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
              aria-label="تغییر تصویر"
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
                onFileChosen(e.target.files?.[0] ?? null);
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
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            در حال بارگذاری…
          </div>
        ) : isError &&
          !(error instanceof ApiClientError && error.statusCode === 404) ? (
          <div className="space-y-3 py-8 text-center">
            <p className="text-sm text-destructive">
              {error instanceof ApiClientError
                ? error.message
                : "بارگذاری ناموفق بود."}
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
          <div className="space-y-8">
            {/* Read-only identity — not a form */}
            <section className="grid gap-4 sm:grid-cols-2">
              <InfoItem label="نام" value={user?.first_name ?? ""} />
              <InfoItem label="نام خانوادگی" value={user?.last_name ?? ""} />
              <InfoItem
                label="کد ملی"
                value={profile?.national_id ?? ""}
                dir="ltr"
                hint="ویرایش این فیلد فقط توسط مدیر امکان‌پذیر است"
              />
              <InfoItem
                label="تاریخ تولد"
                value={toJalaliDisplay(profile?.birth_date)}
                dir="ltr"
              />
              <InfoItem
                label="جنسیت"
                value={
                  profile?.gender ? GENDER_LABELS[profile.gender] ?? "—" : "—"
                }
              />
              <InfoItem
                label="ایمیل"
                value={user?.email ?? ""}
                dir="ltr"
              />
              {profile?.address ? (
                <div className="sm:col-span-2">
                  <InfoItem label="آدرس" value={profile.address} />
                </div>
              ) : null}
            </section>

            {/* Bio */}
            <Form {...form}>
              <form onSubmit={onSubmitBio} className="space-y-3" noValidate>
                <FormField
                  control={form.control}
                  name="display_bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>متن زیر عکس</FormLabel>
                      <FormControl>
                        <textarea
                          {...field}
                          value={field.value ?? ""}
                          rows={2}
                          maxLength={500}
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                          placeholder="جمله‌ای کوتاه…"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end">
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

            {/* Mobile + OTP */}
            <section className="space-y-3 rounded-lg border border-border/70 p-4">
              <div className="text-sm font-medium">شماره موبایل</div>
              <div className="text-sm" dir="ltr">
                {currentMobile || "—"}
              </div>

              {mobileStep === "idle" ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">
                      شماره جدید
                    </label>
                    <Input
                      dir="ltr"
                      className="h-9"
                      value={newMobile}
                      onChange={(e) => setNewMobile(e.target.value)}
                      placeholder="09xxxxxxxxx"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={mobileBusy || !newMobile.trim()}
                    onClick={() => void requestMobileOtp()}
                  >
                    {mobileBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    ارسال کد
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-muted-foreground">
                      کد تأیید
                    </label>
                    <Input
                      dir="ltr"
                      className="h-9"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="------"
                    />
                    {debugCode && process.env.NODE_ENV === "development" ? (
                      <p className="text-[11px] text-muted-foreground" dir="ltr">
                        debug: {debugCode}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={mobileBusy}
                      onClick={() => {
                        setMobileStep("idle");
                        setOtpCode("");
                        setDebugCode(null);
                      }}
                    >
                      انصراف
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={mobileBusy || otpCode.trim().length < 4}
                      onClick={() => void verifyMobileOtp()}
                    >
                      {mobileBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      تأیید
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <AvatarCropDialog
        open={cropOpen}
        file={cropFile}
        onOpenChange={(o) => {
          setCropOpen(o);
          if (!o) setCropFile(null);
        }}
        onConfirm={onCropConfirm}
        busy={uploadAvatar.isPending}
      />
    </div>
  );
}
