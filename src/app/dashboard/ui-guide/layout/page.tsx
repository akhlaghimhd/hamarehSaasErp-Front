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
    "اسکلت صفحه: App Shell، عرض، Density، Sticky، Split، ترکیب فرم+جدول، به‌روزرسانی درجا، قواعد Overlay.",
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

  function handleSave() {
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
    }, 350);
  }

  return (
    <div className="space-y-6">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین این صفحه (جمع‌بندی چت)">
        <ul className="list-disc space-y-1 pr-5">
          <li>
            فاصله UI-01: main <code className="rounded bg-muted px-1">p-4</code> · بخش‌ها{" "}
            <code className="rounded bg-muted px-1">space-y-6</code>
          </li>
          <li>آیکون B+D · Chip Sidebar سطح۱ · Outline جدول · Duotone فقط Empty/Hero</li>
          <li>max-w-5xl برای فرم/متن · جدول می‌تواند عرض کامل Main باشد</li>
          <li>Sticky فقط نوار همان ناحیه اسکرول</li>
          <li>
            فرم+جدول: A عمودی پیش‌فرض · B کنار هم فقط ≤۴ فیلد · C جدول کامل + Modal/Drawer
          </li>
          <li>Drawer وقتی دیدن جدول همزمان مفید است · Modal برای فرم کوتاه</li>
          <li>بدون رفرش کامل بعد از mutation</li>
          <li>
            Overlay: تمیز → بیرون/انصراف آزاد · تغییرکرده → فقط ثبت یا انصراف می‌بندد · انصراف
            بدون سؤال · برچسب «جدید» کنار عنوان بعد از ثبت · نوتیف در UI-06
          </li>
        </ul>
      </GuideRulesBox>

      <GuideSection title="۱) App Shell — آناتومی">
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
                    <div className="text-[10px] text-muted-foreground">Shell</div>
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
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => setSidebarCollapsed((v) => !v)}
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground">Header</span>
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
                <div className="text-xs font-medium">Main Content</div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {["اسناد امروز", "در انتظار", "موجودی"].map((t) => (
                    <div key={t} className="rounded-lg border bg-card p-3 elevate-hover">
                      <div className="text-[11px] text-muted-foreground">{t}</div>
                      <div className="text-lg font-semibold">—</div>
                    </div>
                  ))}
                </div>
              </main>
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۲) عرض محتوا و max-w-5xl">
        <p className="text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1">max-w-5xl</code> ≈ ۱۰۲۴px برای فرم/متن. جدول
          ستون‌دار می‌تواند عرض کامل Main + اسکرول افقی بگیرد.
        </p>
        <div className="mt-3 grid grid-cols-12 gap-1">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex h-7 items-center justify-center rounded bg-primary/15 font-mono text-[10px] text-primary"
            >
              {i + 1}
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection title="۳) Page Header">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4 elevate-hover">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <div className="text-base font-semibold">اسناد انبار</div>
              <div className="text-xs text-muted-foreground">ثبت و ردیابی</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline">
              خروجی
            </Button>
            <Button size="sm">سند جدید</Button>
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
        <div className="rounded-xl border bg-card">
          {["پیش‌نویس · GR-001", "در انتظار · GI-014", "تأیید شده · TR-003"].map((row) => (
            <div
              key={row}
              className={cn(
                "flex items-center justify-between border-b last:border-0",
                pad,
                rowH
              )}
            >
              <span className={cn("flex items-center gap-2", textSize)}>
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

      <GuideSection title="۵) Split View — لیست + جزئیات">
        <div className="grid min-h-[220px] overflow-hidden rounded-xl border md:grid-cols-[minmax(180px,260px)_1fr]">
          <div className="border-l bg-card">
            <div className="border-b px-3 py-2 text-xs font-medium">فهرست</div>
            {["کالای A", "کالای B", "کالای C"].map((item, i) => (
              <div
                key={item}
                className={cn(
                  "flex items-center gap-2 border-b px-3 py-2.5 text-xs last:border-0",
                  i === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                <Package className="h-3.5 w-3.5" />
                {item}
              </div>
            ))}
          </div>
          <div className="space-y-3 bg-muted/15 p-4">
            <div className="text-sm font-semibold">جزئیات کالای A</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg border bg-card p-3 text-xs">
                <div className="text-muted-foreground">کد</div>
                <div className="font-medium">ITM-001</div>
              </div>
              <div className="rounded-lg border bg-card p-3 text-xs">
                <div className="text-muted-foreground">موجودی</div>
                <div className="font-medium">۱۲۰</div>
              </div>
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۶) Sticky Toolbar">
        <p className="mb-2 text-xs text-muted-foreground">
          نوار فقط بالای همان جدول می‌ماند — نه کل صفحه.
        </p>
        <div className="max-h-44 overflow-auto rounded-xl border">
          <div className="sticky top-0 z-10 flex justify-between border-b bg-card/95 px-3 py-2 text-xs backdrop-blur">
            <span>۱۲ نتیجه</span>
            <Button size="sm" className="h-7 text-[11px]">
              جدید
            </Button>
          </div>
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="flex h-9 items-center justify-between border-b px-3 text-xs last:border-0"
            >
              <span className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-primary" />
                ردیف {i + 1}
              </span>
              <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection title="۷) الگوهای A و B">
        <div className="mb-4 space-y-2">
          <div className="text-sm font-medium">A — عمودی (پیش‌فرض)</div>
          <div className="space-y-2 rounded-xl border p-3">
            <div className="rounded-lg bg-muted/30 p-3 text-xs">فرم بالا</div>
            <div className="max-h-28 overflow-auto rounded-lg border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border-b px-3 py-1.5 text-[11px] last:border-0">
                  ردیف {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">B — کنار هم فقط ≤۴ فیلد + اسکرول مستقل</div>
          <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
            <div className="rounded-xl border p-3 text-xs">فرم کوتاه</div>
            <div className="max-h-32 overflow-auto rounded-xl border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border-b px-3 py-1.5 text-[11px] last:border-0">
                  اخیر {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۸) الگو C — Modal / Drawer">
        <div className="mb-3 rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
          <div className="mb-1 font-medium text-foreground">قواعد Overlay</div>
          <ul className="list-disc space-y-1 pr-5">
            <li>بدون تغییر: کلیک بیرون و انصراف آزاد</li>
            <li>با تغییر فیلد: فقط ثبت یا انصراف می‌بندد — کلیک بیرون نمی‌بندد</li>
            <li>انصراف بدون سؤال</li>
            <li>بعد از ثبت: برچسب «جدید» کنار عنوان ردیف · نوتیف در UI-06</li>
          </ul>
        </div>

        <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
            <span className="text-xs font-medium">{rows.length} سند</span>
            <div className="flex gap-2">
              <Button size="sm" className="h-8" onClick={() => setFormOpen(true)}>
                Modal
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => setDrawerOpen(true)}>
                Drawer
              </Button>
            </div>
          </div>
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
                  className={cn("border-b last:border-0", r.isNew && "bg-primary/5")}
                >
                  <td className="px-3 py-2 font-mono text-primary">{r.code}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5">
                      {r.title}
                      {r.isNew ? (
                        <Badge variant="success" className="text-[9px]">
                          جدید
                        </Badge>
                      ) : null}
                    </span>
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

        <Dialog
          open={formOpen}
          onOpenChange={(open) => {
            if (open) {
              setFormOpen(true);
              return;
            }
            if (!isDirty) closeOverlay();
          }}
        >
          <DialogContent
            className="sm:max-w-md"
            onPointerDownOutside={(e) => {
              if (isDirty) e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              if (isDirty) e.preventDefault();
            }}
            onInteractOutside={(e) => {
              if (isDirty) e.preventDefault();
            }}
          >
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
              <Button disabled={saving || !canSubmit} onClick={handleSave}>
                {saving ? "…" : "ثبت"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 flex justify-start">
            <button
              type="button"
              className="absolute inset-0 bg-black/25"
              aria-label="بستن"
              onClick={() => {
                if (!isDirty) closeOverlay();
              }}
            />
            <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l bg-background shadow-[var(--shadow-lg)]">
              <div className="border-b px-4 py-3">
                <div className="text-sm font-semibold">سند جدید</div>
                <div className="text-[11px] text-muted-foreground">Drawer</div>
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
                <Button className="flex-1" disabled={saving || !canSubmit} onClick={handleSave}>
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

      <GuideSection title="۹) بدون رفرش صفحه">
        <ol className="list-decimal space-y-1 pr-5 text-xs text-muted-foreground">
          <li>mutation از کلاینت — نه submit کلاسیک</li>
          <li>موفق: بستن Overlay + به‌روزرسانی جدول</li>
          <li>ناموفق: Overlay باز + خطا روی فرم</li>
        </ol>
      </GuideSection>

      <GuideSection title="۱۰) Do / Don’t">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="mb-2 font-medium text-emerald-800 dark:text-emerald-200">انجام بده</div>
            <ul className="list-disc space-y-1 pr-5 text-xs text-muted-foreground">
              <li>فرم تغییرکرده فقط با ثبت/انصراف بسته شود</li>
              <li>برچسب جدید کنار عنوان بعد از ثبت</li>
              <li>به‌روزرسانی درجا بدون reload</li>
            </ul>
          </div>
          <div className="rounded-xl border bg-muted/25 p-4 text-sm">
            <div className="mb-2 font-medium">انجام نده</div>
            <ul className="list-disc space-y-1 pr-5 text-xs text-muted-foreground">
              <li>بستن با کلیک بیرون وقتی فرم پر شده</li>
              <li>سؤال اضافه برای انصراف</li>
              <li>رفرش کامل بعد از ثبت ساده</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <Separator />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/foundations">UI-01</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/navigation">UI-03</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide">فهرست</a>
        </Button>
      </div>
    </div>
  );
}
