"use client";

import {
  GuidePageHeader,
  GuideRulesBox,
  GuideSection,
} from "@/shared/components/ui-guide/guide-shell";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { cn } from "@/shared/lib/utils";
import {
  Check,
  ChevronLeft,
  Home,
  Package,
  Search,
  Settings,
  User,
} from "lucide-react";

const meta = {
  code: "UI-01",
  title: "Foundations",
  description:
    "پایه‌های غیرقابل مذاکره سیستم طراحی: تایپوگرافی، فاصله‌گذاری، شعاع، Elevation، آیکون و مقیاس‌های پایه. همه کامپوننت‌ها باید از این توکن‌ها پیروی کنند.",
  phase: "فاز ۱",
  status: "ready" as const,
};

const typeScale = [
  {
    token: "Display",
    className: "text-3xl font-semibold tracking-tight",
    size: "30px / 1.25",
    usage: "عنوان‌های خیلی بزرگ داشبورد (به‌ندرت)",
    sample: "داشبورد مدیریت",
  },
  {
    token: "H1 / Page Title",
    className: "text-2xl font-semibold tracking-tight",
    size: "24px / 1.3",
    usage: "عنوان اصلی صفحه",
    sample: "فهرست کالاها",
  },
  {
    token: "H2 / Section",
    className: "text-lg font-semibold",
    size: "18px / 1.4",
    usage: "عنوان بخش داخل صفحه",
    sample: "اطلاعات پایه",
  },
  {
    token: "H3 / Card Title",
    className: "text-base font-semibold",
    size: "16px / 1.4",
    usage: "عنوان کارت و مودال",
    sample: "خلاصه موجودی",
  },
  {
    token: "Body",
    className: "text-sm font-normal",
    size: "14px / 1.6",
    usage: "متن اصلی رابط کاربری",
    sample: "این متن بدنه استاندارد سیستم است و برای خوانایی طولانی مناسب است.",
  },
  {
    token: "Body Strong",
    className: "text-sm font-medium",
    size: "14px / 1.6",
    usage: "برچسب‌های مهم و مقادیر کلیدی",
    sample: "کد کالا: ITM-00125",
  },
  {
    token: "Caption / Helper",
    className: "text-xs text-muted-foreground",
    size: "12px / 1.5",
    usage: "راهنما، متا، زیرنویس",
    sample: "آخرین به‌روزرسانی ۵ دقیقه پیش",
  },
  {
    token: "Overline / Badge",
    className: "text-[11px] font-semibold uppercase tracking-wide",
    size: "11px / 1.4",
    usage: "برچسب کوچک و کدهای فنی",
    sample: "UI-01 · FOUNDATIONS",
  },
];

const spacingScale = [
  { token: "0.5", px: "2px", className: "w-0.5", usage: "فاصله بسیار ریز داخل آیکون" },
  { token: "1", px: "4px", className: "w-1", usage: "فاصله فشرده بین عناصر مرتبط" },
  { token: "1.5", px: "6px", className: "w-1.5", usage: "گپ آیکون و متن در دکمه کوچک" },
  { token: "2", px: "8px", className: "w-2", usage: "واحد پایه ۸ نقطه‌ای" },
  { token: "3", px: "12px", className: "w-3", usage: "گپ استاندارد کنترل‌ها" },
  { token: "4", px: "16px", className: "w-4", usage: "پدینگ داخلی کارت (Comfortable)" },
  { token: "5", px: "20px", className: "w-5", usage: "فاصله بین بخش‌های نزدیک" },
  { token: "6", px: "24px", className: "w-6", usage: "فاصله بین Sectionها" },
  { token: "8", px: "32px", className: "w-8", usage: "جداکننده بلوک‌های بزرگ" },
  { token: "10", px: "40px", className: "w-10", usage: "حاشیه صفحه در دسکتاپ" },
];

const radiusScale = [
  { token: "sm", className: "rounded-sm", value: "calc(var(--radius) - 4px) ≈ 6px", usage: "Badge، Chip کوچک" },
  { token: "md", className: "rounded-md", value: "calc(var(--radius) - 2px) ≈ 8px", usage: "Input، دکمه کوچک" },
  { token: "lg", className: "rounded-lg", value: "var(--radius) ≈ 10px", usage: "دکمه، منو، کنترل استاندارد" },
  { token: "xl", className: "rounded-xl", value: "≈ 12px", usage: "Card، Panel، Modal" },
  { token: "2xl", className: "rounded-2xl", value: "≈ 16px", usage: "سطح پیش‌نمایش بزرگ، Hero" },
  { token: "full", className: "rounded-full", value: "9999px", usage: "Avatar، Dot، Pill" },
];

