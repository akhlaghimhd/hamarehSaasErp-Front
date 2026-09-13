"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { Badge } from "@/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Palette,
  Type,
  LayoutTemplate,
  Navigation,
  FormInput,
  Table2,
  Bell,
  Layers,
  GitBranch,
  BarChart3,
  Combine,
  Accessibility,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

type GuideItem = {
  code: string;
  href: string;
  title: string;
  description: string;
  phase: string;
  status: "ready" | "in-progress" | "planned";
  icon: ComponentType<{ className?: string }>;
};

const guides: GuideItem[] = [
  {
    code: "UI-00",
    href: "/dashboard/ui-guide/branding",
    title: "Branding & Tenant Theming",
    description:
      "پالت رنگی قابل کاستم، لوگو، شعار، Favicon، فضاهای برند و توکن‌های مستأجر",
    phase: "فاز ۰",
    status: "ready",
    icon: Palette,
  },
  {
    code: "UI-01",
    href: "/dashboard/ui-guide/foundations",
    title: "Foundations",
    description:
      "تایپوگرافی، فاصله، شعاع، Elevation، الگو، Density — آیکون B+D قفل‌شده",
    phase: "فاز ۱",
    status: "ready",
    icon: Type,
  },
  {
    code: "UI-01b",
    href: "/dashboard/ui-guide/icon-lab",
    title: "Icon Lab",
    description: "نمایش زنده سیاست B+D: Lucide + Chip/Brand + Phosphor Duotone",
    phase: "فاز ۱",
    status: "ready",
    icon: Sparkles,
  },
  {
    code: "UI-02",
    href: "/dashboard/ui-guide/layout",
    title: "Layout & Structure",
    description: "App Shell، Grid، Density، Split View، Sticky و ترکیب فرم+جدول",
    phase: "فاز ۱",
    status: "ready",
    icon: LayoutTemplate,
  },
  {
    code: "UI-03",
    href: "/dashboard/ui-guide/navigation",
    title: "Navigation & Wayfinding",
    description: "Sidebar، Header، Breadcrumb، Tabs و Command Palette",
    phase: "فاز ۱",
    status: "ready",
    icon: Navigation,
  },
  {
    code: "UI-04",
    href: "/dashboard/ui-guide/forms",
    title: "Forms & Data Entry",
    description: "انواع ورودی، اعتبارسنجی، چیدمان فرم و حالت‌های خطا",
    phase: "فاز ۲",
    status: "ready",
    icon: FormInput,
  },
  {
    code: "UI-05",
    href: "/dashboard/ui-guide/data-display",
    title: "Data Display & Tables",
    description:
      "ستون قابل‌انتخاب، مالی، page-size، Empty در برابر جستجوی خالی، Stripe، stale، Card/List متنوع",
    phase: "فاز ۲",
    status: "ready",
    icon: Table2,
  },
  {
    code: "UI-06",
    href: "/dashboard/ui-guide/feedback",
    title: "Feedback, Status & Loading",
    description: "Alert، Toast، Status Chip، Progress و Loading Overlay",
    phase: "فاز ۲",
    status: "ready",
    icon: Bell,
  },
  {
    code: "UI-07",
    href: "/dashboard/ui-guide/overlays",
    title: "Overlays & Layered UI",
    description: "Modal، Drawer، Popover، Tooltip و لایه‌بندی",
    phase: "فاز ۳",
    status: "planned",
    icon: Layers,
  },
  {
    code: "UI-08",
    href: "/dashboard/ui-guide/workflow",
    title: "Workflow & Process Patterns",
    description: "Stepper، Approval، Kanban، Timeline و Activity Feed",
    phase: "فاز ۳",
    status: "planned",
    icon: GitBranch,
  },
  {
    code: "UI-09",
    href: "/dashboard/ui-guide/charts",
    title: "Charts & Reporting",
    description: "KPI Card، Charts، Filter Panel و چیدمان گزارش",
    phase: "فاز ۳",
    status: "planned",
    icon: BarChart3,
  },
  {
    code: "UI-10",
    href: "/dashboard/ui-guide/composition",
    title: "Real-world Composition",
    description: "ترکیب واقعی فرم + جدول + فیلتر با حداقل پرت فضا",
    phase: "فاز ۴",
    status: "planned",
    icon: Combine,
  },
  {
    code: "UI-11",
    href: "/dashboard/ui-guide/accessibility",
    title: "Accessibility, Motion & Rules",
    description: "Focus، Keyboard، Reduced Motion و قوانین Do / Don’t",
    phase: "فاز ۴",
    status: "planned",
    icon: Accessibility,
  },
];

