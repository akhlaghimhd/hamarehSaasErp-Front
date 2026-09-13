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
  Info,
  Loader2,
  X,
} from "lucide-react";

const meta = {
  code: "UI-06",
  title: "Feedback, Status & Loading",
  description:
    "Alert، Toast، Status Chip، Progress، Loading Overlay و قوانین بازخورد به کاربر.",
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

export default function FeedbackGuidePage() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [progress, setProgress] = useState(35);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [btnLoading, setBtnLoading] = useState(false);

  useEffect(() => {
    if (!overlayOpen) return;
    const t = setTimeout(() => setOverlayOpen(false), 2200);
    return () => clearTimeout(t);
  }, [overlayOpen]);

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
      pushToast({
        variant: "success",
        title: "ذخیره شد",
        description: "تغییرات بدون رفرش صفحه اعمال شد.",
      });
    }, 1400);
  }

  return (
    <div className="space-y-6" dir="rtl">
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
            </ul>
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

      {/* Toast viewport */}
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

      {/* Loading overlay demo */}
      {overlayOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-8 py-6 shadow-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-sm font-medium">در حال پردازش…</div>
            <p className="text-xs text-muted-foreground">لطفاً صبر کنید</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
