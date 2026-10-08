"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ListTree,
  NotebookPen,
  Inbox,
  Sparkles,
  BarChart3,
  Wallet,
  Scale,
  FileCheck2,
  HandCoins,
  BadgePercent,
  FileSpreadsheet,
  Send,
  BellRing,
  Building2,
  ClipboardCheck,
  Share2,
  Boxes,
} from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { usePermission } from "@/auth";
import { FinancePermissions } from "../types";

type HubCard = {
  key: string;
  href: string;
  title: string;
  description: string;
  icon: typeof ListTree;
  open: boolean;
  group: string;
};

type HubGroup = {
  id: string;
  title: string;
};

/** ترتیب بر اساس فرکانس استفاده: روزانه → جاری → ماهانه → بستن → پایه → گروه */
const HUB_GROUPS: HubGroup[] = [
  { id: "daily_ops", title: "عملیات روزانه" },
  { id: "ongoing_control", title: "کنترل جاری" },
  { id: "tax_periodic", title: "مالیات و انطباق دوره‌ای" },
  { id: "reports_close", title: "گزارش‌ها و بستن دوره" },
  { id: "setup_structure", title: "پایه و ساختار" },
  { id: "assets_group", title: "دارایی و گروه" },
];

function HubCardView({
  card,
  allowed,
  active,
}: {
  card: HubCard;
  allowed: boolean;
  active?: boolean;
}) {
  const Icon = card.icon;
  const interactive = card.open && allowed;

  const body = (
    <div
      className={
        interactive
          ? [
              "group flex h-full flex-col gap-2 rounded-xl border bg-card p-4 shadow-[var(--shadow-xs)] transition",
              active
                ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                : "border-border/80 hover:border-primary/40 hover:shadow-[var(--shadow-sm)]",
            ].join(" ")
          : "flex h-full flex-col gap-2 rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 opacity-80"
      }
    >
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="font-medium">{card.title}</div>
      </div>
      <p className="text-xs text-muted-foreground">{card.description}</p>
      {!card.open ? (
        <span className="mt-auto text-[10px] text-muted-foreground">به‌زودی</span>
      ) : !allowed ? (
        <span className="mt-auto text-[10px] text-amber-700 dark:text-amber-400">
          مجوز لازم را ندارید
        </span>
      ) : null}
    </div>
  );

  if (interactive) {
    return (
      <Link href={card.href} className="block" prefetch={false}>
        {body}
      </Link>
    );
  }
  return <div className="block">{body}</div>;
}

