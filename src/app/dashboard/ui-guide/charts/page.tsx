"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  MonoCard,
  RungBarsChart,
  HairlineLineChart,
  TickDonutChart,
  TickRowsChart,
  ChunkyBarsChart,
} from "@/shared/components/ui-guide/mono-charts";
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
  Layers2,
  X,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const meta = {
  code: "UI-09",
  title: "Charts & Reporting",
  description:
    "گزارش بصری حرفه‌ای: KPI تعاملی، Combo، و نمونه‌های Mono Editorial الهام‌گرفته از Lieflat.",
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

type Period = "7d" | "30d" | "90d" | "ytd" | "custom";

export default function ChartsGuidePage() {
  const [period, setPeriod] = useState<Period>("30d");
  const [fromDate, setFromDate] = useState("1403-06-01");
  const [toDate, setToDate] = useState("1403-06-31");

  const chartData = useMemo(() => {
    if (period === "7d") return monthly.slice(-2);
    if (period === "30d") return monthly.slice(-3);
    return monthly;
  }, [period]);

  const totalSales = chartData.reduce((s, r) => s + r.sales, 0) * 1_000_000;

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

      <GuideSection title="۲) KPI تعاملی" description="شاخص‌های کلیدی دوره">
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
            <div
              key={k.key}
              className={cn(
                "rounded-xl border border-border/70 bg-card p-4 text-right transition",
                "hover:border-primary/40 hover:shadow-md"
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
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection
        title="۳) Combo Chart — فروش (میله) + حاشیه ٪ (خط)"
        description="دو مقیاس روی یک قاب"
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
                  fill="hsl(222 70% 48%)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="margin"
                  name="margin"
                  stroke="hsl(32 90% 48%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۴) Mono Editorial — الهام از Lieflat Charts"
        description="کارت کاغذی · واحد قابل‌شمارش · انیمیشن ورود · کلیک = پخش مجدد"
      >
        <GuideRulesBox title="قواعد بصری این بخش">
          <ul className="list-disc space-y-1 pr-5 text-[12px]">
            <li>
              پس‌زمینه کاغذی <code dir="ltr">#F0EFEB</code> · جوهر{" "}
              <code dir="ltr">#1C1C1A</code> · بدون border/shadow
            </li>
            <li>عنوان نتیجه‌محور · زیرعنوان توضیح واحد · ردیف منبع با tracking</li>
            <li>اصل واحد قابل‌شمارش: هر پله / تیک / نقطه = یک واحد واقعی داده</li>
            <li>کلیک روی نمودار = پخش مجدد انیمیشن</li>
          </ul>
        </GuideRulesBox>

        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <MonoCard
            title="فروش شش ماه · پله به پله"
            sub="هر پله = ۱۰ میلیون ریال · میله یک نردبان قابل‌شمارش است"
            srcLine="RUNG BARS · MONO-BASIC · SALES"
          >
            <RungBarsChart
              data={[
                { label: "فروردین", value: 42 },
                { label: "اردیبهشت", value: 51 },
                { label: "خرداد", value: 48 },
                { label: "تیر", value: 62 },
                { label: "مرداد", value: 71 },
                { label: "شهریور", value: 66 },
              ]}
              unitLabel="یک پله = ۱۰ میلیون ریال"
            />
          </MonoCard>

          <MonoCard
            title="۳۰ روز ثبت‌نام · نقطه به نقطه"
            sub="هر نقطه = یک روز · خط مویی · کف نمودار مثل بارکد تقویم"
            srcLine="HAIRLINE LINE · MONO-BASIC · GROWTH"
          >
            <HairlineLineChart
              data={Array.from({ length: 30 }, (_, i) => ({
                label: `روز ${i + 1}`,
                value: 8 + ((i * 17 + 3) % 23) + (i > 20 ? 6 : 0),
              }))}
            />
          </MonoCard>

          <MonoCard
            title="سهم کانال‌های فروش"
            sub="هر تیک = ۱٪ · چهار منبع · مثل عقربه بخوانید"
            srcLine="TICK DONUT · MONO-BASIC · CHANNEL"
          >
            <TickDonutChart
              segments={[
                { label: "حضوری", value: 38 },
                { label: "آنلاین", value: 27 },
                { label: "نماینده", value: 22 },
                { label: "سایر", value: 13 },
              ]}
            />
          </MonoCard>

          <MonoCard
            title="تیم‌ها · انتشار این فصل"
            sub="هر تیک = یک انتشار · ردیف یک صف است نه میله پررنگ"
            srcLine="TICK ROWS · MONO-BASIC · SHIP"
          >
            <TickRowsChart
              data={[
                { label: "هویت", value: 14 },
                { label: "سازمان", value: 9 },
                { label: "انبار", value: 11 },
                { label: "فروش", value: 7 },
                { label: "مالی", value: 5 },
                { label: "گزارش", value: 3 },
              ]}
              unit={1}
            />
          </MonoCard>

          <MonoCard
            title="رتبه‌بندی کالا · خواندن زیر ۱۰ ثانیه"
            sub="میله ضخیم · عدد بزرگ · مرتب‌شده از بالا"
            srcLine="CHUNKY BARS · GLANCE · TOP N"
            className="lg:col-span-2"
          >
            <ChunkyBarsChart
              data={[
                { label: "ورق گالوانیزه", value: 420 },
                { label: "پروفیل", value: 280 },
                { label: "تیرآهن", value: 195 },
                { label: "میلگرد", value: 168 },
                { label: "نبشی/ناودانی", value: 112 },
              ]}
            />
          </MonoCard>

          <MonoCard
            title="حاشیه ناخالص · روند ۶ ماه"
            sub="کارت تیره · جوهر معکوس · همان دستور زبان Mono"
            srcLine="HAIRLINE LINE · MONO-DARK · MARGIN"
            dark
            className="lg:col-span-2"
          >
            <div className="[&_circle]:!stroke-[#F0EFEB] [&_path]:!stroke-[#F0EFEB]">
              <HairlineLineChart
                data={[
                  { label: "فروردین", value: 33 },
                  { label: "اردیبهشت", value: 39 },
                  { label: "خرداد", value: 38 },
                  { label: "تیر", value: 44 },
                  { label: "مرداد", value: 46 },
                  { label: "شهریور", value: 45 },
                ]}
              />
            </div>
          </MonoCard>
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">
          این نمونه‌ها از قواعد بصری Lieflat Charts الهام گرفته‌اند و به‌صورت
          مستقل در React/SVG پیاده‌سازی شده‌اند. کد قالب‌های اصلی کپی نشده است.
        </p>
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
