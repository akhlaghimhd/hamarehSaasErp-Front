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
} from "lucide-react";

const meta = {
  code: "UI-04",
  title: "Forms & Data Entry",
  description:
    "فرم سریع و پیچیده، تب‌دار با ثبت موقت/نهایی، تاریخ شمسی، آپلود، همه حالت‌های فیلد، ویرایش با ردیابی تغییر.",
  phase: "فاز ۲",
  status: "ready" as const,
};

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

/** نمایشی: تقویم شمسی سبک برای راهنما (بدون وابستگی سنگین) */
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
  const [y, setY] = useState(1404);
  const [m, setM] = useState(6); // 1-based

  const daysInMonth = m <= 6 ? 31 : m <= 11 ? 30 : 29;

  function pick(day: number) {
    const mm = String(m).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${y}/${mm}/${dd}`);
    setOpen(false);
  }

  return (
    <div className="relative space-y-1.5">
      <Label>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
        <span className="mr-2 text-[10px] font-normal text-muted-foreground">شمسی</span>
      </Label>
      <div className="flex gap-1">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="۱۴۰۴/۰۶/۲۰"
          className="font-mono"
          dir="ltr"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          onClick={() => setOpen((v) => !v)}
          aria-label="تقویم شمسی"
        >
          <CalendarDays className="h-4 w-4" />
        </Button>
      </div>
      {open ? (
        <div className="absolute z-20 mt-1 w-[280px] rounded-xl border border-border/70 bg-card p-3 shadow-[var(--shadow-md)]">
          <div className="mb-2 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                if (m === 1) {
                  setM(12);
                  setY((x) => x - 1);
                } else setM((x) => x - 1);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="text-xs font-medium">
              {SHAMSI_MONTHS[m - 1]} {y}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                if (m === 12) {
                  setM(1);
                  setY((x) => x + 1);
                } else setM((x) => x + 1);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
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
                  {day}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            در محصول واقعی از کتابخانهٔ جلالی تأییدشده استفاده می‌شود؛ اینجا الگوی UX قفل می‌شود.
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

export default function FormsGuidePage() {
  // Quick form
  const [qTitle, setQTitle] = useState("");
  const [qWh, setQWh] = useState("");

  // Shamsi
  const [docDate, setDocDate] = useState("1404/06/20");

  // Tabbed complex
  const [tab, setTab] = useState("base");
  const [draftSaved, setDraftSaved] = useState(false);
  const [tabCode, setTabCode] = useState("");
  const [tabName, setTabName] = useState("");
  const [tabNote, setTabNote] = useState("");
  const [tabPrice, setTabPrice] = useState("");

  // Upload
  const fileRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadItem[]>([
    { id: "1", name: "فاکتور-ورود.pdf", size: "240 KB" },
    { id: "2", name: "تصویر-کالا.jpg", size: "1.1 MB" },
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  // Edit change-tracking
  const [editVals, setEditVals] = useState<EditFields>({ ...EDIT_BASELINE });

  function isFieldDirty(key: keyof EditFields) {
    return editVals[key] !== EDIT_BASELINE[key];
  }

  function restoreField(key: keyof EditFields) {
    setEditVals((v) => ({ ...v, [key]: EDIT_BASELINE[key] }));
  }

  function setEditField(key: keyof EditFields, value: string) {
    setEditVals((v) => ({ ...v, [key]: value }));
  }

  const dirtyCount = useMemo(
    () => (Object.keys(EDIT_BASELINE) as (keyof EditFields)[]).filter(isFieldDirty).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editVals]
  );

  function onPickFiles(list: FileList | null) {
    if (!list?.length) return;
    const next: UploadItem[] = Array.from(list).map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`,
    }));
    setFiles((prev) => [...next, ...prev]);
  }

  function FieldShell({
    fieldKey,
    label,
    children,
  }: {
    fieldKey: keyof EditFields;
    label: string;
    children: React.ReactNode;
  }) {
    const dirty = isFieldDirty(fieldKey);
    return (
      <div
        className={cn(
          "space-y-1.5 rounded-lg p-2 transition",
          dirty && "bg-amber-50/80 ring-1 ring-amber-300/70 dark:bg-amber-950/30 dark:ring-amber-800"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <Label className={cn(dirty && "text-amber-900 dark:text-amber-100")}>
            {label}
            {dirty ? (
              <Badge variant="outline" className="mr-2 text-[9px] border-amber-400 text-amber-800">
                تغییر
              </Badge>
            ) : null}
          </Label>
          {dirty ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-[10px] text-muted-foreground"
              onClick={() => restoreField(fieldKey)}
            >
              <RotateCcw className="h-3 w-3" />
              بازگشت
            </Button>
          ) : null}
        </div>
        {children}
        {dirty ? (
          <p className="text-[10px] text-muted-foreground">
            قبلی: <span className="font-medium text-foreground">{EDIT_BASELINE[fieldKey]}</span>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        <GuidePageHeader meta={meta} />

        <GuideRulesBox title="قوانین فرم (تکمیل‌شده)">
          <ul className="list-disc space-y-1 pr-5">
            <li>
              <strong className="text-foreground">تاریخ همیشه شمسی</strong> در UI محصول — میلادی فقط در
              لایهٔ API/ذخیره در صورت نیاز.
            </li>
            <li>
              فرم سریع ≤۴ فیلد · فرم پیچیده تب‌دار با <strong className="text-foreground">ثبت موقت</strong>{" "}
              و <strong className="text-foreground">ثبت نهایی</strong>.
            </li>
            <li>خطا زیر فیلد · * روی برچسب · ثبت بدون رفرش صفحه (UI-02).</li>
            <li>
              ویرایش طولانی (≥۸ فیلد): فیلد تغییرکرده هایلایت · نمایش مقدار قبلی · دکمه بازگشت هر فیلد.
            </li>
            <li>Hint/Info قبل از ثبت حساس · آپلود با لیست و امکان تغییر نام/حذف.</li>
          </ul>
        </GuideRulesBox>

        {/* 1 Quick vs Complex */}
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
                داده دسته‌بندی‌شده که در یک صفحه جا نمی‌شود: تب + ثبت موقت + ثبت نهایی.
              </p>
              <ul className="list-disc space-y-1 pr-5 text-[11px] text-muted-foreground">
                <li>هر تب یک دامنه (هویت / مالی / پیوست)</li>
                <li>ثبت موقت = پیش‌نویس بدون اعتبارسنجی سخت همه تب‌ها</li>
                <li>ثبت نهایی = اعتبارسنجی همهٔ تب‌های الزامی</li>
              </ul>
            </div>
          </div>
        </GuideSection>

        {/* 2 Tabbed */}
        <GuideSection title="۲) فرم تب‌دار — ثبت موقت و ثبت نهایی">
          <div className="max-w-3xl rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {draftSaved ? (
                <Badge variant="success" className="text-[10px]">
                  پیش‌نویس ذخیره شد
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  ذخیره نشده
                </Badge>
              )}
            </div>
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="base">اطلاعات پایه</TabsTrigger>
                <TabsTrigger value="finance">مالی</TabsTrigger>
                <TabsTrigger value="extra">توضیحات</TabsTrigger>
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
              </TabsContent>
              <TabsContent value="finance" className="space-y-3">
                <div className="space-y-1.5">
                  <Label>قیمت پایه</Label>
                  <Input
                    value={tabPrice}
                    onChange={(e) => setTabPrice(e.target.value)}
                    inputMode="decimal"
                    dir="ltr"
                  />
                </div>
              </TabsContent>
              <TabsContent value="extra" className="space-y-3">
                <div className="space-y-1.5">
                  <Label>یادداشت</Label>
                  <Textarea value={tabNote} onChange={(e) => setTabNote(e.target.value)} rows={3} />
                </div>
              </TabsContent>
            </Tabs>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border/60 pt-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDraftSaved(true)}
              >
                ثبت موقت
              </Button>
              <Button type="button">ثبت نهایی</Button>
              <Button type="button" variant="outline">
                انصراف
              </Button>
            </div>
          </div>
        </GuideSection>

        {/* 3 Shamsi */}
        <GuideSection title="۳) انتخاب تاریخ شمسی">
          <div className="max-w-sm rounded-xl border border-border/70 bg-card p-4">
            <ShamsiDateField
              label="تاریخ سند"
              value={docDate}
              onChange={setDocDate}
              required
            />
            <p className="mt-3 text-[11px] text-muted-foreground">
              تقویم محصول: ماه/روز شمسی، هفته از شنبه. نمایش <code className="rounded bg-muted px-1">type="date"</code>{" "}
              مرورگر (میلادی) در فرم‌های عملیاتی ممنوع است.
            </p>
          </div>
        </GuideSection>

        {/* 4 All states */}
        <GuideSection title="۴) همهٔ حالت‌های محتمل فیلد">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                { t: "پیش‌فرض", el: <Input placeholder="خالی" /> },
                { t: "پر شده", el: <Input defaultValue="ITM-001" /> },
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
                      <span className="inline-flex items-center rounded-r-md border border-l-0 bg-muted px-2 text-xs text-muted-foreground">
                        IRR
                      </span>
                      <Input className="rounded-r-none" placeholder="مبلغ" dir="ltr" />
                    </div>
                  ),
                },
                {
                  t: "شمارنده کاراکتر",
                  el: (
                    <>
                      <Textarea maxLength={80} rows={2} placeholder="حداکثر ۸۰" />
                      <p className="text-left text-[10px] text-muted-foreground" dir="ltr">
                        0 / 80
                      </p>
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

        {/* 5 Upload */}
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

        {/* 6 Info / hints */}
        <GuideSection title="۶) Info و هشدار قبل از ثبت حساس">
          <div className="max-w-xl space-y-3">
            <div className="flex items-start gap-2 rounded-xl border border-sky-200/80 bg-sky-50/70 p-3 text-xs dark:border-sky-900 dark:bg-sky-950/30">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              <div>
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
              <Input className="max-w-[160px]" placeholder="0" dir="ltr" />
            </div>
          </div>
        </GuideSection>

        {/* 7 Edit change tracking */}
        <GuideSection
          title="۷) فرم ویرایش پیچیده — ردیابی تغییر و بازگشت"
          description="برای فرم‌های ≥۸ فیلد: فیلد تغییرکرده هایلایت می‌شود، مقدار قبلی کوچک نمایش داده می‌شود، دکمه بازگشت همان فیلد."
        >
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant={dirtyCount ? "warning" : "secondary"}>
              {dirtyCount ? `${dirtyCount} فیلد تغییر کرده` : "بدون تغییر"}
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
          <div className="max-w-3xl space-y-2 rounded-xl border border-border/70 bg-card p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <FieldShell fieldKey="code" label="کد">
                <Input
                  value={editVals.code}
                  onChange={(e) => setEditField("code", e.target.value)}
                />
              </FieldShell>
              <FieldShell fieldKey="name" label="نام">
                <Input
                  value={editVals.name}
                  onChange={(e) => setEditField("name", e.target.value)}
                />
              </FieldShell>
              <FieldShell fieldKey="group" label="گروه">
                <Input
                  value={editVals.group}
                  onChange={(e) => setEditField("group", e.target.value)}
                />
              </FieldShell>
              <FieldShell fieldKey="warehouse" label="انبار">
                <Input
                  value={editVals.warehouse}
                  onChange={(e) => setEditField("warehouse", e.target.value)}
                />
              </FieldShell>
              <FieldShell fieldKey="unit" label="واحد">
                <Input
                  value={editVals.unit}
                  onChange={(e) => setEditField("unit", e.target.value)}
                />
              </FieldShell>
              <FieldShell fieldKey="minStock" label="حداقل موجودی">
                <Input
                  value={editVals.minStock}
                  onChange={(e) => setEditField("minStock", e.target.value)}
                  dir="ltr"
                />
              </FieldShell>
              <FieldShell fieldKey="barcode" label="بارکد">
                <Input
                  value={editVals.barcode}
                  onChange={(e) => setEditField("barcode", e.target.value)}
                  dir="ltr"
                />
              </FieldShell>
              <FieldShell fieldKey="supplier" label="تأمین‌کننده">
                <Input
                  value={editVals.supplier}
                  onChange={(e) => setEditField("supplier", e.target.value)}
                />
              </FieldShell>
              <div className="sm:col-span-2">
                <FieldShell fieldKey="description" label="توضیحات">
                  <Textarea
                    rows={2}
                    value={editVals.description}
                    onChange={(e) => setEditField("description", e.target.value)}
                  />
                </FieldShell>
              </div>
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
          <p className="mt-2 text-xs text-muted-foreground">
            یک فیلد را عوض کن تا هایلایت کهربایی، «قبلی: …» و دکمه بازگشت ظاهر شود.
          </p>
        </GuideSection>

        {/* 8 Do Don't */}
        <GuideSection title="۸) Do / Don’t">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="mb-2 font-medium text-emerald-800 dark:text-emerald-200">انجام بده</div>
              <ul className="list-disc space-y-1 pr-5 text-xs text-muted-foreground">
                <li>تقویم شمسی در همه فرم‌های عملیاتی</li>
                <li>ثبت موقت برای فرم‌های چندتب</li>
                <li>هایلایت + بازگشت مقدار قبلی در ویرایش طولانی</li>
                <li>Info/هشدار قبل از ثبت حساس</li>
              </ul>
            </div>
            <div className="rounded-xl border bg-muted/25 p-4 text-sm">
              <div className="mb-2 font-medium">انجام نده</div>
              <ul className="list-disc space-y-1 pr-5 text-xs text-muted-foreground">
                <li>input type=date میلادی در UI کاربر</li>
                <li>یک صفحه بی‌نهایت بدون تب برای داده چنددامنه‌ای</li>
                <li>ویرایش ۱۰ فیلد بدون نشان دادن چه چیزی عوض شده</li>
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
