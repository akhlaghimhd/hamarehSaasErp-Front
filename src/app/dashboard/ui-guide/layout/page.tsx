"use client";

import { useMemo, useState } from "react";
import {
  GuidePageHeader,
  GuideRulesBox,
  GuideSection,
} from "@/shared/components/ui-guide/guide-shell";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
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
  AlertTriangle,
} from "lucide-react";

const meta = {
  code: "UI-02",
  title: "Layout & Structure",
  description:
    "اسکلت کامل صفحه: App Shell، عرض محتوا، Grid، Density، Sticky، Split، ترکیب فرم+جدول، به‌روزرسانی درجا، و قوانین Modal/Drawer برای ثبت ERP.",
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

type DocRow = {
  code: string;
  title: string;
  status: string;
  date: string;
  isNew?: boolean;
};

const initialRows: DocRow[] = [
  { code: "GR-001", title: "ورود محموله", status: "پیش‌نویس", date: "1404/06/01" },
  { code: "GI-014", title: "خروج مصرف", status: "در انتظار", date: "1404/06/02" },
  { code: "TR-003", title: "انتقال بین انبار", status: "تأیید شده", date: "1404/06/03" },
  { code: "GR-002", title: "ورود برگشتی", status: "پیش‌نویس", date: "1404/06/04" },
];

export default function LayoutGuidePage() {
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rows, setRows] = useState<DocRow[]>(initialRows);
  const [title, setTitle] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState<null | "modal" | "drawer">(null);

  const rowH = density === "comfortable" ? "h-10" : "h-8";
  const pad = density === "comfortable" ? "p-4" : "p-3";
  const text = density === "comfortable" ? "text-sm" : "text-xs";

  const isDirty = useMemo(
    () => title.trim().length > 0 || warehouse.trim().length > 0,
    [title, warehouse]
  );

  function resetFormFields() {
    setTitle("");
    setWarehouse("");
  }

  function requestClose(source: "modal" | "drawer") {
    if (isDirty) {
      setConfirmClose(source);
      return;
    }
    forceClose(source);
  }

  function forceClose(source: "modal" | "drawer") {
    if (source === "modal") setFormOpen(false);
    if (source === "drawer") setDrawerOpen(false);
    setConfirmClose(null);
    resetFormFields();
    setLastAction(
      "فرم بسته شد بدون ذخیره — داده ثبت نشده. کاربر نباید تصور کند ذخیره شده است."
    );
  }

  function handleSaveFromOverlay(source: "modal" | "drawer") {
    if (!title.trim()) {
      setLastAction("عنوان الزامی است — Overlay باز ماند؛ صفحه رفرش نشد.");
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      const code = `GR-${String(100 + rows.length).slice(-3)}`;
      const next: DocRow = {
        code,
        title: title.trim(),
        status: "پیش‌نویس",
        date: "همین الآن",
        isNew: true,
      };
      setRows((prev) => [next, ...prev.map((r) => ({ ...r, isNew: false }))]);
      setSaving(false);
      setFormOpen(false);
      setDrawerOpen(false);
      setConfirmClose(null);
      resetFormFields();
      setLastAction(
        `ذخیره موفق (${source === "modal" ? "Modal" : "Drawer"}): ${code} بدون رفرش به جدول اضافه شد.`
      );
    }, 400);
  }

  return (
    <div className="space-y-6">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین چیدمان (کامل)">
        <ul className="list-disc space-y-1 pr-5">
          <li>
            فاصله: main دسکتاپ <code className="rounded bg-muted px-1">p-4</code> · بین بخش‌ها{" "}
            <code className="rounded bg-muted px-1">space-y-6</code> (UI-01).
          </li>
          <li>آیکون B+D: Chip در Sidebar سطح۱؛ Outline در جدول.</li>
          <li>max-width برای فرم/متن؛ جدول می‌تواند عرض کامل Main بگیرد.</li>
          <li>Sticky فقط نوار همان ناحیه اسکرول — نه کل صفحه.</li>
          <li>فرم+جدول: A عمودی · B ثبت سریع ≤۴ فیلد · C جدول کامل + Modal/Drawer.</li>
          <li>بدون رفرش کامل بعد از mutation؛ Dirty Form بدون تأیید بسته نمی‌شود.</li>
          <li>ثبت عملیاتی ERP: ترجیح Drawer وقتی دیدن جدول همزمان لازم است.</li>
        </ul>
      </GuideRulesBox>

      {/* —— 1 Shell —— */}
      <GuideSection
        title="۱) App Shell — آناتومی"
        description="ساختار ثابت محصول: Sidebar + Header + Main. جزئیات ناوبری در UI-03."
      >
        <div className="overflow-hidden rounded-xl border border-border/70 shadow-[var(--shadow-sm)]">
          <div className="flex min-h-[300px]">
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
          دکمه منو را بزن تا Sidebar جمع شود. آیکون‌ها با Chip (سیاست B).
        </p>
      </GuideSection>

      {/* —— 2 max-width —— */}
      <GuideSection
        title="۲) عرض محتوا و max-w-5xl"
        description="سقف عرض برای خوانایی — نه اجبار باریک کردن همه جداول."
      >
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <code className="rounded bg-muted px-1 text-foreground">max-w-5xl</code> ≈ ۱۰۲۴px. روی
            مانیتور عریض، فرم/متن را تا افق نکش تا خط چشم خسته نشود.
          </p>
          <ul className="list-disc space-y-1 pr-5 text-xs">
            <li>
              <strong className="text-foreground">فرم، راهنما، تنظیمات:</strong> max-w-3xl تا max-w-5xl
            </li>
            <li>
              <strong className="text-foreground">جدول ستون‌دار:</strong> می‌تواند عرض کامل Main + اسکرول
              افقی بگیرد
            </li>
            <li>Shell همیشه full-width است؛ محدودیت فقط روی بلوک محتواست</li>
          </ul>
        </div>
        <div className="mt-3 space-y-2">
          <div className="rounded-lg border border-border/70 bg-card p-2">
            <div className="mb-1 text-[11px] text-muted-foreground">بدون سقف</div>
            <div className="h-8 w-full rounded bg-rose-500/15 text-center text-[10px] leading-8 text-rose-800 dark:text-rose-200">
              خط خیلی بلند
            </div>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
            <div className="mb-1 text-[11px] text-primary">با max-w-5xl (فرم)</div>
            <div className="mx-auto h-8 max-w-5xl rounded bg-primary/20 text-center text-[10px] leading-8 text-primary">
              عرض محدود و خوانا
            </div>
          </div>
          <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
            <div className="mb-2 text-xs font-medium text-primary">Grid ذهنی ۱۲ ستونه داخل محتوا</div>
            <div className="grid grid-cols-12 gap-1">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-7 items-center justify-center rounded bg-primary/15 font-mono text-[10px] text-primary"
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </GuideSection>

      {/* —— 3 Page header —— */}
      <GuideSection title="۳) Page Header استاندارد">
        <div className="rounded-xl border border-border/70 bg-card p-4 elevate-hover">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-base font-semibold text-foreground">اسناد انبار</h3>
                <p className="text-xs text-muted-foreground">ثبت، تأیید و ردیابی ورود و خروج</p>
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

      {/* —— 4 Density —— */}
      <GuideSection
        title="۴) Density روی چیدمان"
        description="همان دو حالت UI-01 — فقط فشردگی عوض می‌شود، نه منطق صفحه."
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

      {/* —— 5 Split —— */}
      <GuideSection
        title="۵) Split View — لیست + جزئیات"
        description="انتخاب از لیست و دیدن جزئیات کنار آن. فرم سنگین اینجا جا نمی‌گیرد."
      >
        <div className="grid min-h-[220px] gap-0 overflow-hidden rounded-xl border border-border/70 md:grid-cols-[minmax(180px,260px)_1fr]">
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

      {/* —— 6 Sticky —— */}
      <GuideSection
        title="۶) Sticky Toolbar"
        description="نوار ابزار همان جدول هنگام اسکرول ردیف‌ها می‌ماند — نه قفل کردن کل صفحه."
      >
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">درست:</strong> باکس جدول با ارتفاع محدود + اسکرول داخل
            همان باکس + نوار <code className="rounded bg-muted px-1">sticky top-0</code>.
          </p>
          <p>
            <strong className="text-foreground">غلط:</strong> sticky همزمان Header + فیلتر + فرم + چند
            کارت.
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

      {/* —— 7 Composition A/B —— */}
      <GuideSection title="۷) ترکیب فرم + جدول — الگوهای A و B">
        <div className="mb-3 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 text-xs text-muted-foreground dark:border-amber-900 dark:bg-amber-950/20">
          دو ستون اجباری وقتی فرم بلند است فضای خالی مرده می‌سازد. الگو را بر اساس سنگینی فرم انتخاب کن.
        </div>

        <div className="mb-5 space-y-2">
          <div className="text-sm font-medium text-foreground">
            A — عمودی (پیش‌فرض ERP)
          </div>
          <p className="text-xs text-muted-foreground">
            فرم متوسط/سنگین بالا · جدول پایین با اسکرول مستقل.
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

        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">
            B — کنار هم فقط ثبت سریع (≤۴ فیلد)
          </div>
          <p className="text-xs text-muted-foreground">
            شرط: فرم کوتاه. لیست با max-h و اسکرول مستقل تا ارتفاع فرم فضای مرده نسازد.
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
      </GuideSection>

      {/* —— 8 Pattern C + Modal/Drawer —— */}
      <GuideSection title="۸) الگو C — جدول کامل + Modal / Drawer + Dirty Guard">
        <div className="mb-3 space-y-2 text-xs text-muted-foreground">
          <p>
            صفحه = جدول تمام‌عرض. «جدید» فرم را در لایه باز می‌کند. ذخیره = ردیف در جدول بدون رفرش.
          </p>
        </div>

        <div className="mb-4 overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[600px] text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="px-3 py-2 text-right">موضوع</th>
                <th className="px-3 py-2 text-right">Modal</th>
                <th className="px-3 py-2 text-right">Drawer</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/50">
                <td className="px-3 py-2 font-medium text-foreground">دیدن جدول همزمان</td>
                <td className="px-3 py-2">ضعیف</td>
                <td className="px-3 py-2 text-foreground">بهتر — بخشی از جدول دیده می‌شود</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="px-3 py-2 font-medium text-foreground">فرم بلند</td>
                <td className="px-3 py-2">نامناسب</td>
                <td className="px-3 py-2 text-foreground">مناسب‌تر (ارتفاع کامل)</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-foreground">پیشنهاد ERP</td>
                <td className="px-3 py-2">تأیید کوتاه / ≤۵ فیلد</td>
                <td className="px-3 py-2 text-foreground">ثبت/ویرایش عملیاتی پیش‌فرض</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mb-4 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs dark:border-amber-900 dark:bg-amber-950/25">
          <div className="mb-2 flex items-center gap-2 font-medium text-amber-900 dark:text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            Dirty Form — بستن تصادفی
          </div>
          <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
            <li>فرم خالی: بستن با بیرون/Escape مجاز</li>
            <li>فرم Dirty: بستن بی‌صدا ممنوع → تأیید «دور انداختن تغییرات»</li>
            <li>بعد از دور انداختن: پیام روشن که ثبت نشد</li>
            <li>فقط ذخیره موفق Overlay را قطعی می‌بندد و جدول را به‌روز می‌کند</li>
          </ul>
        </div>

        {lastAction ? (
          <div className="mb-3 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs">
            {lastAction}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
            <span className="text-xs font-medium">اسناد · {rows.length} ردیف · بدون full reload</span>
            <div className="flex gap-2">
              <Button size="sm" className="h-8" onClick={() => setFormOpen(true)}>
                Modal
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8"
                onClick={() => setDrawerOpen(true)}
              >
                Drawer (ترجیح ثبت)
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="px-3 py-2 text-right">کد</th>
                  <th className="px-3 py-2 text-right">عنوان</th>
                  <th className="px-3 py-2 text-right">وضعیت</th>
                  <th className="px-3 py-2 text-right">تاریخ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.code}
                    className={cn(
                      "border-b border-border/40 last:border-0",
                      r.isNew && "bg-primary/10"
                    )}
                  >
                    <td className="px-3 py-2 font-mono text-primary">{r.code}</td>
                    <td className="px-3 py-2">
                      {r.title}{" "}
                      {r.isNew ? (
                        <Badge variant="success" className="text-[9px]">
                          جدید
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{r.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          امتحان: چیزی تایپ کن → بیرون کلیک / انصراف → باید تأیید بگیری. ذخیره → ردیف جدید بدون رفرش.
        </p>

        <Dialog
          open={formOpen}
          onOpenChange={(open) => {
            if (!open) requestClose("modal");
            else setFormOpen(true);
          }}
        >
          <DialogContent
            className="sm:max-w-md"
            onPointerDownOutside={(e) => {
              if (isDirty) {
                e.preventDefault();
                setConfirmClose("modal");
              }
            }}
            onEscapeKeyDown={(e) => {
              if (isDirty) {
                e.preventDefault();
                setConfirmClose("modal");
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>سند جدید — Modal</DialogTitle>
              <DialogDescription>فرم کوتاه · Dirty بدون تأیید بسته نمی‌شود</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-title">عنوان</Label>
                <Input
                  id="m-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-wh">انبار</Label>
                <Input
                  id="m-wh"
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                />
              </div>
              {isDirty ? (
                <Badge variant="warning" className="text-[10px]">
                  Dirty
                </Badge>
              ) : null}
            </div>
            <DialogFooter>
              <Button variant="outline" disabled={saving} onClick={() => requestClose("modal")}>
                انصراف
              </Button>
              <Button disabled={saving} onClick={() => handleSaveFromOverlay("modal")}>
                {saving ? "…" : "ذخیره"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 flex justify-start">
            <button
              type="button"
              className="absolute inset-0 bg-black/30"
              aria-label="تلاش بستن"
              onClick={() => requestClose("drawer")}
            />
            <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l bg-background shadow-[var(--shadow-lg)]">
              <div className="border-b px-4 py-3">
                <div className="text-sm font-semibold">سند جدید — Drawer</div>
                <div className="text-[11px] text-muted-foreground">
                  جدول در پس‌زمینه هنوز قابل رجوع چشمی است
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-auto p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="d-title">عنوان</Label>
                  <Input
                    id="d-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-wh">انبار</Label>
                  <Input
                    id="d-wh"
                    value={warehouse}
                    onChange={(e) => setWarehouse(e.target.value)}
                  />
                </div>
                {isDirty ? (
                  <div className="rounded-md border border-amber-300/60 bg-amber-50/80 px-2 py-1.5 text-[11px] text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    تغییر ذخیره‌نشده — کلیک بیرون بدون تأیید نمی‌بندد
                  </div>
                ) : null}
              </div>
              <div className="flex gap-2 border-t p-4">
                <Button
                  className="flex-1"
                  disabled={saving}
                  onClick={() => handleSaveFromOverlay("drawer")}
                >
                  {saving ? "…" : "ذخیره"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={saving}
                  onClick={() => requestClose("drawer")}
                >
                  انصراف
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <Dialog open={confirmClose !== null} onOpenChange={(o) => !o && setConfirmClose(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>تغییرات ذخیره نشده</DialogTitle>
              <DialogDescription>
                اگر ببندید داده ثبت نمی‌شود. مطمئن هستید؟
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmClose(null)}>
                ادامه ویرایش
              </Button>
              <Button
                variant="destructive"
                onClick={() => confirmClose && forceClose(confirmClose)}
              >
                دور انداختن
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </GuideSection>

      {/* —— 9 no refresh —— */}
      <GuideSection title="۹) بدون رفرش کامل صفحه">
        <ol className="list-decimal space-y-1.5 pr-5 text-xs text-muted-foreground">
          <li>ذخیره → API از کلاینت (نه submit کلاسیک مرورگر)</li>
          <li>موفق → بستن Overlay + درج ردیف در state/cache + Toast (UI-06)</li>
          <li>ناموفق → Overlay باز + خطا روی فرم</li>
          <li>اسکرول و فیلتر کاربر حفظ شود</li>
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">
          جزئیات بیشتر: UI-04 Forms · UI-05 Tables · UI-06 Feedback
        </p>
      </GuideSection>

      {/* —— 10 Do/Dont —— */}
      <GuideSection title="۱۰) Do / Don’t">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="mb-2 font-medium text-emerald-800 dark:text-emerald-200">انجام بده</div>
            <ul className="list-disc space-y-1 pr-5 text-xs text-muted-foreground">
              <li>Shell ثابت؛ محتوا داخل Main</li>
              <li>الگوی A/B/C بر اساس سنگینی فرم</li>
              <li>Drawer برای ثبت با نیاز به دیدن جدول</li>
              <li>Dirty Guard قبل از بستن</li>
              <li>به‌روزرسانی درجا بدون reload</li>
            </ul>
          </div>
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-4 text-sm dark:border-rose-900 dark:bg-rose-950/30">
            <div className="mb-2 font-medium text-rose-800 dark:text-rose-200">انجام نده</div>
            <ul className="list-disc space-y-1 pr-5 text-xs text-muted-foreground">
              <li>دو ستون اجباری برای فرم بلند</li>
              <li>Sticky تو در تو روی کل صفحه</li>
              <li>بستن بی‌صدای فرم Dirty</li>
              <li>رفرش کامل بعد از یک ثبت ساده</li>
              <li>فرض اینکه بسته شدن = ذخیره</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <Separator />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/foundations">UI-01 Foundations</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/navigation">UI-03 Navigation</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide">فهرست</a>
        </Button>
      </div>
    </div>
  );
}
