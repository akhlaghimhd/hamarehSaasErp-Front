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
  Warehouse,
  ShoppingCart,
  FileText,
  Bell,
} from "lucide-react";

const meta = {
  code: "UI-01",
  title: "Foundations",
  description:
    "پایه‌های غیرقابل مذاکره سیستم طراحی: تایپوگرافی، فاصله‌گذاری، شعاع، Elevation، الگوهای سطحی، آیکون و مقیاس‌های پایه.",
  phase: "فاز ۱",
  status: "ready" as const,
};

/** Typography tied to semantic palette tokens */
const typeScale = [
  {
    token: "Display",
    className: "text-3xl font-semibold tracking-tight text-foreground",
    colorToken: "foreground",
    size: "30px / 1.25",
    usage: "عنوان‌های خیلی بزرگ داشبورد (به‌ندرت)",
    sample: "داشبورد مدیریت",
  },
  {
    token: "H1 / Page Title",
    className: "text-2xl font-semibold tracking-tight text-foreground",
    colorToken: "foreground",
    size: "24px / 1.3",
    usage: "عنوان اصلی صفحه",
    sample: "فهرست کالاها",
  },
  {
    token: "H2 / Section",
    className: "text-lg font-semibold text-foreground",
    colorToken: "foreground",
    size: "18px / 1.4",
    usage: "عنوان بخش داخل صفحه",
    sample: "اطلاعات پایه",
  },
  {
    token: "H3 / Card Title",
    className: "text-base font-semibold text-card-foreground",
    colorToken: "card-foreground",
    size: "16px / 1.4",
    usage: "عنوان کارت و مودال",
    sample: "خلاصه موجودی",
  },
  {
    token: "Body",
    className: "text-sm font-normal text-foreground",
    colorToken: "foreground",
    size: "14px / 1.6",
    usage: "متن اصلی رابط کاربری",
    sample: "این متن بدنه استاندارد سیستم است و شدت رنگ آن از توکن foreground می‌آید.",
  },
  {
    token: "Body Strong",
    className: "text-sm font-medium text-foreground",
    colorToken: "foreground",
    size: "14px / 1.6",
    usage: "برچسب‌های مهم و مقادیر کلیدی",
    sample: "کد کالا: ITM-00125",
  },
  {
    token: "Primary Emphasis",
    className: "text-sm font-semibold text-primary",
    colorToken: "primary",
    size: "14px / 1.5",
    usage: "لینک‌ها، تأکید برند، CTA متنی",
    sample: "مشاهده جزئیات سند",
  },
  {
    token: "Caption / Helper",
    className: "text-xs text-muted-foreground",
    colorToken: "muted-foreground",
    size: "12px / 1.5",
    usage: "راهنما، متا، زیرنویس",
    sample: "آخرین به‌روزرسانی ۵ دقیقه پیش",
  },
  {
    token: "Danger / Error",
    className: "text-sm font-medium text-destructive",
    colorToken: "destructive",
    size: "14px / 1.5",
    usage: "پیام خطا و هشدار مخرب",
    sample: "موجودی کافی نیست",
  },
  {
    token: "Overline / Code",
    className: "text-[11px] font-semibold tracking-wide text-primary",
    colorToken: "primary",
    size: "11px / 1.4",
    usage: "کد صفحه راهنما و برچسب فنی",
    sample: "UI-01 · FOUNDATIONS",
  },
];

const spacingScale = [
  { token: "0.5", px: "2px", usage: "فاصله بسیار ریز داخل آیکون" },
  { token: "1", px: "4px", usage: "فاصله فشرده بین عناصر مرتبط" },
  { token: "1.5", px: "6px", usage: "گپ آیکون و متن در دکمه کوچک" },
  { token: "2", px: "8px", usage: "واحد پایه ۸ نقطه‌ای" },
  { token: "3", px: "12px", usage: "گپ استاندارد کنترل‌ها" },
  { token: "4", px: "16px", usage: "پدینگ داخلی کارت (Comfortable)" },
  { token: "5", px: "20px", usage: "فاصله بین بخش‌های نزدیک" },
  { token: "6", px: "24px", usage: "فاصله بین Sectionها" },
  { token: "8", px: "32px", usage: "جداکننده بلوک‌های بزرگ" },
  { token: "10", px: "40px", usage: "حاشیه صفحه در دسکتاپ" },
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
    hoverClass: "elevate-hover",
    usage: "جداسازی ملایم ردیف و کنترل",
  },
  {
    token: "sm",
    css: "var(--shadow-sm)",
    hoverClass: "elevate-hover",
    usage: "کارت پیش‌فرض — با hover به md می‌رود",
  },
  {
    token: "md",
    css: "var(--shadow-md)",
    hoverClass: "elevate-hover-strong",
    usage: "Dropdown، Popover، کارت تعاملی",
  },
  {
    token: "lg",
    css: "var(--shadow-lg)",
    hoverClass: "",
    usage: "Modal، Drawer، لایه بالا (ثابت)",
  },
  {
    token: "primary",
    css: "var(--shadow-primary)",
    hoverClass: "",
    usage: "دکمه Primary و Brand Mark",
  },
];

