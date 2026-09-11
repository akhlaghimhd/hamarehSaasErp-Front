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
  FileText,
} from "lucide-react";

const meta = {
  code: "UI-02",
  title: "Layout & Structure",
  description:
    "اسکلت صفحه، ترکیب فرم+جدول، و قانون به‌روزرسانی درجا بدون رفرش کل صفحه.",
  phase: "فاز ۱",
  status: "ready" as const,
};

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
];

export default function LayoutGuidePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rows, setRows] = useState<DocRow[]>(initialRows);
  const [title, setTitle] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function resetFormFields() {
    setTitle("");
    setWarehouse("");
  }

  function handleSaveFromOverlay(source: "modal" | "drawer") {
    if (!title.trim()) {
      setLastAction("عنوان الزامی است — صفحه رفرش نشد، فقط اعتبارسنجی.");
      return;
    }
    setSaving(true);
    // شبیه‌سازی درخواست شبکه بدون reload
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
      resetFormFields();
      setLastAction(
        `ذخیره از ${source === "modal" ? "Modal" : "Drawer"}: ردیف ${code} به جدول اضافه شد بدون رفرش صفحه.`
      );
    }, 450);
  }

  return (
    <div className="space-y-6">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین چیدمان + به‌روزرسانی درجا">
        <ul className="list-disc space-y-1 pr-5">
          <li>فرم+جدول: A عمودی · B ثبت سریع کنار هم · C جدول کامل + Modal/Drawer</li>
          <li>
            <strong className="text-foreground">ممنوع:</strong> بعد از ثبت/ویرایش/حذف موفق، رفرش کامل
            صفحه (<code className="rounded bg-muted px-1">location.reload</code> یا submit سنتی
            full-page).
          </li>
          <li>
            بعد از mutation موفق: بستن Overlay (اگر بود) + به‌روزرسانی همان جدول/لیست در حافظه UI +
            بازخورد Toast/Banner (جزئیات در UI-06).
          </li>
        </ul>
      </GuideRulesBox>

      <GuideSection title="۱) App Shell (خلاصه)">
        <div className="overflow-hidden rounded-xl border shadow-[var(--shadow-sm)]">
          <div className="flex min-h-[160px]">
            <aside
              className={cn(
                "border-l bg-card p-2 transition-all",
                sidebarCollapsed ? "w-14" : "w-44"
              )}
            >
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setSidebarCollapsed((v) => !v)}
              >
                <Menu className="h-4 w-4" />
              </Button>
            </aside>
            <div className="flex-1 bg-muted/20 p-3 text-xs text-muted-foreground">Main</div>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۲–۶) یادآوری سریع">
        <ul className="list-disc space-y-1 pr-5 text-xs text-muted-foreground">
          <li>max-w برای فرم/متن؛ جدول می‌تواند عریض‌تر باشد.</li>
          <li>Sticky فقط نوار همان ناحیه اسکرول.</li>
          <li>Split = لیست+جزئیات، نه فرم سنگین کنار جدول.</li>
        </ul>
      </GuideSection>

      <GuideSection title="۷) الگو C + دموی زنده بدون رفرش">
        <p className="text-xs text-muted-foreground">
          جدول روی صفحه است. «جدید» فرم را در لایه باز می‌کند. با «ذخیره»، ردیف جدید در همان جدول
          ظاهر می‌شود — URL عوض نمی‌شود، صفحه سفید نمی‌شود، اسکرول از دست نمی‌رود.
        </p>

        {lastAction ? (
          <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs text-foreground">
            {lastAction}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
            <span className="text-xs font-medium">
              اسناد · {rows.length} ردیف · بدون full page reload
            </span>
            <div className="flex gap-2">
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
                      {r.title}
                      {r.isNew ? (
                        <Badge className="mr-2 text-[9px]" variant="success">
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

        <Dialog
          open={formOpen}
          onOpenChange={(o) => {
            setFormOpen(o);
            if (!o) resetFormFields();
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>سند جدید (Modal)</DialogTitle>
              <DialogDescription>
                ذخیره = به‌روزرسانی state جدول. نه submit سنتی HTML که صفحه را reload کند.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-title">عنوان</Label>
                <Input
                  id="m-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="مثلاً ورود محموله"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-wh">انبار</Label>
                <Input
                  id="m-wh"
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                  placeholder="انبار مرکزی"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFormOpen(false)} disabled={saving}>
                انصراف
              </Button>
              <Button onClick={() => handleSaveFromOverlay("modal")} disabled={saving}>
                {saving ? "در حال ذخیره…" : "ذخیره"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 flex justify-start">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="بستن"
              onClick={() => {
                setDrawerOpen(false);
                resetFormFields();
              }}
            />
            <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l bg-background shadow-[var(--shadow-lg)]">
              <div className="border-b px-4 py-3">
                <div className="text-sm font-semibold">سند جدید (Drawer)</div>
                <div className="text-[11px] text-muted-foreground">ذخیره بدون رفرش صفحه</div>
              </div>
              <div className="flex-1 space-y-3 p-4">
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
                  onClick={() => {
                    setDrawerOpen(false);
                    resetFormFields();
                  }}
                >
                  انصراف
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </GuideSection>

      <GuideSection
        title="۸) قانون قفل: بدون رفرش کامل صفحه (In-place update)"
        description="این بخش همان‌جایی است که اصل «اتفاق داخل صفحه نباید کل صفحه را از نو بار کند» ثبت می‌شود."
      >
        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            محصول SPA است (Next.js App Router + React). هر تغییری که کاربر در یک صفحه می‌بیند —
            ثبت فرم، ویرایش ردیف، حذف، تغییر وضعیت، فیلتر، صفحه‌بندی — باید نتیجه را در همان صفحه نشان
            دهد، نه با بارگذاری دوباره کل document.
          </p>

          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-2 text-xs font-medium text-foreground">جریان استاندارد بعد از ذخیره</div>
            <ol className="list-decimal space-y-1.5 pr-5 text-xs">
              <li>کاربر ذخیره می‌زند → دکمه Loading / disabled (جلوگیری از double-submit).</li>
              <li>درخواست API (از طریق Service/React Query) — نه form submit سنتی مرورگر.</li>
              <li>
                موفق: بستن Modal/Drawer (اگر باز بود) · به‌روزرسانی cache/لیست · هایلایت کوتاه ردیف
                جدید · Toast موفقیت (UI-06).
              </li>
              <li>
                ناموفق: Overlay باز می‌ماند · پیام خطا کنار فیلد یا بالای فرم · جدول دست‌نخورده.
              </li>
            </ol>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3 text-xs dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="mb-1 font-medium text-emerald-800 dark:text-emerald-200">باید</div>
              <ul className="list-disc space-y-1 pr-4 text-muted-foreground">
                <li>Client state یا React Query cache را به‌روز کن.</li>
                <li>اسکرول و فیلترهای فعلی کاربر حفظ شوند.</li>
                <li>ردیف جدید را بدون پرش صفحه نشان بده.</li>
                <li>در الگوی C بعد از save فقط Overlay بسته شود.</li>
              </ul>
            </div>
            <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-3 text-xs dark:border-rose-900 dark:bg-rose-950/30">
              <div className="mb-1 font-medium text-rose-800 dark:text-rose-200">نباید</div>
              <ul className="list-disc space-y-1 pr-4 text-muted-foreground">
                <li>
                  <code className="rounded bg-muted px-1">window.location</code> یا reload بعد از
                  save
                </li>
                <li>form با action کلاسیک که کل HTML را عوض کند</li>
                <li>پاک شدن فیلتر/صفحه فقط به‌خاطر یک ثبت ساده</li>
                <li>هدایت اجباری به صفحه دیگر مگر سناریوی صریح (مثلاً «ادامه گردش کار»)</li>
              </ul>
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/30 p-3 text-xs">
            <strong className="text-foreground">تقسیم مسئولیت صفحات راهنما:</strong>
            <ul className="mt-1 list-disc space-y-1 pr-5 text-muted-foreground">
              <li>
                <strong className="text-foreground">همین UI-02:</strong> اصل «بدون رفرش» و جریان
                Overlay → جدول در ترکیب صفحه.
              </li>
              <li>
                <strong className="text-foreground">UI-04 Forms:</strong> submit، validation، حالت
                Saving، جلوگیری از double-submit.
              </li>
              <li>
                <strong className="text-foreground">UI-05 Tables:</strong> درج/به‌روزرسانی/حذف ردیف،
                optimistic UI، حفظ scroll.
              </li>
              <li>
                <strong className="text-foreground">UI-06 Feedback:</strong> Toast، Banner خطا،
                Loading سراسری در مقابل Loading دکمه‌ای.
              </li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۹) Do / Don’t چیدمان">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="mb-2 font-medium text-emerald-800 dark:text-emerald-200">انجام بده</div>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>الگوی A/B/C را بر اساس سنگینی فرم انتخاب کن.</li>
              <li>بعد از mutation فقط داده همان ناحیه را عوض کن.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-4 text-sm dark:border-rose-900 dark:bg-rose-950/30">
            <div className="mb-2 font-medium text-rose-800 dark:text-rose-200">انجام نده</div>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>رفرش کامل صفحه برای یک ردیف جدید</li>
              <li>دو ستون اجباری برای فرم بلند</li>
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
