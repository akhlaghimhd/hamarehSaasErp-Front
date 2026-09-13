"use client";

import { useMemo, useState } from "react";
import {
  GuidePageHeader,
  GuideRulesBox,
  GuideSection,
} from "@/shared/components/ui-guide/guide-shell";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  Check,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  X,
} from "lucide-react";

const meta = {
  code: "UI-10",
  title: "Real-world Composition",
  description:
    "ترکیب واقعی فیلتر + جدول + فرم + جزئیات با حداقل پرت فضا — الگوی صفحات عملیاتی ERP.",
  phase: "فاز ۴",
  status: "ready" as const,
};

function toFa(n: number | string) {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function formatMoney(n: number) {
  return toFa(
    new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)
  );
}

type DocStatus = "draft" | "pending" | "approved" | "rejected";

type Doc = {
  id: string;
  code: string;
  type: string;
  party: string;
  amount: number;
  status: DocStatus;
  warehouse: string;
  updated: string;
};

const statusLabel: Record<DocStatus, string> = {
  draft: "پیش‌نویس",
  pending: "در انتظار",
  approved: "تأیید شده",
  rejected: "رد شده",
};

const statusVariant: Record<
  DocStatus,
  "secondary" | "warning" | "success" | "destructive"
> = {
  draft: "secondary",
  pending: "warning",
  approved: "success",
  rejected: "destructive",
};

const seedDocs: Doc[] = [
  {
    id: "1",
    code: "GR-1403-018",
    type: "رسید انبار",
    party: "فولاد مبارکه",
    amount: 125_000_000,
    status: "pending",
    warehouse: "مرکزی",
    updated: "۱۴۰۳/۰۶/۲۰",
  },
  {
    id: "2",
    code: "GI-1403-042",
    type: "حواله",
    party: "خط تولید A",
    amount: 48_500_000,
    status: "approved",
    warehouse: "تولید",
    updated: "۱۴۰۳/۰۶/۱۹",
  },
  {
    id: "3",
    code: "GR-1403-019",
    type: "رسید انبار",
    party: "کاویان",
    amount: 72_000_000,
    status: "draft",
    warehouse: "مرکزی",
    updated: "۱۴۰۳/۰۶/۲۰",
  },
  {
    id: "4",
    code: "TR-1403-007",
    type: "انتقال",
    party: "انبار جنوب",
    amount: 15_200_000,
    status: "pending",
    warehouse: "جنوب",
    updated: "۱۴۰۳/۰۶/۱۸",
  },
  {
    id: "5",
    code: "GI-1403-043",
    type: "حواله",
    party: "پروژه پارس",
    amount: 33_800_000,
    status: "rejected",
    warehouse: "پروژه",
    updated: "۱۴۰۳/۰۶/۱۷",
  },
  {
    id: "6",
    code: "GR-1403-020",
    type: "رسید انبار",
    party: "ذوب‌آهن",
    amount: 210_000_000,
    status: "approved",
    warehouse: "مرکزی",
    updated: "۱۴۰۳/۰۶/۱۶",
  },
];

type Line = { id: string; item: string; qty: number; unit: string; rate: number };

const emptyLines: Line[] = [
  { id: "l1", item: "", qty: 0, unit: "عدد", rate: 0 },
];

