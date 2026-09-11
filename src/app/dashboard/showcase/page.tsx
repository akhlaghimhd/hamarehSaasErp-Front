"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Separator } from "@/shared/components/ui/separator";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

type DocRow = {
  id: string;
  code: string;
  title: string;
  warehouse: string;
  amount: number;
  status: "draft" | "pending" | "approved" | "rejected";
};

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

const chartData = [
  { name: "فروردین", inbound: 42, outbound: 28 },
  { name: "اردیبهشت", inbound: 55, outbound: 36 },
  { name: "خرداد", inbound: 48, outbound: 40 },
  { name: "تیر", inbound: 61, outbound: 45 },
  { name: "مرداد", inbound: 58, outbound: 50 },
  { name: "شهریور", inbound: 70, outbound: 52 },
];

const statusMap = {
  draft: { label: "پیش‌نویس", variant: "secondary" as const },
  pending: { label: "در انتظار", variant: "warning" as const },
  approved: { label: "تأیید شده", variant: "success" as const },
  rejected: { label: "رد شده", variant: "destructive" as const },
};

type SortKey = "code" | "title" | "amount" | "status";

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border/80 bg-popover px-2.5 py-1.5 text-[11px] shadow-[var(--shadow-sm)]">
      <div className="mb-1 font-medium">{label}</div>
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-2 text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
          <span>{item.name}:</span>
          <span className="text-foreground">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ShowcasePage() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("code");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const q = query.trim();
    let rows = seedRows.filter(
      (r) => !q || r.code.includes(q) || r.title.includes(q) || r.warehouse.includes(q)
    );
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv), "fa")
        : String(bv).localeCompare(String(av), "fa");
    });
    return rows;
  }, [query, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const selectedCount = Object.values(selected).filter(Boolean).length;
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selected[r.id]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">نمایشگاه کامپوننت‌ها</h1>
          <p className="text-xs text-muted-foreground">
            بررسی ظاهر پایه قبل از صفحات واقعی
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => toast.message("یادآوری", { description: "۳ سند در انتظار تأیید شماست." })}>
            نوتیف ساده
          </Button>
          <Button size="sm" onClick={() => toast.success("ذخیره شد", { description: "سند GR-1405-001 ثبت شد." })}>
            نوتیف موفقیت
          </Button>
          <Button size="sm" variant="destructive" onClick={() => toast.error("خطا در ثبت", { description: "ارتباط با سرور برقرار نشد." })}>
            نوتیف خطا
          </Button>
        </div>
      </div>

      <Alert className="border-primary/15 bg-gradient-to-l from-primary/[0.06] to-transparent py-3">
        <AlertTitle className="text-sm">هدف این صفحه</AlertTitle>
        <AlertDescription className="text-xs">
          جدول، فرم، پاپ‌آپ، تب، نمودار و اعلان را یکجا ببینید و اصلاح بگویید.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {["اسناد امروز", "در انتظار تأیید", "کالاهای فعال", "انبارها"].map((title, i) => (
          <Card key={title}>
            <CardHeader className="pb-1">
              <CardDescription>{title}</CardDescription>
              <CardTitle className="text-2xl">{["۱۲۸", "۲۴", "۳٬۴۲۰", "۱۲"][i]}</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={i === 1 ? "warning" : "success"}>{i === 1 ? "نیاز به اقدام" : "پایدار"}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>نمودار ستونی ورود/خروج</CardTitle>
            <CardDescription>میله باریک‌تر + تولتیپ فشرده</CardDescription>
          </CardHeader>
          <CardContent className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="28%" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} tickMargin={6} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted) / 0.45)" }} />
                <Bar dataKey="inbound" name="ورود" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar dataKey="outbound" name="خروج" fill="hsl(var(--muted-foreground) / 0.35)" radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>روند اسناد</CardTitle>
            <CardDescription>نمودار خطی فشرده</CardDescription>
          </CardHeader>
          <CardContent className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} tickMargin={6} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="inbound" name="ورود" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                <Line type="monotone" dataKey="outbound" name="خروج" stroke="hsl(142 40% 45%)" strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

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
            <Input
              className="h-9 w-52"
              placeholder="جستجو کد / عنوان / انبار..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4" />
                  سند جدید
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ایجاد سند انبار</DialogTitle>
                  <DialogDescription>نمونه پاپ‌آپ فرم</DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs">عنوان سند</Label>
                    <Input className="h-9" placeholder="مثلاً رسید خرید قطعات" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">انبار</Label>
                    <Select defaultValue="central">
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="انتخاب انبار" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="central">انبار مرکزی</SelectItem>
                        <SelectItem value="east">انبار شرق</SelectItem>
                        <SelectItem value="prod">انبار تولید</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">توضیحات</Label>
                    <Textarea placeholder="یادداشت اختیاری..." />
                  </div>
                </div>
                <DialogFooter>
                  <Button size="sm" onClick={() => toast.success("سند پیش‌نویس ذخیره شد")}>
                    ذخیره
                  </Button>
                  <Button size="sm" variant="outline">
                    انصراف
                  </Button>
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
                  <Checkbox
                    checked={allPageSelected}
                    onCheckedChange={(v) => {
                      const next = { ...selected };
                      pageRows.forEach((r) => {
                        next[r.id] = Boolean(v);
                      });
                      setSelected(next);
                    }}
                    aria-label="انتخاب همه ردیف‌های صفحه"
                  />
                </TableHead>
                <TableHead>
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("code")}>
                    کد <SortIcon column="code" />
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("title")}>
                    عنوان <SortIcon column="title" />
                  </button>
                </TableHead>
                <TableHead>انبار</TableHead>
                <TableHead>
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("amount")}>
                    مبلغ <SortIcon column="amount" />
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("status")}>
                    وضعیت <SortIcon column="status" />
                  </button>
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => (
                <TableRow key={row.id} data-state={selected[row.id] ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={Boolean(selected[row.id])}
                      onCheckedChange={(v) =>
                        setSelected((prev) => ({ ...prev, [row.id]: Boolean(v) }))
                      }
                      aria-label={`انتخاب ${row.code}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{row.code}</TableCell>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>{row.warehouse}</TableCell>
                  <TableCell>{row.amount.toLocaleString("fa-IR")}</TableCell>
                  <TableCell>
                    <Badge variant={statusMap[row.status].variant}>{statusMap[row.status].label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="عملیات">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {filtered.length} ردیف · صفحه {page} از {totalPages}
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">۵ در صفحه</SelectItem>
                  <SelectItem value="8">۸ در صفحه</SelectItem>
                  <SelectItem value="10">۱۰ در صفحه</SelectItem>
                  <SelectItem value="20">۲۰ در صفحه</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronRight className="h-4 w-4" />
                قبلی
              </Button>
              <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                بعدی
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>فرم و کنترل‌ها</CardTitle>
            <CardDescription>چک‌باکس مربعی برای گزینه‌های چندانتخابی · سوییچ برای روشن/خاموش</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">نام کالا</Label>
                <Input className="h-9" placeholder="لپ‌تاپ ایسوس ۱۵" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">گروه کالا</Label>
                <Select>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="it">تجهیزات IT</SelectItem>
                    <SelectItem value="raw">مواد اولیه</SelectItem>
                    <SelectItem value="spare">قطعات یدکی</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">توضیحات</Label>
              <Textarea placeholder="توضیح تکمیلی..." />
            </div>
            <Separator />
            <div className="flex flex-wrap items-center gap-5">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox defaultChecked />
                قابل فروش
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox />
                کنترل سریال
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch defaultChecked />
                فعال در سیستم
              </label>
            </div>
          </CardContent>
          <CardFooter>
            <Button size="sm">ذخیره</Button>
            <Button size="sm" variant="secondary">
              پیش‌نویس
            </Button>
            <Button size="sm" variant="outline">
              انصراف
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>تب‌ها، جداکننده، لودینگ</CardTitle>
            <CardDescription>چینش راست‌چین</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="info" dir="rtl">
              <TabsList>
                <TabsTrigger value="info">اطلاعات</TabsTrigger>
                <TabsTrigger value="stock">موجودی</TabsTrigger>
                <TabsTrigger value="history">تاریخچه</TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-2.5">
                <p className="text-xs text-muted-foreground">محتوای تب اطلاعات کالا</p>
                <Separator />
                <div className="grid gap-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">کد</span><span>ITM-00125</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">واحد</span><span>عدد</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">وضعیت</span><Badge variant="success">فعال</Badge></div>
                </div>
              </TabsContent>
              <TabsContent value="stock">
                <p className="text-sm">موجودی قابل فروش: <strong>۱٬۲۴۰</strong></p>
              </TabsContent>
              <TabsContent value="history" className="space-y-2">
                <p className="text-xs text-muted-foreground">نمونه اسکلتون لودینگ</p>
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-5/6" />
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>حالت‌های بازخورد</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">
          <Alert variant="success" className="py-2.5">
            <AlertTitle className="text-sm">موفق</AlertTitle>
            <AlertDescription className="text-xs">عملیات با موفقیت انجام شد.</AlertDescription>
          </Alert>
          <Alert variant="warning" className="py-2.5">
            <AlertTitle className="text-sm">هشدار</AlertTitle>
            <AlertDescription className="text-xs">موجودی به حد نقطه سفارش رسیده است.</AlertDescription>
          </Alert>
          <Alert variant="destructive" className="py-2.5">
            <AlertTitle className="text-sm">خطا</AlertTitle>
            <AlertDescription className="text-xs">ثبت سند به دلیل قفل دوره مالی ممکن نیست.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
