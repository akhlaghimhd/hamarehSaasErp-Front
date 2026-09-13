"use client";

import { useEffect, useState } from "react";
import {
  GuidePageHeader,
  GuideRulesBox,
  GuideSection,
} from "@/shared/components/ui-guide/guide-shell";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Heart,
  Info,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";

const meta = {
  code: "UI-06",
  title: "Feedback, Status & Loading",
  description:
    "Alert، Toast، Status Chip، Progress، Loading Overlay، مدل‌های انتظار آرام و بازخورد همدلانه.",
  phase: "فاز ۲",
  status: "ready" as const,
};

function toFa(value: string | number): string {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

type ToastItem = {
  id: number;
  variant: "success" | "warning" | "destructive" | "info";
  title: string;
  description?: string;
};

const toastIcon = {
  success: CheckCircle2,
  warning: AlertTriangle,
  destructive: AlertCircle,
  info: Info,
} as const;

const toastClass = {
  success:
    "border-emerald-500/40 bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  warning:
    "border-amber-500/40 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  destructive:
    "border-destructive/40 bg-destructive/10 text-destructive",
  info: "border-primary/30 bg-primary/5 text-foreground",
} as const;

/** سه نقطهٔ تنفسی — انتظار آرام */
function BreathingDots({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-primary/70"
          style={{
            animation: "ui06-breathe 1.4s ease-in-out infinite",
            animationDelay: `${i * 0.18}s`,
          }}
        />
      ))}
    </span>
  );
}

