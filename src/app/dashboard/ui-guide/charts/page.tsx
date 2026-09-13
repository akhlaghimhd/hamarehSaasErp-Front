"use client";

import { useMemo, useState } from "react";
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
  BarChart3,
  Calendar,
  Filter,
  TrendingUp,
  Wallet,
  Warehouse,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
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
    "KPI Card، نمودارهای Bar/Line/Area/Donut، Filter Panel و چیدمان گزارش — با اعداد مالی خوانا.",
  phase: "فاز ۳",
  status: "ready" as const,
};

function toFa(n: number | string) {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

function formatMoney(n: number) {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(n);
  return toFa(formatted);
}

function formatCompact(n: number) {
  if (Math.abs(n) >= 1_000_000_000)
    return toFa((n / 1_000_000_000).toFixed(1)) + "B";
  if (Math.abs(n) >= 1_000_000) return toFa((n / 1_000_000).toFixed(1)) + "M";
  if (Math.abs(n) >= 1_000) return toFa((n / 1_000).toFixed(1)) + "K";
  return toFa(n);
}

const salesByMonth = [
  { name: "فرو", sales: 42, cost: 28 },
  { name: "ارد", sales: 55, cost: 31 },
  { name: "خرد", sales: 48, cost: 29 },
  { name: "تیر", sales: 62, cost: 35 },
  { name: "مرد", sales: 71, cost: 38 },
  { name: "شهر", sales: 65, cost: 36 },
];

const stockTrend = [
  { name: "ه۱", qty: 120 },
  { name: "ه۲", qty: 132 },
  { name: "ه۳", qty: 118 },
  { name: "ه۴", qty: 145 },
  { name: "ه۵", qty: 160 },
  { name: "ه۶", qty: 152 },
];

const channelShare = [
  { name: "حضوری", value: 38, color: "hsl(var(--primary))" },
  { name: "آنلاین", value: 27, color: "hsl(162 60% 40%)" },
  { name: "نماینده", value: 22, color: "hsl(38 90% 50%)" },
  { name: "سایر", value: 13, color: "hsl(var(--muted-foreground))" },
];

const kpis = [
  {
    label: "فروش ماه",
    value: 1_250_000_000,
    unit: "ریال",
    delta: 12.4,
    icon: Wallet,
    tone: "up" as const,
  },
  {
    label: "اسناد باز",
    value: 48,
    unit: "سند",
    delta: -3.1,
    icon: BarChart3,
    tone: "down" as const,
  },
  {
    label: "موجودی کل",
    value: 12_450,
    unit: "قلم",
    delta: 5.2,
    icon: Warehouse,
    tone: "up" as const,
  },
  {
    label: "نرخ تأیید",
    value: 86,
    unit: "٪",
    delta: 1.8,
    icon: TrendingUp,
    tone: "up" as const,
  },
];

type Period = "7d" | "30d" | "90d" | "ytd";

export default function ChartsGuidePage() {
  const [period, setPeriod] = useState<Period>("30d");
  const [channel, setChannel] = useState<"all" | "online" | "store">("all");
  const [warehouse, setWarehouse] = useState<"all" | "main" | "south">("all");

  const filteredSales = useMemo(() => {
    if (period === "7d") return salesByMonth.slice(-2);
    if (period === "90d") return salesByMonth;
    if (period === "ytd") return salesByMonth;
    return salesByMonth.slice(-4);
  }, [period]);

  return (
    <div className="space-y-6" dir="rtl">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین گزارش و نمودار">
        <ul className="list-disc space-y-1 pr-5">
          <li>
            اعداد مالی با جداکننده هزارگان · LTR برای رقم · برچسب‌ها فارسی.
          </li>
          <li>KPI حداکثر ۴ در یک ردیف دسکتاپ · روند با رنگ ملایم نه جیغ.</li>
          <li>
            نمودار خالی ≠ خطا · Empty آرام با توضیح «داده‌ای برای بازه نیست».
          </li>
          <li>فیلتر گزارش sticky بالای همان ناحیه · بدون reload صفحه.</li>
          <li>رنگ‌ها از توکن پالت (primary / muted) · نه رنگ ثابت هگز پراکنده.</li>
          <li>Tooltip کوتاه و خوانا · بدون شلوغی Legend زیاد.</li>
        </ul>
      </GuideRulesBox>

      <GuideSection
        title="۱) KPI Cards"
        description="شاخص کلیدی با روند · عدد مالی خوانا"
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            const up = k.tone === "up";
            return (
              <div
                key={k.label}
                className="rounded-xl border border-border/70 bg-card p-4 elevate-hover"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="text-xs text-muted-foreground">{k.label}</div>
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-xl font-semibold tracking-tight"
                    dir="ltr"
                  >
                    {k.unit === "٪"
                      ? toFa(k.value)
                      : k.unit === "ریال"
                        ? formatMoney(k.value)
                        : toFa(k.value)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {k.unit}
                  </span>
                </div>
                <div
                  className={cn(
                    "mt-2 inline-flex items-center gap-1 text-[11px]",
                    up
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  )}
                >
                  {up ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  <span dir="ltr">{toFa(Math.abs(k.delta))}٪</span>
                  <span className="text-muted-foreground">نسبت به دوره قبل</span>
                </div>
              </div>
            );
          })}
        </div>
      </GuideSection>

      <GuideSection
        title="۲) Filter Panel گزارش"
        description="sticky بالای ناحیه گزارش · بدون reload"
      >
        <div className="sticky top-0 z-10 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card/95 p-3 backdrop-blur">
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5" />
            فیلتر
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["7d", "۷ روز"],
                ["30d", "۳۰ روز"],
                ["90d", "۹۰ روز"],
                ["ytd", "از ابتدای سال"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={period === key ? "default" : "outline"}
                className="h-7 text-[11px]"
                onClick={() => setPeriod(key)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="mx-1 hidden h-5 w-px bg-border sm:block" />
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", "همه کانال"],
                ["online", "آنلاین"],
                ["store", "حضوری"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={channel === key ? "secondary" : "ghost"}
                className="h-7 text-[11px]"
                onClick={() => setChannel(key)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", "همه انبار"],
                ["main", "مرکزی"],
                ["south", "جنوب"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={warehouse === key ? "secondary" : "ghost"}
                className="h-7 text-[11px]"
                onClick={() => setWarehouse(key)}
              >
                {label}
              </Button>
            ))}
          </div>
          <Badge variant="outline" className="mr-auto gap-1 text-[10px]">
            <Calendar className="h-3 w-3" />
            بازه:{" "}
            {period === "7d"
              ? "۷ روز"
              : period === "30d"
                ? "۳۰ روز"
                : period === "90d"
                  ? "۹۰ روز"
                  : "YTD"}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">
          کانال: {channel} · انبار: {warehouse} · دادهٔ نمودار زیر با period
          هم‌خوان است (دمو).
        </p>
      </GuideSection>

      <GuideSection
        title="۳) Bar Chart — فروش در برابر هزینه"
        description="مقایسه دو سری · محور با compact number"
      >
        <div className="h-64 rounded-xl border border-border/70 bg-card p-3 sm:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={filteredSales} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatCompact(Number(v) * 1_000_000)}
                width={48}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatMoney(value * 1_000_000) + " ریال",
                  name === "sales" ? "فروش" : "هزینه",
                ]}
                labelStyle={{ direction: "rtl" }}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
              />
              <Legend
                formatter={(v) => (v === "sales" ? "فروش" : "هزینه")}
                wrapperStyle={{ fontSize: 12 }}
              />
              <Bar
                dataKey="sales"
                name="sales"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="cost"
                name="cost"
                fill="hsl(var(--muted-foreground) / 0.35)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GuideSection>

      <GuideSection
        title="۴) Line & Area — روند موجودی"
        description="سری زمانی نرم · بدون شلوغی"
      >
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="h-56 rounded-xl border border-border/70 bg-card p-3">
            <div className="mb-1 text-xs font-medium">Line</div>
            <ResponsiveContainer width="100%" height="90%">
              <LineChart data={stockTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={36} />
                <Tooltip
                  formatter={(v: number) => [toFa(v), "موجودی"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="qty"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-56 rounded-xl border border-border/70 bg-card p-3">
            <div className="mb-1 text-xs font-medium">Area</div>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={stockTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={36} />
                <Tooltip
                  formatter={(v: number) => [toFa(v), "موجودی"]}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid hsl(var(--border))",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="qty"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.15)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۵) Donut — سهم کانال فروش"
        description="حداکثر ۴–۵ برش · برچسب کنار نمودار"
      >
        <div className="grid items-center gap-4 rounded-xl border border-border/70 bg-card p-4 md:grid-cols-[240px_1fr]">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelShare}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {channelShare.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
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
          <div className="space-y-2">
            {channelShare.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: c.color }}
                  />
                  {c.name}
                </span>
                <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                  {toFa(c.value)}٪
                </span>
              </div>
            ))}
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۶) چیدمان گزارش — ترکیب KPI + نمودار + جدول خلاصه"
        description="الگوی صفحه گزارش عملیاتی"
      >
        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { t: "فروش امروز", v: "۱۸۶M" },
              { t: "سفارش باز", v: "۲۳" },
              { t: "میانگین سبد", v: "۴.۲M" },
            ].map((x) => (
              <div
                key={x.t}
                className="rounded-lg border border-border/60 bg-card px-3 py-2"
              >
                <div className="text-[11px] text-muted-foreground">{x.t}</div>
                <div className="text-base font-semibold" dir="ltr">
                  {x.v}
                </div>
              </div>
            ))}
          </div>
          <div className="h-40 rounded-lg border border-border/60 bg-card p-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stockTrend}>
                <Area
                  type="monotone"
                  dataKey="qty"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.12)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/40 text-muted-foreground">
                  <th className="px-3 py-2 text-right">کالا</th>
                  <th className="px-3 py-2 text-right">فروش</th>
                  <th className="px-3 py-2 text-right">سهم</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["ورق گالوانیزه", "۴۲۰M", "۳۴٪"],
                  ["پروفیل", "۲۸۰M", "۲۳٪"],
                  ["تیرآهن", "۱۹۵M", "۱۶٪"],
                ].map((row) => (
                  <tr key={row[0]} className="border-b last:border-0">
                    <td className="px-3 py-2">{row[0]}</td>
                    <td className="px-3 py-2 font-mono" dir="ltr">
                      {row[1]}
                    </td>
                    <td className="px-3 py-2" dir="ltr">
                      {row[2]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۷) Empty / Loading نمودار">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-card text-center">
            <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
            <div className="text-sm font-medium">داده‌ای برای این بازه نیست</div>
            <div className="text-[11px] text-muted-foreground">
              فیلتر را تغییر دهید یا بازه گسترده‌تری انتخاب کنید
            </div>
          </div>
          <div className="flex h-40 flex-col justify-center gap-3 rounded-xl border border-border/70 bg-card p-4">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="flex items-end gap-2">
              {[40, 65, 45, 80, 55, 70].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 animate-pulse rounded-t bg-muted"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="text-center text-[11px] text-muted-foreground">
              بارگذاری نمودار…
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۸) Do / Don’t">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <div className="mb-2 font-medium text-emerald-700 dark:text-emerald-400">
              انجام بده
            </div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>عدد مالی با جداکننده و LTR</li>
              <li>KPI محدود و معنادار</li>
              <li>فیلتر بدون reload</li>
              <li>Empty آرام برای بازه بدون داده</li>
              <li>رنگ از توکن پالت</li>
            </ul>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="mb-2 font-medium text-destructive">انجام نده</div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>۱۰ KPI در یک صفحه</li>
              <li>Pie با بیش از ۵–۶ برش</li>
              <li>رنگ‌های تصادفی خارج از Design Token</li>
              <li>محور شلوغ بدون compact format</li>
              <li>نمودار خالی شبیه خطا/اسکلت گیرکرده</li>
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
