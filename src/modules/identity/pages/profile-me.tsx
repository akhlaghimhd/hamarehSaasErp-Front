/**
 * Profile me — compact card UI (design tokens), auth-streamed avatar,
 * inline bio edit, identity as dense definition list. Mobile change deferred.
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
} from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Card,
  CardContent,
} from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
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
  BIO_MAX,
  GENDER_LABELS,
  toJalaliDisplay,
} from "../validations/profile-schema";
import { cn } from "@/shared/lib/utils";

const MAX_AVATAR_BYTES = 512 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

function FieldRow({
  label,
  value,
  dir,
  className,
}: {
  label: string;
  value: string;
  dir?: "ltr" | "rtl";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 border-b border-border/50 py-2.5 last:border-0",
        className
      )}
    >
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-end text-sm font-medium" dir={dir}>
        {value || "—"}
      </dd>
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
      // refresh blob from server shortly after
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

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader
        title="پروفایل من"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "پروفایل من" },
        ]}
      />

      <Card className="overflow-hidden">
        {/* Hero strip */}
        <div className="border-b border-border/60 bg-gradient-to-l from-primary/[0.06] via-transparent to-transparent px-5 py-5">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-2 border-background shadow-[var(--shadow-sm)] ring-1 ring-border/80 bg-muted">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserRound className="h-8 w-8 text-muted-foreground/70" />
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

            <div className="min-w-0 flex-1 space-y-1.5">
              <h2 className="truncate text-base font-semibold tracking-tight">
                {displayName}
              </h2>

              {/* Inline bio */}
              {!editingBio ? (
                <div className="group flex items-start gap-1.5">
                  <p className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">
                    {(profile?.display_bio || profile?.description)?.trim() || (
                      <span className="text-muted-foreground/60">
                        متن کوتاه زیر عکس…
                      </span>
                    )}
                  </p>
                  <button
                    type="button"
                    className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground opacity-70 transition hover:bg-accent hover:text-foreground hover:opacity-100"
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
                <div className="space-y-2">
                  <textarea
                    value={bioDraft}
                    onChange={(e) =>
                      setBioDraft(e.target.value.slice(0, BIO_MAX))
                    }
                    rows={2}
                    maxLength={BIO_MAX}
                    autoFocus
                    className="w-full resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                            profile?.display_bio ?? profile?.description ?? ""
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
        </div>

        <CardContent className="px-5 py-1">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
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
            <dl>
              <FieldRow label="نام" value={user?.first_name ?? ""} />
              <FieldRow label="نام خانوادگی" value={user?.last_name ?? ""} />
              <FieldRow
                label="کد ملی"
                value={profile?.national_id ?? ""}
                dir="ltr"
              />
              <FieldRow
                label="تاریخ تولد"
                value={toJalaliDisplay(profile?.birth_date)}
                dir="ltr"
              />
              <FieldRow
                label="جنسیت"
                value={
                  profile?.gender ? GENDER_LABELS[profile.gender] ?? "—" : "—"
                }
              />
              <FieldRow
                label="موبایل"
                value={user?.mobile ?? ""}
                dir="ltr"
              />
              <FieldRow label="ایمیل" value={user?.email ?? ""} dir="ltr" />
              {profile?.address ? (
                <FieldRow label="آدرس" value={profile.address} />
              ) : null}
            </dl>
          )}
        </CardContent>
      </Card>

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
