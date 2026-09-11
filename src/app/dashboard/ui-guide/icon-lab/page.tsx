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
// Phosphor: prefer named icons without forcing full package compile
import { Package as PhPackage } from "@phosphor-icons/react/dist/csr/Package";
import { Warehouse as PhWarehouse } from "@phosphor-icons/react/dist/csr/Warehouse";
import { ShoppingCart as PhCart } from "@phosphor-icons/react/dist/csr/ShoppingCart";
import { FileText as PhFile } from "@phosphor-icons/react/dist/csr/FileText";
import { Users as PhUsers } from "@phosphor-icons/react/dist/csr/Users";
import { Gear as PhGear } from "@phosphor-icons/react/dist/csr/Gear";
import { House as PhHouse } from "@phosphor-icons/react/dist/csr/House";
import { MagnifyingGlass as PhSearch } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { Bell as PhBell } from "@phosphor-icons/react/dist/csr/Bell";
import { Check as PhCheck } from "@phosphor-icons/react/dist/csr/Check";
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
    "مقایسه زنده Lucide · Phosphor · Tabler برای قفل سیاست آیکون (A/B/C/D).",
  phase: "فاز ۱ · زیرمجموعه Foundations",
  status: "ready" as const,
};

type IconComp = ComponentType<{
  className?: string;
  size?: number | string;
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone";
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

function IconCell({ children, caption }: { children: ReactNode; caption?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {children}
      {caption ? <span className="text-[10px] text-muted-foreground">{caption}</span> : null}
    </div>
  );
}

export default function IconLabPage() {
  return (
    <div className="space-y-6">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="نکته نصب">
        <ul className="list-disc space-y-1 pr-5">
          <li>
            در این پروژه از <strong className="text-foreground">pnpm</strong> استفاده کن:{" "}
            <code className="rounded bg-muted px-1">pnpm install</code>
          </li>
          <li>مخلوط کردن npm و pnpm باعث خطای null در arborist می‌شود.</li>
        </ul>
      </GuideRulesBox>

      <GuideSection
        title="۱) مقایسه سه‌ستونه — Outline ۱۶px"
        description="Lucide · Phosphor Regular · Tabler — فقط فرم خط را مقایسه کن."
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

      <GuideSection title="۲) شبیه‌سازی Sidebar" description="هویت روزانه سیستم اینجا شکل می‌گیرد.">
        <div className="grid gap-3 md:grid-cols-3">
          {(
            [
              { title: "Lucide", lib: "lucide" as const },
              { title: "Phosphor", lib: "phosphor" as const },
              { title: "Tabler", lib: "tabler" as const },
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
                        {...(col.lib === "phosphor" ? { weight: "regular" as const } : {})}
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
        title="۳) وزن‌های Phosphor (از جمله Duotone)"
        description="Thin / Light / Regular / Duotone — برای سطوح نمایشی Duotone جذاب‌تر است."
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              { weight: "thin" as const, label: "Thin" },
              { weight: "light" as const, label: "Light" },
              { weight: "regular" as const, label: "Regular" },
              { weight: "duotone" as const, label: "Duotone" },
            ] as const
          ).map((w) => (
            <div key={w.weight} className="rounded-xl border border-border/70 bg-card p-4">
              <div className="mb-3 text-xs font-medium text-foreground">{w.label}</div>
              <div className="flex flex-wrap gap-3 text-primary">
                <PhPackage className="h-7 w-7" weight={w.weight} />
                <PhWarehouse className="h-7 w-7" weight={w.weight} />
                <PhCart className="h-7 w-7" weight={w.weight} />
                <PhFile className="h-7 w-7" weight={w.weight} />
              </div>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection title="۴) درمان Lucide برای پیشنهاد B">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-3 text-xs font-medium">Outline</div>
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
            <div className="mb-3 text-xs font-medium">Chip Primary</div>
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
            <div className="mb-3 text-xs font-medium">Brand Mark</div>
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
            <div className="mb-3 text-xs font-medium">خط ضخیم</div>
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

      <GuideSection title="۵) تراکم جدول">
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

      <GuideSection title="۶) قفل تصمیم">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg border border-border/70 bg-card p-3 text-xs">
            <Badge className="mb-1">A</Badge> فقط Lucide
          </div>
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
            <Badge className="mb-1">B</Badge> Lucide + Chip/Brand در ماژول و Empty
          </div>
          <div className="rounded-lg border border-border/70 bg-card p-3 text-xs">
            <Badge variant="secondary" className="mb-1">
              C
            </Badge>{" "}
            پایه = Phosphor یا Tabler
          </div>
          <div className="rounded-lg border border-border/70 bg-card p-3 text-xs">
            <Badge variant="outline" className="mb-1">
              D
            </Badge>{" "}
            Duotone فقط Hero/Empty (معمولاً با B)
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/dashboard/ui-guide/foundations">Foundations</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="/dashboard/ui-guide">فهرست راهنما</a>
          </Button>
        </div>
      </GuideSection>
    </div>
  );
}
