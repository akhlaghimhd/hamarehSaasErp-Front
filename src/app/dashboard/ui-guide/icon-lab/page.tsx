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
  Package as LucidePackage,
  Warehouse as LucideWarehouse,
  ShoppingCart as LucideCart,
  FileText as LucideFile,
  Users as LucideUsers,
  Settings as LucideSettings,
  LayoutDashboard as LucideDash,
  Search as LucideSearch,
  Bell as LucideBell,
  Check as LucideCheck,
} from "lucide-react";
import {
  Package as PhPackage,
  Warehouse as PhWarehouse,
  ShoppingCart as PhCart,
  FileText as PhFile,
  Users as PhUsers,
  Gear as PhGear,
  House as PhHouse,
  MagnifyingGlass as PhSearch,
  Bell as PhBell,
  Check as PhCheck,
} from "@phosphor-icons/react";
import {
  IconPackage as TabPackage,
  IconBuildingWarehouse as TabWarehouse,
  IconShoppingCart as TabCart,
  IconFileText as TabFile,
  IconUsers as TabUsers,
  IconSettings as TabSettings,
  IconLayoutDashboard as TabDash,
  IconSearch as TabSearch,
  IconBell as TabBell,
  IconCheck as TabCheck,
} from "@tabler/icons-react";

const meta = {
  code: "UI-01b",
  title: "Icon Lab — مقایسه بصری",
  description:
    "گالری تصمیم‌گیری برای سیاست آیکون. سه کتابخانه و چند درمان بصری را کنار هم ببین، بعد A/B/C/D را قفل کن.",
  phase: "فاز ۱ · زیرمجموعه Foundations",
  status: "ready" as const,
};

type IconComp = ComponentType<{
  className?: string;
  size?: number | string;
  weight?: string;
  stroke?: number;
  strokeWidth?: number;
}>;

const rows: {
  key: string;
  label: string;
  lucide: IconComp;
  phosphor: IconComp;
  tabler: IconComp;
}[] = [
  { key: "dash", label: "داشبورد", lucide: LucideDash, phosphor: PhHouse, tabler: TabDash },
  { key: "wh", label: "انبار", lucide: LucideWarehouse, phosphor: PhWarehouse, tabler: TabWarehouse },
  { key: "pkg", label: "کالا", lucide: LucidePackage, phosphor: PhPackage, tabler: TabPackage },
  { key: "cart", label: "خرید/فروش", lucide: LucideCart, phosphor: PhCart, tabler: TabCart },
  { key: "doc", label: "سند", lucide: LucideFile, phosphor: PhFile, tabler: TabFile },
  { key: "users", label: "کاربران", lucide: LucideUsers, phosphor: PhUsers, tabler: TabUsers },
  { key: "settings", label: "تنظیمات", lucide: LucideSettings, phosphor: PhGear, tabler: TabSettings },
  { key: "search", label: "جستجو", lucide: LucideSearch, phosphor: PhSearch, tabler: TabSearch },
  { key: "bell", label: "اعلان", lucide: LucideBell, phosphor: PhBell, tabler: TabBell },
  { key: "check", label: "تأیید", lucide: LucideCheck, phosphor: PhCheck, tabler: TabCheck },
];

function IconCell({
  children,
  caption,
  className,
}: {
  children: ReactNode;
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      {children}
      {caption ? <span className="text-[10px] text-muted-foreground">{caption}</span> : null}
    </div>
  );
}