const elevationScale = [
  {
    token: "xs",
    css: "var(--shadow-xs)",
    usage: "جداسازی خیلی ملایم ردیف/کنترل",
  },
  {
    token: "sm",
    css: "var(--shadow-sm)",
    usage: "کارت پیش‌فرض و سطح‌های سطح ۲",
  },
  {
    token: "md",
    css: "var(--shadow-md)",
    usage: "Hover کارت، Dropdown، Popover",
  },
  {
    token: "lg",
    css: "var(--shadow-lg)",
    usage: "Modal، Drawer، لایه‌های بالا",
  },
  {
    token: "primary",
    css: "var(--shadow-primary)",
    usage: "دکمه Primary و Brand Mark",
  },
];

const iconSizes = [
  { token: "xs", className: "h-3 w-3", px: "12px", usage: "داخل Badge و متا" },
  { token: "sm", className: "h-3.5 w-3.5", px: "14px", usage: "دکمه sm و لینک کمکی" },
  { token: "md", className: "h-4 w-4", px: "16px", usage: "استاندارد منو، دکمه، جدول" },
  { token: "lg", className: "h-5 w-5", px: "20px", usage: "Header actions، Empty State" },
  { token: "xl", className: "h-6 w-6", px: "24px", usage: "آیکون بزرگ صفحه خالی" },
];

const densityCompare = [
  {
    name: "Comfortable (پیش‌فرض)",
    row: "h-10",
    pad: "p-4",
    text: "text-sm",
    note: "کار روزمره ERP — خوانایی بالا",
  },
  {
    name: "Compact",
    row: "h-8",
    pad: "p-3",
    text: "text-xs",
    note: "جداول پرتراکم و صفحات عملیاتی حرفه‌ای",
  },
];

