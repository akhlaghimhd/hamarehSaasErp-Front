"use client";

import type { ComponentType, ReactNode } from "react";
import {
  GuidePageHeader,
  GuideRulesBox,
  GuideSection,
} from "@/shared/components/ui-guide/guide-shell";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import {
  Package,
  Warehouse,
  ShoppingCart,
  FileText,
  Users,
  Settings,
  LayoutDashboard,
  Search,
  Bell,
  Check,
  Boxes,
  ClipboardList,
  Factory,
  Wallet,
} from "lucide-react";

const meta = {
  code: "UI-01b",
  title: "Icon Lab — مقایسه بصری",
  description:
    "گالری تصمیم‌گیری با Lucide (بدون پکیج اضافه). درمان‌های بصری مختلف را ببین و سیاست A/B/D را قفل کن. مقایسه Phosphor/Tabler بعداً اختیاری است.",
  phase: "فاز ۱ · زیرمجموعه Foundations",
  status: "ready" as const,
};

type IconComp = ComponentType<{ className?: string; strokeWidth?: number }>;

const moduleIcons: { key: string; label: string; Icon: IconComp }[] = [
  { key: "dash", label: "داشبورد", Icon: LayoutDashboard },
  { key: "wh", label: "انبار", Icon: Warehouse },
  { key: "pkg", label: "کالا", Icon: Package },
  { key: "cart", label: "خرید/فروش", Icon: ShoppingCart },
  { key: "doc", label: "سند", Icon: FileText },
  { key: "mfg", label: "تولید", Icon: Factory },
  { key: "fin", label: "مالی", Icon: Wallet },
  { key: "users", label: "کاربران", Icon: Users },
  { key: "settings", label: "تنظیمات", Icon: Settings },
  { key: "search", label: "جستجو", Icon: Search },
  { key: "bell", label: "اعلان", Icon: Bell },
  { key: "check", label: "تأیید", Icon: Check },
];

function IconCell({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {children}
      {caption ? <span className="text-[10px] text-muted-foreground">{caption}</span> : null}
    </div>
  );
}