/** حلقهٔ نرم با پالس */
function SoftRingLoader({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-14 w-14" : "h-11 w-11";
  return (
    <span className={cn("relative inline-flex items-center justify-center", s)}>
      <span className="absolute inset-0 rounded-full border-2 border-primary/15" />
      <span
        className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary/80"
        style={{ animation: "ui06-spin 0.9s linear infinite" }}
      />
      <span
        className="absolute inset-1 rounded-full bg-primary/10"
        style={{ animation: "ui06-breathe 2s ease-in-out infinite" }}
      />
    </span>
  );
}

export default function FeedbackGuidePage() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [progress, setProgress] = useState(35);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayCalm, setOverlayCalm] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [rowSaving, setRowSaving] = useState<string | null>(null);
  const [calmProgress, setCalmProgress] = useState(0);
  const [showSuccessPulse, setShowSuccessPulse] = useState(false);

  useEffect(() => {
    if (!overlayOpen && !overlayCalm) return;
    const t = setTimeout(() => {
      setOverlayOpen(false);
      setOverlayCalm(false);
    }, 2400);
    return () => clearTimeout(t);
  }, [overlayOpen, overlayCalm]);

  useEffect(() => {
    if (!sectionLoading) return;
    const t = setTimeout(() => setSectionLoading(false), 2500);
    return () => clearTimeout(t);
  }, [sectionLoading]);

  useEffect(() => {
    if (calmProgress <= 0 || calmProgress >= 100) return;
    const t = setTimeout(() => setCalmProgress((p) => Math.min(100, p + 8)), 280);
    return () => clearTimeout(t);
  }, [calmProgress]);

  function pushToast(item: Omit<ToastItem, "id">) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...item, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }

  function dismissToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function simulateSave() {
    setBtnLoading(true);
    setTimeout(() => {
      setBtnLoading(false);
      setShowSuccessPulse(true);
      setTimeout(() => setShowSuccessPulse(false), 1200);
      pushToast({
        variant: "success",
        title: "ذخیره شد",
        description: "تغییرات بدون رفرش صفحه اعمال شد.",
      });
    }, 1400);
  }

  function simulateRowSave(id: string) {
    setRowSaving(id);
    setTimeout(() => {
      setRowSaving(null);
      pushToast({
        variant: "success",
        title: "ردیف به‌روز شد",
        description: "فقط همین بخش در حال به‌روزرسانی بود.",
      });
    }, 1600);
  }

  return (
    <div className="space-y-6" dir="rtl">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes ui06-breathe {
          0%, 100% { opacity: 0.35; transform: scale(0.85); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes ui06-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes ui06-shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        @keyframes ui06-rise {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes ui06-soft-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
          50% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0.12); }
        }
        @keyframes ui06-wave {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .ui06-shimmer {
          background: linear-gradient(
            90deg,
            hsl(var(--muted)) 0%,
            hsl(var(--muted-foreground) / 0.08) 50%,
            hsl(var(--muted)) 100%
          );
          background-size: 200% 100%;
          animation: ui06-shimmer 1.6s ease-in-out infinite;
        }
      `,
        }}
      />

      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین بازخورد و وضعیت">
        <ul className="list-disc space-y-1 pr-5">
          <li>
            خطای فیلد فقط زیر همان فیلد (UI-04) · Toast جایگزین پیام فیلد نیست.
          </li>
          <li>
            Toast برای نتیجهٔ عملیات کوتاه (موفق / هشدار / خطا) · خودکار محو می‌شود.
          </li>
          <li>
            Alert برای پیام ماندگار داخل صفحه (هشدار قبل از ثبت حساس، توضیح وضعیت).
          </li>
          <li>
            Loading Overlay فقط برای عملیات مسدودکنندهٔ کل ناحیه · نه برای هر کلیک.
          </li>
          <li>
            Status با Badge/Chip · رنگ از پالت (success / warning / destructive / secondary).
          </li>
          <li>
            انتظار جزئی (بخش/ردیف) با loader داخل همان ناحیه · بقیهٔ صفحه قابل تعامل بماند.
          </li>
          <li>
            پیام خطا/هشدار با لحن آرام و CTA واضح · انیمیشن نرم، نه چشمک‌زن تند.
          </li>
          <li>اعداد dir=ltr + ارقام فارسی · آیکون Lucide کوچک · بدون Duotone در feedback ردیفی.</li>
        </ul>
      </GuideRulesBox>

      <GuideSection
        title="۱) Alert — پیام ماندگار داخل صفحه"
        description="برای هشدار قبل از ثبت حساس، توضیح وضعیت سیستم، یا راهنمای پایدار."
      >
        <div className="space-y-3">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>اطلاع</AlertTitle>
            <AlertDescription>
              دوره مالی جاری باز است. اسناد در همین دوره ثبت می‌شوند.
            </AlertDescription>
          </Alert>
          <Alert variant="success">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>موفق</AlertTitle>
            <AlertDescription>
              اتصال به سرویس حسابداری برقرار است.
            </AlertDescription>
          </Alert>
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>هشدار</AlertTitle>
            <AlertDescription>
              موجودی کالا کمتر از حد حداقل است. قبل از صدور حواله بررسی کنید.
            </AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>خطا</AlertTitle>
            <AlertDescription>
              ثبت سند به دلیل بسته بودن دوره مالی ممکن نیست.
            </AlertDescription>
          </Alert>
        </div>
      </GuideSection>

      <GuideSection
        title="۲) Toast — بازخورد کوتاه عملیات"
        description="نتیجهٔ ذخیره، حذف، یا خطای شبکه. خودکار محو می‌شود؛ قابل بستن دستی."
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              pushToast({
                variant: "success",
                title: "ثبت شد",
                description: "سفارش با موفقیت ذخیره شد.",
              })
            }
          >
            Toast موفق
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              pushToast({
                variant: "warning",
                title: "توجه",
                description: "سقف اعتبار مشتری نزدیک است.",
              })
            }
          >
            Toast هشدار
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              pushToast({
                variant: "destructive",
                title: "خطا",
                description: "ارتباط با سرور برقرار نشد.",
              })
            }
          >
            Toast خطا
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              pushToast({
                variant: "info",
                title: "در صف",
                description: "خروجی اکسل آماده می‌شود.",
              })
            }
          >
            Toast اطلاع
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          در محصول واقعی می‌توان از کتابخانهٔ toast (مثلاً sonner) استفاده کرد؛ الگوی
          بصری و زمان محو همین است.
        </p>
      </GuideSection>

      <GuideSection
        title="۳) Status Chip — وضعیت موجودیت"
        description="وضعیت سند، کالا، کارمند و پرداخت با Badge."
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">فعال</Badge>
          <Badge variant="warning">در انتظار تأیید</Badge>
          <Badge variant="destructive">رد شده</Badge>
          <Badge variant="secondary">پیش‌نویس</Badge>
          <Badge variant="outline">بایگانی</Badge>
          <Badge>پیش‌فرض</Badge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="success" className="gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
            پرداخت‌شده
          </Badge>
          <Badge variant="warning" className="gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
            سررسید نزدیک
          </Badge>
          <Badge variant="destructive" className="gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            سررسید گذشته
          </Badge>
        </div>
      </GuideSection>

      <GuideSection
        title="۴) Progress — پیشرفت عملیات"
        description="آپلود، مهاجرت، یا پردازش دسته‌ای."
      >
        <div className="space-y-4 rounded-xl border border-border/70 bg-card p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span>آپلود فایل پیوست</span>
              <span dir="ltr" className="font-mono tabular-nums">
                {toFa(progress)}%
              </span>
            </div>
            <Progress value={progress} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setProgress((p) => Math.max(0, p - 15))}
            >
              −{toFa(15)}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setProgress((p) => Math.min(100, p + 15))}
            >
              +{toFa(15)}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setProgress(100)}>
              تکمیل
            </Button>
          </div>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">نامعین (indeterminate-style)</div>
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="absolute inset-y-0 w-1/3 animate-pulse rounded-full bg-primary/70" style={{ left: "20%" }} />
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۵) Loading — دکمه، اسکلتون، Overlay"
        description="سه سطح: دکمه در حال کار · اسکلتون محتوا · overlay مسدودکننده."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
            <div className="text-sm font-medium">دکمه در حال بارگذاری</div>
            <Button size="sm" disabled={btnLoading} onClick={simulateSave} className="gap-1.5">
              {btnLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {btnLoading ? "در حال ذخیره…" : "ذخیره سند"}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              بعد از موفقیت، Toast نمایش داده می‌شود · بدون رفرش صفحه.
            </p>
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
            <div className="text-sm font-medium">Skeleton محتوا</div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Button size="sm" variant="outline" onClick={() => setOverlayOpen(true)}>
            نمایش Loading Overlay
          </Button>
          <p className="text-[11px] text-muted-foreground">
            فقط برای عملیات سنگین که کل ناحیه باید قفل شود (مثلاً بستن دوره مالی).
          </p>
        </div>
      </GuideSection>

      <GuideSection
        title="۶) ترکیب در سناریوی واقعی"
        description="ثبت سند: خطای فیلد زیر input · هشدار Alert بالای فرم · Toast بعد از موفقیت."
      >
        <div className="rounded-xl border border-border/70 bg-card p-4 space-y-3">
          <Alert variant="warning">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>قبل از ثبت نهایی</AlertTitle>
            <AlertDescription>
              این سند پس از تأیید قابل ویرایش نیست. از صحت اقلام مطمئن شوید.
            </AlertDescription>
          </Alert>
          <div className="space-y-1">
            <label className="text-xs font-medium">
              مبلغ <span className="text-destructive">*</span>
            </label>
            <div className="rounded-md border border-destructive/60 bg-background px-3 py-2 text-sm" dir="ltr">
              {toFa(0)}
            </div>
            <p className="text-[11px] text-destructive">مبلغ باید بزرگ‌تر از صفر باشد.</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={simulateSave} disabled={btnLoading}>
              {btnLoading ? (
                <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" />
              ) : null}
              ثبت نهایی
            </Button>
            <Button size="sm" variant="outline">
              انصراف
            </Button>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۷) Do / Don’t">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <div className="mb-2 font-medium text-emerald-700 dark:text-emerald-400">
              انجام بده
            </div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>خطای اعتبارسنجی فقط زیر فیلد</li>
              <li>Toast برای نتیجهٔ عملیات کوتاه</li>
              <li>Alert برای پیام ماندگار / هشدار حساس</li>
              <li>Status با Badge از پالت استاندارد</li>
              <li>دکمه loading با Spinner + غیرفعال</li>
              <li>Skeleton به‌جای صفحه خالی در بارگذاری اولیه</li>
              <li>Overlay فقط برای کار مسدودکننده</li>
              <li>انتظار جزئی داخل همان بخش · انیمیشن نرم و لحن آرام</li>
            </ul>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="mb-2 font-medium text-destructive">انجام نده</div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>جایگزین کردن خطای فیلد با Toast</li>
              <li>Overlay برای هر کلیک ذخیره</li>
              <li>رنگ وضعیت خارج از پالت</li>
              <li>پیام مبهم بدون CTA</li>
              <li>رفرش کامل صفحه بعد از موفقیت</li>
              <li>چند Toast همزمان شلوغ بدون صف</li>
              <li>انیمیشن تند/چشمک‌زن روی خطا که اضطراب می‌آورد</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۸) مدل‌های انتظار — صفحه کامل و بخشی"
        description="هر سطح انتظار، loader متناسب خودش را دارد تا کاربر بداند چه چیزی در حال کار است."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-10 text-center">
            <SoftRingLoader size="lg" />
            <div className="text-sm font-medium">در حال آماده‌سازی</div>
            <p className="max-w-[12rem] text-[11px] text-muted-foreground">
              صفحهٔ کامل · تنفس نرم · بدون چرخش خشن
            </p>
            <BreathingDots />
          </div>

          <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-2 text-sm font-medium">بخش جدول</div>
            <div className="space-y-2 opacity-40">
              <div className="h-3 rounded bg-muted" />
              <div className="h-3 w-4/5 rounded bg-muted" />
              <div className="h-3 w-3/5 rounded bg-muted" />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/60 backdrop-blur-[1px]">
              <SoftRingLoader size="sm" />
              <span className="mt-2 text-[11px] text-muted-foreground">بارگذاری این بخش…</span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-10">
            <div className="flex items-end gap-1.5" aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="w-1.5 rounded-full bg-primary/80"
                  style={{
                    height: 12 + (i % 3) * 4,
                    animation: "ui06-wave 0.9s ease-in-out infinite",
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
            <div className="text-sm font-medium">در صف پردازش</div>
            <p className="text-[11px] text-muted-foreground">مناسب گزارش‌های طولانی</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setOverlayCalm(true)}>
            Overlay آرام (صفحه کامل)
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSectionLoading(true)}>
            لودینگ داخل کارت
          </Button>
        </div>

        <div className="relative mt-3 overflow-hidden rounded-xl border border-border/70 bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">کارت عملیاتی</span>
            <Badge variant="secondary" className="text-[10px]">نمونه</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            با دکمهٔ بالا، فقط همین کارت وارد حالت انتظار می‌شود؛ بقیهٔ صفحه آزاد است.
          </p>
          {sectionLoading ? (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/75 backdrop-blur-[2px]"
              style={{ animation: "ui06-rise 0.25s ease-out" }}
            >
              <SoftRingLoader />
              <span className="text-xs text-muted-foreground">در حال همگام‌سازی…</span>
              <BreathingDots />
            </div>
          ) : null}
        </div>
      </GuideSection>

      <GuideSection
        title="۹) انتظار جزئی — ردیف، shimmer، نوار ذخیره"
        description="وقتی فقط یک ردیف یا فیلد در حال ذخیره است."
      >
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
            {["ITM-100 · ورق فولادی", "ITM-101 · پیچ M8", "ITM-102 · رنگ اپوکسی"].map(
              (label, i) => {
                const id = `r${i}`;
                const saving = rowSaving === id;
                return (
                  <div
                    key={id}
                    className={cn(
                      "flex items-center gap-3 border-b border-border/50 px-3 py-2.5 last:border-0",
                      saving && "bg-primary/5"
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm">{label}</span>
                    {saving ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        ذخیره…
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-[11px]"
                        onClick={() => simulateRowSave(id)}
                      >
                        ذخیره ردیف
                      </Button>
                    )}
                  </div>
                );
              }
            )}
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Shimmer جدول (بارگذاری اولیه)
            </div>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex gap-2">
                  <div className="ui06-shimmer h-3 w-12 rounded" />
                  <div className="ui06-shimmer h-3 flex-1 rounded" />
                  <div className="ui06-shimmer h-3 w-16 rounded" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                در حال آماده‌سازی گزارش
              </span>
              <span dir="ltr" className="font-mono tabular-nums text-muted-foreground">
                {toFa(calmProgress)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/80 transition-all duration-300"
                style={{
                  width: `${calmProgress}%`,
                  backgroundImage: "var(--gradient-primary)",
                }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {calmProgress >= 100
                ? "آماده‌ست — می‌توانید ادامه دهید."
                : "لطفاً چند لحظه صبر کنید؛ در حال جمع‌آوری داده هستیم."}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => setCalmProgress(8)}
              disabled={calmProgress > 0 && calmProgress < 100}
            >
              شروع شبیه‌سازی
            </Button>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۱۰) بازخورد همدلانه — کاهش تنش"
        description="خطا و هشدار می‌توانند نرم، روشن و امیدوارکننده باشند؛ نه تهدیدآمیز."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div
            className="rounded-xl border border-destructive/25 bg-destructive/5 p-4"
            style={{ animation: "ui06-rise 0.35s ease-out" }}
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive">
              <AlertCircle className="h-4 w-4" />
              مشکلی پیش آمد — قابل حل است
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              ارتباط لحظه‌ای قطع شد. دادهٔ شما از بین نرفته. دوباره تلاش کنید یا چند ثانیه
              صبر کنید.
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-[11px]">
                تلاش دوباره
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-[11px]">
                پشتیبانی
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-40" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              یک نکته قبل از ادامه
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              موجودی نزدیک حداقل است. می‌توانید همین حالا ثبت کنید؛ فقط مراقب کسری باشید.
            </p>
          </div>

          <div
            className={cn(
              "rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 transition-all",
              showSuccessPulse && "ring-2 ring-emerald-500/20"
            )}
            style={
              showSuccessPulse
                ? { animation: "ui06-soft-glow 1s ease-in-out" }
                : undefined
            }
          >
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
              همه چیز مرتب است
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              سند ذخیره شد. می‌توانید به کار بعدی بروید یا همین‌جا بمانید.
            </p>
            <Button size="sm" className="mt-3 h-7 text-[11px]" onClick={simulateSave}>
              شبیه‌سازی ذخیرهٔ موفق
            </Button>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border/70 bg-card px-4 py-8 text-center">
            <Heart className="h-5 w-5 text-primary/70" style={{ animation: "ui06-breathe 2.2s ease-in-out infinite" }} />
            <div className="text-sm font-medium">در حال گوش دادن به سرور…</div>
            <p className="max-w-[14rem] text-[11px] text-muted-foreground">
              گاهی شبکه کمی دیر جواب می‌دهد. شما کاری لازم نیست انجام دهید.
            </p>
            <BreathingDots className="mt-1" />
          </div>
        </div>
      </GuideSection>

      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/data-display">UI-05 Data Display</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/forms">UI-04 Forms</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide">فهرست راهنما</a>
        </Button>
      </div>

      <div className="pointer-events-none fixed bottom-4 left-4 z-50 flex w-[min(100%-2rem,22rem)] flex-col gap-2">
        {toasts.map((t) => {
          const Icon = toastIcon[t.variant];
          return (
            <div
              key={t.id}
              className={cn(
                "pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2.5 shadow-lg",
                toastClass[t.variant]
              )}
              role="status"
              style={{ animation: "ui06-rise 0.25s ease-out" }}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{t.title}</div>
                {t.description ? (
                  <div className="text-xs opacity-90">{t.description}</div>
                ) : null}
              </div>
              <button
                type="button"
                className="rounded p-0.5 opacity-70 hover:opacity-100"
                onClick={() => dismissToast(t.id)}
                aria-label="بستن"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      {overlayOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-8 py-6 shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-sm font-medium">در حال پردازش…</div>
            <p className="text-xs text-muted-foreground">لطفاً صبر کنید</p>
          </div>
        </div>
      ) : null}

      {overlayCalm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div
            className="flex flex-col items-center gap-4 rounded-2xl border border-border/80 bg-card px-10 py-8 shadow-xl"
            style={{ animation: "ui06-rise 0.3s ease-out" }}
          >
            <SoftRingLoader size="lg" />
            <div className="text-center">
              <div className="text-sm font-medium">کمی صبر کنید</div>
              <p className="mt-1 max-w-[14rem] text-xs text-muted-foreground">
                در حال انجام کار مهم هستیم. صفحه به‌زودی برمی‌گردد.
              </p>
            </div>
            <BreathingDots />
          </div>
        </div>
      ) : null}
    </div>
  );
}
