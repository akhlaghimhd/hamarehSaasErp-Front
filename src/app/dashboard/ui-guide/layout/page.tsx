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
} from "lucide-react";

const meta = {
  code: "UI-02",
  title: "Layout & Structure",
  description:
    "اسکلت صفحه محصول: App Shell، عرض محتوا، Density، Sticky، Split، ترکیب فرم+جدول، به‌روزرسانی درجا، و قواعد سبک Overlay.",
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
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rowH = density === "comfortable" ? "h-10" : "h-8";
  const pad = density === "comfortable" ? "p-4" : "p-3";
  const textSize = density === "comfortable" ? "text-sm" : "text-xs";

  const isDirty = useMemo(
    () => title.trim().length > 0 || warehouse.trim().length > 0,
    [title, warehouse]
  );
  const canSubmit = title.trim().length > 0;

  function resetFormFields() {
    setTitle("");
    setWarehouse("");
  }

  function closeOverlay() {
    setFormOpen(false);
    setDrawerOpen(false);
    resetFormFields();
  }

  function handleSave(source: "modal" | "drawer") {
    if (!canSubmit) return;
    setSaving(true);
    window.setTimeout(() => {
      const code = `GR-${String(100 + rows.length).slice(-3)}`;
      setRows((prev) => [
        {
          code,
          title: title.trim(),
          status: "پیش‌نویس",
          date: "همین الآن",
          isNew: true,
        },
        ...prev.map((r) => ({ ...r, isNew: false })),
      ]);
      setSaving(false);
      closeOverlay();
      setNotice(`ثبت شد · ${code}`);
      window.setTimeout(() => setNotice(null), 2500);
    }, 350);
  }

  return (
    <div className="space-y-6">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین این صفحه (جمع‌بندی چت)">
        <ul className="list-disc space-y-1 pr-5">
          <li>
            فاصله از UI-01: main <code className="rounded bg-muted px-1">p-4</code> · بین بخش‌ها{" "}
            <code className="rounded bg-muted px-1">space-y-6</code>
          </li>
          <li>آیکون B+D: Chip سطح۱ Sidebar · Outline در جدول · Duotone فقط Empty/Hero</li>
          <li>
            max-w-5xl (~۱۰۲۴px) برای فرم/متن · جدول ستون‌دار می‌تواند عرض کامل Main + اسکرول افقی
          </li>
          <li>Sticky فقط نوار همان ناحیه اسکرول · نه چند لایه روی کل صفحه</li>
          <li>
            فرم+جدول: <strong className="text-foreground">A</strong> عمودی پیش‌فرض ·{" "}
            <strong className="text-foreground">B</strong> کنار هم فقط ثبت سریع ≤۴ فیلد با اسکرول
            مستقل · <strong className="text-foreground">C</strong> جدول کامل + Modal/Drawer
          </li>
          <li>Drawer ترجیح ثبت عملیاتی وقتی دیدن جدول همزمان مفید است · Modal برای فرم کوتاه</li>
          <li>بعد از mutation: بدون رفرش کامل صفحه · به‌روزرسانی همان لیست/جدول</li>
          <li>
            Overlay: فرم تمیز → بستن آزاد · تغییر داده → نشان روی دکمه ذخیره · انصراف بدون سؤال ·
            نوتیف فقط بعد از ثبت/ویرایش/حذف موفق
          </li>
        </ul>
      </GuideRulesBox>

      {/* 1 Shell */}
      <GuideSection
        title="۱) App Shell — آناتومی"
        description="Sidebar + Header + Main ثابت. جزئیات ناوبری در UI-03."
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
                <div className="flex gap-1.5">
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
          منو را جمع کن. آیکون سطح۱ با Chip (سیاست B).
        </p>
      </GuideSection>

      {/* 2 width */}
      <GuideSection
        title="۲) عرض محتوا و max-w-5xl"
        description="سقف خوانایی برای فرم/متن — جدول اجباری به باریک شدن نیست."
      >
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <code className="rounded bg-muted px-1 text-foreground">max-w-5xl</code> ≈ ۱۰۲۴px. روی
            ultrawide فرم را تا افق نکش.
          </p>
          <ul className="list-disc space-y-1 pr-5 text-xs">
            <li>
              <strong className="text-foreground">فرم / راهنما / تنظیمات:</strong> max-w-3xl تا
              max-w-5xl
            </li>
            <li>
              <strong className="text-foreground">جدول ستون‌دار:</strong> عرض Main + اسکرول افقی در
              صورت نیاز
            </li>
            <li>Shell همیشه full-width</li>
          </ul>
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-8 w-full rounded bg-rose-500/10 text-center text-[10px] leading-8 text-rose-800 dark:text-rose-200">
            بدون سقف — خط خیلی بلند
          </div>
          <div className="mx-auto h-8 max-w-5xl rounded bg-primary/15 text-center text-[10px] leading-8 text-primary">
            با max-w-5xl — خوانا
          </div>
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
      </GuideSection>

      {/* 3 header */}
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
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                خروجی
              </Button>
              <Button size="sm">سند جدید</Button>
            </div>
          </div>
        </div>
      </GuideSection>

      {/* 4 density */}
      <GuideSection title="۴) Density" description="فقط فشردگی؛ منطق صفحه ثابت.">
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
              <span className={cn("flex items-center gap-2 text-foreground", textSize)}>
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

      {/* 5 split */}
      <GuideSection
        title="۵) Split View — لیست + جزئیات"
        description="نه جای فرم سنگین کنار جدول کامل."
      >
        <div className="grid min-h-[220px] overflow-hidden rounded-xl border border-border/70 md:grid-cols-[minmax(180px,260px)_1fr]">
          <div className="border-l border-border/70 bg-card">
            <div className="border-b border-border/60 px-3 py-2 text-xs font-medium">فهرست</div>
            {["کالای A", "کالای B", "کالای C"].map((item, i) => (
              <div
                key={item}
                className={cn(
                  "flex items-center gap-2 border-b border-border/40 px-3 py-2.5 text-xs last:border-0",
                  i === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"
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
                <div className="font-medium">ITM-001</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card p-3 text-xs">
                <div className="text-muted-foreground">موجودی</div>
                <div className="font-medium">۱۲۰</div>
              </div>
            </div>
            <Button size="sm">ویرایش</Button>
          </div>
        </div>
      </GuideSection>

      {/* 6 sticky */}
      <GuideSection title="۶) Sticky Toolbar">
        <p className="mb-2 text-xs text-muted-foreground">
          نوار فیلتر/اکشن همان جدول هنگام اسکرول ردیف‌ها می‌ماند. کل صفحه را sticky نکن.
        </p>
        <div className="max-h-44 overflow-auto rounded-xl border border-border/70">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/70 bg-card/95 px-3 py-2 backdrop-blur">
            <span className="text-xs font-medium">۱۲ نتیجه</span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" className="h-7 text-[11px]">
                فیلتر
              </Button>
              <Button size="sm" className="h-7 text-[11px]">
                جدید
              </Button>
            </div>
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex h-9 items-center justify-between border-b border-border/40 px-3 text-xs text-muted-foreground last:border-0"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-primary" />
                ردیف {i + 1}
              </span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </div>
          ))}
        </div>
      </GuideSection>

      {/* 7 A B */}
      <GuideSection title="۷) ترکیب فرم + جدول — الگوهای A و B">
        <div className="mb-3 rounded-lg border border-border/70 bg-muted/25 p-3 text-xs text-muted-foreground">
          دو ستون اجباری برای فرم بلند → فضای خالی مرده. الگو را با سنگینی فرم انتخاب کن.
        </div>

        <div className="mb-5 space-y-2">
          <div className="text-sm font-medium text-foreground">A — عمودی (پیش‌فرض ERP)</div>
          <p className="text-xs text-muted-foreground">فرم متوسط/سنگین بالا · جدول پایین با اسکرول مستقل</p>
          <div className="space-y-3 rounded-xl border border-border/70 bg-card p-3">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="mb-2 text-xs font-medium">فرم ثبت</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="h-8 rounded-md border bg-card px-2 text-[11px] leading-8 text-muted-foreground">
                  عنوان
                </div>
                <div className="h-8 rounded-md border bg-card px-2 text-[11px] leading-8 text-muted-foreground">
                  انبار
                </div>
                <div className="h-8 rounded-md border bg-card px-2 text-[11px] leading-8 text-muted-foreground sm:col-span-2">
                  توضیحات
                </div>
              </div>
              <Button size="sm" className="mt-2">
                ذخیره
              </Button>
            </div>
            <div className="max-h-36 overflow-auto rounded-lg border">
              <div className="sticky top-0 border-b bg-card px-3 py-1.5 text-[11px] font-medium">
                فهرست اسناد
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-8 items-center gap-2 border-b px-3 text-[11px] last:border-0"
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
            لیست با max-h و اسکرول مستقل تا ارتفاع فرم فضای مرده نسازد.
          </p>
          <div className="grid items-start gap-3 lg:grid-cols-[minmax(220px,320px)_1fr]">
            <div className="rounded-xl border border-border/70 bg-card p-3">
              <div className="mb-2 text-xs font-medium">ثبت سریع</div>
              <div className="space-y-2">
                <div className="h-8 rounded-md border bg-muted/20 px-2 text-[11px] leading-8 text-muted-foreground">
                  عنوان
                </div>
                <div className="h-8 rounded-md border bg-muted/20 px-2 text-[11px] leading-8 text-muted-foreground">
                  انبار
                </div>
                <Button size="sm" className="w-full">
                  ذخیره
                </Button>
              </div>
            </div>
            <div className="max-h-40 overflow-auto rounded-xl border border-border/70 bg-card">
              <div className="sticky top-0 border-b bg-card px-3 py-1.5 text-[11px] font-medium">
                اخیر
              </div>
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="flex h-8 items-center justify-between border-b px-3 text-[11px] last:border-0"
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

      {/* 8 C */}
      <GuideSection title="۸) الگو C — جدول کامل + Modal / Drawer">
        <div className="mb-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
            <strong className="text-foreground">Modal:</strong> فرم کوتاه، تأیید، تمرکز کامل
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
            <strong className="text-foreground">Drawer:</strong> ثبت عملیاتی وقتی دیدن جدول همزمان
            مفید است
          </div>
        </div>

        <div className="mb-3 rounded-lg border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
          <div className="mb-1 font-medium text-foreground">قواعد Overlay (سبک)</div>
          <ul className="list-disc space-y-1 pr-5">
            <li>بدون تغییر: بستن با کلیک بیرون و انصراف آزاد</li>
            <li>
              با تغییر فیلد: روی دکمه ثبت یک نشان رنگی (نقطه/نوار) روشن می‌شود؛ اگر الزامی‌ها کامل
              باشند ثبت فعال است
            </li>
            <li>انصراف: بدون سؤال بسته می‌شود (احترام به تصمیم کاربر)</li>
            <li>نوتیف فقط بعد از موفقیت: ثبت شد / ویرایش شد / حذف شد (جزئیات UI-06)</li>
          </ul>
        </div>

        {notice ? (
          <div className="mb-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-foreground">
            {notice}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
            <span className="text-xs font-medium">{rows.length} سند · بدون full reload</span>
            <div className="flex gap-2">
              <Button size="sm" className="h-8" onClick={() => setFormOpen(true)}>
                Modal
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => setDrawerOpen(true)}>
                Drawer
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
                      r.isNew && "bg-primary/5"
                    )}
                  >
                    <td className="px-3 py-2 font-mono text-primary">{r.code}</td>
                    <td className="px-3 py-2">{r.title}</td>
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

        {/* Modal */}
        <Dialog
          open={formOpen}
          onOpenChange={(open) => {
            if (!open) closeOverlay();
            else setFormOpen(true);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>سند جدید</DialogTitle>
              <DialogDescription>Modal · فرم کوتاه</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-title">عنوان *</Label>
                <Input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-wh">انبار</Label>
                <Input
                  id="m-wh"
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" disabled={saving} onClick={closeOverlay}>
                انصراف
              </Button>
              <Button
                disabled={saving || !canSubmit}
                onClick={() => handleSave("modal")}
                className="relative"
              >
                {isDirty ? (
                  <span className="absolute left-2 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber-400" />
                ) : null}
                {saving ? "…" : "ثبت"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Drawer */}
        {drawerOpen ? (
          <div className="fixed inset-0 z-50 flex justify-start">
            <button
              type="button"
              className="absolute inset-0 bg-black/25"
              aria-label="بستن"
              onClick={closeOverlay}
            />
            <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l bg-background shadow-[var(--shadow-lg)]">
              <div className="border-b px-4 py-3">
                <div className="text-sm font-semibold">سند جدید</div>
                <div className="text-[11px] text-muted-foreground">
                  Drawer · بخشی از جدول در پس‌زمینه دیده می‌شود
                </div>
              </div>
              <div className="flex-1 space-y-3 p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="d-title">عنوان *</Label>
                  <Input id="d-title" value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-wh">انبار</Label>
                  <Input
                    id="d-wh"
                    value={warehouse}
                    onChange={(e) => setWarehouse(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 border-t p-4">
                <Button
                  className="relative flex-1"
                  disabled={saving || !canSubmit}
                  onClick={() => handleSave("drawer")}
                >
                  {isDirty ? (
                    <span className="absolute left-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-amber-400" />
                  ) : null}
                  {saving ? "…" : "ثبت"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={saving}
                  onClick={closeOverlay}
                >
                  انصراف
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </GuideSection>

      {/* 9 no reload */}
      <GuideSection title="۹) بدون رفرش کامل صفحه">
        <ol className="list-decimal space-y-1.5 pr-5 text-xs text-muted-foreground">
          <li>mutation از کلاینت (React Query / state) — نه submit کلاسیک مرورگر</li>
          <li>موفق: بستن Overlay (اگر بود) + به‌روزرسانی همان جدول + نوتیف کوتاه</li>
          <li>ناموفق: Overlay باز می‌ماند + خطا روی فرم</li>
          <li>فیلتر و اسکرول کاربر حفظ شود</li>
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">
          جزئیات Forms / Tables / Feedback: UI-04 · UI-05 · UI-06
        </p>
      </GuideSection>

      {/* 10 do dont */}
      <GuideSection title="۱۰) Do / Don’t">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="mb-2 font-medium text-emerald-800 dark:text-emerald-200">انجام بده</div>
            <ul className="list-disc space-y-1 pr-5 text-xs text-muted-foreground">
              <li>Shell ثابت · محتوا در Main</li>
              <li>A/B/C بر اساس سنگینی فرم</li>
              <li>نشان dirty روی دکمه ثبت · انصراف آزاد</li>
              <li>نوتیف فقط بعد از موفقیت</li>
              <li>به‌روزرسانی درجا بدون reload</li>
            </ul>
          </div>
          <div className="rounded-xl border border-border/70 bg-muted/25 p-4 text-sm">
            <div className="mb-2 font-medium">انجام نده</div>
            <ul className="list-disc space-y-1 pr-5 text-xs text-muted-foreground">
              <li>دو ستون اجباری برای فرم بلند</li>
              <li>Sticky تو در تو روی کل صفحه</li>
              <li>دیالوگ مهیب برای هر انصراف</li>
              <li>رفرش کامل بعد از یک ثبت ساده</li>
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
          <a href="/dashboard/ui-guide/icon-lab">Icon Lab</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide">فهرست</a>
        </Button>
      </div>
    </div>
  );
}
