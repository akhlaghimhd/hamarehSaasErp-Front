"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  GuidePageHeader,
  GuideRulesBox,
  GuideSection,
} from "@/shared/components/ui-guide/guide-shell";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarRange,
  ChevronLeft,
  Layers2,
  PieChart as PieIcon,
  Table2,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const meta = {
  code: "UI-09",
  title: "Charts & Reporting",
  description:
    "گزارش بصری حرفه‌ای: KPI تعاملی، Drill-down، Combo، بازه از–تا، و راهنمای انتخاب نوع نمودار.",
  phase: "فاز ۳",
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

function formatCompact(n: number) {
  const a = Math.abs(n);
  if (a >= 1e9) return toFa((n / 1e9).toFixed(1)) + "B";
  if (a >= 1e6) return toFa((n / 1e6).toFixed(1)) + "M";
  if (a >= 1e3) return toFa((n / 1e3).toFixed(1)) + "K";
  return toFa(n);
}

const monthly = [
  { m: "فروردین", sales: 420, cost: 280, margin: 33, orders: 186 },
  { m: "اردیبهشت", sales: 510, cost: 310, margin: 39, orders: 214 },
  { m: "خرداد", sales: 475, cost: 295, margin: 38, orders: 201 },
  { m: "تیر", sales: 620, cost: 350, margin: 44, orders: 268 },
  { m: "مرداد", sales: 705, cost: 380, margin: 46, orders: 291 },
  { m: "شهریور", sales: 658, cost: 365, margin: 45, orders: 275 },
];

const channelDetail: Record<
  string,
  { name: string; value: number; color: string; amount: number; top: string[] }
> = {
  حضوری: {
    name: "حضوری",
    value: 38,
    color: "hsl(222 70% 48%)",
    amount: 475_000_000,
    top: ["ورق گالوانیزه", "پروفیل سبک", "تیرآهن ۱۴"],
  },
  آنلاین: {
    name: "آنلاین",
    value: 27,
    color: "hsl(162 55% 38%)",
    amount: 337_500_000,
    top: ["میلگرد", "نبشی", "ورق سیاه"],
  },
  نماینده: {
    name: "نماینده",
    value: 22,
    color: "hsl(32 90% 48%)",
    amount: 275_000_000,
    top: ["لوله صنعتی", "ورق روغنی", "ناودانی"],
  },
  سایر: {
    name: "سایر",
    value: 13,
    color: "hsl(220 10% 55%)",
    amount: 162_500_000,
    top: ["ضایعات", "خدمات برش", "حمل"],
  },
};

const channelData = Object.values(channelDetail).map((c) => ({
  name: c.name,
  value: c.value,
  color: c.color,
}));

const productRows = [
  { name: "ورق گالوانیزه", sales: 420, share: 34, trend: 8.2 },
  { name: "پروفیل", sales: 280, share: 23, trend: 3.1 },
  { name: "تیرآهن", sales: 195, share: 16, trend: -1.4 },
  { name: "میلگرد", sales: 168, share: 14, trend: 5.6 },
  { name: "نبشی/ناودانی", sales: 112, share: 9, trend: 0.8 },
];

const heatmap = [
  { day: "ش", h8: 12, h12: 28, h16: 35, h20: 18 },
  { day: "ی", h8: 15, h12: 32, h16: 40, h20: 22 },
  { day: "د", h8: 18, h12: 36, h16: 42, h20: 25 },
  { day: "س", h8: 14, h12: 30, h16: 38, h20: 20 },
  { day: "چ", h8: 20, h12: 41, h16: 48, h20: 28 },
  { day: "پ", h8: 22, h12: 45, h16: 52, h20: 30 },
  { day: "ج", h8: 8, h12: 18, h16: 22, h20: 12 },
];

type Period = "7d" | "30d" | "90d" | "ytd" | "custom";
type DetailKind =
  | null
  | { type: "kpi"; key: string }
  | { type: "channel"; name: string }
  | { type: "month"; m: string }
  | { type: "product"; name: string };

const chartGuide = [
  {
    when: "روند در زمان (فروش ماهانه، موجودی هفتگی)",
    use: "Line یا Area",
    avoid: "Pie / Donut",
    why: "زمان روی محور X خوانا است؛ Pie زمان را از بین می‌برد.",
  },
  {
    when: "مقایسه چند دسته در یک دوره",
    use: "Bar افقی یا عمودی",
    avoid: "Pie با بیش از ۵ برش",
    why: "مقایسه طول میله دقیق‌تر از زاویه است.",
  },
  {
    when: "سهم از کل (کانال، منطقه)",
    use: "Donut حداکثر ۵ برش + Legend",
    avoid: "Bar اگر فقط نسبت مهم است و نه مقدار مطلق",
    why: "Donut حس «کل» می‌دهد؛ برای جزئیات روی برش کلیک.",
  },
  {
    when: "دو مقیاس هم‌زمان (فروش + حاشیه ٪)",
    use: "Composed / Combo (Bar + Line)",
    avoid: "دو نمودار جدا بدون هم‌راستایی محور",
    why: "یک قاب، دو مقیاس؛ محور راست برای درصد.",
  },
  {
    when: "رتبه‌بندی اقلام (Top N کالا)",
    use: "جدول + Bar افقی یا فقط جدول مرتب",
    avoid: "Pie",
    why: "رتبه و مقدار هر دو مهم‌اند.",
  },
  {
    when: "توزیع زمانی پرتراکم (ساعت × روز)",
    use: "Heatmap ساده",
    avoid: "Line شلوغ با ۲۰ سری",
    why: "چگالی با رنگ دیده می‌شود نه با ۲۰ خط.",
  },
  {
    when: "KPI اجرایی",
    use: "کارت عدد + delta + کلیک برای drill",
    avoid: "نمودار مینی بدون معنای روند",
    why: "مدیر اول عدد می‌خواهد، بعد جزئیات.",
  },
];

export default function ChartsGuidePage() {
  const [period, setPeriod] = useState<Period>("30d");
  const [fromDate, setFromDate] = useState("1403-06-01");
  const [toDate, setToDate] = useState("1403-06-31");
  const [detail, setDetail] = useState<DetailKind>(null);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  const chartData = useMemo(() => {
    if (period === "7d") return monthly.slice(-2);
    if (period === "30d") return monthly.slice(-3);
    return monthly;
  }, [period]);

  const totalSales = chartData.reduce((s, r) => s + r.sales, 0) * 1_000_000;

  function openChannel(name: string) {
    setActiveChannel(name);
    setDetail({ type: "channel", name });
  }

  return (
    <div className="space-y-6" dir="rtl">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="اصول گزارش بصری (قفل‌شده)">
        <ul className="list-disc space-y-1 pr-5">
          <li>هر عنصر بصری قابل‌کلیک است → پنل جزئیات؛ نه صفحه جدید.</li>
          <li>عدد مالی: جداکننده + LTR · برچسب فارسی.</li>
          <li>فیلتر بازه: preset + از/تا سفارشی · بدون reload.</li>
          <li>Combo فقط وقتی دو مقیاس معنا دارند (مثلاً مبلغ + ٪).</li>
          <li>نوع نمودار از ماتریس راهنما انتخاب می‌شود، نه سلیقه لحظه‌ای.</li>
          <li>Empty ≠ خطا · Drill همیشه قابل بستن با Escape/دکمه.</li>
        </ul>
      </GuideRulesBox>

      <GuideSection
        title="۱) فیلتر گزارش — preset + از / تا"
        description="بازه تاریخی قابل تنظیم · اعمال بدون رفرش"
      >
        <div className="rounded-xl border border-border/70 bg-card p-3">
          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ["7d", "۷ روز"],
                ["30d", "۳۰ روز"],
                ["90d", "۹۰ روز"],
                ["ytd", "از ابتدای سال"],
                ["custom", "سفارشی"],
              ] as const
            ).map(([k, label]) => (
              <Button
                key={k}
                size="sm"
                variant={period === k ? "default" : "outline"}
                className="h-8 text-[11px]"
                onClick={() => setPeriod(k)}
              >
                {label}
              </Button>
            ))}
          </div>
          {period === "custom" ? (
            <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">از تاریخ</label>
                <input
                  type="text"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 font-mono text-xs"
                  placeholder="1403-01-01"
                  dir="ltr"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-muted-foreground">تا تاریخ</label>
                <input
                  type="text"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 font-mono text-xs"
                  placeholder="1403-06-31"
                  dir="ltr"
                />
              </div>
              <Badge variant="outline" className="gap-1 text-[10px]">
                <CalendarRange className="h-3 w-3" />
                {toFa(fromDate)} → {toFa(toDate)}
              </Badge>
            </div>
          ) : null}
        </div>
      </GuideSection>

      <GuideSection
        title="۲) KPI تعاملی"
        description="کلیک = جزئیات در پنل کناری"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              key: "sales",
              label: "فروش دوره",
              value: formatMoney(totalSales),
              unit: "ریال",
              delta: 12.4,
              up: true,
            },
            {
              key: "orders",
              label: "تعداد سفارش",
              value: toFa(chartData.reduce((s, r) => s + r.orders, 0)),
              unit: "سفارش",
              delta: 4.1,
              up: true,
            },
            {
              key: "margin",
              label: "میانگین حاشیه",
              value: toFa(
                Math.round(
                  chartData.reduce((s, r) => s + r.margin, 0) / chartData.length
                )
              ),
              unit: "٪",
              delta: 1.2,
              up: true,
            },
            {
              key: "cost",
              label: "هزینه تمام‌شده",
              value: formatMoney(
                chartData.reduce((s, r) => s + r.cost, 0) * 1_000_000
              ),
              unit: "ریال",
              delta: -2.3,
              up: false,
            },
          ].map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={() => setDetail({ type: "kpi", key: k.key })}
              className={cn(
                "rounded-xl border bg-card p-4 text-right transition",
                "hover:border-primary/40 hover:shadow-md",
                detail?.type === "kpi" && detail.key === k.key
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border/70"
              )}
            >
              <div className="text-[11px] text-muted-foreground">{k.label}</div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-semibold tracking-tight" dir="ltr">
                  {k.value}
                </span>
                <span className="text-[10px] text-muted-foreground">{k.unit}</span>
              </div>
              <div
                className={cn(
                  "mt-2 inline-flex items-center gap-1 text-[11px]",
                  k.up
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-destructive"
                )}
              >
                {k.up ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                <span dir="ltr">{toFa(Math.abs(k.delta))}٪</span>
                <span className="text-muted-foreground">vs دوره قبل</span>
              </div>
            </button>
          ))}
        </div>
      </GuideSection>

      <GuideSection
        title="۳) Combo Chart — فروش (میله) + حاشیه ٪ (خط)"
        description="دو مقیاس روی یک قاب · کلیک میله = جزئیات ماه"
      >
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-medium">عملکرد ماهانه</div>
              <div className="text-[11px] text-muted-foreground">
                محور چپ: مبلغ (میلیون) · محور راست: حاشیه ٪
              </div>
            </div>
            <Badge variant="secondary" className="gap-1 text-[10px]">
              <Layers2 className="h-3 w-3" />
              Composed
            </Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="hsl(222 70% 48%)"
                      stopOpacity={0.9}
                    />
                    <stop
                      offset="100%"
                      stopColor="hsl(222 70% 48%)"
                      stopOpacity={0.55}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="m"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCompact(Number(v) * 1e6)}
                  width={44}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 60]}
                  tickFormatter={(v) => toFa(v) + "٪"}
                  width={40}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
                        <div className="mb-1 font-medium">{label}</div>
                        {payload.map((p) => (
                          <div
                            key={String(p.dataKey)}
                            className="flex justify-between gap-4"
                          >
                            <span className="text-muted-foreground">
                              {p.dataKey === "sales"
                                ? "فروش"
                                : p.dataKey === "margin"
                                  ? "حاشیه"
                                  : String(p.name)}
                            </span>
                            <span dir="ltr" className="font-mono">
                              {p.dataKey === "margin"
                                ? toFa(p.value as number) + "٪"
                                : formatMoney((p.value as number) * 1e6)}
                            </span>
                          </div>
                        ))}
                        <div className="mt-1 text-[10px] text-primary">
                          کلیک برای جزئیات ماه
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend
                  formatter={(v) =>
                    v === "sales" ? "فروش" : v === "margin" ? "حاشیه ٪" : v
                  }
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="sales"
                  name="sales"
                  fill="url(#salesGrad)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                  cursor="pointer"
                  onClick={(data) => {
                    const m = (data as { m?: string })?.m;
                    if (m) setDetail({ type: "month", m });
                  }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="margin"
                  name="margin"
                  stroke="hsl(32 90% 48%)"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "hsl(32 90% 48%)", strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۴) Donut با Drill-down"
        description="کلیک روی برش → جزئیات کانال در پنل"
      >
        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-2 text-sm font-medium">سهم کانال فروش</div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={channelData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={68}
                    outerRadius={96}
                    paddingAngle={3}
                    cursor="pointer"
                    onClick={(_, i) => openChannel(channelData[i].name)}
                  >
                    {channelData.map((e) => (
                      <Cell
                        key={e.name}
                        fill={e.color}
                        stroke={
                          activeChannel === e.name
                            ? "hsl(var(--background))"
                            : "transparent"
                        }
                        strokeWidth={activeChannel === e.name ? 3 : 0}
                        opacity={
                          activeChannel && activeChannel !== e.name ? 0.45 : 1
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [toFa(v) + "٪", "سهم"]}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              {channelData.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => openChannel(c.name)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition",
                    activeChannel === c.name
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/70 hover:bg-muted/50"
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: c.color }}
                  />
                  {c.name}
                  <span className="font-mono text-muted-foreground" dir="ltr">
                    {toFa(c.value)}٪
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4">
            {detail?.type === "channel" && channelDetail[detail.name] ? (
              <ChannelDetail
                data={channelDetail[detail.name]}
                onClose={() => {
                  setDetail(null);
                  setActiveChannel(null);
                }}
              />
            ) : detail?.type === "month" ? (
              <MonthDetail
                m={detail.m}
                row={monthly.find((x) => x.m === detail.m)}
                onClose={() => setDetail(null)}
              />
            ) : detail?.type === "kpi" ? (
              <KpiDetail k={detail.key} onClose={() => setDetail(null)} />
            ) : detail?.type === "product" ? (
              <ProductDetail
                name={detail.name}
                row={productRows.find((p) => p.name === detail.name)}
                onClose={() => setDetail(null)}
              />
            ) : (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                <PieIcon className="h-8 w-8 opacity-40" />
                <div className="text-sm">پنل جزئیات</div>
                <div className="max-w-[200px] text-[11px]">
                  روی KPI، برش Donut، میله ماه، یا ردیف کالا کلیک کنید
                </div>
              </div>
            )}
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۵) رتبه‌بندی کالا — Bar افقی + جدول"
        description="کلیک ردیف = جزئیات محصول"
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 rounded-xl border border-border/70 bg-card p-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...productRows].reverse()}
                layout="vertical"
                margin={{ left: 8, right: 16 }}
              >
                <CartesianGrid
                  strokeDasharray="4 4"
                  horizontal={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => formatCompact(Number(v) * 1e6)}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [
                    formatMoney(v * 1e6) + " ریال",
                    "فروش",
                  ]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                />
                <Bar
                  dataKey="sales"
                  fill="hsl(222 70% 48%)"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={18}
                  cursor="pointer"
                  onClick={(d) => {
                    const name = (d as { name?: string })?.name;
                    if (name) setDetail({ type: "product", name });
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="px-3 py-2 text-right">کالا</th>
                  <th className="px-3 py-2 text-right">فروش</th>
                  <th className="px-3 py-2 text-right">سهم</th>
                  <th className="px-3 py-2 text-right">روند</th>
                </tr>
              </thead>
              <tbody>
                {productRows.map((r) => (
                  <tr
                    key={r.name}
                    className="cursor-pointer border-b last:border-0 hover:bg-primary/5"
                    onClick={() => setDetail({ type: "product", name: r.name })}
                  >
                    <td className="px-3 py-2.5 font-medium">{r.name}</td>
                    <td className="px-3 py-2.5 font-mono" dir="ltr">
                      {formatMoney(r.sales * 1e6)}
                    </td>
                    <td className="px-3 py-2.5" dir="ltr">
                      {toFa(r.share)}٪
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2.5 font-mono",
                        r.trend >= 0 ? "text-emerald-600" : "text-destructive"
                      )}
                      dir="ltr"
                    >
                      {r.trend >= 0 ? "+" : ""}
                      {toFa(r.trend)}٪
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۶) Area — روند نرم سفارش"
        description="مناسب سری زمانی تکی با تأکید بر حجم"
      >
        <div className="h-56 rounded-xl border border-border/70 bg-card p-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(162 55% 38%)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(162 55% 38%)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="4 4"
                vertical={false}
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="m"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                formatter={(v: number) => [toFa(v), "سفارش"]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="hsl(162 55% 38%)"
                fill="url(#areaFill)"
                strokeWidth={2.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </GuideSection>

      <GuideSection
        title="۷) Heatmap — تراکم سفارش (روز × بازه ساعتی)"
        description="برای الگوی زمانی پرتراکم"
      >
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-card p-4">
          <div className="mb-2 grid grid-cols-[2rem_repeat(4,minmax(3rem,1fr))] gap-1 text-center text-[10px] text-muted-foreground">
            <div />
            <div>۸–۱۲</div>
            <div>۱۲–۱۶</div>
            <div>۱۶–۲۰</div>
            <div>۲۰–۲۴</div>
          </div>
          {heatmap.map((row) => (
            <div
              key={row.day}
              className="mb-1 grid grid-cols-[2rem_repeat(4,minmax(3rem,1fr))] gap-1"
            >
              <div className="flex items-center justify-center text-[11px] text-muted-foreground">
                {row.day}
              </div>
              {(["h8", "h12", "h16", "h20"] as const).map((key) => {
                const v = row[key];
                const intensity = Math.min(1, v / 55);
                return (
                  <button
                    key={key}
                    type="button"
                    title={`${row.day} · ${toFa(v)} سفارش`}
                    className="flex h-9 items-center justify-center rounded-md text-[11px] font-medium transition hover:ring-2 hover:ring-primary/30"
                    style={{
                      background: `hsl(222 70% 48% / ${0.08 + intensity * 0.75})`,
                      color: intensity > 0.55 ? "white" : "inherit",
                    }}
                  >
                    {toFa(v)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection
        title="۸) الگوهای نمایش جزئیات (Drill)"
        description="چه جزئیاتی را چطور نشان دهیم"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              title: "Side Panel",
              desc: "KPI / Donut / ردیف جدول → پنل ثابت کنار نمودار. سریع، بدون از دست رفتن context.",
              icon: ChevronLeft,
            },
            {
              title: "Inline Expand",
              desc: "جدول گزارش: ردیف باز می‌شود و زیرهمان ردیف breakdown می‌آید.",
              icon: Table2,
            },
            {
              title: "Overlay Sheet",
              desc: "موبایل یا جزئیات سنگین: Drawer از پایین/کنار با اسکرول مستقل.",
              icon: Layers2,
            },
          ].map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="rounded-xl border border-border/70 bg-card p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium">{p.title}</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {p.desc}
                </p>
              </div>
            );
          })}
        </div>
      </GuideSection>

      <GuideSection
        title="۹) راهنمای انتخاب نوع نمودار"
        description="SoT برای تیم: چه داده‌ای → چه نمایشی"
      >
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40 text-muted-foreground">
                <th className="px-3 py-2.5 text-right">نوع سؤال / داده</th>
                <th className="px-3 py-2.5 text-right">نمایش پیشنهادی</th>
                <th className="px-3 py-2.5 text-right">پرهیز از</th>
                <th className="px-3 py-2.5 text-right">دلیل</th>
              </tr>
            </thead>
            <tbody>
              {chartGuide.map((g) => (
                <tr key={g.when} className="border-b last:border-0">
                  <td className="px-3 py-2.5 font-medium">{g.when}</td>
                  <td className="px-3 py-2.5 text-primary">{g.use}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{g.avoid}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{g.why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GuideSection>

      <GuideSection title="۱۰) Do / Don’t">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <div className="mb-2 font-medium text-emerald-700 dark:text-emerald-400">
              انجام بده
            </div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>Drill-down روی هر عنصر بصری</li>
              <li>Combo فقط با دو مقیاس معنادار</li>
              <li>بازه preset + از/تا</li>
              <li>ماتریس انتخاب نمودار به‌عنوان SoT</li>
              <li>Tooltip کوتاه + پنل جزئیات غنی</li>
            </ul>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="mb-2 font-medium text-destructive">انجام نده</div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>میله سه‌بعدی یا افکت کودکانه</li>
              <li>Pie با بیش از ۵ برش</li>
              <li>نمودار غیرقابل‌کلیک در گزارش مدیریتی</li>
              <li>رنگ خارج از سیستم طراحی</li>
              <li>دو مقیاس بدون راهنمای محور</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/workflow">UI-08 Workflow</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide">فهرست راهنما</a>
        </Button>
      </div>
    </div>
  );
}

function DetailShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="text-sm font-semibold">{title}</div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="بستن"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

function ChannelDetail({
  data,
  onClose,
}: {
  data: (typeof channelDetail)[string];
  onClose: () => void;
}) {
  return (
    <DetailShell title={`کانال: ${data.name}`} onClose={onClose}>
      <div className="space-y-3 text-xs">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-full"
            style={{ background: data.color }}
          />
          <span className="text-muted-foreground">سهم</span>
          <span className="mr-auto font-mono font-medium" dir="ltr">
            {toFa(data.value)}٪
          </span>
        </div>
        <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="text-[11px] text-muted-foreground">مبلغ فروش</div>
          <div className="text-lg font-semibold" dir="ltr">
            {formatMoney(data.amount)}
            <span className="mr-1 text-xs font-normal text-muted-foreground">
              ریال
            </span>
          </div>
        </div>
        <div>
          <div className="mb-1.5 text-[11px] text-muted-foreground">
            برترین اقلام این کانال
          </div>
          <ul className="space-y-1">
            {data.top.map((t, i) => (
              <li
                key={t}
                className="flex items-center justify-between rounded-md border border-border/50 px-2 py-1.5"
              >
                <span>
                  {toFa(i + 1)}. {t}
                </span>
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </DetailShell>
  );
}

function MonthDetail({
  m,
  row,
  onClose,
}: {
  m: string;
  row?: (typeof monthly)[0];
  onClose: () => void;
}) {
  if (!row)
    return (
      <DetailShell title={m} onClose={onClose}>
        <p className="text-xs text-muted-foreground">داده نیست</p>
      </DetailShell>
    );
  return (
    <DetailShell title={`ماه ${m}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          ["فروش", formatMoney(row.sales * 1e6) + " ریال"],
          ["هزینه", formatMoney(row.cost * 1e6) + " ریال"],
          ["حاشیه", toFa(row.margin) + "٪"],
          ["سفارش", toFa(row.orders)],
        ].map(([k, v]) => (
          <div
            key={k}
            className="rounded-lg border border-border/60 bg-muted/20 p-2.5"
          >
            <div className="text-[10px] text-muted-foreground">{k}</div>
            <div className="mt-0.5 font-semibold" dir="ltr">
              {v}
            </div>
          </div>
        ))}
      </div>
    </DetailShell>
  );
}

function KpiDetail({
  k,
  onClose,
}: {
  k: string;
  onClose: () => void;
}) {
  const labels: Record<string, string> = {
    sales: "فروش دوره",
    orders: "تعداد سفارش",
    margin: "میانگین حاشیه",
    cost: "هزینه تمام‌شده",
  };
  return (
    <DetailShell title={labels[k] ?? k} onClose={onClose}>
      <p className="mb-2 text-[11px] text-muted-foreground">
        شکست ماهانه این شاخص در بازه انتخاب‌شده:
      </p>
      <ul className="space-y-1 text-xs">
        {monthly.map((r) => (
          <li
            key={r.m}
            className="flex justify-between rounded-md border border-border/50 px-2 py-1.5"
          >
            <span>{r.m}</span>
            <span className="font-mono" dir="ltr">
              {k === "sales"
                ? formatMoney(r.sales * 1e6)
                : k === "cost"
                  ? formatMoney(r.cost * 1e6)
                  : k === "margin"
                    ? toFa(r.margin) + "٪"
                    : toFa(r.orders)}
            </span>
          </li>
        ))}
      </ul>
    </DetailShell>
  );
}

function ProductDetail({
  name,
  row,
  onClose,
}: {
  name: string;
  row?: (typeof productRows)[0];
  onClose: () => void;
}) {
  return (
    <DetailShell title={name} onClose={onClose}>
      {row ? (
        <div className="space-y-2 text-xs">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
            <div className="text-[10px] text-muted-foreground">فروش</div>
            <div className="text-base font-semibold" dir="ltr">
              {formatMoney(row.sales * 1e6)} ریال
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">سهم از کل</span>
            <span dir="ltr">{toFa(row.share)}٪</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">روند</span>
            <span
              className={
                row.trend >= 0 ? "text-emerald-600" : "text-destructive"
              }
              dir="ltr"
            >
              {row.trend >= 0 ? "+" : ""}
              {toFa(row.trend)}٪
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">داده نیست</p>
      )}
    </DetailShell>
  );
}
