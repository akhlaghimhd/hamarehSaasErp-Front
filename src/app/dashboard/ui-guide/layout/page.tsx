"use client";

import { useState } from "react";
import {
  GuidePageHeader,
  GuideRulesBox,
  GuideSection,
} from "@/shared/components/ui-guide/guide-shell";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
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
  LayoutDashboard,
  Package,
  Warehouse,
  ShoppingCart,
  Settings,
  Search,
  Bell,
  Menu,
  ChevronLeft,
  FileText,
} from "lucide-react";

const meta = {
  code: "UI-02",
  title: "Layout & Structure",
  description:
    "اسکلت صفحه: App Shell، عرض محتوا، Grid، Sticky، Split View، Density و ترکیب واقعی بلوک‌ها با توکن‌های UI-00/UI-01 و سیاست آیکون B+D.",
  phase: "فاز ۱",
  status: "ready" as const,
};

const navItems = [
  { label: "داشبورد", Icon: LayoutDashboard },
  { label: "انبار", Icon: Warehouse },
  { label: "کالا", Icon: Package },
  { label: "خرید/فروش", Icon: ShoppingCart },
  { label: "تنظیمات", Icon: Settings },
];

export default function LayoutGuidePage() {
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const rowH = density === "comfortable" ? "h-10" : "h-8";
  const pad = density === "comfortable" ? "p-4" : "p-3";
  const text = density === "comfortable" ? "text-sm" : "text-xs";

  return (
    <div className="space-y-6">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین چیدمان (وابسته به تصمیم‌های قبلی)">
        <ul className="list-disc space-y-1 pr-5">
          <li>
            فاصله صفحه از UI-01: main در دسکتاپ <code className="rounded bg-muted px-1">p-4</code>،
            فاصله عمودی بخش‌ها <code className="rounded bg-muted px-1">space-y-6</code>.
          </li>
          <li>
            آیکون منو: سیاست <strong className="text-foreground">B+D</strong> — Lucide داخل Chip در
            Sidebar سطح۱؛ Outline ساده در لیست فشرده.
          </li>
          <li>
            سایه و سطح: کارت‌ها <code className="rounded bg-muted px-1">elevate-hover</code>؛ جداسازی
            از پس‌زمینه با shadow توکن.
          </li>
          <li>
            عرض محتوا: حداکثر خوانا برای فرم/جدول؛ از کشیدن بی‌نهایت روی مانیتور عریض خودداری کن.
          </li>
          <li>Sticky فقط برای Header صفحه و نوار ابزار جدول — نه برای همه کارت‌ها.</li>
        </ul>
      </GuideRulesBox>

      <GuideSection
        title="۱) App Shell — آناتومی"
        description="ساختار ثابت محصول: Sidebar + Header + Main. جزئیات Navigation در UI-03 تکمیل می‌شود."
      >
        <div className="overflow-hidden rounded-xl border border-border/70 shadow-[var(--shadow-sm)]">
          <div className="flex min-h-[320px]">
            {/* Sidebar demo */}
            <aside
              className={cn(
                "flex shrink-0 flex-col border-l border-border/70 bg-card transition-all",
                sidebarCollapsed ? "w-14" : "w-52"
              )}
            >
              <div className="flex items-center gap-2 border-b border-border/60 p-2">
                <div className="brand-mark flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs text-white">
                  ه
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <div className="truncate text-xs font-semibold">هماره ERP</div>
                    <div className="truncate text-[10px] text-muted-foreground">Shell</div>
                  </div>
                )}
              </div>
              <nav className="flex-1 space-y-0.5 p-1.5">
                {navItems.map(({ label, Icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {!sidebarCollapsed && <span className="truncate">{label}</span>}
                  </div>
                ))}
              </nav>
            </aside>

            {/* Main column */}
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="header-blur flex h-12 items-center justify-between border-b border-border/70 px-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => setSidebarCollapsed((v) => !v)}
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">Header · جستجو / اعلان</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Bell className="h-4 w-4" />
                  </Button>
                </div>
              </header>
              <main className={cn("flex-1 space-y-3 bg-muted/20", pad)}>
                <div className="text-xs font-medium text-foreground">Main Content</div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {["اسناد امروز", "در انتظار", "موجودی"].map((t) => (
                    <div
                      key={t}
                      className="rounded-lg border border-border/60 bg-card p-3 elevate-hover"
                    >
                      <div className="text-[11px] text-muted-foreground">{t}</div>
                      <div className="text-lg font-semibold text-foreground">—</div>
                    </div>
                  ))}
                </div>
              </main>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          دکمه منو را بزن تا حالت جمع‌شده Sidebar را ببینی. آیکون‌ها با Chip (سیاست B) هستند.
        </p>
      </GuideSection>

      <GuideSection
        title="۲) عرض محتوا و Grid"
        description="روی مانیتور عریض، محتوا نباید تا افق کشیده شود. از شبکه ۱۲ ستونی ذهنی استفاده کن."
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-border/70 bg-card p-3">
            <div className="mb-2 text-xs font-medium text-foreground">Full bleed (فقط Shell)</div>
            <div className="grid grid-cols-12 gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-8 items-center justify-center rounded bg-primary/15 font-mono text-[10px] text-primary"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto max-w-5xl rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
            <div className="mb-2 text-xs font-medium text-primary">
              max-w-5xl · محدوده پیشنهادی فرم و جدول استاندارد
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-card p-3 text-xs text-muted-foreground">
                ستون فرم
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3 text-xs text-muted-foreground">
                ستون خلاصه / ساید
              </div>
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۳) Page Header استاندارد"
        description="الگوی ثابت بالای هر صفحه عملیاتی — عنوان، توضیح کوتاه، اکشن‌های اصلی."
      >
        <div className="rounded-xl border border-border/70 bg-card p-4 elevate-hover">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-semibold text-foreground">اسناد انبار</h3>
                  <p className="text-xs text-muted-foreground">ثبت، تأیید و ردیابی اسناد ورود و خروج</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline">
                خروجی
              </Button>
              <Button size="sm">سند جدید</Button>
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۴) Density روی چیدمان"
        description="همان دو حالت UI-01 — تغییر Density نباید منطق صفحه را عوض کند، فقط فشردگی."
      >
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={density === "comfortable" ? "default" : "outline"}
            onClick={() => setDensity("comfortable")}
          >
            Comfortable
          </Button>
          <Button
            size="sm"
            variant={density === "compact" ? "default" : "outline"}
            onClick={() => setDensity("compact")}
          >
            Compact
          </Button>
        </div>
        <div className="rounded-xl border border-border/70 bg-card">
          {["پیش‌نویس · GR-1404-001", "در انتظار · GI-1404-014", "تأیید شده · TR-1404-003"].map(
            (row) => (
              <div
                key={row}
                className={cn(
                  "flex items-center justify-between border-b border-border/50 last:border-0",
                  pad,
                  rowH
                )}
              >
                <span className={cn("flex items-center gap-2 text-foreground", text)}>
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  {row}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  عملیات
                </Badge>
              </div>
            )
          )}
        </div>
      </GuideSection>

      <GuideSection
        title="۵) Split View — لیست + جزئیات"
        description="الگوی رایج ERP: انتخاب از لیست، ویرایش در پنل کناری. حداقل پرت فضا."
      >
        <div className="grid min-h-[240px] gap-0 overflow-hidden rounded-xl border border-border/70 md:grid-cols-[minmax(200px,280px)_1fr]">
          <div className="border-l border-border/70 bg-card">
            <div className="border-b border-border/60 px-3 py-2 text-xs font-medium text-foreground">
              فهرست
            </div>
            {["کالای A", "کالای B", "کالای C"].map((item, i) => (
              <div
                key={item}
                className={cn(
                  "flex items-center gap-2 border-b border-border/40 px-3 py-2.5 text-xs last:border-0",
                  i === 0
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted/40"
                )}
              >
                <Package className="h-3.5 w-3.5" />
                {item}
              </div>
            ))}
          </div>
          <div className="space-y-3 bg-muted/15 p-4">
            <div className="text-sm font-semibold text-foreground">جزئیات کالای A</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-card p-3 text-xs">
                <div className="text-muted-foreground">کد</div>
                <div className="font-medium text-foreground">ITM-001</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3 text-xs">
                <div className="text-muted-foreground">موجودی</div>
                <div className="font-medium text-foreground">۱۲۰</div>
              </div>
            </div>
            <Button size="sm">ویرایش</Button>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۶) Sticky Toolbar"
        description="نوار ابزار جدول می‌تواند sticky باشد؛ کل صفحه را sticky نکن."
      >
        <div className="max-h-48 overflow-auto rounded-xl border border-border/70">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/70 bg-card/95 px-3 py-2 backdrop-blur">
            <span className="text-xs font-medium text-foreground">۱۲ نتیجه</span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-[11px]">
                فیلتر
              </Button>
              <Button size="sm" className="h-7 text-[11px]">
                جدید
              </Button>
            </div>
          </div>
          <div className="space-y-0 bg-card">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex h-9 items-center justify-between border-b border-border/40 px-3 text-xs text-muted-foreground"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  ردیف نمونه {i + 1}
                </span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </div>
            ))}
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۷) ترکیب واقعی — فرم + جدول (پیش‌نمایش UI-10)">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <Card className="elevate-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">فرم ثبت سریع</CardTitle>
              <CardDescription className="text-xs">ورود داده در کنار فهرست</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-9 rounded-lg border border-border/70 bg-muted/20 px-3 text-xs leading-9 text-muted-foreground">
                عنوان سند
              </div>
              <div className="h-9 rounded-lg border border-border/70 bg-muted/20 px-3 text-xs leading-9 text-muted-foreground">
                انبار
              </div>
              <Button size="sm" className="w-full">
                ذخیره
              </Button>
            </CardContent>
          </Card>
          <Card className="elevate-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">اسناد اخیر</CardTitle>
              <CardDescription className="text-xs">همان صفحه — بدون پرت عمودی زیاد</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0 p-0">
              {["GR-001", "GI-002", "TR-003"].map((c) => (
                <div
                  key={c}
                  className="flex h-9 items-center justify-between border-t border-border/50 px-4 text-xs"
                >
                  <span className="flex items-center gap-2 text-foreground">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    {c}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    پیش‌نویس
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </GuideSection>

      <GuideSection title="۸) Do / Don’t چیدمان">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="mb-2 font-medium text-emerald-800 dark:text-emerald-200">انجام بده</div>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>Shell ثابت نگه دار؛ محتوا داخل Main تغییر کند.</li>
              <li>از max-width برای فرم/جدول استاندارد استفاده کن.</li>
              <li>Chip آیکون در Sidebar سطح۱ (B+D).</li>
              <li>Density را بدون تغییر ساختار منطقی اعمال کن.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-4 text-sm dark:border-rose-900 dark:bg-rose-950/30">
            <div className="mb-2 font-medium text-rose-800 dark:text-rose-200">انجام نده</div>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>چند سطح Sticky تو در تو نساز.</li>
              <li>محتوا را روی ultrawide تا لب افق نکش.</li>
              <li>Sidebar را برای هر مستأجر بازطراحی نکن.</li>
              <li>Duotone را در لیست فشرده نگذار.</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <Separator />

      <div className="flex flex-wrap gap-2 text-xs">
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/foundations">UI-01 Foundations</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/icon-lab">Icon Lab</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/branding">UI-00 Branding</a>
        </Button>
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">مرحله بعد:</strong> UI-03 Navigation & Wayfinding — جزئیات
        Sidebar، Header، Breadcrumb، Tabs، Command Palette (با رعایت Shell همین صفحه).
      </div>
    </div>
  );
}
