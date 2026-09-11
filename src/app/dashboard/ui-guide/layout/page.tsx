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
    "اسکلت صفحه: App Shell، عرض محتوا، Sticky، Split View و قوانین ترکیب فرم+جدول بدون پرت فضا.",
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
  const [formOpen, setFormOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
          <li>آیکون B+D: Chip در Sidebar سطح۱؛ Outline در جدول.</li>
          <li>max-width برای فرم/متن؛ جدول می‌تواند عریض‌تر باشد.</li>
          <li>Sticky فقط روی نوار همان ناحیه اسکرول.</li>
          <li>
            فرم+جدول: پیش‌فرض عمودی؛ کنار هم فقط ثبت سریع؛ فرم سنگین در Modal/Drawer.
          </li>
        </ul>
      </GuideRulesBox>

      <GuideSection title="۱) App Shell">
        <div className="overflow-hidden rounded-xl border border-border/70 shadow-[var(--shadow-sm)]">
          <div className="flex min-h-[240px]">
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
                  <div className="truncate text-xs font-semibold">هماره ERP</div>
                )}
              </div>
              <nav className="space-y-0.5 p-1.5">
                {navItems.map(({ label, Icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {!sidebarCollapsed && label}
                  </div>
                ))}
              </nav>
            </aside>
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="header-blur flex h-12 items-center justify-between border-b px-3">
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
                <div className="text-xs text-muted-foreground">Main</div>
              </main>
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۲) max-w-5xl">
        <p className="text-sm text-muted-foreground">
          سقف عرض ≈۱۰۲۴px برای فرم/متن تا روی مانیتور عریض خط چشم خسته نشود. جدول ستون‌دار
          می‌تواند عرض کامل Main را بگیرد.
        </p>
      </GuideSection>

      <GuideSection title="۳) Page Header">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-4 w-4" />
            </span>
            <div>
              <div className="text-base font-semibold">اسناد انبار</div>
              <div className="text-xs text-muted-foreground">ثبت و ردیابی</div>
            </div>
          </div>
          <Button size="sm">سند جدید</Button>
        </div>
      </GuideSection>

      <GuideSection title="۴) Density">
        <div className="mb-2 flex gap-2">
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
          {["پیش‌نویس", "در انتظار", "تأیید شده"].map((row) => (
            <div
              key={row}
              className={cn(
                "flex items-center justify-between border-b last:border-0",
                pad,
                rowH
              )}
            >
              <span className={cn("flex items-center gap-2", text)}>
                <FileText className="h-3.5 w-3.5 text-primary" />
                {row}
              </span>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection title="۵) Split — لیست + جزئیات">
        <div className="grid min-h-[180px] overflow-hidden rounded-xl border md:grid-cols-[220px_1fr]">
          <div className="border-l bg-card">
            {["کالای A", "کالای B"].map((item, i) => (
              <div
                key={item}
                className={cn(
                  "px-3 py-2 text-xs",
                  i === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"
                )}
              >
                {item}
              </div>
            ))}
          </div>
          <div className="bg-muted/15 p-4 text-sm">جزئیات انتخاب‌شده</div>
        </div>
      </GuideSection>

      <GuideSection title="۶) Sticky Toolbar">
        <p className="mb-2 text-xs text-muted-foreground">
          نوار ابزار فقط بالای همان جدول می‌ماند؛ کل صفحه sticky نمی‌شود.
        </p>
        <div className="max-h-40 overflow-auto rounded-xl border">
          <div className="sticky top-0 z-10 flex justify-between border-b bg-card/95 px-3 py-2 text-xs backdrop-blur">
            <span>۱۲ نتیجه</span>
            <Button size="sm" className="h-7 text-[11px]">
              جدید
            </Button>
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex h-8 items-center gap-2 border-b px-3 text-xs last:border-0">
              <FileText className="h-3.5 w-3.5 text-primary" />
              ردیف {i + 1}
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection title="۷) ترکیب فرم + جدول">
        <div className="mb-3 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 text-xs text-muted-foreground dark:border-amber-900 dark:bg-amber-950/20">
          دو ستون اجباری وقتی فرم بلند است فضای خالی مرده می‌سازد. سه الگو:
        </div>

        <div className="mb-6 space-y-2">
          <div className="text-sm font-medium">A — عمودی (پیش‌فرض)</div>
          <div className="space-y-2 rounded-xl border p-3">
            <div className="rounded-lg bg-muted/30 p-3 text-xs">فرم بالا</div>
            <div className="max-h-28 overflow-auto rounded-lg border">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border-b px-3 py-1.5 text-[11px] last:border-0">
                  ردیف جدول {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <div className="text-sm font-medium">B — کنار هم فقط ثبت سریع (≤۴ فیلد)</div>
          <div className="grid gap-3 lg:grid-cols-[280px_1fr]">
            <div className="rounded-xl border p-3 text-xs">فرم کوتاه + ذخیره</div>
            <div className="max-h-32 overflow-auto rounded-xl border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border-b px-3 py-1.5 text-[11px] last:border-0">
                  اخیر {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-sm font-medium text-foreground">
            C — جدول کامل روی صفحه + فرم در Modal یا Drawer
          </div>
          <p className="text-xs text-muted-foreground">
            صفحه همیشه فقط جدول (و فیلتر) است. وقتی «سند جدید» می‌زنی، فرم روی یک لایه جدا باز
            می‌شود. جدول پشت آن می‌ماند و بعد از بستن فرم دوباره کامل دیده می‌شود. هیچ ستونی کنار
            جدول اشغال نمی‌شود و فضای خالی مرده ساخته نمی‌شود.
          </p>

          {/* Live full-width table */}
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-[var(--shadow-sm)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 px-3 py-2">
              <span className="text-xs font-medium text-foreground">اسناد انبار · تمام عرض</span>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="h-8" onClick={() => setFormOpen(true)}>
                  جدید — Modal
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={() => setDrawerOpen(true)}
                >
                  جدید — Drawer
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground">
                    <th className="px-3 py-2 text-right font-medium">کد</th>
                    <th className="px-3 py-2 text-right font-medium">عنوان</th>
                    <th className="px-3 py-2 text-right font-medium">وضعیت</th>
                    <th className="px-3 py-2 text-right font-medium">تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["GR-001", "ورود محموله", "پیش‌نویس", "1404/06/01"],
                    ["GI-014", "خروج مصرف", "در انتظار", "1404/06/02"],
                    ["TR-003", "انتقال بین انبار", "تأیید شده", "1404/06/03"],
                    ["GR-002", "ورود برگشتی", "پیش‌نویس", "1404/06/04"],
                  ].map((r) => (
                    <tr key={r[0]} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2 font-mono text-primary">{r[0]}</td>
                      <td className="px-3 py-2">{r[1]}</td>
                      <td className="px-3 py-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {r[2]}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid gap-2 text-[11px] text-muted-foreground sm:grid-cols-2">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
              <strong className="text-foreground">Modal:</strong> وسط صفحه، برای فرم متوسط، تمرکز
              کامل روی ثبت.
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-2">
              <strong className="text-foreground">Drawer:</strong> از لبه (معمولاً راست در LTR / مناسب
              RTL از چپ یا راست)، برای فرم‌های کمی بلندتر بدون ترک کامل زمینه جدول.
            </div>
          </div>
        </div>

        {/* Modal form */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>سند جدید (Modal)</DialogTitle>
              <DialogDescription>
                جدول پشت این پنجره است. بعد از ذخیره یا بستن، دوباره جدول کامل را می‌بینی.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label htmlFor="m-title">عنوان</Label>
                <Input id="m-title" placeholder="مثلاً ورود محموله" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-wh">انبار</Label>
                <Input id="m-wh" placeholder="انبار مرکزی" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-note">توضیح</Label>
                <Input id="m-note" placeholder="اختیاری" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                انصراف
              </Button>
              <Button onClick={() => setFormOpen(false)}>ذخیره</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Simple drawer simulation (panel from side) */}
        {drawerOpen ? (
          <div className="fixed inset-0 z-50 flex justify-start">
            <button
              type="button"
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
              aria-label="بستن"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-[var(--shadow-lg)] animate-in slide-in-from-left duration-200">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">سند جدید (Drawer)</div>
                  <div className="text-[11px] text-muted-foreground">
                    از کنار صفحه باز می‌شود؛ جدول هنوز در پس‌زمینه است
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setDrawerOpen(false)}>
                  بستن
                </Button>
              </div>
              <div className="flex-1 space-y-3 overflow-auto p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="d-title">عنوان</Label>
                  <Input id="d-title" placeholder="عنوان سند" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-wh">انبار</Label>
                  <Input id="d-wh" placeholder="انبار" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-date">تاریخ</Label>
                  <Input id="d-date" placeholder="1404/06/20" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-note">شرح</Label>
                  <Input id="d-note" placeholder="توضیحات بیشتر…" />
                </div>
              </div>
              <div className="flex gap-2 border-t p-4">
                <Button className="flex-1" onClick={() => setDrawerOpen(false)}>
                  ذخیره
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>
                  انصراف
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">جمع‌بندی C:</strong> صفحه = جدول تمام‌عرض. اکشن
          «جدید/ویرایش» → Modal یا Drawer با فرم. بعد از بستن → برگشت به همان جدول بدون به‌هم‌ریختن
          چیدمان.
        </div>
      </GuideSection>

      <GuideSection title="۸) Do / Don’t">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="mb-2 font-medium text-emerald-800 dark:text-emerald-200">انجام بده</div>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>فرم سنگین در Modal/Drawer</li>
              <li>جدول با عرض کامل وقتی ستون زیاد است</li>
              <li>اسکرول مستقل برای لیست‌های بلند</li>
            </ul>
          </div>
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-4 text-sm dark:border-rose-900 dark:bg-rose-950/30">
            <div className="mb-2 font-medium text-rose-800 dark:text-rose-200">انجام نده</div>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>دو ستون اجباری برای فرم بلند</li>
              <li>فشردن جدول در کنار فرم ۱۰ فیلدی</li>
              <li>Sticky روی کل صفحه</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <Separator />

      <div className="flex flex-wrap gap-2">
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