export function FinanceHomePage() {
  const pathname = usePathname();
  const canCoa = usePermission(FinancePermissions.coaView);
  const canJournal = usePermission(FinancePermissions.journalView);
  const canReport = usePermission(FinancePermissions.reportView);
  const canTreasury = usePermission(FinancePermissions.treasuryView);
  const canAr = usePermission(FinancePermissions.arView);
  const canTax = usePermission(FinancePermissions.taxView);
  const canMoodian = usePermission(FinancePermissions.moodianView);
  const canCompliance = usePermission(FinancePermissions.complianceView);
  const canSuggest = usePermission(FinancePermissions.suggestView);
  const canFa = usePermission(FinancePermissions.faView);
  const canPeriod = usePermission(FinancePermissions.periodView);
  const canIc = usePermission(FinancePermissions.icView);
  const canSmart = usePermission(FinancePermissions.smartView);

  const cards: HubCard[] = [
    // —— عملیات روزانه
    {
      key: "journals",
      href: "/dashboard/finance/journals",
      title: "اسناد حسابداری",
      description: "پیش‌نویس، ثبت قطعی و برگشت",
      icon: NotebookPen,
      open: true,
      group: "daily_ops",
    },
    {
      key: "suggested",
      href: "/dashboard/finance/suggested-journals",
      title: "صندوق پیشنهادها",
      description: "K1 — قبول/رد پیش‌نویس از رویداد عملیاتی",
      icon: Inbox,
      open: true,
      group: "daily_ops",
    },
    {
      key: "treasury",
      href: "/dashboard/finance/treasury",
      title: "خزانه",
      description: "اسناد دریافت و پرداخت",
      icon: Wallet,
      open: true,
      group: "daily_ops",
    },
    {
      key: "cheques",
      href: "/dashboard/finance/cheques",
      title: "چک",
      description: "ثبت و چرخه وضعیت چک",
      icon: FileCheck2,
      open: true,
      group: "daily_ops",
    },
    {
      key: "openItems",
      href: "/dashboard/finance/open-items",
      title: "حساب‌های باز",
      description: "AR/AP و عمر بدهی",
      icon: HandCoins,
      open: true,
      group: "daily_ops",
    },
    // —— کنترل جاری
    {
      key: "bankRecon",
      href: "/dashboard/finance/bank-recon",
      title: "تطبیق بانکی",
      description: "صورت‌حساب بانک و match سطر",
      icon: Scale,
      open: true,
      group: "ongoing_control",
    },
    {
      key: "alerts",
      href: "/dashboard/finance/compliance-alerts",
      title: "هشدار انطباق",
      description: "K3 — شکاف مودیان و کیفیت",
      icon: BellRing,
      open: true,
      group: "ongoing_control",
    },
    {
      key: "smart",
      href: "/dashboard/finance/smart-assist",
      title: "دستیار هوشمند",
      description: "K2/K5/K6 — پیشنهاد، بینش، NL→Draft",
      icon: Sparkles,
      open: true,
      group: "ongoing_control",
    },
    // —— مالیات و انطباق دوره‌ای
    {
      key: "tax",
      href: "/dashboard/finance/tax",
      title: "نرخ مالیات",
      description: "پیکربندی VAT دوره‌ای",
      icon: BadgePercent,
      open: true,
      group: "tax_periodic",
    },
    {
      key: "taxReports",
      href: "/dashboard/finance/tax-reports",
      title: "گزارش VAT / مودیان",
      description: "خلاصه دوره + شکاف ارسال",
      icon: FileSpreadsheet,
      open: true,
      group: "tax_periodic",
    },
    {
      key: "moodian",
      href: "/dashboard/finance/moodian",
      title: "مودیان",
      description: "پیگیری ارسال صورتحساب",
      icon: Send,
      open: true,
      group: "tax_periodic",
    },
    // —— گزارش‌ها و بستن دوره
    {
      key: "reports",
      href: "/dashboard/finance/reports",
      title: "گزارش‌های مالی",
      description: "تراز آزمایشی، سود و زیان، ترازنامه",
      icon: BarChart3,
      open: true,
      group: "reports_close",
    },
    {
      key: "periodClose",
      href: "/dashboard/finance/period-close",
      title: "بستن دوره",
      description: "K4 — وضعیت دوره + چک‌لیست",
      icon: ClipboardCheck,
      open: true,
      group: "reports_close",
    },
    // —— پایه و ساختار
    {
      key: "accounts",
      href: "/dashboard/finance/accounts",
      title: "کدینگ حساب‌ها",
      description: "درخت حساب‌های کل و معین",
      icon: ListTree,
      open: true,
      group: "setup_structure",
    },
    // —— دارایی و گروه
    {
      key: "fixedAssets",
      href: "/dashboard/finance/fixed-assets",
      title: "دارایی ثابت",
      description: "F — دارایی و استهلاک → پیش‌نویس",
      icon: Building2,
      open: true,
      group: "assets_group",
    },
    {
      key: "intercompany",
      href: "/dashboard/finance/intercompany",
      title: "بین شرکتی",
      description: "H — نقشه / جفت پیش‌نویس / حذف",
      icon: Share2,
      open: true,
      group: "assets_group",
    },
    {
      key: "consolTb",
      href: "/dashboard/finance/consolidated-tb",
      title: "تراز تلفیقی",
      description: "جمع OPERATING زیر ریشه گروه",
      icon: Boxes,
      open: true,
      group: "assets_group",
    },
  ];

  const allowedMap: Record<string, boolean> = {
    accounts: canCoa,
    journals: canJournal,
    suggested: canSuggest,
    smart: canSmart,
    reports: canReport,
    treasury: canTreasury,
    bankRecon: canTreasury,
    cheques: canTreasury,
    openItems: canAr,
    tax: canTax,
    taxReports: canTax,
    moodian: canMoodian,
    alerts: canCompliance,
    fixedAssets: canFa,
    periodClose: canPeriod,
    intercompany: canIc,
    consolTb: canIc,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="حسابداری مالی"
        description="چیدمان بر اساس کاربرد روزانه تا دوره‌ای"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری" },
        ]}
      />

      {HUB_GROUPS.map((group) => {
        const groupCards = cards.filter((c) => c.group === group.id);
        if (groupCards.length === 0) return null;
        return (
          <section key={group.id} className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {group.title}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {groupCards.map((card) => {
                const active =
                  pathname === card.href ||
                  pathname.startsWith(card.href + "/");
                return (
                  <HubCardView
                    key={card.key}
                    card={card}
                    active={active}
                    allowed={allowedMap[card.key] ?? false}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
