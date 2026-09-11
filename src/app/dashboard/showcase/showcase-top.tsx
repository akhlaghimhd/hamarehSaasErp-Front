"use client";

import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

const chartData = [
  { name: "فروردین", inbound: 42, outbound: 28 },
  { name: "اردیبهشت", inbound: 55, outbound: 36 },
  { name: "خرداد", inbound: 48, outbound: 40 },
  { name: "تیر", inbound: 61, outbound: 45 },
  { name: "مرداد", inbound: 58, outbound: 50 },
  { name: "شهریور", inbound: 70, outbound: 52 },
];

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name?: string; value?: number; color?: string }>; label?: string }) {
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

export function ShowcaseTop() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">نمایشگاه کامپوننت‌ها</h1>
          <p className="text-xs text-muted-foreground">بررسی ظاهر پایه قبل از صفحات واقعی</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => toast.message("یادآوری", { description: "۳ سند در انتظار تأیید شماست." })}>نوتیف ساده</Button>
          <Button size="sm" onClick={() => toast.success("ذخیره شد", { description: "سند GR-1405-001 ثبت شد." })}>نوتیف موفقیت</Button>
          <Button size="sm" variant="destructive" onClick={() => toast.error("خطا در ثبت", { description: "ارتباط با سرور برقرار نشد." })}>نوتیف خطا</Button>
        </div>
      </div>

      <Alert className="border-primary/15 bg-gradient-to-l from-primary/[0.06] to-transparent py-3">
        <AlertTitle className="text-sm">هدف این صفحه</AlertTitle>
        <AlertDescription className="text-xs">جدول، فرم، پاپ‌آپ، تب، نمودار، گالری و اعلان را یکجا ببینید و اصلاح بگویید.</AlertDescription>
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
    </div>
  );
}
