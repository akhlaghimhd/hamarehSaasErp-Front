"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  GuidePageHeader,
  GuideRulesBox,
  GuideSection,
} from "@/shared/components/ui-guide/guide-shell";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
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
  Building2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns3,
  Eye,
  Filter,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { Package as PhPackage } from "@phosphor-icons/react/dist/csr/Package";
import { MagnifyingGlass as PhSearch } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";

const meta = {
  code: "UI-05",
  title: "Data Display & Tables",
  description:
    "ستون قابل‌انتخاب، مالی، page-size، Empty در برابر جستجوی خالی، Stripe، stale، Card/List متنوع",
  phase: "فاز ۲",
  status: "ready" as const,
};

const MAX_VISIBLE_COLS = 6;

function toFa(value: string | number): string {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function formatMoney(value: number, decimals = 0): string {
  const fixed = value.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const withSep = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const result = decPart !== undefined ? `${withSep}.${decPart}` : withSep;
  return toFa(result);
}

type ItemRow = {
  id: string;
  code: string;
  name: string;
  warehouse: string;
  qty: number;
  unit: string;
  status: "active" | "low" | "draft";
  category: string;
  minStock: number;
  maxStock: number;
  lastMove: string;
  barcode: string;
};

const SAMPLE_ROWS: ItemRow[] = [
  { id: "1", code: "ITM-100", name: "ورق فولادی", warehouse: "انبار مرکزی", qty: 1200, unit: "کیلوگرم", status: "active", category: "مواد اولیه", minStock: 100, maxStock: 5000, lastMove: "۱۴۰۳/۰۶/۲۰", barcode: "6260001001" },
  { id: "2", code: "ITM-101", name: "پیچ M8", warehouse: "انبار قطعات", qty: 45, unit: "عدد", status: "low", category: "اتصالات", minStock: 50, maxStock: 2000, lastMove: "۱۴۰۳/۰۶/۱۸", barcode: "6260001002" },
  { id: "3", code: "ITM-102", name: "رنگ اپوکسی", warehouse: "انبار جنوب", qty: 80, unit: "لیتر", status: "active", category: "مواد شیمیایی", minStock: 20, maxStock: 500, lastMove: "۱۴۰۳/۰۶/۱۵", barcode: "6260001003" },
  { id: "4", code: "ITM-103", name: "واشر آب‌بندی", warehouse: "انبار مرکزی", qty: 12, unit: "بسته", status: "low", category: "اتصالات", minStock: 30, maxStock: 800, lastMove: "۱۴۰۳/۰۶/۱۲", barcode: "6260001004" },
  { id: "5", code: "ITM-104", name: "کابل برق", warehouse: "انبار شمال", qty: 350, unit: "متر", status: "active", category: "برق", minStock: 50, maxStock: 2000, lastMove: "۱۴۰۳/۰۶/۲۲", barcode: "6260001005" },
  { id: "6", code: "ITM-105", name: "ورق آلومینیوم", warehouse: "انبار مرکزی", qty: 0, unit: "کیلوگرم", status: "draft", category: "مواد اولیه", minStock: 80, maxStock: 3000, lastMove: "—", barcode: "6260001006" },
  { id: "7", code: "ITM-106", name: "مهره M10", warehouse: "انبار قطعات", qty: 890, unit: "عدد", status: "active", category: "اتصالات", minStock: 100, maxStock: 5000, lastMove: "۱۴۰۳/۰۶/۲۱", barcode: "6260001007" },
  { id: "8", code: "ITM-107", name: "تسمه نقاله", warehouse: "انبار جنوب", qty: 22, unit: "متر", status: "low", category: "مکانیک", minStock: 25, maxStock: 200, lastMove: "۱۴۰۳/۰۶/۱۰", barcode: "6260001008" },
];

type ColKey = keyof ItemRow | "actions";
type ColDef = { key: ColKey; label: string; priority: number; defaultVisible: boolean };

const ALL_COLUMNS: ColDef[] = [
  { key: "code", label: "کد", priority: 1, defaultVisible: true },
  { key: "name", label: "نام", priority: 2, defaultVisible: true },
  { key: "warehouse", label: "انبار", priority: 3, defaultVisible: true },
  { key: "qty", label: "موجودی", priority: 4, defaultVisible: true },
  { key: "status", label: "وضعیت", priority: 5, defaultVisible: true },
  { key: "category", label: "دسته", priority: 6, defaultVisible: false },
  { key: "minStock", label: "حداقل", priority: 7, defaultVisible: false },
  { key: "maxStock", label: "حداکثر", priority: 8, defaultVisible: false },
  { key: "lastMove", label: "آخرین حرکت", priority: 9, defaultVisible: false },
  { key: "barcode", label: "بارکد", priority: 10, defaultVisible: false },
  { key: "actions", label: "عملیات", priority: 99, defaultVisible: true },
];

const statusLabel: Record<ItemRow["status"], string> = {
  active: "فعال",
  low: "کم‌موجودی",
  draft: "پیش‌نویس",
};

const statusVariant: Record<ItemRow["status"], "success" | "warning" | "secondary"> = {
  active: "success",
  low: "warning",
  draft: "secondary",
};

type FinanceRow = {
  id: string;
  voucher: string;
  party: string;
  debit: number;
  credit: number;
  balance: number;
  date: string;
};

const FINANCE_ROWS: FinanceRow[] = [
  { id: "f1", voucher: "ACC-1403-001", party: "شرکت فولاد پارس", debit: 12500000, credit: 0, balance: 12500000, date: "۱۴۰۳/۰۶/۰۱" },
  { id: "f2", voucher: "ACC-1403-002", party: "تأمین‌کنندگان جنوب", debit: 0, credit: 3750000.5, balance: 8750000.5, date: "۱۴۰۳/۰۶/۰۳" },
  { id: "f3", voucher: "ACC-1403-003", party: "فروشگاه مرکزی", debit: 892000, credit: 0, balance: 9642000.5, date: "۱۴۰۳/۰۶/۰۵" },
  { id: "f4", voucher: "ACC-1403-004", party: "پیمانکار نصب", debit: 0, credit: 2100000, balance: 7542000.5, date: "۱۴۰۳/۰۶/۰۸" },
];

type EmployeeCard = {
  id: string;
  name: string;
  role: string;
  dept: string;
  status: "active" | "leave" | "remote";
  avatar: string;
};

const EMPLOYEE_ROWS: EmployeeCard[] = [
  { id: "e1", name: "سارا محمدی", role: "کارشناس انبار", dept: "عملیات", status: "active", avatar: "سم" },
  { id: "e2", name: "علی رضایی", role: "حسابدار", dept: "مالی", status: "remote", avatar: "عر" },
  { id: "e3", name: "مریم کریمی", role: "مسئول خرید", dept: "تدارکات", status: "leave", avatar: "مک" },
];

type InvoiceCard = {
  id: string;
  number: string;
  customer: string;
  amount: number;
  status: "paid" | "pending" | "overdue";
  due: string;
};

const INVOICE_CARDS: InvoiceCard[] = [
  { id: "i1", number: "SI-1403-88", customer: "شرکت آریا", amount: 45800000, status: "paid", due: "۱۴۰۳/۰۵/۳۰" },
  { id: "i2", number: "SI-1403-91", customer: "گروه صنعتی نور", amount: 12350000.75, status: "pending", due: "۱۴۰۳/۰۶/۲۵" },
  { id: "i3", number: "SI-1403-94", customer: "بازرگانی سپهر", amount: 8900000, status: "overdue", due: "۱۴۰۳/۰۶/۱۰" },
];

type SortKey = "code" | "name" | "qty" | null;

export default function DataDisplayGuidePage() {
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(4);
  const [showEmpty, setShowEmpty] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [staleData, setStaleData] = useState(false);
  const [colPickerOpen, setColPickerOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<ItemRow | null>(null);
  const [visibleCols, setVisibleCols] = useState<Set<ColKey>>(() => {
    const s = new Set<ColKey>();
    ALL_COLUMNS.filter((c) => c.defaultVisible).forEach((c) => s.add(c.key));
    return s;
  });

  const filtered = useMemo(() => {
    let rows = [...SAMPLE_ROWS];
    const q = query.trim();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.code.includes(q) ||
          r.name.includes(q) ||
          r.warehouse.includes(q) ||
          r.category.includes(q)
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
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const isSearchNoResult = query.trim().length > 0 && filtered.length === 0;

  const activeDataCols = ALL_COLUMNS.filter(
    (c) => c.key !== "actions" && visibleCols.has(c.key)
  ).sort((a, b) => a.priority - b.priority);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }
  function toggleAllPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageRows.forEach((r) => next.delete(r.id));
      else pageRows.forEach((r) => next.add(r.id));
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
  function toggleCol(key: ColKey) {
    if (key === "actions") return;
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size <= 2) return prev;
        next.delete(key);
      } else {
        const dataCount = [...next].filter((k) => k !== "actions").length;
        if (dataCount >= MAX_VISIBLE_COLS) return prev;
        next.add(key);
      }
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

  function renderCell(row: ItemRow, key: ColKey): ReactNode {
    switch (key) {
      case "code":
        return <span className="font-mono text-primary">{row.code}</span>;
      case "name":
        return (
          <span className="inline-flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            {row.name}
          </span>
        );
      case "warehouse":
        return <span className="text-muted-foreground">{row.warehouse}</span>;
      case "qty":
        return (
          <>
            <span dir="ltr" className="font-mono tabular-nums">
              {toFa(row.qty)}
            </span>{" "}
            <span className="text-[11px] text-muted-foreground">{row.unit}</span>
          </>
        );
      case "status":
        return (
          <Badge variant={statusVariant[row.status]} className="text-[10px]">
            {statusLabel[row.status]}
          </Badge>
        );
      case "category":
        return row.category;
      case "minStock":
        return (
          <span dir="ltr" className="font-mono tabular-nums">
            {toFa(row.minStock)}
          </span>
        );
      case "maxStock":
        return (
          <span dir="ltr" className="font-mono tabular-nums">
            {toFa(row.maxStock)}
          </span>
        );
      case "lastMove":
        return <span className="text-muted-foreground">{row.lastMove}</span>;
      case "barcode":
        return <span className="font-mono text-xs">{row.barcode}</span>;
      default:
        return null;
    }
  }

  return (
    <div className="space-y-6" dir="rtl">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین نمایش داده و جدول">
        <ul className="list-disc space-y-1 pr-5">
          <li>Density · Sticky فقط toolbar جدول · بدون رفرش کامل · Lucide در جدول · Phosphor فقط Empty</li>
          <li>انتخاب ستون تا سقف عرض · جزئیات با اولویت DB · مالی با جداکننده و اعشار</li>
          <li>page-size · Empty ≠ جستجوی خالی · Stripe ملایم · hover از توکن · stale + refresh</li>
          <li>Card/List چنددامنه (انبار / مالی / HR / فاکتور)</li>
        </ul>
      </GuideRulesBox>

      <GuideSection title="۱) Density — Comfortable در برابر Compact" description="ارتفاع ردیف و فاصله داخلی با یک سوئیچ کنترل می‌شود.">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button size="sm" variant={density === "comfortable" ? "default" : "outline"} onClick={() => setDensity("comfortable")}>Comfortable</Button>
          <Button size="sm" variant={density === "compact" ? "default" : "outline"} onClick={() => setDensity("compact")}>Compact</Button>
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
              {SAMPLE_ROWS.slice(0, 3).map((r, i) => (
                <TableRow key={r.id} className={cn(i % 2 === 1 && "bg-muted/30")}>
                  <TableCell className={cn("font-mono text-primary", cellPy)}>{r.code}</TableCell>
                  <TableCell className={cellPy}>{r.name}</TableCell>
                  <TableCell className={cellPy} dir="ltr">{toFa(r.qty)}</TableCell>
                  <TableCell className={cellPy}>
                    <Badge variant={statusVariant[r.status]} className="text-[10px]">{statusLabel[r.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </GuideSection>

      <GuideSection
        title="۲) جدول کامل — ستون قابل‌انتخاب، صفحه‌بندی، جستجو، به‌روزرسانی زنده"
        description="الگوی عملیاتی استاندارد لیست‌های ERP با انتخاب ستون و page-size."
      >
        <div className="mb-2 flex flex-wrap gap-2">
          <Button size="sm" variant={showEmpty ? "default" : "outline"} onClick={() => { setShowEmpty((v) => !v); setShowSkeleton(false); }}>
            {showEmpty ? "نمایش داده" : "Empty State"}
          </Button>
          <Button size="sm" variant={showSkeleton ? "default" : "outline"} onClick={() => { setShowSkeleton((v) => !v); setShowEmpty(false); }}>
            {showSkeleton ? "پایان Loading" : "Skeleton"}
          </Button>
          <Button size="sm" variant={staleData ? "default" : "outline"} onClick={() => setStaleData((v) => !v)} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            {staleData ? "پنهان کردن stale" : "شبیه‌سازی stale"}
          </Button>
        </div>

        {staleData ? (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
              </span>
              داده توسط کاربر دیگری به‌روز شده — برای دیدن آخرین نسخه جدول را رفرش کنید.
            </span>
            <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => setStaleData(false)}>
              <RefreshCw className="h-3 w-3" />
              به‌روزرسانی
            </Button>
          </div>
        ) : null}

        <div className="max-h-[480px] overflow-auto rounded-xl border border-border/70 bg-card">
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-card/95 px-3 py-2 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {showEmpty ? toFa(0) : toFa(filtered.length)} نتیجه
                {selected.size > 0 ? (
                  <span className="mr-2 text-primary"> · {toFa(selected.size)} انتخاب‌شده</span>
                ) : null}
              </span>
              {selected.size > 0 ? (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-[11px]">خروجی</Button>
                  <Button size="sm" variant="outline" className="h-7 text-[11px] text-destructive">حذف</Button>
                </div>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setPage(1); setShowEmpty(false); }}
                  placeholder="جستجو…"
                  className="h-8 w-40 pr-8 text-xs"
                />
              </div>
              <div className="relative">
                <Button size="sm" variant="outline" className="h-8 gap-1 text-[11px]" onClick={() => setColPickerOpen((v) => !v)}>
                  <Columns3 className="h-3.5 w-3.5" />
                  ستون‌ها
                </Button>
                {colPickerOpen ? (
                  <div className="absolute left-0 top-full z-20 mt-1 w-52 rounded-lg border border-border bg-popover p-2 shadow-md">
                    <div className="mb-1 text-[10px] text-muted-foreground">حداکثر {toFa(MAX_VISIBLE_COLS)} ستون داده</div>
                    {ALL_COLUMNS.filter((c) => c.key !== "actions").map((c) => (
                      <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-muted/60">
                        <Checkbox checked={visibleCols.has(c.key)} onCheckedChange={() => toggleCol(c.key)} />
                        <span>{c.label}</span>
                        <span className="mr-auto text-[10px] text-muted-foreground">{toFa(c.priority)}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
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
          ) : showEmpty ? (
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
          ) : isSearchNoResult ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
              <PhSearch className="h-12 w-12 text-muted-foreground" weight="duotone" />
              <div className="text-sm font-medium">نتیجه‌ای یافت نشد</div>
              <p className="max-w-xs text-xs text-muted-foreground">
                برای «{query}» ردیفی پیدا نشد. عبارت جستجو را تغییر دهید یا فیلتر را پاک کنید.
              </p>
              <Button size="sm" variant="outline" onClick={() => { setQuery(""); setPage(1); }}>
                پاک‌کردن جستجو
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn("w-10", headH)}>
                      <Checkbox checked={allPageSelected} onCheckedChange={toggleAllPage} aria-label="انتخاب همه صفحه" />
                    </TableHead>
                    {activeDataCols.map((c) => (
                      <TableHead key={c.key} className={cn(headH)}>
                        {c.key === "code" || c.key === "name" || c.key === "qty" ? (
                          <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(c.key as SortKey)}>
                            {c.label}
                            <SortIcon active={sortKey === c.key} dir={sortDir} />
                          </button>
                        ) : (
                          c.label
                        )}
                      </TableHead>
                    ))}
                    {visibleCols.has("actions") ? (
                      <TableHead className={cn("w-28 text-center", headH)}>عملیات</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r, idx) => {
                    const isSel = selected.has(r.id);
                    return (
                      <TableRow
                        key={r.id}
                        data-state={isSel ? "selected" : undefined}
                        className={cn(
                          "transition-colors hover:bg-primary/5",
                          idx % 2 === 1 && "bg-muted/25"
                        )}
                      >
                        <TableCell className={cellPy}>
                          <Checkbox checked={isSel} onCheckedChange={() => toggleOne(r.id)} aria-label={`انتخاب ${r.code}`} />
                        </TableCell>
                        {activeDataCols.map((c) => (
                          <TableCell key={c.key} className={cellPy}>
                            {renderCell(r, c.key)}
                          </TableCell>
                        ))}
                        {visibleCols.has("actions") ? (
                          <TableCell className={cn("text-center", cellPy)}>
                            <div className="inline-flex items-center gap-0.5">
                              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="جزئیات" onClick={() => setDetailRow(r)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="ویرایش">
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" aria-label="بیشتر">
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3 py-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>صفحه {toFa(page)} از {toFa(totalPages)}</span>
                  <span className="text-border">|</span>
                  <label className="inline-flex items-center gap-1">
                    تعداد در صفحه
                    <select
                      className="h-7 rounded-md border border-border bg-background px-1.5 text-xs"
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    >
                      {[4, 8, 12, 20].map((n) => (
                        <option key={n} value={n}>{toFa(n)}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} aria-label="صفحه قبل">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const n = i + 1;
                    return (
                      <Button key={n} size="sm" variant={page === n ? "default" : "outline"} className="h-7 min-w-7 px-2 text-[11px]" onClick={() => setPage(n)}>
                        {toFa(n)}
                      </Button>
                    );
                  })}
                  <Button size="icon" variant="outline" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} aria-label="صفحه بعد">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <Dialog open={!!detailRow} onOpenChange={(o) => !o && setDetailRow(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>جزئیات کالا</DialogTitle>
              <DialogDescription>تمام فیلدها بر اساس اولویت دیتابیس</DialogDescription>
            </DialogHeader>
            {detailRow ? (
              <dl className="grid gap-2 text-sm">
                {ALL_COLUMNS.filter((c) => c.key !== "actions")
                  .sort((a, b) => a.priority - b.priority)
                  .map((c) => (
                    <div key={c.key} className="flex items-start justify-between gap-3 border-b border-border/40 pb-1.5">
                      <dt className="text-xs text-muted-foreground">{c.label}</dt>
                      <dd className="text-left text-xs font-medium">{renderCell(detailRow, c.key)}</dd>
                    </div>
                  ))}
              </dl>
            ) : null}
          </DialogContent>
        </Dialog>
      </GuideSection>

      <GuideSection title="۳) جدول مالی — خوانایی عدد" description="جداکننده سه‌رقمی، اعشار درست، dir=ltr و ارقام فارسی.">
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>شماره سند</TableHead>
                <TableHead>طرف حساب</TableHead>
                <TableHead className="text-left">بدهکار</TableHead>
                <TableHead className="text-left">بستانکار</TableHead>
                <TableHead className="text-left">مانده</TableHead>
                <TableHead>تاریخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {FINANCE_ROWS.map((r, i) => (
                <TableRow key={r.id} className={cn("hover:bg-primary/5", i % 2 === 1 && "bg-muted/25")}>
                  <TableCell className="font-mono text-xs text-primary">{r.voucher}</TableCell>
                  <TableCell>{r.party}</TableCell>
                  <TableCell className="text-left font-mono tabular-nums" dir="ltr">
                    {r.debit > 0 ? formatMoney(r.debit, r.debit % 1 ? 1 : 0) : "—"}
                  </TableCell>
                  <TableCell className="text-left font-mono tabular-nums" dir="ltr">
                    {r.credit > 0 ? formatMoney(r.credit, r.credit % 1 ? 1 : 0) : "—"}
                  </TableCell>
                  <TableCell className="text-left font-mono tabular-nums font-medium" dir="ltr">
                    {formatMoney(r.balance, r.balance % 1 ? 1 : 0)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          مثال: {formatMoney(12500000)} · {formatMoney(3750000.5, 1)} · {formatMoney(12350000.75, 2)}
        </p>
      </GuideSection>

      <GuideSection title="۴) Skeleton / Loading" description="در زمان بارگذاری اولیه یا رفرش داده، به‌جای جدول خالی از اسکلتون استفاده شود.">
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

      <GuideSection title="۵) Empty State در برابر نتیجهٔ خالی جستجو" description="Empty اولیه ≠ جستجوی ناموفق. هر کدام پیام و CTA مناسب خود را دارد.">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="pattern-mesh flex flex-col items-center gap-3 rounded-xl border border-border/70 px-4 py-10 text-center">
            <PhPackage className="h-14 w-14 text-primary" weight="duotone" />
            <div className="text-sm font-medium">لیست خالی است</div>
            <p className="max-w-xs text-xs text-muted-foreground">هنوز داده‌ای ثبت نشده. دکمه اقدام اصلی را واضح نگه دارید.</p>
            <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" />افزودن اولین مورد</Button>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border/70 px-4 py-10 text-center">
            <PhSearch className="h-14 w-14 text-muted-foreground" weight="duotone" />
            <div className="text-sm font-medium">نتیجه‌ای یافت نشد</div>
            <p className="max-w-xs text-xs text-muted-foreground">برای عبارت جستجو ردیفی پیدا نشد. فیلتر را پاک کنید یا عبارت را تغییر دهید.</p>
            <Button size="sm" variant="outline">پاک‌کردن جستجو</Button>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۶) مدل‌های Card و List — داده غیر انبار" description="نمونه برای HR، فاکتور فروش و کارمند — هر دامنه فیلدها و اکشن‌های خودش را دارد.">
        <div className="mb-3 text-xs font-medium text-muted-foreground">کارت کارمند (HR)</div>
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          {EMPLOYEE_ROWS.map((e) => (
            <div key={e.id} className="rounded-xl border border-border/70 bg-card p-3 elevate-hover">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">{e.avatar}</span>
                <div>
                  <div className="text-sm font-medium">{e.name}</div>
                  <div className="text-[11px] text-muted-foreground">{e.role}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-muted-foreground"><Building2 className="h-3 w-3" />{e.dept}</span>
                <Badge variant={e.status === "active" ? "success" : e.status === "leave" ? "warning" : "secondary"} className="text-[10px]">
                  {e.status === "active" ? "فعال" : e.status === "leave" ? "مرخصی" : "دورکاری"}
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-3 text-xs font-medium text-muted-foreground">کارت فاکتور فروش (مالی)</div>
        <div className="mb-4 grid gap-2 sm:grid-cols-3">
          {INVOICE_CARDS.map((inv) => (
            <div key={inv.id} className="rounded-xl border border-border/70 bg-card p-3 elevate-hover">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[11px] text-primary">{inv.number}</div>
                  <div className="text-sm font-medium">{inv.customer}</div>
                </div>
                <Badge variant={inv.status === "paid" ? "success" : inv.status === "overdue" ? "destructive" : "warning"} className="text-[10px]">
                  {inv.status === "paid" ? "پرداخت‌شده" : inv.status === "overdue" ? "سررسید گذشته" : "در انتظار"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Wallet className="h-3 w-3" /><span dir="ltr" className="font-mono tabular-nums">{formatMoney(inv.amount, inv.amount % 1 ? 2 : 0)}</span></span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{inv.due}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-3 text-xs font-medium text-muted-foreground">لیست فشرده (List row)</div>
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          {SAMPLE_ROWS.slice(0, 4).map((r, i) => (
            <div key={r.id} className={cn("flex items-center gap-3 px-3 py-2.5 hover:bg-primary/5", i > 0 && "border-t border-border/50", i % 2 === 1 && "bg-muted/20")}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Package className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{r.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{r.code} · {r.warehouse}</div>
              </div>
              <span dir="ltr" className="shrink-0 font-mono text-xs tabular-nums">{toFa(r.qty)}</span>
              <Badge variant={statusVariant[r.status]} className="shrink-0 text-[10px]">{statusLabel[r.status]}</Badge>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection title="۷) ترکیب با فیلتر (آماده برای UI-10)" description="فیلتر سبک در toolbar کافی است؛ پنل فیلتر پیشرفته در Composition می‌آید.">
        <div className="rounded-xl border border-border/70 bg-card">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2">
            <div className="relative min-w-[140px] flex-1">
              <Search className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="جستجوی سریع…" className="h-8 pr-8 text-xs" defaultValue="" />
            </div>
            <Button size="sm" variant="outline" className="h-8 gap-1 text-[11px]">
              <Filter className="h-3.5 w-3.5" />
              فیلترها
              <Badge variant="secondary" className="mr-0.5 h-4 px-1 text-[9px]">{toFa(2)}</Badge>
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-[11px] text-muted-foreground">پاک‌کردن</Button>
          </div>
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            نتیجه فیلتر در همین ناحیه جدول رندر می‌شود · بدون ناوبری صفحه جدید.
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۸) Do / Don’t">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <div className="mb-2 font-medium text-emerald-700 dark:text-emerald-400">انجام بده</div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>Sticky فقط روی toolbar همان جدول</li>
              <li>اعداد با dir=ltr و ارقام فارسی + جداکننده مالی</li>
              <li>Empty با Phosphor Duotone + CTA واضح</li>
              <li>جستجوی خالی ≠ Empty اولیه</li>
              <li>انتخاب ستون با سقف عرض + جزئیات اولویت‌دار</li>
              <li>page-size + stripe ملایم + hover از توکن</li>
              <li>نشانه stale + دکمه refresh</li>
            </ul>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="mb-2 font-medium text-destructive">انجام نده</div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>Sticky کردن کل هدر صفحه</li>
              <li>رفرش کامل صفحه بعد از mutation</li>
              <li>آیکون Duotone داخل ردیف‌های جدول</li>
              <li>اعداد راست‌چین یا بدون جداکننده در مالی</li>
              <li>جدول عریض بدون جایگزین موبایل / انتخاب ستون</li>
              <li>پیام یکسان برای Empty و جستجوی ناموفق</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <Button asChild variant="outline" size="sm"><a href="/dashboard/ui-guide/forms">UI-04 Forms</a></Button>
        <Button asChild variant="outline" size="sm"><a href="/dashboard/ui-guide/layout">UI-02 Layout</a></Button>
        <Button asChild variant="outline" size="sm"><a href="/dashboard/ui-guide">فهرست راهنما</a></Button>
      </div>
    </div>
  );
}
