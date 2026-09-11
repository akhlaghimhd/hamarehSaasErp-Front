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
import { Menu, FileText, AlertTriangle } from "lucide-react";

const meta = {
  code: "UI-02",
  title: "Layout & Structure",
  description:
    "اسکلت صفحه، ترکیب فرم+جدول، به‌روزرسانی درجا، و قوانین Modal/Drawer برای ثبت داده حیاتی ERP.",
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
  { code: "GR-002", title: "ورود برگشتی", status: "پیش‌نویس", date: "1404/06/04" },
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
  const [confirmClose, setConfirmClose] = useState<null | "modal" | "drawer">(null);

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
      setLastAction("عنوان الزامی است — Overlay باز ماند؛ رفرش نشد.");
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
        `ذخیره موفق (${source === "modal" ? "Modal" : "Drawer"}): ${code} به جدول اضافه شد بدون رفرش.`
      );
    }, 400);
  }

  return (
    <div className="space-y-6">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین کلیدی">
        <ul className="list-disc space-y-1 pr-5">
          <li>بدون رفرش کامل بعد از mutation داخل صفحه.</li>
          <li>
            ثبت حیاتی ERP: ترجیح <strong className="text-foreground">Drawer</strong> وقتی دیدن جدول
            همزمان لازم است؛ Modal برای فرم کوتاه و تمرکز کامل.
          </li>
          <li>
            <strong className="text-foreground">Dirty Form:</strong> کلیک بیرون / Escape وقتی فرم
            پر شده، نباید بی‌صدا ببندد — تأیید صریح «دور انداختن تغییرات».
          </li>
          <li>بستن بدون ذخیره = داده ثبت نشده؛ بعد از بستن با Toast/پیام روشن بگو ذخیره نشد.</li>
        </ul>
      </GuideRulesBox>

      <GuideSection title="۱) App Shell (خلاصه)">
        <div className="overflow-hidden rounded-xl border">
          <div className="flex min-h-[120px]">
            <aside
              className={cn("border-l bg-card p-2", sidebarCollapsed ? "w-14" : "w-40")}
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

      <GuideSection title="۲) Modal در برابر Drawer — تجربه کاربری ERP">
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-xs">
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
                <td className="px-3 py-2">ضعیف — جدول زیر سایه پنهان می‌شود</td>
                <td className="px-3 py-2 text-foreground">
                  بهتر — بخشی از جدول در کنار پنل دیده می‌شود
                </td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="px-3 py-2 font-medium text-foreground">تمرکز روی فرم</td>
                <td className="px-3 py-2 text-foreground">قوی‌تر</td>
                <td className="px-3 py-2">متوسط</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="px-3 py-2 font-medium text-foreground">فرم بلند / چندبخشی</td>
                <td className="px-3 py-2">نامناسب (اسکرول داخل پنجره کوچک)</td>
                <td className="px-3 py-2 text-foreground">مناسب‌تر (ارتفاع کامل)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="px-3 py-2 font-medium text-foreground">خطر بستن تصادفی</td>
                <td className="px-3 py-2">بالا اگر overlay-click آزاد باشد</td>
                <td className="px-3 py-2">همان خطر — باید قفل Dirty داشته باشد</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-foreground">پیشنهاد ERP ما</td>
                <td className="px-3 py-2">تأیید کوتاه، انتخاب ساده، ≤۵ فیلد</td>
                <td className="px-3 py-2 text-foreground">
                  ثبت/ویرایش سند عملیاتی پیش‌فرض
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">کی Drawer خوب است:</strong> کاربر موقع پر کردن فرم
            باید کد/عنوان/وضعیت ردیف‌های جدول را ببیند (کپی مرجع، جلوگیری از ثبت تکراری، مقایسه).
          </p>
          <p>
            <strong className="text-foreground">کی Modal بهتر است:</strong> تأیید حذف، تغییر وضعیت
            یک‌کلیکی، فرم خیلی کوتاه بدون نیاز به جدول پشت.
          </p>
          <p>
            <strong className="text-foreground">کی هیچ‌کدام:</strong> سند چندصفحه‌ای / آیتم‌لاین زیاد
            → صفحه اختصاصی یا الگوی A (فرم بالا، جدول پایین) یا ویزارد تمام‌صفحه.
          </p>
        </div>
      </GuideSection>

      <GuideSection title="۳) قانون بستن — Dirty Form (حیاتی)">
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs dark:border-amber-900 dark:bg-amber-950/25">
          <div className="mb-2 flex items-center gap-2 font-medium text-amber-900 dark:text-amber-100">
            <AlertTriangle className="h-4 w-4" />
            مشکل واقعی ERP
          </div>
          <p className="text-muted-foreground">
            اگر کاربر چند فیلد را پر کند و اشتباهاً بیرون کلیک کند و فرم بی‌صدا بسته شود، ممکن است
            فکر کند «ثبت شد» در حالی که هیچ APIای صدا نشده. این در موجودی و مالی خطرناک است.
          </p>
        </div>

        <ul className="mt-3 list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
          <li>
            اگر فرم <strong className="text-foreground">خالی (clean)</strong> است: بستن با Escape /
            دکمه انصراف / کلیک بیرون مجاز.
          </li>
          <li>
            اگر فرم <strong className="text-foreground">Dirty</strong> است: کلیک بیرون و Escape
            <strong className="text-foreground"> نباید</strong> بی‌صدا ببندد → دیالوگ تأیید «تغییرات
            ذخیره نشده. دور انداخته شود؟».
          </li>
          <li>بعد از بستن بدون ذخیره: پیام روشن که ثبت انجام نشد (نه سکوت).</li>
          <li>فقط «ذخیره موفق» Overlay را قطعی می‌بندد و جدول را به‌روز می‌کند.</li>
        </ul>
      </GuideSection>

      <GuideSection title="۴) دموی زنده — امتحان کن">
        <p className="text-xs text-muted-foreground">
          در Drawer یا Modal چیزی تایپ کن، بعد بیرون کلیک کن یا انصراف بزن — باید تأیید بگیری. با
          ذخیره، ردیف به جدول اضافه می‌شود بدون رفرش.
        </p>

        {lastAction ? (
          <div className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs">
            {lastAction}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-sm)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
            <span className="text-xs font-medium">جدول اسناد · {rows.length} ردیف</span>
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
                Drawer (ترجیح ثبت ERP)
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

        {/* Modal */}
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
              <DialogDescription>
                برای فرم کوتاه. جدول زیر سایه است. Dirty = بستن بی‌صدا ممنوع.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="m-title">عنوان</Label>
                <Input
                  id="m-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="عنوان سند"
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
                  Dirty — بستن نیاز به تأیید دارد
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

        {/* Drawer — table remains partially visible */}
        {drawerOpen ? (
          <div className="fixed inset-0 z-50 flex justify-start">
            <button
              type="button"
              className="absolute inset-0 bg-black/30"
              aria-label="تلاش برای بستن"
              onClick={() => requestClose("drawer")}
            />
            <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l bg-background shadow-[var(--shadow-lg)]">
              <div className="border-b px-4 py-3">
                <div className="text-sm font-semibold">سند جدید — Drawer</div>
                <div className="text-[11px] text-muted-foreground">
                  جدول سمت دیگر صفحه هنوز دیده می‌شود · Dirty محافظت می‌شود
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
                    تغییر ذخیره‌نشده دارید. کلیک بیرون بدون تأیید، فرم را نمی‌بندد.
                  </div>
                ) : null}
                <div className="rounded-md border border-dashed border-border/70 p-2 text-[11px] text-muted-foreground">
                  نکته UX: در عرض دسکتاپ، جدول پشت/کنار Drawer قابل رجوع چشمی است؛ برای کپی کد سند
                  یا چک تکراری بودن مفید است.
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
                  onClick={() => requestClose("drawer")}
                >
                  انصراف
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Confirm discard */}
        <Dialog
          open={confirmClose !== null}
          onOpenChange={(o) => {
            if (!o) setConfirmClose(null);
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>تغییرات ذخیره نشده</DialogTitle>
              <DialogDescription>
                اگر ببندید، داده‌ای ثبت نمی‌شود. مطمئن هستید؟
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

      <GuideSection title="۵) بدون رفرش صفحه (یادآوری قفل‌شده)">
        <ol className="list-decimal space-y-1 pr-5 text-xs text-muted-foreground">
          <li>ذخیره → API از کلاینت (نه submit کلاسیک مرورگر)</li>
          <li>موفق → بستن Overlay + درج ردیف در state/cache + Toast</li>
          <li>ناموفق → Overlay باز + خطا روی فرم</li>
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">
          جزئیات Forms/Tables/Feedback: UI-04 · UI-05 · UI-06
        </p>
      </GuideSection>

      <GuideSection title="۶) Do / Don’t Overlay ثبت">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="mb-2 font-medium text-emerald-800 dark:text-emerald-200">انجام بده</div>
            <ul className="list-disc space-y-1 pr-5 text-xs text-muted-foreground">
              <li>Drawer برای ثبت عملیاتی با نیاز به دیدن جدول</li>
              <li>تأیید قبل از بستن وقتی Dirty است</li>
              <li>پیام صریح «ذخیره نشد» اگر کاربر دور انداخت</li>
              <li>دکمه ذخیره با حالت Loading</li>
            </ul>
          </div>
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-4 text-sm dark:border-rose-900 dark:bg-rose-950/30">
            <div className="mb-2 font-medium text-rose-800 dark:text-rose-200">انجام نده</div>
            <ul className="list-disc space-y-1 pr-5 text-xs text-muted-foreground">
              <li>بستن بی‌صدای فرم پر با کلیک بیرون</li>
              <li>Modal تمام‌صفحه برای سند خط‌دار سنگین</li>
              <li>فرض اینکه کاربر می‌فهمد بسته شدن = ذخیره</li>
              <li>رفرش کامل صفحه بعد از save</li>
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