const statusLabel = {
  ready: "آماده",
  "in-progress": "در حال ساخت",
  planned: "برنامه‌ریزی‌شده",
} as const;

const statusVariant = {
  ready: "success",
  "in-progress": "warning",
  planned: "secondary",
} as const;

export default function UiGuideIndexPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px]">
            UI Guide
          </Badge>
          <Badge variant="success">Source of Truth</Badge>
        </div>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
          راهنمای رابط کاربری و تجربه کاربری
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          مرجع قطعی طراحی UI/UX پلتفرم هماره. هر تصمیم در صفحه خودش قفل می‌شود و در صفحات
          بعدی/قبلی هم به‌صورت ترکیب‌شده دیده می‌شود تا ناسازگاری در کنار هم مشخص شود.
        </p>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">
        <div className="mb-2 font-medium text-primary">تصمیم‌های قفل‌شده تا اینجا</div>
        <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
          <li>UI-00: توکن رنگ مستأجر + اسلات لوگو/شعار + Dark/Light</li>
          <li>UI-01: تایپ، فاصله، شعاع، Elevation+hover، الگو، Density · آیکون B+D</li>
          <li>UI-02: Shell، max-width، Sticky، A/B/C فرم+جدول، بدون reload، قواعد Overlay</li>
          <li>UI-03: Sidebar، Header، Breadcrumb، Tabs، Command</li>
          <li>
            UI-04: Label+* · خطا زیر فیلد · چیدمان ۱–۲ ستون · ثبت بدون reload · انصراف آزاد ·
            شمسی · تب+ثبت موقت · DOM ثابت
          </li>
          <li>
            UI-05: انتخاب ستون (سقف عرض) · جزئیات با اولویت DB · مالی با جداکننده/اعشار ·
            page-size · Empty ≠ جستجوی خالی · Stripe ملایم · hover از توکن · stale+refresh ·
            Card/List چنددامنه
          </li>
          <li>
            UI-06: خطای فیلد ≠ Toast · Alert ماندگار · Toast کوتاه · Status از پالت · Overlay
            فقط مسدودکننده · دکمه loading + Skeleton
          </li>
          <li>
            Package manager: <strong className="text-foreground">pnpm</strong>
          </li>
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {guides.map((item) => {
          const Icon = item.icon;
          const isReady = item.status === "ready";
          return (
            <Link
              key={item.code}
              href={item.href}
              className={cn(
                "group block rounded-xl transition",
                !isReady && "pointer-events-none opacity-70"
              )}
              aria-disabled={!isReady}
            >
              <Card className="h-full elevate-hover transition group-hover:border-primary/30">
                <CardHeader className="space-y-3 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {item.code}
                      </Badge>
                      <Badge variant={statusVariant[item.status]} className="text-[10px]">
                        {statusLabel[item.status]}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <CardTitle className="text-sm">{item.title}</CardTitle>
                    <CardDescription className="mt-1 text-xs leading-relaxed">
                      {item.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-0 text-xs text-muted-foreground">
                  <span>{item.phase}</span>
                  {isReady ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      مشاهده
                      <ArrowLeft className="h-3 w-3" />
                    </span>
                  ) : (
                    <span>به‌زودی</span>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">یادداشت حاکمیتی:</strong> پس از تکمیل فازهای اصلی، سند{" "}
        <code className="rounded bg-muted px-1 py-0.5">
          Frontend_Design_System_Specification_v1.0.md
        </code>{" "}
        به‌روز می‌شود و Source of Truth بصری از Figma به این صفحات زنده منتقل می‌گردد.
      </div>
    </div>
  );
}
