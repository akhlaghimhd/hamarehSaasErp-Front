"use client";

import { useMemo, useState, useRef } from "react";
import {
  GuidePageHeader,
  GuideRulesBox,
  GuideSection,
} from "@/shared/components/ui-guide/guide-shell";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Switch } from "@/shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";
import { Separator } from "@/shared/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Info,
  Pencil,
  RotateCcw,
  Trash2,
  Upload,
  AlertTriangle,
  CheckCircle2,
  X,
  Search,
} from "lucide-react";

const meta = {
  code: "UI-04",
  title: "Forms & Data Entry",
  description:
    "فرم سریع و پیچیده، تب‌دار با ثبت موقت/نهایی، تاریخ شمسی، کاتالوگ کنترل‌ها، آپلود، ویرایش با ردیابی تغییر.",
  phase: "فاز ۲",
  status: "ready" as const,
};

/** ارقام فارسی برای نمایش UI */
function toFa(value: string | number): string {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

const SHAMSI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

const WAREHOUSE_OPTIONS = [
  "انبار مرکزی",
  "انبار جنوب",
  "انبار شمال",
  "انبار غرب",
  "سردخانه",
  "انبار قطعات",
];

function ShamsiDateField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"days" | "months" | "years">("days");
  const [y, setY] = useState(1404);
  const [m, setM] = useState(6);
  const [yearPage, setYearPage] = useState(1400);

  const daysInMonth = m <= 6 ? 31 : m <= 11 ? 30 : 29;

  function pick(day: number) {
    const mm = String(m).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${y}/${mm}/${dd}`);
    setOpen(false);
    setView("days");
  }

  const displayValue = value ? toFa(value) : "";

  return (
    <div className="relative space-y-1.5">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
        <span className="mr-2 text-[10px] font-normal text-muted-foreground">شمسی</span>
      </Label>
      <div className="flex gap-1">
        <Input
          value={displayValue}
          onChange={(e) => {
            // نگهداری مقدار داخلی با ارقام لاتین برای منطق
            const raw = e.target.value.replace(/[۰-۹]/g, (d) =>
              String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))
            );
            onChange(raw);
          }}
          placeholder={toFa("1404/06/20")}
          className="text-right font-mono"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => {
            setOpen((v) => !v);
            setView("days");
          }}
          aria-label="تقویم شمسی"
        >
          <CalendarDays className="h-4 w-4" />
        </Button>
      </div>
      {open ? (
        <div className="absolute z-20 mt-1 w-[280px] rounded-xl border border-border/70 bg-card p-3 shadow-[var(--shadow-md)]">
          <div className="mb-2 flex items-center justify-between gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                if (view === "years") setYearPage((p) => p - 12);
                else if (view === "months") setY((x) => x - 1);
                else if (m === 1) {
                  setM(12);
                  setY((x) => x - 1);
                } else setM((x) => x - 1);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 text-xs font-medium">
              {view === "days" ? (
                <>
                  <button
                    type="button"
                    className="rounded px-1.5 py-0.5 hover:bg-muted"
                    onClick={() => setView("months")}
                  >
                    {SHAMSI_MONTHS[m - 1]}
                  </button>
                  <button
                    type="button"
                    className="rounded px-1.5 py-0.5 hover:bg-muted"
                    onClick={() => {
                      setYearPage(Math.floor(y / 12) * 12);
                      setView("years");
                    }}
                  >
                    {toFa(y)}
                  </button>
                </>
              ) : null}
              {view === "months" ? (
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 hover:bg-muted"
                  onClick={() => {
                    setYearPage(Math.floor(y / 12) * 12);
                    setView("years");
                  }}
                >
                  {toFa(y)}
                </button>
              ) : null}
              {view === "years" ? (
                <span className="px-1.5">
                  {toFa(yearPage)} – {toFa(yearPage + 11)}
                </span>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                if (view === "years") setYearPage((p) => p + 12);
                else if (view === "months") setY((x) => x + 1);
                else if (m === 12) {
                  setM(1);
                  setY((x) => x + 1);
                } else setM((x) => x + 1);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {view === "days" ? (
            <>
              <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground">
                {WEEKDAYS.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const token = `${y}/${String(m).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
                  const selected = value === token;
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => pick(day)}
                      className={cn(
                        "h-8 rounded-md text-xs hover:bg-primary/10",
                        selected && "bg-primary text-primary-foreground hover:bg-primary"
                      )}
                    >
                      {toFa(day)}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {view === "months" ? (
            <div className="grid grid-cols-3 gap-1">
              {SHAMSI_MONTHS.map((name, idx) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    setM(idx + 1);
                    setView("days");
                  }}
                  className={cn(
                    "rounded-md px-1 py-2 text-xs hover:bg-primary/10",
                    m === idx + 1 && "bg-primary text-primary-foreground"
                  )}
                >
                  {name}
                </button>
              ))}
            </div>
          ) : null}

          {view === "years" ? (
            <div className="grid grid-cols-3 gap-1">
              {Array.from({ length: 12 }).map((_, i) => {
                const yr = yearPage + i;
                return (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setY(yr);
                      setView("months");
                    }}
                    className={cn(
                      "rounded-md px-1 py-2 text-xs hover:bg-primary/10",
                      y === yr && "bg-primary text-primary-foreground"
                    )}
                  >
                    {toFa(yr)}
                  </button>
                );
              })}
            </div>
          ) : null}

          <p className="mt-2 text-[10px] text-muted-foreground">
            روی نام ماه یا سال کلیک کنید. در محصول از کتابخانهٔ جلالی تأییدشده استفاده می‌شود.
          </p>
        </div>
      ) : null}
    </div>
  );
}

