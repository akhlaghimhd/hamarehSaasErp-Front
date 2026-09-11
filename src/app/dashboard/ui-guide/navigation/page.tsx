"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  GuidePageHeader,
  GuideRulesBox,
  GuideSection,
} from "@/shared/components/ui-guide/guide-shell";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Separator } from "@/shared/components/ui/separator";
import { cn } from "@/shared/lib/utils";
import {
  LayoutDashboard,
  Warehouse,
  Package,
  ShoppingCart,
  FileText,
  Settings,
  Search,
  Bell,
  ChevronLeft,
  ChevronDown,
  User,
  Command,
  Home,
} from "lucide-react";

const meta = {
  code: "UI-03",
  title: "Navigation & Wayfinding",
  description:
    "مسیریابی محصول: Sidebar، Header، Breadcrumb، Tabs، Command Palette — روی Shell قفل‌شده UI-02 و آیکون B+D.",
  phase: "فاز ۱",
  status: "ready" as const,
};

type NavItem = {
  id: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  children?: { id: string; label: string }[];
};

const navTree: NavItem[] = [
  { id: "dash", label: "داشبورد", Icon: LayoutDashboard },
  {
    id: "inv",
    label: "انبار",
    Icon: Warehouse,
    children: [
      { id: "items", label: "کالاها" },
      { id: "docs", label: "اسناد انبار" },
      { id: "bal", label: "موجودی" },
    ],
  },
  { id: "ps", label: "خرید و فروش", Icon: ShoppingCart },
  { id: "pkg", label: "کاتالوگ کالا", Icon: Package },
  { id: "set", label: "تنظیمات", Icon: Settings },
];