const surfacePatterns = [
  {
    id: "dots",
    title: "Dots",
    className: "pattern-dots",
    usage: "پس‌زمینه بخش خالی، Empty State ملایم",
  },
  {
    id: "grid",
    title: "Grid",
    className: "pattern-grid",
    usage: "ناحیه داشبورد / پنل تحلیلی",
  },
  {
    id: "diagonal",
    title: "Diagonal",
    className: "pattern-diagonal",
    usage: "هدر ماژول یا نوار جانبی تزئینی",
  },
  {
    id: "soft-noise",
    title: "Soft Noise",
    className: "pattern-soft-noise",
    usage: "کارت KPI و سطح‌های برجسته",
  },
  {
    id: "mesh",
    title: "Mesh Glow",
    className: "pattern-mesh",
    usage: "Hero صفحه ورود یا Welcome",
  },
];

const iconSizes = [
  { token: "xs", className: "h-3 w-3", px: "12px" },
  { token: "sm", className: "h-3.5 w-3.5", px: "14px" },
  { token: "md", className: "h-4 w-4", px: "16px" },
  { token: "lg", className: "h-5 w-5", px: "20px" },
  { token: "xl", className: "h-6 w-6", px: "24px" },
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
    note: "جداول پرتراکم و صفحات عملیاتی",
  },
];

const iconProposals = [
  {
    id: "A",
    title: "پیشنهاد A — Lucide خالص (فعلی)",
    pros: "سبک، tree-shake، یکدست، لود سریع",
    cons: "چهره خیلی رایج در محصولات SaaS",
    verdict: "پایه امن؛ برای تمایز بصری کافی نیست",
  },
  {
    id: "B",
    title: "پیشنهاد B — Hybrid (توصیه)",
    pros: "Lucide برای UI عمومی + مجموعه آیکون ماژولی سفارشی/متمایز برای Inventory، PS، Workflow",
    cons: "نیاز به نگهداری ۲ لایه و راهنمای انتخاب",
    verdict: "بهترین تعادل سرعت + هویت",
  },
  {
    id: "C",
    title: "پیشنهاد C — Phosphor یا Tabler به‌جای Lucide",
    pros: "تنوع وزن (thin/light/regular/bold) و ظاهر کمی متفاوت‌تر",
    cons: "بازنویسی همه آیکون‌های فعلی؛ هزینه مهاجرت",
    verdict: "فقط اگر بخواهیم کل زبان آیکون را عوض کنیم",
  },
  {
    id: "D",
    title: "پیشنهاد D — Duotone انتخابی",
    pros: "برای Empty State، ماژول‌های اصلی و Onboarding روح بصری قوی",
    cons: "در جدول و منوی فشرده شلوغ می‌شود",
    verdict: "فقط در سطوح بزرگ و نمایشی، نه در Data Grid",
  },
];

