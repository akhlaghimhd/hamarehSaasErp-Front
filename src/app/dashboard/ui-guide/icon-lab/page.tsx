"use client";

import type { ComponentType, ReactNode } from "react";
import {
  GuidePageHeader,
  GuideRulesBox,
  GuideSection,
} from "@/shared/components/ui-guide/guide-shell";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
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
  Factory,
  Wallet,
} from "lucide-react";
import { Package as PhPackage } from "@phosphor-icons/react/dist/csr/Package";
import { Warehouse as PhWarehouse } from "@phosphor-icons/react/dist/csr/Warehouse";
import { ShoppingCart as PhCart } from "@phosphor-icons/react/dist/csr/ShoppingCart";
import { FileText as PhFile } from "@phosphor-icons/react/dist/csr/FileText";

const meta = {
  code: "UI-01b",
  title: "Icon Lab — سیاست قفل‌شده B+D",
  description:
    "مرجع زنده سیاست آیکون: Lucide پایه + Chip/Brand + Phosphor Duotone فقط Empty/Hero. Tabler حذف شد.",
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

function IconCell({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-center gap-1.5">{children}</div>;
}

export default function IconLabPage() {
  return (
    <div className="space-y-6">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="سیاست قفل‌شده (B + D)">
        <ul className="list-disc space-y-1 pr-5">
          <li>
            <strong className="text-foreground">پایه:</strong> فقط Lucide Outline در کل محصول.
          </li>
          <li>
            <strong className="text-foreground">تأکید:</strong> Chip یا Brand Mark برای Sidebar
            سطح۱، Page Header، کارت ماژول.
          </li>
          <li>
            <strong className="text-foreground">Duotone:</strong> فقط Phosphor weight="duotone" در
            Empty State، Hero، Onboarding.
          </li>
          <li>
            <strong className="text-foreground">ممنوع:</strong> Tabler · Duotone در جدول · مخلوط
            بی‌قانون کتابخانه‌ها.
          </li>
        </ul>
      </GuideRulesBox>

      <GuideSection title="۱) پایه عملیاتی — Lucide Outline">
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

      <GuideSection title="۲) Sidebar — Chip و Brand (لایه B)">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-border/70 bg-card p-2 shadow-[var(--shadow-sm)]">
            <div className="mb-2 px-2 text-[11px] font-medium text-muted-foreground">Chip نرم</div>
            <div className="space-y-0.5">
              {moduleIcons.slice(0, 6).map(({ key, label, Icon }) => (
                <div
                  key={key}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-card p-2 shadow-[var(--shadow-sm)]">
            <div className="mb-2 px-2 text-[11px] font-medium text-muted-foreground">Brand Mark</div>
            <div className="space-y-0.5">
              {moduleIcons.slice(0, 6).map(({ key, label, Icon }) => (
                <div
                  key={key}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <span className="brand-mark flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۳) Empty / Hero — Phosphor Duotone (لایه D)">
        <div className="pattern-mesh rounded-xl border border-border/70 p-6">
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
            <div className="flex gap-4 text-primary">
              <PhPackage className="h-12 w-12" weight="duotone" />
              <PhWarehouse className="h-12 w-12" weight="duotone" />
              <PhCart className="h-12 w-12" weight="duotone" />
              <PhFile className="h-12 w-12" weight="duotone" />
            </div>
            <div className="text-sm font-medium text-foreground">هنوز سندی ثبت نشده</div>
            <p className="text-xs text-muted-foreground">
              فقط در Empty State / Hero / Onboarding از Phosphor Duotone استفاده کن.
            </p>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۴) جدول — فقط Lucide کوچک">
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

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/foundations">Foundations</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide">فهرست راهنما</a>
        </Button>
      </div>
    </div>
  );
}
