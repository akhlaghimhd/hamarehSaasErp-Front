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
  { id: "1", code: "ITM-100", name: "ورق فولادی", warehouse: "انبار مرکزی", qty: 1200, unit: "کیلوگرم", status: "active" },
  { id: "2", code: "ITM-101", name: "پیچ M8", warehouse: "انبار قطعات", qty: 45, unit: "عدد", status: "low" },
  { id: "3", code: "ITM-102", name: "رنگ اپوکسی", warehouse: "انبار جنوب", qty: 80, unit: "لیتر", status: "active" },
  { id: "4", code: "ITM-103", name: "واشر آب‌بندی", warehouse: "انبار مرکزی", qty: 12, unit: "بسته", status: "low" },
  { id: "5", code: "ITM-104", name: "کابل برق", warehouse: "انبار شمال", qty: 350, unit: "متر", status: "active" },
  { id: "6", code: "ITM-105", name: "ورق آلومینیوم", warehouse: "انبار مرکزی", qty: 0, unit: "کیلوگرم", status: "draft" },
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
      rows = rows.filter((r) => r.code.includes(q) || r.name.includes(q) || r.warehouse.includes(q));
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

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
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
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const cellPy = density === "comfortable" ? "py-2.5" : "py-1.5";
  const headH = density === "comfortable" ? "h-10" : "h-8";

  function SortIcon({ active, dir }: { active: boolean; dir: "asc" | "desc" }) {
    if (!active) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return dir === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <GuidePageHeader meta={meta} />
      <GuideRulesBox title="قوانین نمایش داده و جدول">
        <ul className="list-disc space-y-1 pr-5">
          <li>Density · Sticky فقط toolbar جدول · بدون رفرش کامل · Lucide در جدول · Phosphor فقط Empty</li>
          <li>اعداد LTR + فارسی · انتخاب ردیف · Card/List موبایل</li>
          <li className="text-amber-700 dark:text-amber-300">نسخه کامل enhanced (ستون‌ها، مالی، page-size، جستجوی ناموفق، stripe، stale، Card چنددامنه) در حال push نهایی است — این restore موقت است.</li>
        </ul>
      </GuideRulesBox>
      <GuideSection title="۱) Density">
        <div className="mb-3 flex gap-2">
          <Button size="sm" variant={density === "comfortable" ? "default" : "outline"} onClick={() => setDensity("comfortable")}>Comfortable</Button>
          <Button size="sm" variant={density === "compact" ? "default" : "outline"} onClick={() => setDensity("compact")}>Compact</Button>
        </div>
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <Table>
            <TableHeader><TableRow>
              <TableHead className={cn(headH)}>کد</TableHead>
              <TableHead className={cn(headH)}>نام</TableHead>
              <TableHead className={cn(headH)}>موجودی</TableHead>
              <TableHead className={cn(headH)}>وضعیت</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {SAMPLE_ROWS.slice(0, 3).map((r) => (
                <TableRow key={r.id}>
                  <TableCell className={cn("font-mono text-primary", cellPy)}>{r.code}</TableCell>
                  <TableCell className={cellPy}>{r.name}</TableCell>
                  <TableCell className={cellPy} dir="ltr">{toFa(r.qty)}</TableCell>
                  <TableCell className={cellPy}><Badge variant={statusVariant[r.status]} className="text-[10px]">{statusLabel[r.status]}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </GuideSection>
      <GuideSection title="۲) جدول کامل">
        <div className="mb-2 flex flex-wrap gap-2">
          <Button size="sm" variant={showEmpty ? "default" : "outline"} onClick={() => { setShowEmpty((v) => !v); setShowSkeleton(false); }}>{showEmpty ? "نمایش داده" : "Empty"}</Button>
          <Button size="sm" variant={showSkeleton ? "default" : "outline"} onClick={() => { setShowSkeleton((v) => !v); setShowEmpty(false); }}>{showSkeleton ? "پایان Loading" : "Skeleton"}</Button>
        </div>
        <div className="max-h-[420px] overflow-auto rounded-xl border border-border/70 bg-card">
          <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-card/95 px-3 py-2 backdrop-blur">
            <span className="text-xs text-muted-foreground">{showEmpty ? toFa(0) : toFa(filtered.length)} نتیجه{selected.size > 0 ? <span className="mr-2 text-primary"> · {toFa(selected.size)} انتخاب</span> : null}</span>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); setShowEmpty(false); }} placeholder="جستجو…" className="h-8 w-40 pr-8 text-xs" />
              </div>
              <Button size="sm" className="h-8 gap-1 text-[11px]"><Plus className="h-3.5 w-3.5" />جدید</Button>
            </div>
          </div>
          {showSkeleton ? (
            <div className="space-y-2 p-3">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="flex gap-3"><Skeleton className="h-4 w-4" /><Skeleton className="h-4 flex-1" /></div>))}</div>
          ) : showEmpty ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <PhPackage className="h-14 w-14 text-primary" weight="duotone" />
              <div className="text-sm font-medium">هنوز کالایی ثبت نشده</div>
              <Button size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" />کالای جدید</Button>
            </div>
          ) : isSearchNoResult ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <div className="text-sm font-medium">نتیجه‌ای یافت نشد</div>
              <p className="text-xs text-muted-foreground">برای «{query}» ردیفی پیدا نشد.</p>
              <Button size="sm" variant="outline" onClick={() => { setQuery(""); setPage(1); }}>پاک‌کردن جستجو</Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={cn("w-10", headH)}><Checkbox checked={allPageSelected} onCheckedChange={toggleAllPage} /></TableHead>
                    <TableHead className={cn(headH)}><button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("code")}>کد <SortIcon active={sortKey === "code"} dir={sortDir} /></button></TableHead>
                    <TableHead className={cn(headH)}><button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("name")}>نام <SortIcon active={sortKey === "name"} dir={sortDir} /></button></TableHead>
                    <TableHead className={cn(headH)}>انبار</TableHead>
                    <TableHead className={cn(headH)}><button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("qty")}>موجودی <SortIcon active={sortKey === "qty"} dir={sortDir} /></button></TableHead>
                    <TableHead className={cn(headH)}>وضعیت</TableHead>
                    <TableHead className={cn("w-24 text-center", headH)}>عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((r) => (
                    <TableRow key={r.id} data-state={selected.has(r.id) ? "selected" : undefined}>
                      <TableCell className={cellPy}><Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleOne(r.id)} /></TableCell>
                      <TableCell className={cn("font-mono text-primary", cellPy)}>{r.code}</TableCell>
                      <TableCell className={cellPy}><span className="inline-flex items-center gap-1.5"><Package className="h-3.5 w-3.5 text-muted-foreground" />{r.name}</span></TableCell>
                      <TableCell className={cn("text-muted-foreground", cellPy)}>{r.warehouse}</TableCell>
                      <TableCell className={cellPy}><span dir="ltr" className="font-mono tabular-nums">{toFa(r.qty)}</span> <span className="text-[11px] text-muted-foreground">{r.unit}</span></TableCell>
                      <TableCell className={cellPy}><Badge variant={statusVariant[r.status]} className="text-[10px]">{statusLabel[r.status]}</Badge></TableCell>
                      <TableCell className={cn("text-center", cellPy)}>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
                <span>صفحه {toFa(page)} از {toFa(totalPages)}</span>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronRight className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="outline" className="h-7 w-7" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}><ChevronLeft className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </>
          )}
        </div>
      </GuideSection>
      <div className="flex flex-wrap gap-2 border-t pt-4">
        <Button asChild variant="outline" size="sm"><a href="/dashboard/ui-guide">فهرست راهنما</a></Button>
      </div>
    </div>
  );
}