export default function FoundationsGuidePage() {
  return (
    <div className="space-y-6">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox>
        <ul className="list-disc space-y-1 pr-5">
          <li>
            فونت رسمی: <strong className="text-foreground">Vazirmatn</strong> با وزن‌های
            300–700. زبان و جهت: فارسی + RTL.
          </li>
          <li>
            مقیاس فاصله بر اساس <strong className="text-foreground">۸ نقطه</strong> است.
            فاصله‌های دلخواه خارج از مقیاس ممنوع است مگر با تصمیم معماری.
          </li>
          <li>
            شعاع پایه از <code className="rounded bg-muted px-1">--radius</code> می‌آید
            (فعلی ≈ 0.65rem). همه گوشه‌ها باید از همین خانواده باشند.
          </li>
          <li>
            سایه فقط از توکن‌های <code className="rounded bg-muted px-1">--shadow-*</code> در
            globals.css. سایه هگز ثابت داخل کامپوننت ممنوع است.
          </li>
          <li>
            آیکون‌ها از <strong className="text-foreground">lucide-react</strong> با ضخامت
            پیش‌فرض. اندازه استاندارد رابط: 16px (h-4 w-4).
          </li>
          <li>
            دو حالت تراکم مجاز است: Comfortable (پیش‌فرض) و Compact. تغییر تراکم نباید
            ساختار منطقی صفحه را عوض کند.
          </li>
        </ul>
      </GuideRulesBox>

      <GuideSection
        title="۱) تایپوگرافی"
        description="مقیاس متن قفل‌شده برای کل محصول. از کلاس‌های Tailwind زیر استفاده کن؛ سایز پیکسلی آزاد ننویس."
      >
        <div className="overflow-hidden rounded-xl border border-border/70">
          <div className="grid grid-cols-[140px_1fr_120px] gap-0 border-b border-border/70 bg-muted/40 px-3 py-2 text-[11px] font-medium text-muted-foreground">
            <span>توکن</span>
            <span>نمونه</span>
            <span>اندازه</span>
          </div>
          {typeScale.map((row) => (
            <div
              key={row.token}
              className="grid grid-cols-[140px_1fr_120px] items-center gap-2 border-b border-border/50 px-3 py-3 last:border-b-0"
            >
              <div>
                <div className="text-xs font-medium">{row.token}</div>
                <div className="text-[11px] text-muted-foreground">{row.usage}</div>
              </div>
              <div className={cn(row.className)}>{row.sample}</div>
              <div className="font-mono text-[11px] text-muted-foreground">{row.size}</div>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection
        title="۲) فاصله‌گذاری (Spacing)"
        description="واحد پایه ۸px. مقادیر زیر برای پدینگ، گپ و حاشیه اجباری‌اند."
      >
        <div className="space-y-2">
          {spacingScale.map((item) => (
            <div
              key={item.token}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2"
            >
              <div className="w-16 font-mono text-xs">space-{item.token}</div>
              <div className="h-3 rounded-sm bg-primary/80" style={{ width: item.px }} />
              <Badge variant="outline" className="font-mono text-[10px]">
                {item.px}
              </Badge>
              <span className="text-xs text-muted-foreground">{item.usage}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 rounded-lg border border-dashed border-border/80 bg-muted/20 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">قانون چیدمان صفحه:</strong> پدینگ main در
          دسکتاپ <code className="rounded bg-muted px-1">p-4</code> (۱۶px) و در موبایل{" "}
          <code className="rounded bg-muted px-1">p-3</code>. فاصله عمودی بین بخش‌های اصلی{" "}
          <code className="rounded bg-muted px-1">space-y-6</code>.
        </div>
      </GuideSection>

      <GuideSection
        title="۳) شعاع گوشه (Radius)"
        description="خانواده شعاع از --radius مشتق می‌شود تا با تغییر یک توکن، کل UI هماهنگ بماند."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {radiusScale.map((item) => (
            <div
              key={item.token}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3"
            >
              <div
                className={cn(
                  "flex h-14 w-14 items-center justify-center border border-primary/30 bg-primary/10 text-[10px] font-medium text-primary",
                  item.className
                )}
              >
                {item.token}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">rounded-{item.token}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{item.value}</div>
                <div className="text-[11px] text-muted-foreground">{item.usage}</div>
              </div>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection
        title="۴) Elevation و سایه"
        description="لایه‌بندی بصری فقط با توکن‌های سایه تعریف‌شده در globals.css."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {elevationScale.map((item) => (
            <div
              key={item.token}
              className="rounded-xl border border-border/50 bg-card p-4"
              style={{ boxShadow: `var(--shadow-${item.token === "primary" ? "primary" : item.token})` }}
            >
              <div className="text-sm font-medium">shadow-{item.token}</div>
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">{item.css}</div>
              <div className="mt-2 text-xs text-muted-foreground">{item.usage}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          کلاس‌های کمکی موجود: <code className="rounded bg-muted px-1">surface-card</code>،{" "}
          <code className="rounded bg-muted px-1">surface-card-hover</code>،{" "}
          <code className="rounded bg-muted px-1">btn-primary-gradient</code>.
        </div>
      </GuideSection>

      <GuideSection
        title="۵) سیستم آیکون"
        description="فقط lucide-react. سبک Outline. رنگ از currentColor تا با متن/توکن هماهنگ شود."
      >
        <div className="flex flex-wrap items-end gap-6 rounded-xl border border-border/70 bg-card p-4">
          {iconSizes.map((item) => (
            <div key={item.token} className="flex flex-col items-center gap-2">
              <Package className={cn(item.className, "text-foreground")} />
              <div className="text-center">
                <div className="text-xs font-medium">{item.token}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{item.px}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          {[Home, Search, Package, User, Settings, Check, ChevronLeft].map((Icon, i) => (
            <div
              key={i}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/70 bg-muted/30"
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          اندازه پیش‌فرض در منو و دکمه: <strong className="text-foreground">16px</strong>{" "}
          (<code className="rounded bg-muted px-1">h-4 w-4</code>). در RTL برای جهت‌دارها
          (مثل Chevron) جهت را معکوس در نظر بگیر.
        </p>
      </GuideSection>

      <GuideSection
        title="۶) تراکم نمایش (Density)"
        description="دو حالت مجاز. کاربر/مستأجر نباید حالت سوم اختراع کند."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {densityCompare.map((mode) => (
            <Card key={mode.name}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{mode.name}</CardTitle>
                <CardDescription className="text-xs">{mode.note}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div
                  className={cn(
                    "flex items-center justify-between rounded-lg border border-border/70 bg-muted/20",
                    mode.pad,
                    mode.row
                  )}
                >
                  <span className={cn(mode.text)}>ردیف نمونه جدول</span>
                  <Badge variant="secondary" className="text-[10px]">
                    فعال
                  </Badge>
                </div>
                <div
                  className={cn(
                    "flex items-center justify-between rounded-lg border border-border/70",
                    mode.pad,
                    mode.row
                  )}
                >
                  <span className={cn(mode.text)}>ردیف دوم</span>
                  <Badge variant="outline" className="text-[10px]">
                    پیش‌نویس
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </GuideSection>

      <GuideSection title="۷) قوانین Do / Don’t">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="mb-2 font-medium text-emerald-800 dark:text-emerald-200">
              انجام بده
            </div>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>از مقیاس تایپ و فاصله تعریف‌شده استفاده کن.</li>
              <li>سایه و شعاع را فقط از توکن‌ها بگیر.</li>
              <li>آیکون را با currentColor و اندازه استاندارد بگذار.</li>
              <li>برای صفحات عملیاتی پرتراکم، Compact را آگاهانه انتخاب کن.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-sm dark:border-rose-900 dark:bg-rose-950/30">
            <div className="mb-2 font-medium text-rose-800 dark:text-rose-200">
              انجام نده
            </div>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>فونت یا وزن خارج از Vazirmatn تعریف نکن.</li>
              <li>padding/margin با اعداد دلخواه (مثل 13px) ننویس.</li>
              <li>box-shadow هگز ثابت داخل کامپوننت نگذار.</li>
              <li>آیکون SVG سفارشی پراکنده بدون دلیل معماری اضافه نکن.</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <Separator />

      <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">مرحله بعد:</strong> UI-02 Layout & Structure
        (App Shell، Grid، Split View، Sticky، عرض محتوا). پایه‌های این صفحه در تمام
        چیدمان‌های بعدی اجباری‌اند.
      </div>
    </div>
  );
}
