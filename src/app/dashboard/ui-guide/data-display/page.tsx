"use client";

import { useMemo, useState } from "react";
import {
  GuidePageHeader,
  GuideRulesBox,
  GuideSection,
} from "@/shared/components/ui-guide/guide-shell";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Package as PhPackage } from "@phosphor-icons/react/dist/csr/Package";

const meta = {
  code: "UI-05",
  title: "Data Display & Tables",
  description:
    "جدول پایه و فشرده، هدر قابل مرتب‌سازی، انتخاب ردیف، اکشن، Toolbar چسبان، Empty، Skeleton، صفحه‌بندی، Card/List موبایل.",
  phase: "فاز ۲",
  status: "ready" as const,
};

function toFa(value: string | number): string {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

type ItemRow = {
  id: string;
  code: string;
  name: string;
  warehouse: string;
  qty: number;
  unit: string;
  status: "active" | "low" | "draft";
};

const SAMPLE_ROWS: ItemRow[] = [
  {
    id: "1",
    code: "ITM-100",
    name: "ورق فولادی",
    warehouse: "انبار مرکزی",
    qty: 1200,
    unit: "کیلوگرم",
    status: "active",
  },
  {
    id: "2",
    code: "ITM-101",
    name: "پیچ M8",
    warehouse: "انبار قطعات",
    qty: 45,
    unit: "عدد",
    status: "low",
  },
  {
    id: "3",
    code: "ITM-102",
    name: "رنگ اپوکسی",
    warehouse: "انبار جنوب",
    qty: 80,
    unit: "لیتر",
    status: "active",
  },
  {
    id: "4",
    code: "ITM-103",
    name: "واشر آب‌بندی",
    warehouse: "انبار مرکزی",
    qty: 12,
    unit: "بسته",
    status: "low",
  },
  {
    id: "5",
    code: "ITM-104",
    name: "کابل برق",
    warehouse: "انبار شمال",
    qty: 350,
    unit: "متر",
    status: "active",
  },
  {
    id: "6",
    code: "ITM-105",
    name: "ورق آلومینیوم",
    warehouse: "انبار مرکزی",
    qty: 0,
    unit: "کیلوگرم",
    status: "draft",
  },
];

const statusLabel: Record<ItemRow["status"], string> = {
  active: "فعال",
  low: "کم‌موجودی",
  draft: "پیش‌نویس",
};

const statusVariant: Record<
  ItemRow["status"],
  "success" | "warning" | "secondary"
> = {
  active: "success",
  low: "warning",
  draft: "secondary",
};

type SortKey = "code" | "name" | "qty" | null;

export default function DataDisplayGuidePage() {
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showEmpty, setShowEmpty] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const pageSize = 4;

  const filtered = useMemo(() => {
    let rows = [...SAMPLE_ROWS];
    const q = query.trim();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.code.includes(q) ||
          r.name.includes(q) ||
          r.warehouse.includes(q)
      );
    }
    if (sortKey) {
      rows.sort((a, b) => {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (typeof av === "number" && typeof bv === "number") {
          return sortDir === "asc" ? av - bv : bv - av;
        }
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv), "fa")
          : String(bv).localeCompare(String(av), "fa");
      });
    }
    return rows;
  }, [query, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleAllPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageRows.forEach((r) => next.delete(r.id));
      } else {
        pageRows.forEach((r) => next.add(r.id));
      }
      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const cellPy = density === "comfortable" ? "py-2.5" : "py-1.5";
  const headH = density === "comfortable" ? "h-10" : "h-8";

  function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
    if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return dir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین نمایش داده و جدول">
        <ul className="list-disc space-y-1 pr-5">
          <li>
            Density از UI-01/02: Comfortable پیش‌فرض · Compact برای صفحات پرتراکم.
          </li>
          <li>
            Sticky فقط toolbar بالای همان جدول (نه کل صفحه) — UI-02.
          </li>
          <li>
            بعد از mutation جدول درجا به‌روز می‌شود · بدون رفرش کامل صفحه.
          </li>
          <li>
            آیکون جدول فقط Lucide کوچک · Empty/Hero با Phosphor Duotone مجاز.
          </li>
          <li>
            اعداد چپ‌به‌راست و ارقام فارسی · صفحه راست‌چین.
          </li>
          <li>
            انتخاب ردیف + اکشن گروهی در toolbar · اکشن ردیف در ستون آخر.
          </li>
          <li>
            موبایل: Card/List جایگزین جدول عریض · فیلتر کامل در UI-10.
          </li>
        </ul>
      </GuideRulesBox>

      <GuideSection
        title="۱) Density — Comfortable در برابر Compact"
        description="ارتفاع ردیف و فاصله داخلی با یک سوئیچ کنترل می‌شود."
      >
        <div className="mb-3 flex flex-wrap gap-2">
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
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn(headH)}>کد</TableHead>
                <TableHead className={cn(headH)}>نام کالا</TableHead>
                <TableHead className={cn(headH)}>موجودی</TableHead>
                <TableHead className={cn(headH)}>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SAMPLE_ROWS.slice(0, 3).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className={cn("font-mono text-primary", cellPy)}>
                    {r.code}
                  </TableCell>
                  <TableCell className={cellPy}>{r.name}</TableCell>
                  <TableCell className={cn(cellPy)} dir="ltr">
                    {toFa(r.qty)}
                  </TableCell>
                  <TableCell className={cellPy}>
                    <Badge variant={statusVariant[r.status]} className="text-[10px]">
                      {statusLabel[r.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </GuideSection>

      <GuideSection
        title="۲) جدول کامل — هدر، مرتب‌سازی، انتخاب، اکشن، Toolbar چسبان"
        description="الگوی عملیاتی استاندارد لیست‌های ERP."
      >
        <div className="mb-2 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={showEmpty ? "default" : "outline"}
            onClick={() => {
              setShowEmpty((v) => !v);
              setShowSkeleton(false);
            }}
          >
            {showEmpty ? "نمایش داده" : "Empty State"}
          </Button>
          <Button
            size="sm"
            variant={showSkeleton ? "default" : "outline"}
            onClick={() => {
              setShowSkeleton((v) => !v);
              setShowEmpty(false);
            }}
          >
            {showSkeleton ? "پایان Loading" : "Skeleton"}
          </Button>
        </div>

        <div className="max-h-[420px] overflow-auto rounded-xl border border-border/70 bg-card">
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-card/95 px-3 py-2 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {showEmpty
                  ? toFa(0)
                  : toFa(filtered.length)}{" "}
                نتیجه
                {selected.size > 0 ? (
                  <span className="mr-2 text-primary">
                    · {toFa(selected.size)} انتخاب‌شده
                  </span>
                ) : null}
              </span>
              {selected.size > 0 ? (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-[11px]">
                    خروجی
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] text-destructive">
                    حذف
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="جستجو…"
                  className="h-8 w-40 pr-8 text-xs"
                />
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-[11px]">
                <Filter className="h-3.5 w-3.5" />
                فیلتر
              </Button>
              <Button size="sm" className="h-8 gap-1 text-[11px]">
                <Plus className="h-3.5 w-3.5" />
                جدید
              </Button>
            </div>
          </div>

          {showSkeleton ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          ) : showEmpty || filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
              <PhPackage className="h-14 w-14 text-primary" weight="duotone" />
              <div className="text-sm font-medium">هنوز کالایی ثبت نشده</div>
              <p className="max-w-xs text-xs text-muted-foreground">
                برای شروع، اولین کالا را اضافه کنید. آیکون Empty فقط Phosphor Duotone است.
              </p>
              <Button size="sm" className="mt-1 gap-1">
                <Plus className="h-3.5 w-3.5" />
                کالای جدید
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn("w-10", headH)}>
                      <Checkbox
                        checked={allPageSelected}
                        onCheckedChange={toggleAllPage}
                        aria-label="انتخاب همه صفحه"
                      />
                    </TableHead>
                    <TableHead className={cn(headH)}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() => toggleSort("code")}
                      >
                        کد
                        <SortIcon active={sortKey === "code"} dir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead className={cn(headH)}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() => toggleSort("name")}
                      >
                        نام
                        <SortIcon active={sortKey === "name"} dir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead className={cn(headH)}>انبار</TableHead>
                    <TableHead className={cn(headH)}>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 hover:text-foreground"
                        onClick={() => toggleSort("qty")}
                      >
                        موجودی
                        <SortIcon active={sortKey === "qty"} dir={sortDir} />
                      </button>
                    </TableHead>
                    <TableHead className={cn(headH)}>وضعیت</TableHead>
                    <TableHead className={cn("w-24 text-center", headH)}>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => {
                    const isSel = selected.has(r.id);
                    return (
                      <TableRow
                        key={r.id}
                        data-state={isSel ? "selected" : undefined}
                      >
                        <TableCell className={cellPy}>
                          <Checkbox
                            checked={isSel}
                            onCheckedChange={() => toggleOne(r.id)}
                            aria-label={`انتخاب ${r.code}`}
                          />
                        </TableCell>
                        <TableCell
                          className={cn("font-mono text-primary", cellPy)}
                        >
                          {r.code}
                        </TableCell>
                        <TableCell className={cellPy}>
                          <span className="inline-flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            {r.name}
                          </span>
                        </TableCell>
                        <TableCell className={cn("text-muted-foreground", cellPy)}>
                          {r.warehouse}
                        </TableCell>
                        <TableCell className={cellPy}>
                          <span dir="ltr" className="font-mono tabular-nums">
                            {toFa(r.qty)}
                          </span>{" "}
                          <span className="text-[11px] text-muted-foreground">
                            {r.unit}
                          </span>
                        </TableCell>
                        <TableCell className={cellPy}>
                          <Badge
                            variant={statusVariant[r.status]}
                            className="text-[10px]"
                          >
                            {statusLabel[r.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("text-center", cellPy)}>
                          <div className="inline-flex items-center gap-0.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              aria-label="ویرایش"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground"
                              aria-label="بیشتر"
                            >
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
                <span>
                  صفحه {toFa(page)} از {toFa(totalPages)}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="صفحه قبل"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const n = i + 1;
                    return (
                      <Button
                        key={n}
                        size="sm"
                        variant={page === n ? "default" : "outline"}
                        className="h-7 min-w-7 px-2 text-[11px]"
                        onClick={() => setPage(n)}
                      >
                        {toFa(n)}
                      </Button>
                    );
                  })}
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="صفحه بعد"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </GuideSection>

      <GuideSection
        title="۳) Skeleton / Loading"
        description="در زمان بارگذاری اولیه یا رفرش داده، به‌جای جدول خالی از اسکلتون استفاده شود."
      >
        <div className="rounded-xl border border-border/70 bg-card p-3">
          <div className="mb-3 flex justify-between border-b border-border/50 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-20 rounded-md" />
          </div>
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-14" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۴) Empty State"
        description="فقط در Empty/Hero/Onboarding از Phosphor Duotone استفاده شود."
      >
        <div className="pattern-mesh flex flex-col items-center gap-3 rounded-xl border border-border/70 px-4 py-12 text-center">
          <PhPackage className="h-16 w-16 text-primary" weight="duotone" />
          <div className="text-sm font-medium">لیست خالی است</div>
          <p className="max-w-sm text-xs text-muted-foreground">
            هیچ ردیفی با فیلتر فعلی یافت نشد یا هنوز داده‌ای ثبت نشده. دکمه اقدام اصلی را
            واضح نگه دارید.
          </p>
          <Button size="sm" className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            افزودن اولین مورد
          </Button>
        </div>
      </GuideSection>

      <GuideSection
        title="۵) Card / List — جایگزین جدول در موبایل"
        description="روی عرض کم، ردیف‌ها به کارت تبدیل می‌شوند تا اسکرول افقی اجباری نشود."
      >
        <div className="grid gap-2 sm:hidden">
          {SAMPLE_ROWS.slice(0, 3).map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-border/70 bg-card p-3 elevate-hover"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-xs text-primary">{r.code}</div>
                  <div className="text-sm font-medium">{r.name}</div>
                </div>
                <Badge variant={statusVariant[r.status]} className="text-[10px]">
                  {statusLabel[r.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{r.warehouse}</span>
                <span dir="ltr" className="font-mono">
                  {toFa(r.qty)} {r.unit}
                </span>
              </div>
              <div className="mt-2 flex justify-end gap-1 border-t border-border/50 pt-2">
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-[11px]">
                  <Pencil className="h-3 w-3" />
                  ویرایش
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-[11px] text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                  حذف
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="hidden gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-3">
          {SAMPLE_ROWS.slice(0, 3).map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-border/70 bg-card p-3 elevate-hover"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Package className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="font-mono text-[11px] text-primary">{r.code}</div>
                    <div className="text-sm font-medium">{r.name}</div>
                  </div>
                </div>
                <Badge variant={statusVariant[r.status]} className="text-[10px]">
                  {statusLabel[r.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{r.warehouse}</span>
                <span dir="ltr" className="font-mono tabular-nums">
                  {toFa(r.qty)}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          در viewport موبایل فقط نسخه لیست کارت نمایش داده می‌شود؛ از sm به بالا می‌توان
          جدول یا شبکه کارت را انتخاب کرد.
        </p>
      </GuideSection>

      <GuideSection
        title="۶) ترکیب با فیلتر (آماده برای UI-10)"
        description="فیلتر سبک در toolbar کافی است؛ پنل فیلتر پیشرفته در Composition می‌آید."
      >
        <div className="rounded-xl border border-border/70 bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="جستجوی سریع…"
                className="h-8 pr-8 text-xs"
                defaultValue=""
              />
            </div>
            <Button size="sm" variant="outline" className="h-8 gap-1 text-[11px]">
              <Filter className="h-3.5 w-3.5" />
              فیلترها
              <Badge variant="secondary" className="mr-0.5 h-4 px-1 text-[9px]">
                {toFa(2)}
              </Badge>
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-[11px] text-muted-foreground">
              پاک‌کردن
            </Button>
          </div>
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            نتیجه فیلتر در همین ناحیه جدول رندر می‌شود · بدون ناوبری صفحه جدید.
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
              <li>Sticky فقط روی toolbar همان جدول</li>
              <li>اعداد با dir=ltr و ارقام فارسی</li>
              <li>Empty با Phosphor Duotone + CTA واضح</li>
              <li>Skeleton به‌جای جدول خالی در Loading</li>
              <li>انتخاب گروهی + اکشن در toolbar</li>
              <li>به‌روزرسانی درجا بعد از ثبت/حذف</li>
              <li>Card/List روی موبایل به‌جای اسکرول افقی اجباری</li>
            </ul>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="mb-2 font-medium text-destructive">انجام نده</div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>Sticky کردن کل هدر صفحه</li>
              <li>رفرش کامل صفحه بعد از mutation</li>
              <li>آیکون Duotone داخل ردیف‌های جدول</li>
              <li>اعداد راست‌چین یا ارقام لاتین در UI فارسی</li>
              <li>جدول عریض بدون جایگزین موبایل</li>
              <li>حذف همه ستون‌ها برای «ساده‌سازی» بدون نیاز واقعی</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/forms">UI-04 Forms</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/layout">UI-02 Layout</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide">فهرست راهنما</a>
        </Button>
      </div>
    </div>
  );
}