type UploadItem = { id: string; name: string; size: string };

type EditFields = {
  code: string;
  name: string;
  group: string;
  warehouse: string;
  unit: string;
  minStock: string;
  barcode: string;
  description: string;
  supplier: string;
};

const TRACKED_KEYS: (keyof EditFields)[] = [
  "code",
  "name",
  "group",
  "warehouse",
  "unit",
  "minStock",
  "barcode",
  "supplier",
];

const EDIT_BASELINE: EditFields = {
  code: "ITM-100",
  name: "ورق فولادی",
  group: "مواد اولیه",
  warehouse: "انبار مرکزی",
  unit: "کیلوگرم",
  minStock: "50",
  barcode: "626000100",
  description: "ورق استاندارد",
  supplier: "فولاد مبارکه",
};

/**
 * ساختار DOM همیشه ثابت است تا فوکوس هنگام تایپ از بین نرود:
 * - دکمه بازگشت همیشه در DOM (نامرئی وقتی clean)
 * - خط «قبلی» همیشه با ارتفاع ثابت
 * - Input مستقیم، بدون render-prop
 */
function TrackedField({
  label,
  value,
  baseline,
  onChange,
  onRestore,
}: {
  label: string;
  value: string;
  baseline: string;
  onChange: (v: string) => void;
  onRestore: () => void;
}) {
  const dirty = value !== baseline;

  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "pl-9 text-right",
            dirty && "border-amber-500 focus-visible:ring-amber-400/40 dark:border-amber-600"
          )}
        />
        <button
          type="button"
          tabIndex={dirty ? 0 : -1}
          aria-hidden={!dirty}
          title="بازگشت به مقدار قبلی"
          onMouseDown={(e) => {
            // جلوگیری از دزدیدن فوکوس از Input قبل از click
            e.preventDefault();
          }}
          onClick={onRestore}
          className={cn(
            "absolute left-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground",
            !dirty && "pointer-events-none invisible"
          )}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
      <p className="min-h-[1rem] text-[10px] leading-none text-muted-foreground">
        {dirty ? <>قبلی: {baseline}</> : <span className="invisible">.</span>}
      </p>
    </div>
  );
}

