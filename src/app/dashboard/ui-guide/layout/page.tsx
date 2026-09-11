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
    "اسکلت صفحه: App Shell، عرض محتوا، Grid، Sticky، Split View، Density و قوانین ترکیب فرم+جدول بدون پرت فضا.",
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

      <GuideRulesBox title="قوانین چیدمان">
        <ul className="list-disc space-y-1 pr-5">
          <li>
            فاصله: main دسکتاپ <code className="rounded bg-muted px-1">p-4</code>، بین بخش‌ها{" "}
            <code className="rounded bg-muted px-1">space-y-6</code>.
          </li>
          <li>
            آیکون: B+D — Chip در Sidebar سطح۱؛ Outline در لیست/جدول.
          </li>
          <li>
            <strong className="text-foreground">عرض:</strong> روی مانیتور عریض، بلوک فرم/متن را تا افق
            نکش؛ از max-width استفاده کن تا خط چشم خسته نشود.
          </li>
          <li>
            <strong className="text-foreground">Sticky:</strong> فقط نوار ابزار همان ناحیه اسکرول
            (مثلاً جدول) — نه کل صفحه و نه چند لایه تو در تو.
          </li>
          <li>
            <strong className="text-foreground">فرم + جدول:</strong> کنار هم فقط وقتی فرم کوتاه است؛
            وگرنه زیر هم یا فرم در Modal/Drawer.
          </li>
        </ul>
      </GuideRulesBox>

      <GuideSection title="۱) App Shell — آناتومی">
        <div className="overflow-hidden rounded-xl border border-border/70 shadow-[var(--shadow-sm)]">
          <div className="flex min-h-[280px]">
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
                  </div>
                )}
              </div>
              <nav className="flex-1 space-y-0.5 p-1.5">
                {navItems.map(({ label, Icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground hover:bg-sidebar-accent"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {!sidebarCollapsed && <span className="truncate">{label}</span>}
                  </div>
                ))}
              </nav>
            </aside>
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="header-blur flex h-12 items-center justify-between border-b border-border/70 px-3">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  onClick={() => setSidebarCollapsed((v) => !v)}
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                    <Bell className="h-4 w-4" />
                  </Button>
                </div>
              </header>
              <main className={cn("flex-1 bg-muted/20", pad)}>
                <div className="text-xs text-muted-foreground">ناحیه Main — محتوای صفحه</div>
              </main>
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۲) max-w-5xl یعنی چه؟"
        description="یک سقف عرض برای خوانایی — نه اینکه جدول همیشه باریک باشد."
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            <code className="rounded bg-muted px-1 text-foreground">max-w-5xl</code> در Tailwind یعنی
            حداکثر عرض حدود <strong className="text-foreground">۶۴rem ≈ ۱۰۲۴px</strong>. روی مانیتور
            ۲۷ اینچ عریض، اگر فرم را تا لب راست بکشی، خط‌ها خیلی طولانی می‌شوند و چشم خسته می‌شود.
          </p>
          <ul className="list-disc space-y-1 pr-5">
            <li>
              <strong className="text-foreground">فرم، متن راهنما، کارت تنظیمات:</strong> داخل
              max-w-3xl تا max-w-5xl بگذار.
            </li>
            <li>
              <strong className="text-foreground">جدول داده با ستون زیاد:</strong> می‌تواند عرض کامل
              Main را بگیرد و افقی اسکرول شود — اجباری به max-w-5xl نیست.
            </li>
            <li>
              Shell (Sidebar+Header) همیشه full-width است؛ محدودیت عرض فقط روی بلوک محتواست.
            </li>
          </ul>
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded-lg border border-border/70 bg-card p-2">
            <div className="mb-1 text-[11px] text-muted-foreground">مانیتور عریض — بدون سقف</div>
            <div className="h-8 w-full rounded bg-rose-500/20 text-center text-[10px] leading-8 text-rose-800 dark:text-rose-200">
              خط خیلی بلند ← خوانایی ضعیف
            </div>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
            <div className="mb-1 text-[11px] text-primary">با max-w-5xl (فرم)</div>
            <div className="mx-auto h-8 max-w-5xl rounded bg-primary/20 text-center text-[10px] leading-8 text-primary">
              عرض محدود ← راحت‌تر خوانده می‌شود
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۳) Page Header استاندارد">
        <div className="rounded-xl border border-border/70 bg-card p-4 elevate-hover">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground">اسناد انبار</h3>
                <p className="text-xs text-muted-foreground">ثبت و ردیابی ورود و خروج</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                خروجی
              </Button>
              <Button size="sm">سند جدید</Button>
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۴) Density">
        <div className="mb-3 flex gap-2">
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
          {["پیش‌نویس · GR-001", "در انتظار · GI-014", "تأیید شده · TR-003"].map((row) => (
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
          ))}
        </div>
      </GuideSection>

      <GuideSection
        title="۵) Split View — لیست + جزئیات (نه فرم سنگین)"
        description="برای انتخاب یک رکورد و دیدن جزئیات کنار آن. فرم طولانی اینجا جا نمی‌گیرد."
      >
        <div className="grid min-h-[220px] overflow-hidden rounded-xl border border-border/70 md:grid-cols-[minmax(180px,260px)_1fr]">
          <div className="border-l border-border/70 bg-card">
            <div className="border-b border-border/60 px-3 py-2 text-xs font-medium">فهرست</div>
            {["کالای A", "کالای B", "کالای C"].map((item, i) => (
              <div
                key={item}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 text-xs",
                  i === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <Package className="h-3.5 w-3.5" />
                {item}
              </div>
            ))}
          </div>
          <div className="space-y-2 bg-muted/15 p-4">
            <div className="text-sm font-semibold text-foreground">جزئیات کالای A</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border border-border/60 bg-card p-3 text-xs">
                <div className="text-muted-foreground">کد</div>
                <div className="font-medium">ITM-001</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3 text-xs">
                <div className="text-muted-foreground">موجودی</div>
                <div className="font-medium">۱۲۰</div>
              </div>
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۶) Sticky Toolbar یعنی چه؟"
        description="وقتی جدول را اسکرول می‌کنی، نوار فیلتر/دکمهٔ «جدید» بالای همان جدول می‌ماند — نه اینکه کل صفحه قفل شود."
      >
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">درست:</strong> یک باکس جدول با ارتفاع محدود؛ داخلش
            اسکرول. نوار ابزار با <code className="rounded bg-muted px-1">sticky top-0</code> به بالای
            همان باکس می‌چسبد.
          </p>
          <p>
            <strong className="text-foreground">غلط:</strong> sticky کردن Header + فیلتر + فرم + چند
            کارت روی هم → صفحه خفه و گیج‌کننده می‌شود.
          </p>
        </div>
        <div className="mt-3 max-h-44 overflow-auto rounded-xl border border-border/70">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/70 bg-card/95 px-3 py-2 backdrop-blur">
            <span className="text-xs font-medium text-foreground">۱۲ نتیجه · نوار چسبان</span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-[11px]">
                فیلتر
              </Button>
              <Button size="sm" className="h-7 text-[11px]">
                جدید
              </Button>
            </div>
          </div>
          <div className="bg-card">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="flex h-9 items-center justify-between border-b border-border/40 px-3 text-xs text-muted-foreground"
              >
                <span className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  ردیف {i + 1} — اسکرول کن؛ نوار بالا می‌ماند
                </span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </div>
            ))}
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۷) ترکیب فرم + جدول — قوانین واقعی (پاسخ نگرانی تو)"
        description="کنار هم گذاشتن همیشه درست نیست. سه الگوی مجاز:"
      >
        <div className="mb-4 space-y-2 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3 text-xs text-muted-foreground dark:border-amber-900 dark:bg-amber-950/20">
          <strong className="text-foreground">مشکل الگوی خام «دو ستون همیشه»:</strong>
          اگر فیلدهای فرم زیاد شود ستون فرم بلند می‌شود؛ جدول در ستون کناری یا تنگ می‌ماند یا زیر فرم
          فضای خالی مرده ایجاد می‌شود. وقتی رکوردهای جدول زیاد شود، دو ارتفاع ناهماهنگ می‌شوند.
        </div>

        {/* Pattern A */}
        <div className="mb-4 space-y-2">
          <div className="text-sm font-medium text-foreground">
            الگو A — پیش‌فرض ERP: عمودی (فرم بالا → جدول پایین)
          </div>
          <p className="text-xs text-muted-foreground">
            برای فرم متوسط/سنگین و جدول واقعی. هر بلوک عرض کامل می‌گیرد؛ جدول اسکرول مستقل دارد.
          </p>
          <div className="space-y-3 rounded-xl border border-border/70 bg-card p-3">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="mb-2 text-xs font-medium text-foreground">فرم ثبت</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="h-8 rounded-md border border-border/60 bg-card px-2 text-[11px] leading-8 text-muted-foreground">
                  عنوان
                </div>
                <div className="h-8 rounded-md border border-border/60 bg-card px-2 text-[11px] leading-8 text-muted-foreground">
                  انبار
                </div>
                <div className="h-8 rounded-md border border-border/60 bg-card px-2 text-[11px] leading-8 text-muted-foreground sm:col-span-2">
                  توضیحات
                </div>
              </div>
              <Button size="sm" className="mt-2">
                ذخیره
              </Button>
            </div>
            <div className="max-h-36 overflow-auto rounded-lg border border-border/60">
              <div className="sticky top-0 border-b border-border/60 bg-card px-3 py-1.5 text-[11px] font-medium">
                فهرست اسناد
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-8 items-center gap-2 border-b border-border/40 px-3 text-[11px] last:border-0"
                >
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  سند نمونه {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pattern B */}
        <div className="mb-4 space-y-2">
          <div className="text-sm font-medium text-foreground">
            الگو B — کنار هم فقط «ثبت سریع» (۲ تا ۴ فیلد) + لیست اخیر
          </div>
          <p className="text-xs text-muted-foreground">
            شرط: فرم کوتاه بماند. جدول/لیست ستون خودش اسکرول مستقل دارد (
            <code className="rounded bg-muted px-1">max-h</code> + overflow) تا ارتفاع فرم فضای خالی
            زیر جدول نسازد.
          </p>
          <div className="grid items-start gap-3 lg:grid-cols-[minmax(220px,320px)_1fr]">
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <div className="mb-2 text-xs font-medium">ثبت سریع</div>
              <div className="space-y-2">
                <div className="h-8 rounded-md border border-border/60 bg-muted/20 px-2 text-[11px] leading-8 text-muted-foreground">
                  عنوان
                </div>
                <div className="h-8 rounded-md border border-border/60 bg-muted/20 px-2 text-[11px] leading-8 text-muted-foreground">
                  انبار
                </div>
                <Button size="sm" className="w-full">
                  ذخیره
                </Button>
              </div>
            </div>
            <div className="max-h-40 overflow-auto rounded-xl border border-border/70 bg-card">
              <div className="sticky top-0 border-b border-border/60 bg-card px-3 py-1.5 text-[11px] font-medium">
                اخیر (اسکرول مستقل)
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-8 items-center justify-between border-b border-border/40 px-3 text-[11px] last:border-0"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    GR-00{i + 1}
                  </span>
                  <Badge variant="secondary" className="text-[9px]">
                    پیش‌نویس
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Pattern C */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">
            الگو C — جدول تمام‌عرض + فرم در Modal / Drawer
          </div>
          <p className="text-xs text-muted-foreground">
            وقتی فرم سنگین است یا جدول ستون زیاد دارد: صفحه = جدول کامل؛ «جدید/ویرایش» فرم را در
            لایه رویی باز می‌کند. هیچ فضای مرده‌ای زیر فرم نمی‌ماند.
          </p>
          <div className="rounded-xl border border-border/70 bg-card p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium">جدول تمام‌عرض Main</span>
              <Button size="sm" className="h-7 text-[11px]">
                جدید (باز شدن Drawer)
              </Button>
            </div>
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-6 text-center text-[11px] text-muted-foreground">
              Data Grid کامل — فرم جدا در Overlay (جزئیات در UI-04 و UI-07)
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">قانون قفل‌شونده:</strong> پیش‌فرض الگو A. الگو B فقط با
          فرم ≤ ۴ فیلد و لیست با اسکرول مستقل. الگو C برای فرم سنگین یا جدول عریض. اجبار دو ستون
          برابر برای همه صفحات ممنوع است.
        </div>
      </GuideSection>

      <GuideSection title="۸) Do / Don’t">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="mb-2 font-medium text-emerald-800 dark:text-emerald-200">انجام بده</div>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>فرم سنگین را زیر هم یا در Drawer بگذار.</li>
              <li>به جدول اسکرول مستقل بده.</li>
              <li>Sticky را فقط روی نوار همان ناحیه بگذار.</li>
              <li>max-width برای متن/فرم؛ جدول می‌تواند عریض‌تر باشد.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-4 text-sm dark:border-rose-900 dark:bg-rose-950/30">
            <div className="mb-2 font-medium text-rose-800 dark:text-rose-200">انجام نده</div>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>دو ستون اجباری وقتی فرم بلند است.</li>
              <li>ارتفاع ستون‌ها را به هم قفل نکن تا فضای خالی مرده بسازد.</li>
              <li>کل صفحه را sticky نکن.</li>
              <li>فرم را روی ultrawide تا افق نکش.</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <Separator />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/navigation">UI-03 Navigation</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/foundations">UI-01</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide">فهرست</a>
        </Button>
      </div>
    </div>
  );
}
