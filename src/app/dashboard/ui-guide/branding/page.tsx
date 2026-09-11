"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  GuidePageHeader,
  GuideRulesBox,
  GuideSection,
} from "@/shared/components/ui-guide/guide-shell";
import {
  applyPaletteVars,
  DEFAULT_PALETTE_ID,
  themePalettes,
  type PaletteId,
} from "@/shared/lib/theme-palettes";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { cn } from "@/shared/lib/utils";
import {
  Building2,
  Image as ImageIcon,
  Moon,
  Sun,
  Type,
} from "lucide-react";

const meta = {
  code: "UI-00",
  title: "Branding & Tenant Theming",
  description:
    "قوانین هویت بصری پلتفرم و قابلیت کاستم‌سازی رنگ، لوگو، شعار و فضاهای برند برای هر مستأجر (Tenant).",
  phase: "فاز ۰ — بالاترین اولویت",
  status: "ready" as const,
};

type BrandPreview = {
  productName: string;
  slogan: string;
  logoMark: string;
};

const defaultBrand: BrandPreview = {
  productName: "هماره ERP",
  slogan: "سیستم یکپارچه مدیریت کسب‌وکار",
  logoMark: "ه",
};

export default function BrandingGuidePage() {
  const [paletteId, setPaletteId] = useState<PaletteId>(DEFAULT_PALETTE_ID);
  const [brand, setBrand] = useState<BrandPreview>(defaultBrand);
  const [mode, setMode] = useState<"light" | "dark">("light");
  const previewRef = useRef<HTMLDivElement>(null);

  const activePalette = useMemo(
    () => themePalettes.find((p) => p.id === paletteId) ?? themePalettes[3],
    [paletteId]
  );

  useEffect(() => {
    if (!previewRef.current) return;
    applyPaletteVars(previewRef.current, activePalette.vars);
  }, [activePalette]);

  return (
    <div className="space-y-6">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox>
        <ul className="list-disc space-y-1 pr-5">
          <li>
            <strong className="text-foreground">دامنه کاستم مستأجر:</strong> فقط
            پالت رنگی (Theme Tokens)، لوگو، Favicon، نام محصول و شعار. ساختار
            کامپوننت‌ها و الگوهای تعامل قفل است.
          </li>
          <li>
            تمام رنگ‌های عملیاتی از CSS Variables (
            <code className="rounded bg-muted px-1">--primary</code> و ...)
            خوانده می‌شوند تا تعویض Theme بدون بازنویسی کامپوننت ممکن باشد.
          </li>
          <li>
            هر مستأجر می‌تواند یکی از پالت‌های رسمی را انتخاب کند یا در آینده
            پالت سفارشی محدود (با رعایت کنتراست WCAG AA) تعریف کند.
          </li>
          <li>
            لوگو باید در سه اسلات پشتیبانی شود: Sidebar Mark، Header Mark، صفحه
            ورود. در نبود لوگو، Mark متنی (حرف اول) با گرادیان برند نمایش داده
            می‌شود.
          </li>
          <li>
            Dark Mode باید همان توکن‌های مستأجر را محترم بشمارد؛ فقط مقادیر Light/Dark
            عوض می‌شوند، نه هویت برند.
          </li>
        </ul>
      </GuideRulesBox>

      <GuideSection
        title="۱) پالت‌های رسمی پلتفرم"
        description="این پالت‌ها نقطه شروع انتخاب هویت بصری مستأجر هستند. پیش‌فرض پلتفرم: سبز جنگلی + کرم روشن."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {themePalettes.map((palette) => (
            <button
              key={palette.id}
              type="button"
              onClick={() => setPaletteId(palette.id)}
              className={cn(
                "rounded-xl border bg-card p-3 text-right transition",
                paletteId === palette.id
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border/70 hover:border-primary/40"
              )}
            >
              <div className="mb-2 flex items-center gap-2">
                {palette.swatches.map((color) => (
                  <span
                    key={color}
                    className="h-6 w-6 rounded-full border border-border"
                    style={{ backgroundColor: color }}
                  />
                ))}
                {palette.id === DEFAULT_PALETTE_ID && (
                  <Badge className="mr-auto text-[10px]">پیش‌فرض</Badge>
                )}
              </div>
              <div className="text-sm font-medium">{palette.name}</div>
              <div className="text-xs text-muted-foreground">{palette.description}</div>
            </button>
          ))}
        </div>
      </GuideSection>

      <GuideSection
        title="۲) فضاهای برندینگ قابل کاستم"
        description="مقادیر زیر در محیط واقعی از تنظیمات مستأجر خوانده می‌شوند. اینجا برای پیش‌نمایش زنده قابل ویرایش‌اند."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="brand-name">نام محصول / برند</Label>
            <Input
              id="brand-name"
              value={brand.productName}
              onChange={(e) =>
                setBrand((prev) => ({ ...prev, productName: e.target.value }))
              }
              placeholder="هماره ERP"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-slogan">شعار (اختیاری)</Label>
            <Input
              id="brand-slogan"
              value={brand.slogan}
              onChange={(e) =>
                setBrand((prev) => ({ ...prev, slogan: e.target.value }))
              }
              placeholder="سیستم یکپارچه مدیریت کسب‌وکار"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-mark">علامت متنی (Fallback لوگو)</Label>
            <Input
              id="brand-mark"
              value={brand.logoMark}
              maxLength={2}
              onChange={(e) =>
                setBrand((prev) => ({
                  ...prev,
                  logoMark: e.target.value || "ه",
                }))
              }
              placeholder="ه"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4" />
                اسلات Sidebar
              </CardTitle>
              <CardDescription className="text-xs">
                عرض جمع‌شده و باز — Mark + نام کوتاه
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 p-3">
                <div className="brand-mark flex h-9 w-9 items-center justify-center rounded-lg text-sm text-white">
                  {brand.logoMark}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{brand.productName}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {brand.slogan || "بدون شعار"}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ImageIcon className="h-4 w-4" />
                اسلات Header / Favicon
              </CardTitle>
              <CardDescription className="text-xs">
                نسخه فشرده برای نوار بالا و تب مرورگر
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <div className="brand-mark flex h-8 w-8 items-center justify-center rounded-md text-xs text-white">
                {brand.logoMark}
              </div>
              <div className="text-xs text-muted-foreground">
                Favicon و App Icon باید از همان فایل لوگوی اصلی تولید شوند (SVG
                ترجیحی).
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Type className="h-4 w-4" />
                صفحه ورود
              </CardTitle>
              <CardDescription className="text-xs">
                لوگو بزرگ + نام + شعار در مرکز
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 p-4 text-center">
                <div className="mx-auto mb-2 brand-mark flex h-12 w-12 items-center justify-center rounded-xl text-base text-white">
                  {brand.logoMark}
                </div>
                <div className="text-sm font-semibold">{brand.productName}</div>
                <div className="text-xs text-muted-foreground">{brand.slogan}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </GuideSection>

      <GuideSection
        title="۳) پیش‌نمایش زنده با Theme Tokens"
        description="این بلوک با CSS Variables پالت انتخاب‌شده رندر می‌شود. در محصول واقعی همین مکانیزم برای هر Tenant اعمال می‌گردد."
      >
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={mode === "light" ? "default" : "outline"}
            onClick={() => setMode("light")}
          >
            <Sun className="ml-1.5 h-3.5 w-3.5" />
            Light
          </Button>
          <Button
            size="sm"
            variant={mode === "dark" ? "default" : "outline"}
            onClick={() => setMode("dark")}
          >
            <Moon className="ml-1.5 h-3.5 w-3.5" />
            Dark (نمایشی)
          </Button>
          <span className="text-xs text-muted-foreground">
            پالت فعال: {activePalette.name}
          </span>
        </div>

        <div
          ref={previewRef}
          className={cn(
            "overflow-hidden rounded-2xl border border-border text-foreground shadow-sm",
            mode === "dark" && "dark"
          )}
          style={{ background: "hsl(var(--background))" }}
        >
          <div className="border-b border-border/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="brand-mark flex h-8 w-8 items-center justify-center rounded-lg text-sm text-white">
                {brand.logoMark}
              </div>
              <div>
                <div className="text-sm font-semibold">{brand.productName}</div>
                <div className="text-[11px] text-muted-foreground">{brand.slogan}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <Alert>
              <AlertTitle>هویت بصری مستأجر</AlertTitle>
              <AlertDescription>
                دکمه‌ها، کارت‌ها، نشان‌ها و فوکوس همگی از توکن‌های همین پالت تغذیه
                می‌شوند. ساختار UI ثابت می‌ماند.
              </AlertDescription>
            </Alert>

            <div className="grid gap-3 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>اسناد امروز</CardDescription>
                  <CardTitle className="text-2xl">۱۲۸</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="success">+۱۲٪</Badge>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>در انتظار تأیید</CardDescription>
                  <CardTitle className="text-2xl">۲۴</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant="warning">نیاز به اقدام</Badge>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>کالاهای فعال</CardDescription>
                  <CardTitle className="text-2xl">۳٬۴۲۰</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge>موجودی به‌روز</Badge>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">نمونه کنترل‌ها</CardTitle>
                <CardDescription>
                  رنگ Primary / Secondary / Destructive از پالت فعال
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button>اصلی</Button>
                <Button variant="secondary">ثانویه</Button>
                <Button variant="outline">خط‌دار</Button>
                <Button variant="ghost">متنی</Button>
                <Button variant="destructive">خطرناک</Button>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Badge>پیش‌فرض</Badge>
                <Badge variant="secondary">پیش‌نویس</Badge>
                <Badge variant="warning">در انتظار</Badge>
                <Badge variant="success">تأیید شده</Badge>
                <Badge variant="destructive">رد شده</Badge>
              </CardFooter>
            </Card>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۴) قوانین تصمیم‌گیری (Do / Don’t)">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="mb-2 font-medium text-emerald-800 dark:text-emerald-200">
              انجام بده
            </div>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>فقط از توکن‌های CSS برای رنگ استفاده کن.</li>
              <li>لوگو را در اسلات‌های تعریف‌شده قرار بده.</li>
              <li>کنتراست متن روی Primary را قبل از انتشار بسنج.</li>
              <li>Fallback متنی برای لوگو همیشه فعال باشد.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-sm dark:border-rose-900 dark:bg-rose-950/30">
            <div className="mb-2 font-medium text-rose-800 dark:text-rose-200">
              انجام نده
            </div>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>رنگ هگز ثابت داخل کامپوننت‌های عملیاتی نگذار.</li>
              <li>ساختار Sidebar / Header / Form را برای یک مشتری عوض نکن.</li>
              <li>پالت سفارشی بدون بررسی WCAG AA نپذیر.</li>
              <li>شعار را جایگزین برچسب‌های عملیاتی سیستم نکن.</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">مرحله بعد:</strong> UI-01 Foundations
        (Typography، Spacing، Radius، Elevation، Icon). پس از تثبیت پایه‌ها، بقیه
        صفحات از همین توکن‌های برندینگ تغذیه می‌شوند.
      </div>
    </div>
  );
}
