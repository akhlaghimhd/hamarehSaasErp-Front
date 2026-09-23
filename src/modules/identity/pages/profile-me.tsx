/**
 * Profile me — full shell width, avatar+bio aligned, identity as «label: value».
 * Roles/scopes from security context. Change-password behind button + secure dialog.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  UserRound,
  Loader2,
  Camera,
  Pencil,
  Check,
  X,
  KeyRound,
  Shield,
  MapPin,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
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
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const securityContext = useAuthStore((s) => s.securityContext);
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

  const [pwOpen, setPwOpen] = useState(false);
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

  const resetPwForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setNewPassword2("");
    setPwError(null);
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
      resetPwForm();
      setPwOpen(false);
      toast.success("رمز عبور تغییر کرد. لطفاً دوباره وارد شوید.");
      await authService.logout();
      router.replace("/login");
    } catch (err) {
      setPwError(
        err instanceof ApiClientError ? err.message : "تغییر رمز ناموفق بود."
      );
    } finally {
      setPwBusy(false);
    }
  };

  const roles = securityContext?.roles ?? [];
  const scopes = securityContext?.scopes ?? [];
  const isOwner = securityContext?.is_owner === true;

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
                  {isOwner ? (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-200">
                      <Shield className="h-3 w-3" />
                      مدیر اصلی
                    </span>
                  ) : null}

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

          <Card className="lg:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-4 w-4" />
                نقش‌های سازمانی
              </CardTitle>
            </CardHeader>
            <CardContent>
              {roles.length === 0 ? (
                <p className="text-sm text-muted-foreground">نقشی تخصیص داده نشده است.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {roles.map((r) => (
                    <li
                      key={r.role_id}
                      className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium"
                    >
                      {r.name || r.code}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-6">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4" />
                محدوده‌های دسترسی
              </CardTitle>
            </CardHeader>
            <CardContent>
              {scopes.length === 0 ? (
                <p className="text-sm text-muted-foreground">محدوده‌ای تخصیص داده نشده است.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {scopes.map((s) => (
                    <li
                      key={s.scope_id}
                      className="rounded-full border border-border/70 bg-muted/40 px-3 py-1 text-xs font-medium"
                      title={s.scope_type}
                    >
                      {s.scope_name}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-12">
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4" />
                امنیت حساب
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => {
                  resetPwForm();
                  setPwOpen(true);
                }}
              >
                <KeyRound className="h-3.5 w-3.5" />
                تغییر رمز عبور
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                پس از تغییر رمز عبور، به‌دلیل امنیت، نشست فعلی بسته می‌شود و باید دوباره وارد شوید.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog
        open={pwOpen}
        onOpenChange={(o) => {
          if (pwBusy) return;
          setPwOpen(o);
          if (!o) resetPwForm();
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => {
            if (pwBusy) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>تغییر رمز عبور</DialogTitle>
            <DialogDescription>
              رمز فعلی و رمز جدید را وارد کنید. پس از موفقیت باید دوباره وارد شوید.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void onChangePassword(e)} className="space-y-3">
            <div className="space-y-1.5">
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
                disabled={pwBusy}
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
                disabled={pwBusy}
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
                disabled={pwBusy}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">{PASSWORD_HINT}</p>
            {pwError ? (
              <p className="text-xs text-destructive" role="alert">
                {pwError}
              </p>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pwBusy}
                onClick={() => {
                  setPwOpen(false);
                  resetPwForm();
                }}
              >
                انصراف
              </Button>
              <Button type="submit" size="sm" disabled={pwBusy}>
                {pwBusy ? (
                  <>
                    <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                    در حال ذخیره…
                  </>
                ) : (
                  "ذخیره و خروج"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