export default function FormsGuidePage() {
  const [qTitle, setQTitle] = useState("");
  const [qWh, setQWh] = useState("");
  const [docDate, setDocDate] = useState("1404/06/20");

  const [tab, setTab] = useState("base");
  const [tabDrafts, setTabDrafts] = useState<Record<string, boolean>>({
    base: false,
    finance: false,
    extra: false,
  });
  const [tabCode, setTabCode] = useState("");
  const [tabName, setTabName] = useState("");
  const [tabNote, setTabNote] = useState("");
  const [tabPrice, setTabPrice] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadItem[]>([
    { id: "1", name: "فاکتور-ورود.pdf", size: "۲۴۰ کیلوبایت" },
    { id: "2", name: "تصویر-کالا.jpg", size: "۱٫۱ مگابایت" },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [editVals, setEditVals] = useState<EditFields>({ ...EDIT_BASELINE });

  const [radioVal, setRadioVal] = useState("a");
  const [multi, setMulti] = useState<string[]>(["main"]);
  const [searchQ, setSearchQ] = useState("");
  const [searchPick, setSearchPick] = useState("");
  const [rangeVal, setRangeVal] = useState(40);

  const filteredWh = useMemo(
    () =>
      WAREHOUSE_OPTIONS.filter((w) => w.includes(searchQ.trim()) || searchQ.trim() === ""),
    [searchQ]
  );

  const dirtyCount = useMemo(
    () => TRACKED_KEYS.filter((k) => editVals[k] !== EDIT_BASELINE[k]).length,
    [editVals]
  );

  function setEditField(key: keyof EditFields, value: string) {
    setEditVals((v) => ({ ...v, [key]: value }));
  }

  function restoreField(key: keyof EditFields) {
    setEditVals((v) => ({ ...v, [key]: EDIT_BASELINE[key] }));
  }

  function onPickFiles(list: FileList | null) {
    if (!list?.length) return;
    const next: UploadItem[] = Array.from(list).map((f, i) => {
      const size =
        f.size > 1024 * 1024
          ? `${toFa((f.size / 1024 / 1024).toFixed(1))} مگابایت`
          : `${toFa(Math.max(1, Math.round(f.size / 1024)))} کیلوبایت`;
      return { id: `${Date.now()}-${i}`, name: f.name, size };
    });
    setFiles((prev) => [...next, ...prev]);
  }

  function saveTabDraft(id: string) {
    setTabDrafts((d) => ({ ...d, [id]: true }));
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6" dir="rtl">
        <GuidePageHeader meta={meta} />

        <GuideRulesBox title="قوانین فرم (تکمیل‌شده)">
          <ul className="list-disc space-y-1 pr-5">
            <li>
              <strong className="text-foreground">تاریخ همیشه شمسی</strong> — کلیک روی ماه/سال برای
              پرش سریع · اعداد نمایشی فارسی.
            </li>
            <li>
              فرم سریع ≤۴ فیلد · فرم پیچیده تب‌دار با ثبت موقت هر تب + ثبت نهایی سراسری.
            </li>
            <li>خطا زیر فیلد · * روی برچسب · ثبت بدون رفرش (UI-02).</li>
            <li>
              ویرایش طولانی: فقط کادر فیلدهای کوتاه رنگی · مقدار قبلی زیر فیلد · بازگشت بدون پرش
              فوکوس.
            </li>
            <li>Hint/Info قبل از ثبت حساس · آپلود با لیست و ویرایش نام/حذف.</li>
            <li>کل صفحه راست‌چین · ارقام UI فارسی.</li>
          </ul>
        </GuideRulesBox>

        <GuideSection title="۱) فرم سریع در برابر فرم پیچیده">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">فرم سریع</div>
                <Badge variant="secondary" className="text-[10px]">
                  ≤۴ فیلد
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                ثبت آنی روی همان صفحه یا کنار جدول (الگوی B در UI-02).
              </p>
              <div className="space-y-1.5">
                <Label>عنوان</Label>
                <Input value={qTitle} onChange={(e) => setQTitle(e.target.value)} placeholder="سند…" />
              </div>
              <div className="space-y-1.5">
                <Label>انبار</Label>
                <Select value={qWh || undefined} onValueChange={setQWh}>
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">مرکزی</SelectItem>
                    <SelectItem value="south">جنوب</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" className="w-full">
                ثبت سریع
              </Button>
            </div>

            <div className="space-y-3 rounded-xl border border-primary/25 bg-primary/5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">فرم پیچیده</div>
                <Badge className="text-[10px]">تب‌دار · چندبخشی</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                داده دسته‌بندی‌شده: تب + ثبت موقت هر تب + ثبت نهایی.
              </p>
              <ul className="list-disc space-y-1 pr-5 text-[11px] text-muted-foreground">
                <li>هر تب یک دامنه (هویت / مالی / پیوست)</li>
                <li>ثبت موقت = پیش‌نویس همان تب</li>
                <li>ثبت نهایی = اعتبارسنجی همهٔ تب‌های الزامی</li>
              </ul>
            </div>
          </div>
        </GuideSection>

        <GuideSection title="۲) فرم تب‌دار — ثبت موقت و ثبت نهایی">
          <div className="mb-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-[11px] text-muted-foreground">
            <strong className="text-foreground">UX دکمه ثبت موقت:</strong> داخل هر تب (ذخیره همان
            بخش). پایین فرم فقط «ثبت نهایی» و «انصراف». تب ذخیره‌شده با نقطه سبز.
          </div>
          <div className="max-w-3xl rounded-xl border border-border/70 bg-card p-4">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                {(
                  [
                    { id: "base", label: "اطلاعات پایه" },
                    { id: "finance", label: "مالی" },
                    { id: "extra", label: "توضیحات" },
                  ] as const
                ).map((t) => (
                  <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
                    {t.label}
                    {tabDrafts[t.id] ? (
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500"
                        title="پیش‌نویس این تب ذخیره شده"
                      />
                    ) : null}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="base" className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>
                      کد <span className="text-destructive">*</span>
                    </Label>
                    <Input value={tabCode} onChange={(e) => setTabCode(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      نام <span className="text-destructive">*</span>
                    </Label>
                    <Input value={tabName} onChange={(e) => setTabName(e.target.value)} />
                  </div>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => saveTabDraft("base")}>
                  ثبت موقت این تب
                </Button>
              </TabsContent>

              <TabsContent value="finance" className="space-y-3">
                <div className="space-y-1.5">
                  <Label>قیمت پایه</Label>
                  <Input
                    value={tabPrice}
                    onChange={(e) => setTabPrice(e.target.value)}
                    inputMode="decimal"
                    className="text-right"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => saveTabDraft("finance")}
                >
                  ثبت موقت این تب
                </Button>
              </TabsContent>

              <TabsContent value="extra" className="space-y-3">
                <div className="space-y-1.5">
                  <Label>یادداشت</Label>
                  <Textarea value={tabNote} onChange={(e) => setTabNote(e.target.value)} rows={3} />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => saveTabDraft("extra")}
                >
                  ثبت موقت این تب
                </Button>
              </TabsContent>
            </Tabs>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-3">
              <Button type="button">ثبت نهایی</Button>
              <Button type="button" variant="outline">
                انصراف
              </Button>
            </div>
          </div>
        </GuideSection>

        <GuideSection title="۳) انتخاب تاریخ شمسی">
          <div className="max-w-sm rounded-xl border border-border/70 bg-card p-4">
            <ShamsiDateField label="تاریخ سند" value={docDate} onChange={setDocDate} required />
            <p className="mt-3 text-[11px] text-muted-foreground">
              روی نام ماه یا سال کلیک کنید. ارقام روز/سال فارسی نمایش داده می‌شوند.{" "}
              <code className="rounded bg-muted px-1">type=&quot;date&quot;</code> میلادی ممنوع است.
            </p>
          </div>
        </GuideSection>

        <GuideSection title="۴) همهٔ حالت‌های محتمل فیلد">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                { t: "پیش‌فرض", el: <Input placeholder="خالی" /> },
                { t: "پر شده", el: <Input defaultValue="ITM-۰۰۱" /> },
                {
                  t: "خطا",
                  el: (
                    <>
                      <Input className="border-destructive" aria-invalid defaultValue="" />
                      <p className="text-[10px] text-destructive">الزامی</p>
                    </>
                  ),
                },
                {
                  t: "موفق",
                  el: (
                    <>
                      <Input className="border-emerald-500" defaultValue="تأیید شد" />
                      <p className="flex items-center gap-1 text-[10px] text-emerald-600">
                        <CheckCircle2 className="h-3 w-3" /> معتبر
                      </p>
                    </>
                  ),
                },
                {
                  t: "هشدار",
                  el: (
                    <>
                      <Input className="border-amber-500" defaultValue="نزدیک سقف" />
                      <p className="flex items-center gap-1 text-[10px] text-amber-700">
                        <AlertTriangle className="h-3 w-3" /> بررسی شود
                      </p>
                    </>
                  ),
                },
                { t: "Disabled", el: <Input disabled value="غیرفعال" /> },
                { t: "Readonly", el: <Input readOnly value="فقط خواندنی" /> },
                {
                  t: "با پیشوند",
                  el: (
                    <div className="flex">
                      <Input className="rounded-l-none" placeholder="مبلغ" />
                      <span className="inline-flex items-center rounded-l-md border border-r-0 bg-muted px-2 text-xs text-muted-foreground">
                        ریال
                      </span>
                    </div>
                  ),
                },
                {
                  t: "شمارنده کاراکتر",
                  el: (
                    <>
                      <Textarea maxLength={80} rows={2} placeholder="حداکثر ۸۰" />
                      <p className="text-[10px] text-muted-foreground">{toFa(0)} / {toFa(80)}</p>
                    </>
                  ),
                },
              ] as const
            ).map((s) => (
              <div key={s.t} className="space-y-1.5 rounded-xl border border-border/60 p-3">
                <div className="text-[11px] text-muted-foreground">{s.t}</div>
                {s.el}
              </div>
            ))}
          </div>
        </GuideSection>

        <GuideSection title="۴ب) کاتالوگ کنترل‌های مجاز فرم وب">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
              <div className="text-xs font-medium">متن و ورودی‌های پایه</div>
              <div className="space-y-1.5">
                <Label>متن</Label>
                <Input placeholder="عنوان" />
              </div>
              <div className="space-y-1.5">
                <Label>رمز</Label>
                <Input type="password" placeholder="••••••" />
              </div>
              <div className="space-y-1.5">
                <Label>ایمیل</Label>
                <Input type="email" placeholder="user@example.com" className="text-right" />
              </div>
              <div className="space-y-1.5">
                <Label>تلفن</Label>
                <Input type="tel" placeholder={toFa("09121234567")} className="text-right" />
              </div>
              <div className="space-y-1.5">
                <Label>عدد</Label>
                <Input type="number" placeholder={toFa(0)} className="text-right" />
              </div>
              <div className="space-y-1.5">
                <Label>جستجو</Label>
                <div className="relative">
                  <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pr-8" placeholder="جستجو…" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>زمان</Label>
                <Input type="time" className="text-right" />
              </div>
              <div className="space-y-1.5">
                <Label>بازه (Range)</Label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={rangeVal}
                  onChange={(e) => setRangeVal(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <p className="text-[10px] text-muted-foreground">{toFa(rangeVal)}٪</p>
              </div>
              <div className="space-y-1.5">
                <Label>متن چندخطی</Label>
                <Textarea rows={2} placeholder="توضیح" />
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
              <div className="text-xs font-medium">انتخاب‌ها</div>

              <div className="space-y-1.5">
                <Label>کشویی تک‌انتخابی</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="یک مورد" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a">گزینه الف</SelectItem>
                    <SelectItem value="b">گزینه ب</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>کشویی با جستجو</Label>
                <div className="rounded-md border border-border/70">
                  <div className="flex items-center gap-1 border-b px-2">
                    <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      className="h-8 w-full bg-transparent text-right text-xs outline-none"
                      placeholder="جستجوی انبار…"
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                    />
                  </div>
                  <ul className="max-h-28 overflow-auto p-1">
                    {filteredWh.map((w) => (
                      <li key={w}>
                        <button
                          type="button"
                          className={cn(
                            "w-full rounded-md px-2 py-1.5 text-right text-xs hover:bg-muted",
                            searchPick === w && "bg-primary/10 text-primary"
                          )}
                          onClick={() => setSearchPick(w)}
                        >
                          {w}
                        </button>
                      </li>
                    ))}
                    {filteredWh.length === 0 ? (
                      <li className="px-2 py-2 text-center text-[11px] text-muted-foreground">
                        موردی نیست
                      </li>
                    ) : null}
                  </ul>
                  {searchPick ? (
                    <div className="border-t px-2 py-1.5 text-[11px] text-muted-foreground">
                      انتخاب: <span className="text-foreground">{searchPick}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>چندانتخابی (چک‌لیست)</Label>
                <div className="space-y-2 rounded-md border border-border/60 p-2">
                  {[
                    { id: "main", label: "انبار مرکزی" },
                    { id: "south", label: "انبار جنوب" },
                    { id: "north", label: "انبار شمال" },
                  ].map((o) => (
                    <div key={o.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`m-${o.id}`}
                        checked={multi.includes(o.id)}
                        onCheckedChange={(c) => {
                          setMulti((prev) =>
                            c === true ? [...prev, o.id] : prev.filter((x) => x !== o.id)
                          );
                        }}
                      />
                      <Label htmlFor={`m-${o.id}`} className="font-normal">
                        {o.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>رادیو (تک‌انتخابی)</Label>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: "a", label: "عادی" },
                    { id: "b", label: "فوری" },
                    { id: "c", label: "بحرانی" },
                  ].map((o) => (
                    <label key={o.id} className="flex items-center gap-1.5 text-xs">
                      <input
                        type="radio"
                        name="priority"
                        value={o.id}
                        checked={radioVal === o.id}
                        onChange={() => setRadioVal(o.id)}
                        className="accent-primary"
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <Checkbox id="cat-chk" />
                  <Label htmlFor="cat-chk" className="font-normal">
                    چک‌باکس
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="cat-sw" />
                  <Label htmlFor="cat-sw" className="font-normal">
                    سوئیچ
                  </Label>
                </div>
              </div>
            </div>
          </div>
        </GuideSection>

        <GuideSection title="۵) آپلود فایل و مدیریت لیست">
          <div className="max-w-xl space-y-3 rounded-xl border border-border/70 bg-card p-4">
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                onPickFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-xs text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
            >
              <Upload className="h-5 w-5 text-primary" />
              <span>کلیک برای انتخاب فایل · PDF / تصویر</span>
            </button>
            <ul className="divide-y divide-border/50 rounded-lg border border-border/60">
              {files.map((f) => (
                <li key={f.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                  <FileUp className="h-3.5 w-3.5 shrink-0 text-primary" />
                  {editingId === f.id ? (
                    <Input
                      className="h-7 flex-1"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                  )}
                  <span className="text-muted-foreground">{f.size}</span>
                  {editingId === f.id ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-7"
                      onClick={() => {
                        setFiles((prev) =>
                          prev.map((x) => (x.id === f.id ? { ...x, name: editName || x.name } : x))
                        );
                        setEditingId(null);
                      }}
                    >
                      تأیید
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => {
                        setEditingId(f.id);
                        setEditName(f.name);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
              {files.length === 0 ? (
                <li className="px-3 py-4 text-center text-muted-foreground">فایلی نیست</li>
              ) : null}
            </ul>
          </div>
        </GuideSection>

        <GuideSection title="۶) Info و هشدار قبل از ثبت حساس">
          <div className="max-w-xl space-y-3">
            <div className="flex items-start gap-2 rounded-xl border border-sky-200/80 bg-sky-50/70 p-3 text-xs dark:border-sky-900 dark:bg-sky-950/30">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <div className="flex-1">
                <div className="font-medium text-sky-900 dark:text-sky-100">راهنما</div>
                <p className="mt-0.5 text-muted-foreground">
                  پس از ثبت نهایی سند انبار، موجودی به‌روز می‌شود و برگشت فقط با سند اصلاحی ممکن است.
                </p>
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-start gap-2 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs dark:border-amber-900 dark:bg-amber-950/30">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div>
                <div className="font-medium text-amber-900 dark:text-amber-100">هشدار</div>
                <p className="mt-0.5 text-muted-foreground">
                  مقدار واردشده از سقف اعتبار مشتری بیشتر است.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label className="flex items-center gap-1.5">
                مبلغ
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="text-muted-foreground hover:text-foreground">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    مبلغ به ارز پایه مستأجر محاسبه و ذخیره می‌شود.
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input className="max-w-[160px] text-right" placeholder={toFa(0)} />
            </div>
          </div>
        </GuideSection>

        <GuideSection
          title="۷) فرم ویرایش پیچیده — ردیابی تغییر و بازگشت"
          description="DOM ثابت: دکمه بازگشت و خط قبلی همیشه رزرو شده‌اند تا با اولین حرف فوکوس نپرد. فقط فیلدهای کوتاه."
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={dirtyCount ? "warning" : "secondary"}>
              {dirtyCount ? `${toFa(dirtyCount)} فیلد تغییر کرده` : "بدون تغییر"}
            </Badge>
            {dirtyCount ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px]"
                onClick={() => setEditVals({ ...EDIT_BASELINE })}
              >
                بازگردانی همه
              </Button>
            ) : null}
          </div>
          <div className="max-w-3xl space-y-1 rounded-xl border border-border/70 bg-card p-4">
            <div className="grid gap-x-3 sm:grid-cols-2">
              {TRACKED_KEYS.map((key) => (
                <TrackedField
                  key={key}
                  label={
                    {
                      code: "کد",
                      name: "نام",
                      group: "گروه",
                      warehouse: "انبار",
                      unit: "واحد",
                      minStock: "حداقل موجودی",
                      barcode: "بارکد",
                      supplier: "تأمین‌کننده",
                    }[key]
                  }
                  value={editVals[key]}
                  baseline={EDIT_BASELINE[key]}
                  onChange={(v) => setEditField(key, v)}
                  onRestore={() => restoreField(key)}
                />
              ))}
            </div>
            <div className="space-y-1.5 pt-2">
              <Label>توضیحات (بدون ردیابی بصری)</Label>
              <Textarea
                rows={2}
                value={editVals.description}
                onChange={(e) => setEditField("description", e.target.value)}
              />
            </div>
            <div className="flex gap-2 border-t border-border/60 pt-3">
              <Button type="button" disabled={!dirtyCount}>
                ذخیره تغییرات
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditVals({ ...EDIT_BASELINE })}>
                انصراف
              </Button>
            </div>
          </div>
        </GuideSection>

        <GuideSection title="۸) Do / Don’t">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="mb-2 font-medium text-emerald-800 dark:text-emerald-200">انجام بده</div>
              <ul className="list-disc space-y-1 pr-5 text-xs text-muted-foreground">
                <li>DOM ثابت برای فیلدهای ردیابی‌شده تا فوکوس حفظ شود</li>
                <li>ارقام فارسی در تقویم و شمارنده‌ها</li>
                <li>راست‌چین سراسری صفحه فرم</li>
                <li>ثبت موقت داخل تب + نقطه سبز</li>
              </ul>
            </div>
            <div className="rounded-xl border bg-muted/25 p-4 text-sm">
              <div className="mb-2 font-medium">انجام نده</div>
              <ul className="list-disc space-y-1 pr-5 text-xs text-muted-foreground">
                <li>اضافه/حذف ناگهانی گره DOM کنار Input در حین تایپ</li>
                <li>type=date میلادی</li>
                <li>هایلایت شلوغ دور textarea</li>
              </ul>
            </div>
          </div>
        </GuideSection>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/dashboard/ui-guide/layout">UI-02</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/dashboard/ui-guide">فهرست</a>
          </Button>
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-xs text-muted-foreground">
          <strong className="text-foreground">مرحله بعد:</strong> UI-05 Data Display & Tables
        </div>
      </div>
    </TooltipProvider>
  );
}