export default function NavigationGuidePage() {
  const [activeId, setActiveId] = useState("docs");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ inv: true });
  const [tab, setTab] = useState<"list" | "board" | "archive">("list");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");

  const crumbs = useMemo(
    () => [
      { label: "خانه", href: "#" },
      { label: "انبار", href: "#" },
      { label: "اسناد انبار", href: "#" },
    ],
    []
  );

  const cmdResults = useMemo(() => {
    const all = [
      { label: "اسناد انبار", group: "ناوبری" },
      { label: "کالای جدید", group: "اقدام" },
      { label: "تنظیمات مستأجر", group: "ناوبری" },
      { label: "جستجوی سند GR-", group: "جستجو" },
    ];
    if (!cmdQuery.trim()) return all;
    return all.filter((x) => x.label.includes(cmdQuery.trim()));
  }, [cmdQuery]);

  return (
    <div className="space-y-6">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین ناوبری (وابسته به UI-00…02)">
        <ul className="list-disc space-y-1 pr-5">
          <li>
            Sidebar سطح۱: آیکون Lucide داخل <strong className="text-foreground">Chip</strong> (سیاست
            B). زیرمنو بدون Chip — فقط متن.
          </li>
          <li>
            Active: <code className="rounded bg-muted px-1">primary/10</code> + متن primary.
          </li>
          <li>Header: جستجو، اعلان، کاربر؛ Command Palette با ⌘K / Ctrl+K.</li>
          <li>Breadcrumb حداکثر ۳–۴ سطح؛ سطح آخر بدون لینک.</li>
          <li>Tabs فقط برای نمای هم‌سطح — جایگزین Sidebar نیست.</li>
        </ul>
      </GuideRulesBox>

      <GuideSection title="۱) Sidebar — باز، Active، زیرمنو">
        <div className="max-w-xs overflow-hidden rounded-xl border border-border/70 bg-card shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-2 border-b border-border/60 p-2.5">
            <div className="brand-mark flex h-8 w-8 items-center justify-center rounded-lg text-xs text-white">
              ه
            </div>
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold">هماره ERP</div>
              <div className="text-[10px] text-muted-foreground">Navigation</div>
            </div>
          </div>
          <nav className="space-y-0.5 p-1.5">
            {navTree.map((item) => {
              const hasChildren = !!item.children?.length;
              const isOpen = openGroups[item.id];
              const childActive = item.children?.some((c) => c.id === activeId);
              const selfActive = activeId === item.id;
              const Icon = item.Icon;
              return (
                <div key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasChildren) {
                        setOpenGroups((g) => ({ ...g, [item.id]: !g[item.id] }));
                      } else {
                        setActiveId(item.id);
                      }
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs transition",
                      selfActive || childActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1 truncate text-right">{item.label}</span>
                    {hasChildren ? (
                      isOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
                      ) : (
                        <ChevronLeft className="h-3.5 w-3.5 opacity-70" />
                      )
                    ) : null}
                  </button>
                  {hasChildren && isOpen ? (
                    <div className="mr-4 space-y-0.5 border-r border-border/50 pr-2">
                      {item.children!.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setActiveId(c.id)}
                          className={cn(
                            "flex w-full rounded-md px-2 py-1.5 text-[11px] transition",
                            activeId === c.id
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-muted-foreground hover:bg-muted/50"
                          )}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        </div>
      </GuideSection>

      <GuideSection title="۲) Header — جستجو، اعلان، کاربر، Command">
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-[var(--shadow-sm)]">
          <div className="header-blur flex h-12 items-center justify-between gap-3 border-b border-border/70 px-3">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              className="flex h-8 max-w-xs flex-1 items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-2.5 text-xs text-muted-foreground transition hover:border-primary/30"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">جستجو یا دستور…</span>
              <kbd className="mr-auto hidden rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] sm:inline">
                ⌘K
              </kbd>
            </button>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="relative h-8 w-8 p-0">
                <Bell className="h-4 w-4" />
                <span className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <User className="h-3.5 w-3.5" />
                </span>
                <span className="hidden text-xs sm:inline">کاربر</span>
              </Button>
            </div>
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۳) Breadcrumb">
        <nav
          aria-label="breadcrumb"
          className="flex flex-wrap items-center gap-1 rounded-xl border border-border/70 bg-card px-3 py-2 text-xs"
        >
          <Home className="h-3.5 w-3.5 text-muted-foreground" />
          {crumbs.map((c, i) => {
            const last = i === crumbs.length - 1;
            return (
              <span key={c.label} className="flex items-center gap-1">
                <ChevronLeft className="h-3 w-3 text-muted-foreground/70" />
                {last ? (
                  <span className="font-medium text-foreground">{c.label}</span>
                ) : (
                  <a href={c.href} className="text-muted-foreground hover:text-primary">
                    {c.label}
                  </a>
                )}
              </span>
            );
          })}
        </nav>
      </GuideSection>

      <GuideSection title="۴) Tabs — نماهای هم‌سطح">
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <div className="flex gap-1 border-b border-border/70 px-2 pt-2">
            {(
              [
                { id: "list" as const, label: "فهرست" },
                { id: "board" as const, label: "بورد" },
                { id: "archive" as const, label: "بایگانی" },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "rounded-t-lg px-3 py-2 text-xs transition",
                  tab === t.id
                    ? "border-b-2 border-primary font-medium text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="p-4 text-xs text-muted-foreground">
            نمای «{tab === "list" ? "فهرست" : tab === "board" ? "بورد" : "بایگانی"}»
          </div>
        </div>
      </GuideSection>

      <GuideSection title="۵) Command Palette">
        <Button size="sm" onClick={() => setCmdOpen((v) => !v)}>
          <Command className="ml-1.5 h-3.5 w-3.5" />
          {cmdOpen ? "بستن Palette" : "باز کردن Palette"}
        </Button>
        {cmdOpen ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-border/70 bg-card shadow-[var(--shadow-lg)]">
            <div className="border-b border-border/60 p-2">
              <Input
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
                placeholder="دستور یا صفحه را بنویس…"
                className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
            </div>
            <ul className="max-h-48 overflow-auto p-1">
              {cmdResults.map((r) => (
                <li key={r.label}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs hover:bg-primary/10"
                  >
                    <span className="flex items-center gap-2 text-foreground">
                      <FileText className="h-3.5 w-3.5 text-primary" />
                      {r.label}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {r.group}
                    </Badge>
                  </button>
                </li>
              ))}
              {cmdResults.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">نتیجه‌ای نیست</li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </GuideSection>

      <GuideSection title="۶) حالت‌های آیتم منو">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              { label: "Default", className: "text-muted-foreground" },
              { label: "Hover", className: "bg-sidebar-accent text-sidebar-accent-foreground" },
              { label: "Active", className: "bg-primary/10 text-primary" },
              { label: "Disabled", className: "cursor-not-allowed opacity-40" },
            ] as const
          ).map((s) => (
            <div
              key={s.label}
              className={cn(
                "flex items-center gap-2 rounded-lg border border-border/60 px-2 py-2 text-xs",
                s.className
              )}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Package className="h-3.5 w-3.5" />
              </span>
              {s.label}
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection title="۷) Do / Don’t">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/30">
            <div className="mb-2 font-medium text-emerald-800 dark:text-emerald-200">انجام بده</div>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>Chip فقط سطح۱ Sidebar</li>
              <li>یک Active واضح</li>
              <li>Breadcrumb کوتاه</li>
              <li>Command برای کاربر حرفه‌ای</li>
            </ul>
          </div>
          <div className="rounded-xl border border-rose-200/80 bg-rose-50/60 p-4 text-sm dark:border-rose-900 dark:bg-rose-950/30">
            <div className="mb-2 font-medium text-rose-800 dark:text-rose-200">انجام نده</div>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>Tabs جای منوی ماژول</li>
              <li>Duotone در منو</li>
              <li>بیش از دو سطح تو در تو بدون نیاز</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <Separator />

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/layout">UI-02 Layout</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide">فهرست</a>
        </Button>
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">مرحله بعد:</strong> UI-04 Forms & Data Entry
      </div>
    </div>
  );
}