function SidebarPreview({
  title,
  treatment,
}: {
  title: string;
  treatment: "plain" | "chip" | "brand" | "thick";
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-2 shadow-[var(--shadow-sm)]">
      <div className="mb-2 px-2 text-[11px] font-medium text-muted-foreground">{title}</div>
      <div className="space-y-0.5">
        {moduleIcons.slice(0, 7).map(({ key, label, Icon }) => (
          <div
            key={key}
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {treatment === "plain" && <Icon className="h-4 w-4 shrink-0" />}
            {treatment === "thick" && <Icon className="h-4 w-4 shrink-0" strokeWidth={2.35} />}
            {treatment === "chip" && (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-3.5 w-3.5" />
              </span>
            )}
            {treatment === "brand" && (
              <span className="brand-mark flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white">
                <Icon className="h-3.5 w-3.5" />
              </span>
            )}
            <span className="truncate">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IconLabPage() {
  return (
    <div className="space-y-6">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="وضعیت این صفحه">
        <ul className="list-disc space-y-1 pr-5">
          <li>
            به‌خاطر خطای npm لوکال، وابستگی Phosphor/Tabler موقتاً حذف شد تا پروژه بدون نصب اضافه
            بالا بیاید.
          </li>
          <li>
            برای تصمیم‌گیری، <strong className="text-foreground">درمان‌های بصری Lucide</strong> کافی
            است (پیشنهادهای A / B / D).
          </li>
          <li>
            پیشنهاد C (تعویض کامل کتابخانه) فقط وقتی معنی دارد که بعداً npm پایدار شود و بخواهیم
            مهاجرت کامل کنیم.
          </li>
        </ul>
      </GuideRulesBox>

      <GuideSection
        title="۱) خانواده آیکون عملیاتی (Lucide)"
        description="مجموعه پیشنهادی برای منو و صفحات ERP — همه از یک زبان خطی."
      >
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {moduleIcons.map(({ key, label, Icon }) => (
            <div
              key={key}
              className="flex flex-col items-center gap-2 rounded-xl border border-border/70 bg-card p-3 elevate-hover"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="text-center text-[11px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection
        title="۲) شبیه‌سازی Sidebar با ۴ درمان"
        description="بیشترین تکرار روزانه اینجاست. ببین کدام چهره را برای هویت پلتفرم می‌خواهی."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SidebarPreview title="A · Outline ساده" treatment="plain" />
          <SidebarPreview title="B · Chip نرم" treatment="chip" />
          <SidebarPreview title="B · Brand Mark" treatment="brand" />
          <SidebarPreview title="تأکید خط ضخیم" treatment="thick" />
        </div>
      </GuideSection>

      <GuideSection
        title="۳) درمان‌های نمایشی (Empty / Header / KPI)"
        description="این‌ها برای سطوح بزرگ‌ترند؛ در جدول استفاده نکن."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-3 text-xs font-medium text-foreground">Outline</div>
            <div className="flex flex-wrap gap-3">
              {[Package, Warehouse, ShoppingCart, ClipboardList].map((Icon, i) => (
                <IconCell key={i}>
                  <Icon className="h-6 w-6 text-muted-foreground" />
                </IconCell>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-3 text-xs font-medium text-foreground">Chip Primary</div>
            <div className="flex flex-wrap gap-3">
              {[Package, Warehouse, ShoppingCart, ClipboardList].map((Icon, i) => (
                <IconCell key={i}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                </IconCell>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-3 text-xs font-medium text-foreground">Brand Gradient</div>
            <div className="flex flex-wrap gap-3">
              {[Package, Warehouse, ShoppingCart, ClipboardList].map((Icon, i) => (
                <IconCell key={i}>
                  <span className="brand-mark flex h-11 w-11 items-center justify-center rounded-xl text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                </IconCell>
              ))}
            </div>
          </div>

          <div className="pattern-mesh rounded-xl border border-border/70 p-4">
            <div className="mb-3 text-xs font-medium text-foreground">روی الگوی سطحی</div>
            <div className="flex flex-wrap gap-3">
              {[Boxes, Factory, Wallet, FileText].map((Icon, i) => (
                <IconCell key={i}>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-card/90 text-primary shadow-[var(--shadow-sm)]">
                    <Icon className="h-5 w-5" />
                  </span>
                </IconCell>
              ))}
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۴) تراکم جدول (باید ساده بماند)"
        description="در Data Grid فقط Outline کوچک — بدون Chip و بدون گرادیان."
      >
        <div className="rounded-xl border border-border/70 bg-card p-3">
          {["پیش‌نویس", "در انتظار تأیید", "تأیید شده"].map((label) => (
            <div
              key={label}
              className="flex h-8 items-center justify-between border-b border-border/40 px-1 text-xs last:border-0"
            >
              <span className="flex items-center gap-2 text-foreground">
                <FileText className="h-3.5 w-3.5 text-primary" />
                {label}
              </span>
              <Badge variant="outline" className="text-[10px]">
                عملیات
              </Badge>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection title="۵) پیشنهادهای قابل قفل">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-card p-3 text-xs">
            <Badge className="mb-1">A</Badge>
            <div className="mt-1 text-foreground">فقط Lucide Outline همه‌جا</div>
            <div className="text-muted-foreground">ساده، سریع، کمی رایج</div>
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
            <Badge className="mb-1">B · توصیه</Badge>
            <div className="mt-1 text-foreground">
              Lucide پایه + Chip/Brand فقط برای Sidebar سطح۱، Header ماژول، Empty State
            </div>
            <div className="text-muted-foreground">تمایز بدون پکیج اضافه و بدون ریسک npm</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card p-3 text-xs opacity-70">
            <Badge variant="secondary" className="mb-1">
              C
            </Badge>
            <div className="mt-1 text-foreground">تعویض کامل به Phosphor/Tabler</div>
            <div className="text-muted-foreground">فعلاً به‌خاطر npm لوکال متوقف — بعداً اختیاری</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card p-3 text-xs">
            <Badge variant="outline" className="mb-1">
              D
            </Badge>
            <div className="mt-1 text-foreground">درمان نمایشی قوی‌تر فقط روی Hero/Empty/Onboarding</div>
            <div className="text-muted-foreground">معمولاً مکمل B است، نه جایگزین</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/dashboard/ui-guide/foundations">بازگشت به Foundations</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/dashboard/ui-guide">فهرست راهنما</a>
          </Button>
        </div>
      </GuideSection>
    </div>
  );
}
