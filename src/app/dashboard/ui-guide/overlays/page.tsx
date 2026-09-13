"use client";

import { useEffect, useRef, useState } from "react";
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
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";
import {
  AlertTriangle,
  Check,
  Filter,
  Info,
  MoreHorizontal,
  Settings2,
  Trash2,
  X,
} from "lucide-react";

const meta = {
  code: "UI-07",
  title: "Overlays & Layered UI",
  description:
    "Modal، Drawer، Popover، Tooltip و قوانین لایه‌بندی — بدون تداخل با فرم و جدول.",
  phase: "فاز ۳",
  status: "ready" as const,
};

function toFa(n: number | string) {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export default function OverlaysGuidePage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSide, setDrawerSide] = useState<"left" | "right">("left");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setDrawerOpen(false);
        setPopoverOpen(false);
        setFilterOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (popoverOpen && popoverRef.current && !popoverRef.current.contains(t)) {
        setPopoverOpen(false);
      }
      if (filterOpen && filterRef.current && !filterRef.current.contains(t)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [popoverOpen, filterOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <div className="space-y-6" dir="rtl">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین لایه‌بندی و Overlay">
        <ul className="list-disc space-y-1 pr-5">
          <li>
            Modal برای تأیید مخرب، فرم کوتاه، یا جزئیات متمرکز · نه برای هر ویرایش.
          </li>
          <li>
            Drawer برای فیلتر پیشرفته، جزئیات بلند، یا تنظیمات کنار صفحه · محتوا اسکرول می‌شود.
          </li>
          <li>
            Popover برای انتخاب کوتاه (ستون، فیلتر ساده، منوی ردیف) · با کلیک بیرون بسته شود.
          </li>
          <li>Tooltip فقط راهنمای کوتاه · نه جایگزین label و نه پیام خطا.</li>
          <li>
            یک لایهٔ مسدودکننده در هر لحظه · Modal روی Drawer روی Popover (z-index منظم).
          </li>
          <li>Escape و کلیک روی backdrop برای بستن · مگر عملیات حساس در حال اجرا.</li>
          <li>پس از بستن، فوکوس به trigger برگردد · بدون رفرش صفحه.</li>
        </ul>
      </GuideRulesBox>

      <GuideSection
        title="۱) Modal (Dialog)"
        description="متمرکز · برای تأیید، فرم کوتاه، یا هشدار. از کامپوننت Dialog موجود."
      >
        <div className="flex flex-wrap gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                Modal ساده
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>جزئیات کالا</DialogTitle>
                <DialogDescription>
                  اطلاعات خلاصه برای مشاهدهٔ سریع بدون ترک صفحه.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">کد</span>
                  <span dir="ltr" className="font-mono">
                    ITM-100
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">نام</span>
                  <span>ورق فولادی</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">موجودی</span>
                  <span dir="ltr">{toFa(1200)}</span>
                </div>
              </div>
              <DialogFooter>
                <Button size="sm">بستن</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <Trash2 className="ml-1.5 h-3.5 w-3.5" />
                تأیید حذف
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  حذف این سند؟
                </DialogTitle>
                <DialogDescription>
                  این عمل قابل بازگشت نیست. سند از لیست فعال حذف می‌شود (Soft Delete).
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button size="sm" variant="outline" onClick={() => setConfirmOpen(false)}>
                  انصراف
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setConfirmOpen(false)}
                >
                  بله، حذف شود
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">فرم کوتاه در Modal</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>ویرایش سریع نام</DialogTitle>
                <DialogDescription>
                  فقط فیلدهای کوتاه · برای فرم پیچیده از صفحه یا Drawer استفاده کنید.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <label className="text-xs font-medium">
                  نام کالا <span className="text-destructive">*</span>
                </label>
                <input
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue="ورق فولادی"
                />
              </div>
              <DialogFooter>
                <Button size="sm" variant="outline">
                  انصراف
                </Button>
                <Button size="sm">ذخیره</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </GuideSection>

      <GuideSection
        title="۲) Drawer — پنل کناری"
        description="برای فیلتر، جزئیات بلند، یا تنظیمات. از سمت راست یا چپ می‌آید."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDrawerSide("left");
              setDrawerOpen(true);
            }}
          >
            Drawer از راست (RTL)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDrawerSide("right");
              setDrawerOpen(true);
            }}
          >
            Drawer از چپ
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          در RTL، لبهٔ «شروع» معمولاً راست است. برای فیلتر جدول و جزئیات سند مناسب است.
        </p>
      </GuideSection>

      <GuideSection
        title="۳) Popover — لایهٔ سبک نزدیک trigger"
        description="منوی اقدامات ردیف، انتخاب ستون، فیلتر ساده. با کلیک بیرون بسته می‌شود."
      >
        <div className="flex flex-wrap items-start gap-6">
          <div className="relative" ref={popoverRef}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPopoverOpen((v) => !v)}
              aria-expanded={popoverOpen}
            >
              <MoreHorizontal className="ml-1.5 h-3.5 w-3.5" />
              اقدامات ردیف
            </Button>
            {popoverOpen ? (
              <div
                className="absolute top-full z-40 mt-1 w-44 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg"
                style={{ left: 0 }}
                role="menu"
              >
                {["مشاهده", "ویرایش", "کپی", "بایگانی"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    className="flex w-full items-center px-3 py-1.5 text-right text-sm hover:bg-muted"
                    onClick={() => setPopoverOpen(false)}
                  >
                    {label}
                  </button>
                ))}
                <div className="my-1 border-t border-border" />
                <button
                  type="button"
                  className="flex w-full items-center px-3 py-1.5 text-right text-sm text-destructive hover:bg-destructive/10"
                  onClick={() => setPopoverOpen(false)}
                >
                  حذف
                </button>
              </div>
            ) : null}
          </div>

          <div className="relative" ref={filterRef}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFilterOpen((v) => !v)}
            >
              <Filter className="ml-1.5 h-3.5 w-3.5" />
              فیلتر سریع
              {filterOpen ? (
                <Badge variant="secondary" className="mr-1.5 text-[10px]">
                  باز
                </Badge>
              ) : null}
            </Button>
            {filterOpen ? (
              <div
                className="absolute top-full z-40 mt-1 w-64 rounded-lg border border-border bg-card p-3 shadow-lg"
                style={{ left: 0 }}
              >
                <div className="mb-2 text-xs font-medium">وضعیت</div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {["فعال", "پیش‌نویس", "بایگانی"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="rounded-full border border-border px-2.5 py-0.5 text-[11px] hover:border-primary hover:bg-primary/5"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="mb-2 text-xs font-medium">انبار</div>
                <select className="mb-3 w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs">
                  <option>همه</option>
                  <option>انبار مرکزی</option>
                  <option>انبار غرب</option>
                </select>
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-[11px]" onClick={() => setFilterOpen(false)}>
                    اعمال
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px]"
                    onClick={() => setFilterOpen(false)}
                  >
                    پاک کردن
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۴) Tooltip"
        description="راهنمای خیلی کوتاه روی آیکون یا کنترل فشرده. جایگزین برچسب یا خطا نیست."
      >
        <TooltipProvider delayDuration={200}>
          <div className="flex flex-wrap items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Settings2 className="h-3.5 w-3.5" />
                  تنظیمات
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">باز کردن تنظیمات جدول</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
                  aria-label="راهنما"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                موجودی بر اساس لایهٔ هزینه FIFO محاسبه می‌شود
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-help border-b border-dashed border-muted-foreground text-sm text-muted-foreground">
                  مبلغ خالص
                </span>
              </TooltipTrigger>
              <TooltipContent>پس از کسر تخفیف و مالیات</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </GuideSection>

      <GuideSection
        title="۵) سلسله‌مراتب لایه و z-index"
        description="از پایین به بالا: محتوا → Popover → Drawer → Modal → Toast/Loading Overlay."
      >
        <div className="overflow-hidden rounded-xl border border-border/70">
          {[
            { z: "z-50", label: "Toast / Loading Overlay", note: "بالاترین · مسدود یا اطلاع" },
            { z: "z-50", label: "Modal (Dialog)", note: "تمرکز کامل · backdrop" },
            { z: "z-40", label: "Drawer", note: "پنل کناری · backdrop نیمه‌شفاف" },
            { z: "z-30", label: "Popover / Dropdown", note: "نزدیک trigger · بدون قفل صفحه" },
            { z: "z-20", label: "Sticky toolbar / Header", note: "چسبان داخل layout" },
            { z: "z-0", label: "محتوای صفحه", note: "جدول، فرم، کارت" },
          ].map((row, i) => (
            <div
              key={row.label}
              className={cn(
                "flex items-center gap-3 border-b border-border/50 px-3 py-2.5 last:border-0",
                i === 0 && "bg-primary/5"
              )}
            >
              <Badge variant="outline" className="font-mono text-[10px]">
                {row.z}
              </Badge>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{row.label}</div>
                <div className="text-[11px] text-muted-foreground">{row.note}</div>
              </div>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection
        title="۶) سناریوی ترکیبی — جدول + فیلتر + تأیید"
        description="الگوی واقعی: Popover فیلتر روی جدول · Modal تأیید حذف · بدون reload."
      >
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">لیست اسناد</span>
            <Badge variant="secondary" className="text-[10px]">
              {toFa(3)} ردیف
            </Badge>
            <div className="mr-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => {
                  setDrawerSide("left");
                  setDrawerOpen(true);
                }}
              >
                فیلتر پیشرفته
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-border/60">
            {["GR-1403-001", "GI-1403-014", "TR-1403-003"].map((code) => (
              <div
                key={code}
                className="flex items-center gap-2 border-b border-border/50 px-3 py-2 last:border-0"
              >
                <span dir="ltr" className="font-mono text-xs">
                  {code}
                </span>
                <span className="flex-1 text-xs text-muted-foreground">پیش‌نویس</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px] text-destructive"
                  onClick={() => setConfirmOpen(true)}
                >
                  حذف
                </Button>
              </div>
            ))}
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۷) Do / Don’t">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <div className="mb-2 font-medium text-emerald-700 dark:text-emerald-400">
              انجام بده
            </div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>Modal برای تأیید مخرب و فرم ≤۴ فیلد</li>
              <li>Drawer برای فیلتر/جزئیات بلند</li>
              <li>Popover برای منوی ردیف و فیلتر ساده</li>
              <li>Tooltip فقط راهنمای کوتاه</li>
              <li>Escape + backdrop برای بستن</li>
              <li>بازگشت فوکوس به trigger</li>
              <li>یک لایهٔ مسدودکننده در لحظه</li>
            </ul>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="mb-2 font-medium text-destructive">انجام نده</div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>Modal برای فرم چندتب یا جدول بزرگ</li>
              <li>چند Modal تودرتو بدون نیاز واقعی</li>
              <li>Tooltip به‌جای پیام خطا</li>
              <li>قفل backdrop بدون راه بستن واضح</li>
              <li>باز کردن Overlay با رفرش صفحه</li>
              <li>Popover بدون بستن با کلیک بیرون</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/feedback">UI-06 Feedback</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/data-display">UI-05 Data Display</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide">فهرست راهنما</a>
        </Button>
      </div>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            aria-label="بستن"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className={cn(
              "absolute top-0 flex h-full w-[min(100%,22rem)] flex-col border-border bg-card shadow-xl",
              drawerSide === "left" ? "right-0 border-l" : "left-0 border-r"
            )}
            style={{
              animation:
                drawerSide === "left"
                  ? "ui07-slide-in-right 0.22s ease-out"
                  : "ui07-slide-in-left 0.22s ease-out",
            }}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="text-sm font-semibold">فیلتر پیشرفته</div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setDrawerOpen(false)}
                aria-label="بستن"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">بازه تاریخ</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="از"
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    dir="ltr"
                  />
                  <input
                    type="text"
                    placeholder="تا"
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">نوع سند</label>
                <div className="flex flex-wrap gap-1.5">
                  {["رسید", "حواله", "انتقال"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="rounded-full border border-border px-2.5 py-0.5 text-[11px] hover:border-primary hover:bg-primary/5"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">انبار</label>
                <select className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs">
                  <option>همه انبارها</option>
                  <option>انبار مرکزی</option>
                  <option>انبار غرب</option>
                </select>
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                فیلترها فقط روی همین لیست اعمال می‌شوند. صفحه رفرش نمی‌شود.
              </p>
            </div>
            <div className="flex gap-2 border-t border-border p-3">
              <Button size="sm" className="flex-1" onClick={() => setDrawerOpen(false)}>
                <Check className="ml-1 h-3.5 w-3.5" />
                اعمال
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setDrawerOpen(false)}
              >
                انصراف
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes ui07-slide-in-right {
          from { transform: translateX(100%); opacity: 0.6; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes ui07-slide-in-left {
          from { transform: translateX(-100%); opacity: 0.6; }
          to { transform: translateX(0); opacity: 1; }
        }
      `,
        }}
      />
    </div>
  );
}
