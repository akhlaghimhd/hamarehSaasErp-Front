/**
 * Profile me — full shell width, avatar+bio aligned, identity as «label: value».
 * Change-password card uses same policy as first-login / forgot-password.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  UserRound,
  Loader2,
  Camera,
  Pencil,
  Check,
  X,
  KeyRound,
} from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  useAuthStore,
  authService,
  validatePasswordClient,
  PASSWORD_HINT,
} from "@/auth";
import { ApiClientError } from "@/api";
import {
  useProfileMe,
  useUpsertProfileMe,
  useUploadAvatarMe,
} from "../hooks/use-profile-me";
import { AvatarCropDialog } from "../components/avatar-crop-dialog";
import { profileService } from "../services/profile-service";
import {
  BIO_MAX,
  GENDER_LABELS,
  toJalaliDisplay,
} from "../validations/profile-schema";

const MAX_AVATAR_BYTES = 512 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Inline «عنوان: مقدار» — value stays next to label even for LTR emails */
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

export function ProfileMePage() {
  const user = useAuthStore((s) => s.user);
  const { data: profile, isLoading, isError, error, refetch } = useProfileMe();
  const upsert = useUpsertProfileMe();
  const uploadAvatar = useUploadAvatarMe();
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const [editingBio, setEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const setPreviewSafe = useCallback((url: string | null) => {
    if (previewRef.current && previewRef.current.startsWith("blob:")) {
      URL.revokeObjectURL(previewRef.current);
    }
    previewRef.current = url;
    setPreview(url);
  }, []);

  const loadAvatar = useCallback(async () => {
    if (!profile?.has_avatar && !profile?.avatar_url) {
      setPreviewSafe(null);
      return;
    }
    const url = await profileService.fetchAvatarObjectUrl();
    setPreviewSafe(url);
  }, [profile?.has_avatar, profile?.avatar_url, setPreviewSafe]);

  useEffect(() => {
    void loadAvatar();
    return () => {
      if (previewRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, [loadAvatar]);

  useEffect(() => {
    setBioDraft(profile?.display_bio ?? profile?.description ?? "");
  }, [profile?.display_bio, profile?.description]);

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : "کاربر";

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
    if (cropped.size > MAX_AVATAR_BYTES) {
      toast.error("حجم فایل بیش از حد مجاز است.");
      return;
    }
    try {
      await uploadAvatar.mutateAsync(cropped);
      const local = URL.createObjectURL(cropped);
      setPreviewSafe(local);
      setCropOpen(false);
      setCropFile(null);
      toast.success("تصویر ذخیره شد");
      setTimeout(() => void loadAvatar(), 400);
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : "آپلود ناموفق بود."
      );
    }
  };

  const saveBio = async () => {
    const next = bioDraft.trim().slice(0, BIO_MAX);
    try {
      await upsert.mutateAsync({ display_bio: next || null });
      setEditingBio(false);
      toast.success("ذخیره شد");
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : "ذخیره ناموفق بود."
      );
    }
  };

  const onChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (!currentPassword) {
      setPwError("رمز فعلی را وارد کنید.");
      return;
    }
    const policyErr = validatePasswordClient(newPassword, {
      firstName: user?.first_name,
      lastName: user?.last_name,
      email: user?.email,
      mobile: user?.mobile,
    });
    if (policyErr) {
      setPwError(policyErr);
      return;
    }
    if (newPassword !== newPassword2) {
      setPwError("تکرار رمز با رمز جدید یکسان نیست.");
      return;
    }
    setPwBusy(true);
    try {
      await authService.changePassword(currentPassword, newPassword, newPassword2);
      setCurrentPassword("");
      setNewPassword("");
      setNewPassword2("");
      toast.success("رمز عبور با موفقیت تغییر کرد.");
    } catch (err) {
      setPwError(
        err instanceof ApiClientError ? err.message : "تغییر رمز ناموفق بود."
      );
    } finally {
      setPwBusy(false);
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

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال بارگذاری…
        </div>
      ) : isError &&
        !(error instanceof ApiClientError && error.statusCode === 404) ? (
        <Card>
          <CardContent className="space-y-3 py-10 text-center">
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
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-4">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border/80 bg-muted shadow-[var(--shadow-xs)]">
                    {preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserRound className="h-9 w-9 text-muted-foreground/70" />
                    )}
                  </div>
                  <button
                    type="button"
                    className="absolute -bottom-0.5 -start-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition hover:bg-accent disabled:opacity-50"
                    disabled={uploadAvatar.isPending}
                    onClick={() => fileRef.current?.click()}
                    aria-label="تغییر تصویر"
                  >
                    {uploadAvatar.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Camera className="h-3.5 w-3.5" />
                    )}
                  </button>
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

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 pt-1">
                  <div className="text-base font-semibold leading-tight tracking-tight">
                    {displayName}
                  </div>

                  {!editingBio ? (
                    <div className="flex items-start gap-1.5">
                      <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm leading-snug text-muted-foreground">
                        {(profile?.display_bio || profile?.description)?.trim() || (
                          <span className="text-muted-foreground/55">
                            متن کوتاه زیر عکس…
                          </span>
                        )}
                      </p>
                      <button
                        type="button"
                        className="shrink-0 rounded-md p-1 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                        onClick={() => {
                          setBioDraft(
                            profile?.display_bio ?? profile?.description ?? ""
                          );
                          setEditingBio(true);
                        }}
                        aria-label="ویرایش متن"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full space-y-2">
                      <textarea
                        value={bioDraft}
                        onChange={(e) =>
                          setBioDraft(e.target.value.slice(0, BIO_MAX))
                        }
                        rows={4}
                        maxLength={BIO_MAX}
                        autoFocus
                        className="min-h-[5.5rem] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {bioDraft.length}/{BIO_MAX}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            disabled={upsert.isPending}
                            onClick={() => {
                              setEditingBio(false);
                              setBioDraft(
                                profile?.display_bio ??
                                  profile?.description ??
                                  ""
                              );
                            }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 gap-1 px-2.5"
                            disabled={upsert.isPending}
                            onClick={() => void saveBio()}
                          >
                            {upsert.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            ذخیره
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">اطلاعات هویتی</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                <FieldLine label="نام" value={user?.first_name ?? ""} />
                <FieldLine label="نام خانوادگی" value={user?.last_name ?? ""} />
                <FieldLine
                  label="کد ملی"
                  value={profile?.national_id ?? ""}
                  dir="ltr"
                />
                <FieldLine
                  label="تاریخ تولد"
                  value={toJalaliDisplay(profile?.birth_date)}
                  dir="ltr"
                />
                <FieldLine
                  label="جنسیت"
                  value={
                    profile?.gender
                      ? GENDER_LABELS[profile.gender] ?? "—"
                      : "—"
                  }
                />
                <FieldLine
                  label="موبایل"
                  value={user?.mobile ?? ""}
                  dir="ltr"
                />
                <div className="sm:col-span-2 lg:col-span-2">
                  <FieldLine
                    label="ایمیل"
                    value={user?.email ?? ""}
                    dir="ltr"
                  />
                </div>
                {profile?.address ? (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <FieldLine label="آدرس" value={profile.address} />
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-12">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4" />
                تغییر رمز عبور
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => void onChangePassword(e)}
                className="grid max-w-xl gap-3 sm:grid-cols-2"
              >
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs">رمز فعلی</Label>
                  <Input
                    type="password"
                    dir="ltr"
                    className="h-9"
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setPwError(null);
                    }}
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">رمز جدید</Label>
                  <Input
                    type="password"
                    dir="ltr"
                    className="h-9"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setPwError(null);
                    }}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">تکرار رمز جدید</Label>
                  <Input
                    type="password"
                    dir="ltr"
                    className="h-9"
                    value={newPassword2}
                    onChange={(e) => {
                      setNewPassword2(e.target.value);
                      setPwError(null);
                    }}
                    autoComplete="new-password"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground sm:col-span-2">
                  {PASSWORD_HINT}
                </p>
                {pwError ? (
                  <p className="text-xs text-destructive sm:col-span-2" role="alert">
                    {pwError}
                  </p>
                ) : null}
                <div className="sm:col-span-2">
                  <Button type="submit" size="sm" disabled={pwBusy}>
                    {pwBusy ? (
                      <>
                        <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                        در حال ذخیره…
                      </>
                    ) : (
                      "ذخیره رمز جدید"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

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
