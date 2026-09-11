"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  applyPaletteVars,
  themePalettes,
  type PaletteId,
} from "@/shared/lib/theme-palettes";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  Settings,
  Search,
  Bell,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

const navItems = [
  { label: "داشبورد", icon: LayoutDashboard },
  { label: "انبار و کالا", icon: Warehouse },
  { label: "خرید و فروش", icon: ShoppingCart },
  { label: "کالاها", icon: Package },
  { label: "تنظیمات", icon: Settings },
];

export default function ThemesPreviewPage() {
  const [activeId, setActiveId] = useState<PaletteId>("charcoal-amber");
  const previewRef = useRef<HTMLDivElement>(null);

  const active = themePalettes.find((p) => p.id === activeId) ?? themePalettes[2];

  useEffect(() => {
    if (!previewRef.current) return;
    applyPaletteVars(previewRef.current, active.vars);
  }, [active]);

  return (
    <div className="min-h-screen bg-zinc-100 p-4 md:p-6" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">مقایسه پالت رنگی هماره</h1>
            <p className="text-sm text-zinc-600">
              یک صفحه ثابت — فقط رنگ‌ها عوض می‌شوند. هر کدام را انتخاب کنید و حس کلی را ببینید.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">بازگشت به داشبورد</Link>
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {themePalettes.map((palette) => (
            <button
              key={palette.id}
              type="button"
              onClick={() => setActiveId(palette.id)}
              className={cn(
                "rounded-xl border bg-white p-3 text-right transition",
                activeId === palette.id
                  ? "border-zinc-900 ring-2 ring-zinc-900/20"
                  : "border-zinc-200 hover:border-zinc-400"
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                {palette.swatches.map((color) => (
                  <span
                    key={color}
                    className="h-6 w-6 rounded-full border border-black/10"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="text-sm font-medium text-zinc-900">{palette.name}</div>
              <div className="text-xs text-zinc-500">{palette.description}</div>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-2 text-sm text-zinc-700">
          پالت فعال: <span className="font-semibold">{active.name}</span> — {active.description}
        </div>

        {/* Isolated preview surface — CSS variables scoped here */}
        <div
          ref={previewRef}
          className="overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-sm"
        >
          <div className="flex min-h-[640px]">
            <aside className="hidden w-56 shrink-0 border-l bg-sidebar text-sidebar-foreground md:flex md:flex-col">
              <div className="flex h-14 items-center gap-2 border-b px-4 font-semibold">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm text-primary-foreground">
                  ه
                </div>
                هماره ERP
              </div>
              <nav className="space-y-1 p-3">
                {navItems.map((item, index) => {
                  const Icon = item.icon;
                  const activeItem = index === 0;
                  return (
                    <div
                      key={item.label}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                        activeItem
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </div>
                  );
                })}
              </nav>
            </aside>

            <div className="flex flex-1 flex-col">
              <header className="flex h-14 items-center gap-3 border-b bg-background px-4">
                <div className="relative max-w-md flex-1">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pr-9" placeholder="جستجو در سیستم..." />
                </div>
                <div className="mr-auto flex items-center gap-2">
                  <Button variant="ghost" size="icon" aria-label="اعلان">
                    <Bell className="h-4 w-4" />
                  </Button>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    کا
                  </div>
                </div>
              </header>

              <main className="space-y-6 p-4 md:p-6">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">داشبورد نمونه</h2>
                  <p className="text-sm text-muted-foreground">
                    همین صفحه با هر پالت یکسان می‌ماند تا فقط اثر رنگ را ببینید.
                  </p>
                </div>

                <Alert>
                  <AlertTitle>پیش‌نمایش هویت بصری</AlertTitle>
                  <AlertDescription>
                    دکمه، فرم، نشان وضعیت و سایدبار همگی از متغیرهای رنگی همین پالت استفاده می‌کنند.
                  </AlertDescription>
                </Alert>

                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>اسناد امروز</CardDescription>
                      <CardTitle className="text-3xl">۱۲۸</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="success">+۱۲٪ نسبت به دیروز</Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>در انتظار تأیید</CardDescription>
                      <CardTitle className="text-3xl">۲۴</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant="warning">نیاز به اقدام</Badge>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>کالاهای فعال</CardDescription>
                      <CardTitle className="text-3xl">۳٬۴۲۰</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge>موجودی به‌روز</Badge>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>دکمه‌ها</CardTitle>
                      <CardDescription>اصلی، ثانویه و خطرناک</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      <Button>اصلی</Button>
                      <Button variant="secondary">ثانویه</Button>
                      <Button variant="outline">خط‌دار</Button>
                      <Button variant="ghost">متنی</Button>
                      <Button variant="destructive">خطرناک</Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>نشان وضعیت</CardTitle>
                      <CardDescription>برای گردش‌کار اسناد</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      <Badge>پیش‌فرض</Badge>
                      <Badge variant="secondary">پیش‌نویس</Badge>
                      <Badge variant="warning">در انتظار</Badge>
                      <Badge variant="success">تأیید شده</Badge>
                      <Badge variant="destructive">رد شده</Badge>
                    </CardContent>
                  </Card>

                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>نمونه فرم کالا</CardTitle>
                      <CardDescription>فیلدها با رنگ ورودی و فوکوس همین پالت</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="theme-item-name">نام کالا</Label>
                        <Input id="theme-item-name" placeholder="لپ‌تاپ ایسوس ۱۵" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="theme-item-code">کد کالا</Label>
                        <Input id="theme-item-code" placeholder="ITM-00125" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="theme-price">قیمت واحد</Label>
                        <Input id="theme-price" type="number" placeholder="0" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="theme-warehouse">انبار</Label>
                        <Input id="theme-warehouse" placeholder="انبار مرکزی" />
                      </div>
                    </CardContent>
                    <CardFooter className="gap-2">
                      <Button>ذخیره</Button>
                      <Button variant="outline">انصراف</Button>
                    </CardFooter>
                  </Card>
                </div>
              </main>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-zinc-500">
          بعد از انتخاب، فقط شماره پالت را بگویید تا همان را به‌عنوان هویت هماره قفل کنیم.
        </p>
      </div>
    </div>
  );
}