export default function IconLabPage() {
  return (
    <div className="space-y-6">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="چطور تصمیم بگیری">
        <ul className="list-disc space-y-1 pr-5">
          <li>اول بخش «منوی عمودی» را نگاه کن — بیشترین تکرار روزانه اینجاست.</li>
          <li>بعد «جدول/فشرده» را ببین — اگر شلوغ شد، آن سبک برای Data Grid ممنوع است.</li>
          <li>در نهایت درمان‌های Chip / Brand / Duotone را برای Empty و Header مقایسه کن.</li>
          <li>
            بعد از دیدن، یکی را اعلام کن: <strong className="text-foreground">A / B / C / D</strong>
          </li>
        </ul>
      </GuideRulesBox>

      <GuideSection
        title="۱) مقایسه کتابخانه — Outline یکسان ۱۶px"
        description="Lucide (فعلی) · Phosphor Regular · Tabler. رنگ همه primary است تا فقط فرم خط مقایسه شود."
      >
        <div className="overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-[11px] text-muted-foreground">
                <th className="px-3 py-2 text-right font-medium">کاربرد</th>
                <th className="px-3 py-2 text-center font-medium">Lucide</th>
                <th className="px-3 py-2 text-center font-medium">Phosphor</th>
                <th className="px-3 py-2 text-center font-medium">Tabler</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const L = row.lucide;
                const P = row.phosphor;
                const T = row.tabler;
                return (
                  <tr key={row.key} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-3 text-xs text-foreground">{row.label}</td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center text-primary">
                        <L className="h-4 w-4" />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center text-primary">
                        <P className="h-4 w-4" weight="regular" />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-center text-primary">
                        <T className="h-4 w-4" stroke={1.75} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GuideSection>

      <GuideSection
        title="۲) شبیه‌سازی منوی عمودی (Sidebar)"
        description="آیتم‌های پرتکرار با برچسب — اینجا هویت روزانه سیستم شکل می‌گیرد."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              { title: "A · Lucide", lib: "lucide" as const },
              { title: "C · Phosphor", lib: "phosphor" as const },
              { title: "C · Tabler", lib: "tabler" as const },
            ] as const
          ).map((col) => (
            <div
              key={col.title}
              className="rounded-xl border border-border/70 bg-card p-2 shadow-[var(--shadow-sm)]"
            >
              <div className="mb-2 px-2 text-[11px] font-medium text-muted-foreground">{col.title}</div>
              <div className="space-y-0.5">
                {rows.slice(0, 6).map((row) => {
                  const Icon =
                    col.lib === "lucide"
                      ? row.lucide
                      : col.lib === "phosphor"
                        ? row.phosphor
                        : row.tabler;
                  return (
                    <div
                      key={row.key}
                      className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <Icon
                        className="h-4 w-4 shrink-0"
                        {...(col.lib === "phosphor" ? { weight: "regular" } : {})}
                        {...(col.lib === "tabler" ? { stroke: 1.75 } : {})}
                      />
                      <span className="truncate">{row.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection
        title="۳) درمان‌های بصری روی Lucide (پیشنهاد B بدون تعویض کتابخانه)"
        description="اگر پایه Lucide بماند، تمایز را می‌توان با درمان بصری ساخت — سریع و بدون مهاجرت."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-3 text-xs font-medium text-foreground">Outline ساده</div>
            <div className="flex flex-wrap gap-2">
              {rows.slice(0, 5).map((row) => {
                const Icon = row.lucide;
                return (
                  <IconCell key={row.key}>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </IconCell>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-3 text-xs font-medium text-foreground">Chip نرم Primary</div>
            <div className="flex flex-wrap gap-2">
              {rows.slice(0, 5).map((row) => {
                const Icon = row.lucide;
                return (
                  <IconCell key={row.key}>
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                  </IconCell>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-3 text-xs font-medium text-foreground">Brand Mark (گرادیان)</div>
            <div className="flex flex-wrap gap-2">
              {rows.slice(0, 5).map((row) => {
                const Icon = row.lucide;
                return (
                  <IconCell key={row.key}>
                    <span className="brand-mark flex h-9 w-9 items-center justify-center rounded-lg text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                  </IconCell>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-3 text-xs font-medium text-foreground">خط ضخیم‌تر (نمایشی)</div>
            <div className="flex flex-wrap gap-2">
              {rows.slice(0, 5).map((row) => {
                const Icon = row.lucide;
                return (
                  <IconCell key={row.key}>
                    <Icon className="h-5 w-5 text-primary" strokeWidth={2.25} />
                  </IconCell>
                );
              })}
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۴) Phosphor وزن‌ها (اگر C یا لایه متمایز B)"
        description="Phosphor چند وزن دارد؛ برای Sidebar معمولاً Regular، برای Hero می‌توان Duotone."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              { weight: "thin", label: "Thin" },
              { weight: "light", label: "Light" },
              { weight: "regular", label: "Regular" },
              { weight: "duotone", label: "Duotone" },
            ] as const
          ).map((w) => (
            <div key={w.weight} className="rounded-xl border border-border/70 bg-card p-4">
              <div className="mb-3 text-xs font-medium text-foreground">{w.label}</div>
              <div className="flex flex-wrap gap-3 text-primary">
                <PhPackage className="h-6 w-6" weight={w.weight} />
                <PhWarehouse className="h-6 w-6" weight={w.weight} />
                <PhCart className="h-6 w-6" weight={w.weight} />
                <PhFile className="h-6 w-6" weight={w.weight} />
              </div>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection
        title="۵) تراکم فشرده (جدول / اکشن ردیف)"
        description="اگر اینجا شلوغ یا ناواضح شد، آن سبک برای Data Grid حذف می‌شود."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              { title: "Lucide 14px", node: <LucidePackage className="h-3.5 w-3.5" /> },
              {
                title: "Phosphor 14px",
                node: <PhPackage className="h-3.5 w-3.5" weight="regular" />,
              },
              {
                title: "Tabler 14px",
                node: <TabPackage className="h-3.5 w-3.5" stroke={1.5} />,
              },
            ] as const
          ).map((col) => (
            <div key={col.title} className="rounded-xl border border-border/70 bg-card p-3">
              <div className="mb-2 text-[11px] text-muted-foreground">{col.title}</div>
              {["پیش‌نویس", "در انتظار", "تأیید شده"].map((label) => (
                <div
                  key={label}
                  className="flex h-8 items-center justify-between border-b border-border/40 px-1 text-xs last:border-0"
                >
                  <span className="flex items-center gap-2 text-foreground">
                    <span className="text-primary">{col.node}</span>
                    {label}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    عملیات
                  </Badge>
                </div>
              ))}
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection title="۶) یادآوری پیشنهادها">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-card p-3 text-xs">
            <Badge className="mb-1">A</Badge> فقط Lucide در همه‌جا
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
            <Badge className="mb-1">B · توصیه</Badge> Lucide پایه + درمان Chip/Brand برای ماژول و
            Empty — یا Phosphor Duotone فقط در سطوح نمایشی
          </div>
          <div className="rounded-lg border border-border/70 bg-card p-3 text-xs">
            <Badge variant="secondary" className="mb-1">
              C
            </Badge>{" "}
            تعویض کامل پایه به Phosphor یا Tabler
          </div>
          <div className="rounded-lg border border-border/70 bg-card p-3 text-xs">
            <Badge variant="outline" className="mb-1">
              D
            </Badge>{" "}
            Duotone فقط برای Hero / Empty / Onboarding
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
