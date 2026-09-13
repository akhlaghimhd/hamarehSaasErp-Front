"use client";

import { useEffect, useRef, useState } from "react";
import {
  GuidePageHeader,
  GuideRulesBox,
  GuideSection,
} from "@/shared/components/ui-guide/guide-shell";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  Accessibility,
  MousePointer2,
  Pause,
  Volume2,
} from "lucide-react";

const meta = {
  code: "UI-11",
  title: "Accessibility, Motion & Rules",
  description:
    "Focus، Keyboard، Reduced Motion، کنتراست، و قوانین Do / Don’t سراسری UI Guide.",
  phase: "فاز ۴",
  status: "ready" as const,
};

export default function AccessibilityGuidePage() {
  const [motion, setMotion] = useState<"system" | "reduce" | "full">("system");
  const [announce, setAnnounce] = useState("");
  const [focusDemo, setFocusDemo] = useState(0);
  const liveRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!announce) return;
    const t = window.setTimeout(() => setAnnounce(""), 3000);
    return () => window.clearTimeout(t);
  }, [announce]);

  const reduceMotion =
    motion === "reduce" ||
    (motion === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  return (
    <div className="space-y-6" dir="rtl">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین دسترسی و حرکت (قفل‌شده)">
        <ul className="list-disc space-y-1 pr-5">
          <li>
            همه کنترل‌های تعاملی با صفحه‌کلید قابل‌دسترسی‌اند · ترتیب Tab منطقی.
          </li>
          <li>
            <code className="rounded bg-muted px-1">:focus-visible</code> حلقه
            واضح · نه حذف outline بدون جایگزین.
          </li>
          <li>
            <code className="rounded bg-muted px-1">prefers-reduced-motion</code>
            : انیمیشن تزئینی خاموش · انتقال وضعیت کوتاه یا آنی.
          </li>
          <li>پیام وضعیت مهم با aria-live برای screen reader.</li>
          <li>خطای فرم زیر فیلد + ارتباط با aria-describedby (UI-04).</li>
          <li>کنتراست متن/پس‌زمینه از توکن‌های Design System · نه رنگ تصادفی.</li>
        </ul>
      </GuideRulesBox>

      <GuideSection
        title="۱) Focus Visible"
        description="حلقه فوکوس فقط با صفحه‌کلید دیده شود"
      >
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <p className="mb-3 text-xs text-muted-foreground">
            با Tab بین دکمه‌ها جابه‌جا شوید. با موس کلیک کنید — حلقه نباید دائمی
            بماند (رفتار focus-visible).
          </p>
          <div className="flex flex-wrap gap-2">
            {["ذخیره", "انصراف", "پیش‌نویس", "چاپ"].map((label, i) => (
              <button
                key={label}
                type="button"
                onFocus={() => setFocusDemo(i)}
                className={cn(
                  "rounded-md border border-border bg-background px-3 py-1.5 text-sm transition",
                  "hover:bg-muted/50",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            آخرین فوکوس صفحه‌کلید:{" "}
            <span className="text-foreground">
              {["ذخیره", "انصراف", "پیش‌نویس", "چاپ"][focusDemo]}
            </span>
          </p>
        </div>
      </GuideSection>

      <GuideSection
        title="۲) صفحه‌کلید — میانبرهای حداقلی"
        description="بدون تداخل با مرورگر"
      >
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="px-3 py-2 text-right">کلید</th>
                <th className="px-3 py-2 text-right">رفتار در ERP</th>
                <th className="px-3 py-2 text-right">یادداشت</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Tab / Shift+Tab", "حرکت بین کنترل‌ها", "ترتیب DOM = ترتیب منطقی"],
                ["Enter", "فعال‌سازی دکمه / ارسال فرم", "در textarea خط جدید"],
                ["Space", "تیک چک‌باکس / باز کردن منو", "—"],
                ["Escape", "بستن Overlay (اگر dirty نباشد)", "UI-02 / UI-07"],
                ["Arrow", "جابه‌جایی در Tabs / Menu / Listbox", "نه در فیلد متن آزاد"],
              ].map((row) => (
                <tr key={row[0]} className="border-b last:border-0">
                  <td className="px-3 py-2 font-mono text-[11px]">{row[0]}</td>
                  <td className="px-3 py-2">{row[1]}</td>
                  <td className="px-3 py-2 text-muted-foreground">{row[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GuideSection>

      <GuideSection
        title="۳) Reduced Motion"
        description="احترام به تنظیم سیستم کاربر"
      >
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {(
              [
                ["system", "سیستم"],
                ["full", "انیمیشن کامل"],
                ["reduce", "کاهش حرکت"],
              ] as const
            ).map(([k, label]) => (
              <Button
                key={k}
                size="sm"
                variant={motion === k ? "default" : "outline"}
                className="h-8 text-[11px]"
                onClick={() => setMotion(k)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium">
                <MousePointer2 className="h-3.5 w-3.5 text-primary" />
                انتقال کارت
              </div>
              <div
                className={cn(
                  "h-16 rounded-md bg-primary/15",
                  !reduceMotion &&
                    "transition-transform duration-500 hover:translate-x-2"
                )}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {reduceMotion
                  ? "حرکت افقی غیرفعال است"
                  : "با hover کمی جابه‌جا می‌شود"}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs font-medium">
                <Pause className="h-3.5 w-3.5 text-primary" />
                اسکلت بارگذاری
              </div>
              <div
                className={cn(
                  "h-3 w-2/3 rounded bg-muted",
                  !reduceMotion && "animate-pulse"
                )}
              />
              <div
                className={cn(
                  "mt-2 h-3 w-1/2 rounded bg-muted",
                  !reduceMotion && "animate-pulse"
                )}
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                {reduceMotion
                  ? "pulse خاموش · اسکلت ثابت"
                  : "pulse فعال (پیش‌فرض)"}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            در CSS سراسری:{" "}
            <code className="rounded bg-muted px-1">
              @media (prefers-reduced-motion: reduce)
            </code>{" "}
            انیمیشن‌های تزئینی را کوتاه یا حذف کنید.
          </p>
        </div>
      </GuideSection>

      <GuideSection
        title="۴) Live Region — اعلام وضعیت"
        description="screen reader بدون ربودن فوکوس"
      >
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="h-8 text-[11px]"
              onClick={() => setAnnounce("پیش‌نویس با موفقیت ذخیره شد.")}
            >
              شبیه‌سازی ذخیره موفق
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[11px]"
              onClick={() => setAnnounce("خطا: تأمین‌کننده الزامی است.")}
            >
              شبیه‌سازی خطا
            </Button>
          </div>
          <div
            ref={liveRef}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="mt-3 min-h-[2rem] rounded-md border border-dashed border-border/60 bg-muted/20 px-3 py-2 text-xs"
          >
            {announce ? (
              <span className="inline-flex items-center gap-1.5">
                <Volume2 className="h-3.5 w-3.5 text-primary" />
                {announce}
              </span>
            ) : (
              <span className="text-muted-foreground">
                پیام aria-live اینجا ظاهر می‌شود
              </span>
            )}
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۵) برچسب و نام دسترس‌پذیر"
        description="آیکون‌alone ممنوع بدون نام"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
            <div className="mb-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              درست
            </div>
            <button
              type="button"
              aria-label="بستن پنل"
              className="rounded-md border border-border bg-card p-2 focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span aria-hidden>×</span>
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              <code className="rounded bg-muted px-1">aria-label="بستن پنل"</code>
            </p>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <div className="mb-2 text-xs font-medium text-destructive">نادرست</div>
            <button
              type="button"
              className="rounded-md border border-border bg-card p-2 opacity-60"
              tabIndex={-1}
              title="بدون نام دسترس‌پذیر"
            >
              ×
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              فقط علامت × بدون label — برای screen reader بی‌معناست.
            </p>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۶) کنتراست و وضعیت"
        description="وضعیت فقط با رنگ منتقل نشود"
      >
        <div className="flex flex-wrap gap-3 rounded-xl border border-border/70 bg-card p-4">
          {[
            { label: "تأیید شده", variant: "success" as const, extra: "✓" },
            { label: "در انتظار", variant: "warning" as const, extra: "…" },
            { label: "رد شده", variant: "destructive" as const, extra: "!" },
            { label: "پیش‌نویس", variant: "secondary" as const, extra: "○" },
          ].map((s) => (
            <Badge key={s.label} variant={s.variant} className="gap-1 text-[11px]">
              <span aria-hidden>{s.extra}</span>
              {s.label}
            </Badge>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          رنگ + متن (و در صورت نیاز آیکون) · نه فقط نقطه رنگی.
        </p>
      </GuideSection>

      <GuideSection
        title="۷) چک‌لیست انتشار صفحه"
        description="قبل از ready کردن هر صفحه UI"
      >
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <ul className="space-y-2 text-xs">
            {[
              "ترتیب Tab از راست‌به‌چپ منطقی است و تله فوکوس در Modal درست کار می‌کند",
              "همه دکمه‌های آیکونی aria-label دارند",
              "خطای فرم به فیلد وصل است و با صفحه‌کلید قابل‌دیدن است",
              "انیمیشن‌ها تحت prefers-reduced-motion بی‌ضررند",
              "پیام موفقیت/خطای مهم در live region یا فوکوس مدیریت‌شده اعلام می‌شود",
              "کنتراست Badge و متن muted در تم روشن و تیره قابل‌قبول است",
            ].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border text-[10px]">
                  <Accessibility className="h-2.5 w-2.5 text-muted-foreground" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </GuideSection>

      <GuideSection title="۸) Do / Don’t سراسری">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <div className="mb-2 font-medium text-emerald-700 dark:text-emerald-400">
              انجام بده
            </div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>focus-visible روی همه کنترل‌ها</li>
              <li>نام دسترس‌پذیر برای آیکون‌alone</li>
              <li>وضعیت با متن + رنگ</li>
              <li>احترام به reduced-motion</li>
              <li>aria-live برای بازخورد بدون جابه‌جایی فوکوس</li>
            </ul>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="mb-2 font-medium text-destructive">انجام نده</div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>outline: none بدون جایگزین</li>
              <li>تله فوکوس شکسته در Modal dirty</li>
              <li>انیمیشن بی‌پایان بدون کنترل</li>
              <li>انتقال معنی فقط با رنگ</li>
              <li>کلیک‌only برای اقدام حیاتی</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/composition">UI-10 Composition</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide">فهرست راهنما</a>
        </Button>
      </div>
    </div>
  );
}
