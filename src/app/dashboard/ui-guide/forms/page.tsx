"use client";

import { useMemo, useState, type ComponentProps } from "react";
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
import { Separator } from "@/shared/components/ui/separator";
import { cn } from "@/shared/lib/utils";

const meta = {
  code: "UI-04",
  title: "Forms & Data Entry",
  description:
    "ورودی‌ها، برچسب، اعتبارسنجی، چیدمان، حالت‌های فیلد و قرارداد ثبت — وابسته به توکن‌های UI-00/01 و قواعد Overlay در UI-02.",
  phase: "فاز ۲",
  status: "ready" as const,
};

export default function FormsGuidePage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [note, setNote] = useState("");
  const [active, setActive] = useState(true);
  const [agree, setAgree] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const codeError = submitted && !code.trim();
  const nameError = submitted && !name.trim();
  const canSubmit = code.trim().length > 0 && name.trim().length > 0;

  const isDirty = useMemo(
    () =>
      code.trim().length > 0 ||
      name.trim().length > 0 ||
      warehouse.length > 0 ||
      note.trim().length > 0 ||
      !active ||
      agree,
    [code, name, warehouse, note, active, agree]
  );

  function resetDemo() {
    setCode("");
    setName("");
    setWarehouse("");
    setNote("");
    setActive(true);
    setAgree(false);
    setSubmitted(false);
    setSaving(false);
  }

  function handleSubmit() {
    setSubmitted(true);
    if (!canSubmit) return;
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      setSubmitted(false);
      resetDemo();
    }, 500);
  }

  return (
    <div className="space-y-6">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین فرم (وابسته به صفحات قبل)">
        <ul className="list-disc space-y-1 pr-5">
          <li>
            فیلدها از توکن رنگ/شعاع/فاصله UI-00 و UI-01 استفاده می‌کنند — رنگ هگز ثابت ممنوع.
          </li>
          <li>
            برچسب بالای فیلد · الزامی با <code className="rounded bg-muted px-1">*</code> کنار
            برچسب · پیام خطا زیر فیلد، نه فقط Toast.
          </li>
          <li>
            عرض فرم استاندارد داخل <code className="rounded bg-muted px-1">max-w-3xl</code> تا{" "}
            <code className="rounded bg-muted px-1">max-w-5xl</code> (UI-02).
          </li>
          <li>ثبت: بدون رفرش صفحه · دکمه در حالت Saving غیرفعال · double-submit ممنوع.</li>
          <li>
            در Overlay (UI-02): فرم تمیز → بستن آزاد · فرم تغییرکرده → فقط ثبت/انصراف · انصراف بدون
            سؤال.
          </li>
          <li>نوتیف موفقیت/خطای سراسری در UI-06 تکمیل می‌شود.</li>
        </ul>
      </GuideRulesBox>

      <GuideSection
        title="۱) آناتومی فیلد"
        description="ترتیب ثابت: Label → Control → Helper/Error. فاصله عمودی بین فیلدها gap-4 در Comfortable."
      >
        <div className="max-w-md space-y-4 rounded-xl border border-border/70 bg-card p-4">
          <div className="space-y-1.5">
            <Label htmlFor="demo-code">
              کد کالا <span className="text-destructive">*</span>
            </Label>
            <Input id="demo-code" placeholder="ITM-001" />
            <p className="text-[11px] text-muted-foreground">فقط حروف و عدد و خط تیره</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="demo-err">
              فیلد با خطا <span className="text-destructive">*</span>
            </Label>
            <Input
              id="demo-err"
              defaultValue=""
              aria-invalid
              className="border-destructive focus-visible:ring-destructive/30"
            />
            <p className="text-[11px] text-destructive">این فیلد الزامی است</p>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۲) انواع کنترل رایج ERP">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
            <div className="text-xs font-medium text-foreground">متن و عدد</div>
            <div className="space-y-1.5">
              <Label>متن</Label>
              <Input placeholder="عنوان سند" />
            </div>
            <div className="space-y-1.5">
              <Label>عدد</Label>
              <Input type="number" placeholder="0" inputMode="decimal" />
            </div>
            <div className="space-y-1.5">
              <Label>تاریخ (نمایشی)</Label>
              <Input type="date" />
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4">
            <div className="text-xs font-medium text-foreground">انتخاب و متن بلند</div>
            <div className="space-y-1.5">
              <Label>انبار</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب انبار" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="main">انبار مرکزی</SelectItem>
                  <SelectItem value="south">انبار جنوب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>توضیحات</Label>
              <Textarea placeholder="شرح اختیاری…" rows={3} />
            </div>
          </div>
          <div className="space-y-3 rounded-xl border border-border/70 bg-card p-4 md:col-span-2">
            <div className="text-xs font-medium text-foreground">بولین و تأیید</div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox id="chk1" />
                <Label htmlFor="chk1" className="font-normal">
                  قابل فروش
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="sw1" defaultChecked />
                <Label htmlFor="sw1" className="font-normal">
                  فعال
                </Label>
              </div>
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۳) حالت‌های فیلد">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              { label: "پیش‌فرض", props: { placeholder: "عادی" } as ComponentProps<typeof Input> },
              {
                label: "Disabled",
                props: { disabled: true, value: "غیرفعال" } as ComponentProps<typeof Input>,
              },
              {
                label: "Readonly",
                props: { readOnly: true, value: "فقط خواندنی" } as ComponentProps<typeof Input>,
              },
              {
                label: "خطا",
                props: {
                  "aria-invalid": true,
                  className: "border-destructive",
                  placeholder: "خطا",
                } as ComponentProps<typeof Input>,
              },
            ] as const
          ).map((s) => (
            <div key={s.label} className="space-y-1.5 rounded-xl border border-border/60 p-3">
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
              <Input {...s.props} />
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection
        title="۴) چیدمان فرم"
        description="یک ستونه برای فرم باریک · دو ستونه از md به بالا. بخش‌ها با عنوان جدا شوند."
      >
        <div className="max-w-3xl space-y-4 rounded-xl border border-border/70 bg-card p-4">
          <div className="text-xs font-medium text-foreground">اطلاعات اصلی</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>کد</Label>
              <Input placeholder="ITM-…" />
            </div>
            <div className="space-y-1.5">
              <Label>نام</Label>
              <Input placeholder="نام کالا" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>گروه کالا</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="raw">مواد اولیه</SelectItem>
                  <SelectItem value="fg">محصول نهایی</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="text-xs font-medium text-foreground">توضیحات</div>
          <Textarea rows={2} placeholder="اختیاری" />
        </div>
      </GuideSection>

      <GuideSection title="۵) دموی زنده — اعتبارسنجی و ثبت">
        <div className="max-w-lg space-y-4 rounded-xl border border-border/70 bg-card p-4">
          <div className="space-y-1.5">
            <Label htmlFor="live-code">
              کد <span className="text-destructive">*</span>
            </Label>
            <Input
              id="live-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={cn(codeError && "border-destructive focus-visible:ring-destructive/30")}
            />
            {codeError ? <p className="text-[11px] text-destructive">کد الزامی است</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="live-name">
              نام <span className="text-destructive">*</span>
            </Label>
            <Input
              id="live-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(nameError && "border-destructive focus-visible:ring-destructive/30")}
            />
            {nameError ? <p className="text-[11px] text-destructive">نام الزامی است</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label>انبار</Label>
            <Select value={warehouse || undefined} onValueChange={setWarehouse}>
              <SelectTrigger>
                <SelectValue placeholder="اختیاری" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="main">انبار مرکزی</SelectItem>
                <SelectItem value="south">انبار جنوب</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="live-note">یادداشت</Label>
            <Textarea
              id="live-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Switch id="live-active" checked={active} onCheckedChange={setActive} />
              <Label htmlFor="live-active" className="font-normal">
                فعال
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="live-agree"
                checked={agree}
                onCheckedChange={(v) => setAgree(v === true)}
              />
              <Label htmlFor="live-agree" className="font-normal">
                قابل فروش
              </Label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button disabled={saving} onClick={handleSubmit}>
              {saving ? "در حال ذخیره…" : "ثبت"}
            </Button>
            <Button type="button" variant="outline" disabled={saving} onClick={resetDemo}>
              انصراف
            </Button>
            {isDirty ? (
              <span className="self-center text-[11px] text-muted-foreground">تغییر ذخیره‌نشده</span>
            ) : null}
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۶) دکمه‌های فرم">
        <div className="flex flex-wrap gap-2">
          <Button>اصلی — ثبت</Button>
          <Button variant="secondary">ثانویه</Button>
          <Button variant="outline">انصراف</Button>
          <Button variant="destructive">حذف</Button>
          <Button disabled>Disabled</Button>
          <Button disabled>در حال ذخیره…</Button>
        </div>
      </GuideSection>

      <GuideSection title="۷) یادآوری چیدمان UI-02">
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="rounded-lg border bg-muted/20 p-3">
            <strong className="text-foreground">A عمودی</strong>
            <p className="mt-1">فرم متوسط بالا · جدول پایین</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <strong className="text-foreground">B کنار هم</strong>
            <p className="mt-1">فقط ≤۴ فیلد</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <strong className="text-foreground">C Overlay</strong>
            <p className="mt-1">جدول کامل · Modal/Drawer</p>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۸) Do / Don’t">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="mb-2 font-medium text-emerald-800 dark:text-emerald-200">انجام بده</div>
            <ul className="list-disc space-y-1 pr-5 text-xs text-muted-foreground">
              <li>خطا کنار همان فیلد</li>
              <li>الزامی با * روی برچسب</li>
              <li>ثبت بدون reload</li>
              <li>چیدمان ۱–۲ ستونه</li>
            </ul>
          </div>
          <div className="rounded-xl border bg-muted/25 p-4 text-sm">
            <div className="mb-2 font-medium">انجام نده</div>
            <ul className="list-disc space-y-1 pr-5 text-xs text-muted-foreground">
              <li>فقط Toast به‌جای خطای فیلد</li>
              <li>placeholder به‌جای Label</li>
              <li>بیش از ۳ ستون در یک ردیف</li>
              <li>submit کلاسیک با رفرش صفحه</li>
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
  );
}