export default function FoundationsGuidePage() {
  return (
    <div className="space-y-6">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox>
        <ul className="list-disc space-y-1 pr-5">
          <li>
            فونت رسمی: <strong className="text-foreground">Vazirmatn</strong>. رنگ متن فقط از
            توکن‌های معنایی پالت (<code className="rounded bg-muted px-1">foreground</code>،{" "}
            <code className="rounded bg-muted px-1">muted-foreground</code>،{" "}
            <code className="rounded bg-muted px-1">primary</code>،{" "}
            <code className="rounded bg-muted px-1">destructive</code>).
          </li>
          <li>مقیاس فاصله: ۸ نقطه. شعاع از <code className="rounded bg-muted px-1">--radius</code>.</li>
          <li>
            Elevation باید المان را از صفحه جدا کند؛ کارت‌های تعاملی با hover سایه قوی‌تر
            می‌گیرند.
          </li>
          <li>
            الگوهای سطحی CSS (بدون عکس) برای فضاهای خالی و Hero مجازند؛ در جدول و فرم پرتراکم
            استفاده نکن.
          </li>
          <li>
            سیاست آیکون نهایی پس از تأیید پیشنهادها در همین صفحه قفل می‌شود (فعلاً Lucide پایه).
          </li>
        </ul>
      </GuideRulesBox>

      <GuideSection
        title="۱) تایپوگرافی + رنگ معنایی"
        description="هر سطح متن به یک توکن رنگ از پالت وصل است تا با تعویض Theme مستأجر، شدت و هویت درست بماند."
      >
        <div className="overflow-hidden rounded-xl border border-border/70 surface-card">
          <div className="grid grid-cols-[130px_1fr_110px_100px] gap-0 border-b border-border/70 bg-muted/40 px-3 py-2 text-[11px] font-medium text-muted-foreground">
            <span>توکن</span>
            <span>نمونه</span>
            <span>رنگ</span>
            <span>اندازه</span>
          </div>
          {typeScale.map((row) => (
            <div
              key={row.token}
              className="grid grid-cols-[130px_1fr_110px_100px] items-center gap-2 border-b border-border/50 px-3 py-3 last:border-b-0"
            >
              <div>
                <div className="text-xs font-medium text-foreground">{row.token}</div>
                <div className="text-[11px] text-muted-foreground">{row.usage}</div>
              </div>
              <div className={cn(row.className)}>{row.sample}</div>
              <code className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                {row.colorToken}
              </code>
              <div className="font-mono text-[11px] text-muted-foreground">{row.size}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: "foreground", className: "bg-foreground" },
            { label: "muted-foreground", className: "bg-muted-foreground" },
            { label: "primary", className: "bg-primary" },
            { label: "destructive", className: "bg-destructive" },
            { label: "secondary", className: "bg-secondary border border-border" },
          ].map((c) => (
            <div key={c.label} className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
              <span className={cn("h-4 w-4 rounded-full", c.className)} />
              <span className="font-mono text-[10px] text-muted-foreground">{c.label}</span>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection title="۲) فاصله‌گذاری (Spacing) — تأییدشده" description="واحد پایه ۸px.">
        <div className="space-y-2">
          {spacingScale.map((item) => (
            <div
              key={item.token}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-card px-3 py-2 elevate-hover"
            >
              <div className="w-16 font-mono text-xs text-foreground">space-{item.token}</div>
              <div className="h-3 rounded-sm bg-primary/80" style={{ width: item.px }} />
              <Badge variant="outline" className="font-mono text-[10px]">
                {item.px}
              </Badge>
              <span className="text-xs text-muted-foreground">{item.usage}</span>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection title="۳) شعاع گوشه (Radius) — تأییدشده">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {radiusScale.map((item) => (
            <div
              key={item.token}
              className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 elevate-hover"
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
                <div className="text-sm font-medium text-foreground">rounded-{item.token}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{item.value}</div>
                <div className="text-[11px] text-muted-foreground">{item.usage}</div>
              </div>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection
        title="۴) Elevation، Hover و جداسازی از صفحه"
        description="سایه برای جدا کردن سطح از پس‌زمینه است. روی کارت‌های تعاملی موس را حرکت بده تا تقویت سایه را ببینی."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {elevationScale.map((item) => (
            <div
              key={item.token}
              className={cn(
                "rounded-xl border border-border/50 bg-card p-4",
                item.hoverClass
              )}
              style={{
                boxShadow: `var(--shadow-${item.token === "primary" ? "primary" : item.token})`,
              }}
            >
              <div className="text-sm font-medium text-foreground">shadow-{item.token}</div>
              <div className="mt-1 font-mono text-[10px] text-muted-foreground">{item.css}</div>
              <div className="mt-2 text-xs text-muted-foreground">{item.usage}</div>
              {item.hoverClass ? (
                <div className="mt-2 text-[10px] text-primary">Hover → سایه قوی‌تر</div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border/60 bg-card p-4 elevate-hover">
            <div className="text-sm font-medium text-foreground">کارت تعاملی نمونه</div>
            <p className="mt-1 text-xs text-muted-foreground">
              در حالت عادی shadow-sm؛ با hover به md می‌رود و ۱px بالا می‌آید.
            </p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-4 elevate-hover-strong">
            <div className="text-sm font-medium text-foreground">کارت برجسته نمونه</div>
            <p className="mt-1 text-xs text-muted-foreground">
              برای KPI و اکشن‌های مهم؛ hover به shadow-lg.
            </p>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۵) الگوهای سطحی CSS (بدون عکس)"
        description="برای دادن روح بصری به فضاهای خشک داشبورد — سبک، تکرارشونده، وابسته به توکن primary."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {surfacePatterns.map((p) => (
            <div
              key={p.id}
              className={cn(
                "flex min-h-[120px] flex-col justify-between rounded-xl border border-border/60 p-4 elevate-hover",
                p.className
              )}
            >
              <div className="text-sm font-medium text-foreground">{p.title}</div>
              <div className="text-[11px] text-muted-foreground">{p.usage}</div>
              <code className="mt-2 w-fit rounded bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                .{p.className}
              </code>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          <strong className="text-foreground">قانون:</strong> الگو فقط روی سطوح خالی، Hero، Empty
          State و پس‌زمینه بخش — نه روی ردیف جدول، نه روی فیلد فرم پرتراکم.
        </p>
      </GuideSection>

      <GuideSection
        title="۶) سیستم آیکون — وضعیت فعلی و پیشنهادها"
        description="اولویت: سرعت لود، سپس تمایز بصری. تصمیم نهایی را تو می‌گیری."
      >
        <div className="mb-4 flex flex-wrap items-end gap-6 rounded-xl border border-border/70 bg-card p-4">
          {iconSizes.map((item) => (
            <div key={item.token} className="flex flex-col items-center gap-2">
              <Package className={cn(item.className, "text-primary")} />
              <div className="text-center">
                <div className="text-xs font-medium text-foreground">{item.token}</div>
                <div className="font-mono text-[10px] text-muted-foreground">{item.px}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[Home, Search, Package, Warehouse, ShoppingCart, FileText, User, Settings, Bell, Check, ChevronLeft].map(
            (Icon, i) => (
              <div
                key={i}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-primary/5 text-primary elevate-hover"
              >
                <Icon className="h-4 w-4" />
              </div>
            )
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {iconProposals.map((p) => (
            <Card key={p.id} className="elevate-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-foreground">{p.title}</CardTitle>
                <CardDescription className="text-xs">{p.verdict}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium text-emerald-700 dark:text-emerald-300">مزیت: </span>
                  {p.pros}
                </div>
                <div>
                  <span className="font-medium text-rose-700 dark:text-rose-300">هزینه: </span>
                  {p.cons}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">توصیه معماری من:</strong> پیشنهاد B — Lucide به‌عنوان
          پایه سریع برای کنترل‌ها و جداول؛ برای هویت ماژول‌ها (انبار، خرید، گردش‌کار، مالی) یک
          لایه آیکون متمایزتر (سفارشی یا Phosphor Duotone محدود) فقط در Sidebar سطح اول، Empty
          State و Page Header. این‌طور هم لود سبک می‌ماند هم چهره پلتفرم از قالب‌های تکراری جدا
          می‌شود.
        </div>
      </GuideSection>

      <GuideSection title="۷) تراکم نمایش (Density)">
        <div className="grid gap-3 md:grid-cols-2">
          {densityCompare.map((mode) => (
            <Card key={mode.name} className="elevate-hover">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-foreground">{mode.name}</CardTitle>
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
                  <span className={cn(mode.text, "text-foreground")}>ردیف نمونه جدول</span>
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
                  <span className={cn(mode.text, "text-foreground")}>ردیف دوم</span>
                  <Badge variant="outline" className="text-[10px]">
                    پیش‌نویس
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </GuideSection>

      <GuideSection title="۸) قوانین Do / Don’t">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="mb-2 font-medium text-emerald-800 dark:text-emerald-200">انجام بده</div>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>رنگ متن را از توکن معنایی پالت بگیر.</li>
              <li>روی کارت‌های تعاملی از elevate-hover استفاده کن.</li>
              <li>الگوی CSS را فقط برای فضاهای خالی و Hero به کار ببر.</li>
              <li>آیکون پایه را یکدست نگه دار؛ تمایز را در نقاط برند بگذار.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-4 text-sm dark:border-rose-900 dark:bg-rose-950/30">
            <div className="mb-2 font-medium text-rose-800 dark:text-rose-200">انجام نده</div>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>رنگ خاکستری هگز ثابت برای متن ننویس.</li>
              <li>سایه را از صفحه حذف نکن تا همه‌چیز تخت شود.</li>
              <li>الگوی نقطه‌ای روی جدول شلوغ نگذار.</li>
              <li>چند کتابخانه آیکون را بدون سیاست مخلوط نکن.</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <Separator />

      <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">منتظر تصمیم تو:</strong> کدام پیشنهاد آیکون را قفل
        کنیم؟ (A / B / C / D). بعد از تأیید، به UI-02 Layout می‌رویم.
      </div>
    </div>
  );
}
