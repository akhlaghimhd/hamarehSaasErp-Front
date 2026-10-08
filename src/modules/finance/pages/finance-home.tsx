"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  BarChart3,
  TreePine,
  Wallet,
  ScrollText,
  BookMarked,
  Percent,
  Send,
  AlertTriangle,
  Inbox,
  Building2,
  CalendarCheck,
  GitBranch,
  Layers,
  Sparkles,
  Landmark,
  FileSpreadsheet,
} from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { usePermission } from "@/auth";
import { FinancePermissions } from "../types";

type HubCard = {
  key: string;
  href: string;
  title: string;
  description: string;
  icon: typeof TreePine;
  open: boolean;
};

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
    {
      key: "accounts",
      href: "/dashboard/finance/accounts",
      title: "کدینگ حساب‌ها",
      description: "درخت حساب‌های کل و معین",
      icon: TreePine,
      open: true,
    },
    {
      key: "journals",
      href: "/dashboard/finance/journals",
      title: "اسناد حسابداری",
      description: "پیش‌نویس، ثبت قطعی و برگشت",
      icon: FileText,
      open: true,
    },
    {
      key: "suggested",
      href: "/dashboard/finance/suggested-journals",
      title: "صندوق پیشنهادها",
      description: "K1 — قبول/رد پیش‌نویس از رویداد عملیاتی",
      icon: Inbox,
      open: true,
    },
    {
      key: "smart",
      href: "/dashboard/finance/smart-assist",
      title: "دستیار هوشمند",
      description: "K2/K5/K6 — پیشنهاد، بینش، NL→Draft",
      icon: Sparkles,
      open: true,
    },
    {
      key: "reports",
      href: "/dashboard/finance/reports",
      title: "گزارش‌های مالی",
      description: "تراز آزمایشی، سود و زیان، ترازنامه",
      icon: BarChart3,
      open: true,
    },
    {
      key: "treasury",
      href: "/dashboard/finance/treasury",
      title: "خزانه",
      description: "اسناد دریافت و پرداخت",
      icon: Wallet,
      open: true,
    },
    {
      key: "bankRecon",
      href: "/dashboard/finance/bank-recon",
      title: "تطبیق بانکی",
      description: "صورت‌حساب بانک و match سطر",
      icon: Landmark,
      open: true,
    },
    {
      key: "cheques",
      href: "/dashboard/finance/cheques",
      title: "چک",
      description: "ثبت و چرخه وضعیت چک",
      icon: ScrollText,
      open: true,
    },
    {
      key: "openItems",
      href: "/dashboard/finance/open-items",
      title: "حساب‌های باز",
      description: "AR/AP و عمر بدهی",
      icon: BookMarked,
      open: true,
    },
    {
      key: "tax",
      href: "/dashboard/finance/tax",
      title: "نرخ مالیات",
      description: "پیکربندی VAT دوره‌ای",
      icon: Percent,
      open: true,
    },
    {
      key: "taxReports",
      href: "/dashboard/finance/tax-reports",
      title: "گزارش VAT / مودیان",
      description: "خلاصه دوره + شکاف ارسال",
      icon: FileSpreadsheet,
      open: true,
    },
    {
      key: "moodian",
      href: "/dashboard/finance/moodian",
      title: "مودیان",
      description: "پیگیری ارسال صورتحساب",
      icon: Send,
      open: true,
    },
    {
      key: "alerts",
      href: "/dashboard/finance/compliance-alerts",
      title: "هشدار انطباق",
      description: "K3 — شکاف مودیان و کیفیت",
      icon: AlertTriangle,
      open: true,
    },
    {
      key: "fixedAssets",
      href: "/dashboard/finance/fixed-assets",
      title: "دارایی ثابت",
      description: "F — دارایی و استهلاک → پیش‌نویس",
      icon: Building2,
      open: true,
    },
    {
      key: "periodClose",
      href: "/dashboard/finance/period-close",
      title: "بستن دوره",
      description: "K4 — وضعیت دوره + چک‌لیست",
      icon: CalendarCheck,
      open: true,
    },
    {
      key: "intercompany",
      href: "/dashboard/finance/intercompany",
      title: "بین شرکتی",
      description: "H — نقشه / جفت پیش‌نویس / حذف",
      icon: GitBranch,
      open: true,
    },
    {
      key: "consolTb",
      href: "/dashboard/finance/consolidated-tb",
      title: "تراز تلفیقی",
      description: "جمع OPERATING زیر ریشه گروه",
      icon: Layers,
      open: true,
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
    <div className="space-y-6">
      <PageHeader
        title="حسابداری مالی"
        description="دفتر کل تا گروه و دستیار هوشمند (P0–P6 + residual)"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری" },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const active =
            pathname === card.href || pathname.startsWith(card.href + "/");
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
    </div>
  );
}