export default function CompositionGuidePage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | DocStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>("1");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [showFilters, setShowFilters] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    { id: "l1", item: "ورق گالوانیزه ۲mm", qty: 12, unit: "برگ", rate: 4_200_000 },
    { id: "l2", item: "پروفیل ۴۰×۴۰", qty: 40, unit: "شاخه", rate: 850_000 },
  ]);
  const [docNo, setDocNo] = useState("GR-1403-021");
  const [party, setParty] = useState("");
  const [note, setNote] = useState("");
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return seedDocs.filter((d) => {
      if (status !== "all" && d.status !== status) return false;
      if (!q.trim()) return true;
      const s = q.trim();
      return (
        d.code.includes(s) ||
        d.party.includes(s) ||
        d.type.includes(s) ||
        d.warehouse.includes(s)
      );
    });
  }, [q, status]);

  const selected = seedDocs.find((d) => d.id === selectedId) ?? null;
  const lineTotal = lines.reduce((s, l) => s + l.qty * l.rate, 0);

  function saveDraft() {
    setSavedMsg("پیش‌نویس ذخیره شد · بدون رفرش صفحه");
    window.setTimeout(() => setSavedMsg(null), 2500);
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        id: "l" + String(Date.now()),
        item: "",
        qty: 0,
        unit: "عدد",
        rate: 0,
      },
    ]);
  }

  const rowPad = density === "compact" ? "py-1.5" : "py-2.5";

  return (
    <div className="space-y-6" dir="rtl">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین ترکیب صفحات عملیاتی">
        <ul className="list-disc space-y-1 pr-5">
          <li>Toolbar جدول sticky و فقط روی جدول — نه کل صفحه.</li>
          <li>فیلتر + جستجو + اقدام اصلی در یک نوار فشرده.</li>
          <li>انتخاب ردیف → پنل جزئیات کنار یا پایین · بدون route جدید اجباری.</li>
          <li>فرم سند: هدر ثابت + خطوط قابل‌اسکرول + فوتر جمع و اقدام.</li>
          <li>ثبت / پیش‌نویس بدون reload (UI-04) · DOM ثابت.</li>
          <li>حداقل پرت فضا: Density قابل‌تعویض · یک اسکرول عمودی غالب.</li>
        </ul>
      </GuideRulesBox>

      <GuideSection
        title="۱) صفحه لیست عملیاتی — فیلتر + جدول + جزئیات"
        description="الگوی استاندارد Inventory / PS documents"
      >
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <div className="sticky top-0 z-10 space-y-2 border-b border-border/60 bg-card/95 p-3 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[12rem] flex-1">
                <Search className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="جستجوی کد، طرف، انبار…"
                  className="h-8 w-full rounded-md border border-input bg-background pr-8 pl-3 text-xs"
                />
              </div>
              <Button
                size="sm"
                variant={showFilters ? "secondary" : "outline"}
                className="h-8 gap-1 text-[11px]"
                onClick={() => setShowFilters((v) => !v)}
              >
                <Filter className="h-3.5 w-3.5" />
                فیلتر
              </Button>
              <div className="flex rounded-md border border-border p-0.5">
                {(["comfortable", "compact"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDensity(d)}
                    className={cn(
                      "rounded px-2 py-1 text-[10px]",
                      density === d
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {d === "comfortable" ? "عادی" : "فشرده"}
                  </button>
                ))}
              </div>
              <Button
                size="sm"
                className="mr-auto h-8 gap-1 text-[11px]"
                onClick={() => {
                  setFormOpen(true);
                  setSelectedId(null);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                سند جدید
              </Button>
            </div>
            {showFilters ? (
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["all", "همه"],
                    ["draft", "پیش‌نویس"],
                    ["pending", "در انتظار"],
                    ["approved", "تأیید"],
                    ["rejected", "رد"],
                  ] as const
                ).map(([k, label]) => (
                  <Button
                    key={k}
                    size="sm"
                    variant={status === k ? "default" : "ghost"}
                    className="h-7 text-[11px]"
                    onClick={() => setStatus(k)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid lg:grid-cols-[1fr_300px]">
            <div className="min-w-0 overflow-x-auto border-l border-border/50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-muted-foreground">
                    <th className="px-3 py-2 text-right font-medium">کد</th>
                    <th className="px-3 py-2 text-right font-medium">نوع</th>
                    <th className="px-3 py-2 text-right font-medium">طرف</th>
                    <th className="px-3 py-2 text-right font-medium">مبلغ</th>
                    <th className="px-3 py-2 text-right font-medium">وضعیت</th>
                    <th className="px-3 py-2 text-right font-medium">انبار</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-10 text-center text-muted-foreground"
                      >
                        {q.trim()
                          ? "نتیجه‌ای برای این جستجو نیست"
                          : "سندی در این فیلتر نیست"}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((d) => (
                      <tr
                        key={d.id}
                        onClick={() => {
                          setSelectedId(d.id);
                          setFormOpen(false);
                        }}
                        className={cn(
                          "cursor-pointer border-b last:border-0 transition",
                          selectedId === d.id && !formOpen
                            ? "bg-primary/8"
                            : "hover:bg-muted/40"
                        )}
                      >
                        <td className={cn("px-3 font-mono text-primary", rowPad)}>
                          {d.code}
                        </td>
                        <td className={cn("px-3", rowPad)}>{d.type}</td>
                        <td className={cn("px-3", rowPad)}>{d.party}</td>
                        <td className={cn("px-3 font-mono", rowPad)} dir="ltr">
                          {formatMoney(d.amount)}
                        </td>
                        <td className={cn("px-3", rowPad)}>
                          <Badge
                            variant={statusVariant[d.status]}
                            className="text-[10px]"
                          >
                            {statusLabel[d.status]}
                          </Badge>
                        </td>
                        <td className={cn("px-3 text-muted-foreground", rowPad)}>
                          {d.warehouse}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="flex items-center justify-between border-t border-border/50 px-3 py-2 text-[11px] text-muted-foreground">
                <span>
                  {toFa(filtered.length)} از {toFa(seedDocs.length)} سند
                </span>
                <span>صفحه {toFa(1)}</span>
              </div>
            </div>

            <div className="border-t border-border/50 p-3 lg:border-t-0">
              {formOpen ? (
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">ایجاد سریع</span>
                    <button
                      type="button"
                      onClick={() => setFormOpen(false)}
                      className="rounded p-1 hover:bg-muted"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    برای فرم کامل به بخش ۲ بروید. اینجا فقط ورود سریع است.
                  </p>
                  <Button
                    size="sm"
                    className="h-8 w-full text-[11px]"
                    onClick={() => {
                      setFormOpen(false);
                      document
                        .getElementById("doc-form-demo")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    باز کردن فرم کامل
                  </Button>
                </div>
              ) : selected ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-sm text-primary">
                        {selected.code}
                      </div>
                      <div className="text-muted-foreground">{selected.type}</div>
                    </div>
                    <Badge
                      variant={statusVariant[selected.status]}
                      className="text-[10px]"
                    >
                      {statusLabel[selected.status]}
                    </Badge>
                  </div>
                  <dl className="space-y-1.5">
                    {[
                      ["طرف حساب", selected.party],
                      ["انبار", selected.warehouse],
                      ["مبلغ", formatMoney(selected.amount) + " ریال"],
                      ["به‌روزرسانی", selected.updated],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="flex justify-between gap-2 border-b border-border/40 pb-1.5"
                      >
                        <dt className="text-muted-foreground">{k}</dt>
                        <dd className="text-left font-medium" dir="auto">
                          {v}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-[11px]">
                      ویرایش
                    </Button>
                    {selected.status === "pending" ? (
                      <Button size="sm" className="h-7 text-[11px]">
                        اقدام تأیید
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2"
                      aria-label="بیشتر"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center text-center text-[11px] text-muted-foreground">
                  یک ردیف را انتخاب کنید
                </div>
              )}
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۲) فرم سند عملیاتی — هدر + خطوط + فوتر"
        description="یک اسکرول · جمع زنده · ذخیره بدون reload"
      >
        <div
          id="doc-form-demo"
          className="overflow-hidden rounded-xl border border-border/70 bg-card"
        >
          <div className="border-b border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">رسید انبار جدید</span>
              <Badge variant="secondary" className="text-[10px]">
                پیش‌نویس
              </Badge>
              {savedMsg ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                  <Check className="h-3.5 w-3.5" />
                  {savedMsg}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 border-b border-border/50 p-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-[11px] font-medium">
                شماره سند <span className="text-destructive">*</span>
              </label>
              <input
                value={docNo}
                onChange={(e) => setDocNo(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background px-2 font-mono text-xs"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium">
                تأمین‌کننده <span className="text-destructive">*</span>
              </label>
              <input
                value={party}
                onChange={(e) => setParty(e.target.value)}
                placeholder="نام طرف حساب"
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium">یادداشت</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="اختیاری"
                className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30 text-muted-foreground">
                  <th className="px-3 py-2 text-right">کالا</th>
                  <th className="w-24 px-2 py-2 text-right">تعداد</th>
                  <th className="w-20 px-2 py-2 text-right">واحد</th>
                  <th className="w-28 px-2 py-2 text-right">فی</th>
                  <th className="w-28 px-2 py-2 text-right">جمع</th>
                  <th className="w-10 px-1 py-2" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={line.id} className="border-b last:border-0">
                    <td className="px-2 py-1.5">
                      <input
                        value={line.item}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) =>
                              i === idx ? { ...l, item: e.target.value } : l
                            )
                          )
                        }
                        className="h-7 w-full rounded border border-input bg-background px-2 text-xs"
                        placeholder="نام کالا"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        value={line.qty || ""}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) =>
                              i === idx
                                ? { ...l, qty: Number(e.target.value) || 0 }
                                : l
                            )
                          )
                        }
                        className="h-7 w-full rounded border border-input bg-background px-2 text-xs"
                        dir="ltr"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        value={line.unit}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) =>
                              i === idx ? { ...l, unit: e.target.value } : l
                            )
                          )
                        }
                        className="h-7 w-full rounded border border-input bg-background px-2 text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        value={line.rate || ""}
                        onChange={(e) =>
                          setLines((prev) =>
                            prev.map((l, i) =>
                              i === idx
                                ? { ...l, rate: Number(e.target.value) || 0 }
                                : l
                            )
                          )
                        }
                        className="h-7 w-full rounded border border-input bg-background px-2 text-xs"
                        dir="ltr"
                      />
                    </td>
                    <td className="px-2 py-1.5 font-mono" dir="ltr">
                      {formatMoney(line.qty * line.rate)}
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <button
                        type="button"
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        onClick={() =>
                          setLines((prev) =>
                            prev.length > 1
                              ? prev.filter((_, i) => i !== idx)
                              : emptyLines
                          )
                        }
                        aria-label="حذف خط"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 bg-muted/15 px-4 py-3">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-[11px]"
              onClick={addLine}
            >
              <Plus className="h-3.5 w-3.5" />
              ردیف
            </Button>
            <div className="mr-auto flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">جمع سند</span>
              <span className="text-base font-semibold" dir="ltr">
                {formatMoney(lineTotal)}
                <span className="mr-1 text-[11px] font-normal text-muted-foreground">
                  ریال
                </span>
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-[11px]"
              onClick={saveDraft}
            >
              ذخیره پیش‌نویس
            </Button>
            <Button size="sm" className="h-8 text-[11px]" onClick={saveDraft}>
              ارسال برای تأیید
            </Button>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۳) الگوی فضای صفحه"
        description="چه چیزی بالای fold باشد"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              t: "بالای صفحه (همیشه)",
              items: [
                "عنوان + وضعیت سند",
                "اقدام اصلی (جدید / ذخیره)",
                "جستجو و فیلترهای پرتکرار",
              ],
            },
            {
              t: "بدنه (اسکرول اصلی)",
              items: [
                "جدول یا خطوط سند",
                "پنل جزئیات هم‌تراز با انتخاب",
                "بدون کارت‌های تزئینی خالی",
              ],
            },
            {
              t: "فوتر / لبه",
              items: [
                "جمع مالی زنده",
                "صفحه‌بندی جدول",
                "اقدام ثانویه (انصراف)",
              ],
            },
          ].map((b) => (
            <div
              key={b.t}
              className="rounded-xl border border-border/70 bg-card p-4"
            >
              <div className="mb-2 text-sm font-medium">{b.t}</div>
              <ul className="list-disc space-y-1 pr-4 text-[11px] text-muted-foreground">
                {b.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection title="۴) Do / Don’t ترکیب">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <div className="mb-2 font-medium text-emerald-700 dark:text-emerald-400">
              انجام بده
            </div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>یک جریان بصری: فیلتر → لیست → جزئیات</li>
              <li>Density قابل‌تعویض برای اپراتور انبار</li>
              <li>جمع سند همیشه در فوتر فرم</li>
              <li>Empty جستجو ≠ Empty اولیه (UI-05)</li>
              <li>اقدام اصلی در دسترس بدون اسکرول افقی</li>
            </ul>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="mb-2 font-medium text-destructive">انجام نده</div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>چند اسکرول تو در تو بدون نیاز</li>
              <li>فرم سند بدون فوتر جمع</li>
              <li>باز کردن هر جزئیات در تب/صفحه جدید اجباری</li>
              <li>فاصله‌های بزرگ خالی بین فیلتر و جدول</li>
              <li>مخفی کردن وضعیت سند در لیست</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/charts">UI-09 Charts</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/data-display">UI-05 Tables</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide">فهرست راهنما</a>
        </Button>
      </div>
    </div>
  );
}
