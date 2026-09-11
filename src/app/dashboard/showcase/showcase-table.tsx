"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/shared/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";

type DocRow = { id: string; code: string; title: string; warehouse: string; amount: number; status: "draft" | "pending" | "approved" | "rejected" };
type SortKey = "code" | "title" | "amount" | "status";

const seedRows: DocRow[] = [
  { id: "1", code: "GR-1405-001", title: "رسید خرید قطعات", warehouse: "انبار مرکزی", amount: 12800000, status: "approved" },
  { id: "2", code: "GI-1405-014", title: "حواله تولید", warehouse: "انبار تولید", amount: 4200000, status: "pending" },
  { id: "3", code: "TR-1405-003", title: "انتقال بین انبار", warehouse: "انبار شرق", amount: 950000, status: "draft" },
  { id: "4", code: "GR-1405-002", title: "رسید برگشت از فروش", warehouse: "انبار مرکزی", amount: 2100000, status: "rejected" },
  { id: "5", code: "GI-1405-015", title: "مصرف داخلی", warehouse: "انبار ابزار", amount: 670000, status: "approved" },
  { id: "6", code: "GR-1405-003", title: "رسید امانی", warehouse: "انبار غرب", amount: 3300000, status: "pending" },
  { id: "7", code: "ADJ-1405-001", title: "اصلاح موجودی", warehouse: "انبار مرکزی", amount: 150000, status: "draft" },
  { id: "8", code: "GI-1405-016", title: "خروج ضایعات", warehouse: "انبار تولید", amount: 280000, status: "approved" },
];

const statusMap = {
  draft: { label: "پیش‌نویس", variant: "secondary" as const },
  pending: { label: "در انتظار", variant: "warning" as const },
  approved: { label: "تأیید شده", variant: "success" as const },
  rejected: { label: "رد شده", variant: "destructive" as const },
};

export function ShowcaseTable() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim();
    let rows = seedRows.filter((r) => !q || r.code.includes(q) || r.title.includes(q) || r.warehouse.includes(q));
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc" ? String(av).localeCompare(String(bv), "fa") : String(bv).localeCompare(String(av), "fa");
    });
    return rows;
  }, [query, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const selectedCount = Object.values(selected).filter(Boolean).length;
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selected[r.id]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle>جدول اسناد انبار</CardTitle>
            <CardDescription>
              انتخاب چندتایی با چک‌باکس مربعی · سورت · تعداد در صفحه
              {selectedCount > 0 ? ` · ${selectedCount} انتخاب‌شده` : ""}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input className="h-9 w-52" placeholder="جستجو کد / عنوان / انبار..." value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4" />سند جدید</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ایجاد سند انبار</DialogTitle>
                  <DialogDescription>نمونه پاپ‌آپ فرم</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-1">
                  <div className="space-y-1.5"><Label className="text-xs">عنوان سند</Label><Input className="h-9" placeholder="مثلاً رسید خرید قطعات" /></div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">انبار</Label>
                    <Select defaultValue="central">
                      <SelectTrigger className="h-9"><SelectValue placeholder="انتخاب انبار" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="central">انبار مرکزی</SelectItem>
                        <SelectItem value="east">انبار شرق</SelectItem>
                        <SelectItem value="prod">انبار تولید</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label className="text-xs">توضیحات</Label><Textarea placeholder="یادداشت اختیاری..." /></div>
                </div>
                <DialogFooter>
                  <Button size="sm" onClick={() => toast.success("سند پیش‌نویس ذخیره شد")}>ذخیره</Button>
                  <Button size="sm" variant="outline">انصراف</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allPageSelected} onCheckedChange={(v) => { const next = { ...selected }; pageRows.forEach((r) => { next[r.id] = Boolean(v); }); setSelected(next); }} aria-label="انتخاب همه" />
                </TableHead>
                <TableHead><button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("code")}>کد <SortIcon column="code" /></button></TableHead>
                <TableHead><button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("title")}>عنوان <SortIcon column="title" /></button></TableHead>
                <TableHead>انبار</TableHead>
                <TableHead><button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("amount")}>مبلغ <SortIcon column="amount" /></button></TableHead>
                <TableHead><button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("status")}>وضعیت <SortIcon column="status" /></button></TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => (
                <TableRow key={row.id} data-state={selected[row.id] ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox checked={Boolean(selected[row.id])} onCheckedChange={(v) => setSelected((prev) => ({ ...prev, [row.id]: Boolean(v) }))} aria-label={`انتخاب ${row.code}`} />
                  </TableCell>
                  <TableCell className="font-medium">{row.code}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.warehouse}</TableCell>
                  <TableCell>{row.amount.toLocaleString("fa-IR")}</TableCell>
                  <TableCell><Badge variant={statusMap[row.status].variant}>{statusMap[row.status].label}</Badge></TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="عملیات"><MoreHorizontal className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{filtered.length} ردیف · صفحه {page} از {totalPages}</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">۵ در صفحه</SelectItem>
                  <SelectItem value="8">۸ در صفحه</SelectItem>
                  <SelectItem value="10">۱۰ در صفحه</SelectItem>
                  <SelectItem value="20">۲۰ در صفحه</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronRight className="h-4 w-4" />قبلی</Button>
              <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>بعدی<ChevronLeft className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
