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
  ];

  const allowedMap: Record<string, boolean> = {
    accounts: canCoa,
    journals: canJournal,
    reports: canReport,
    treasury: canTreasury,
    cheques: canTreasury,
    openItems: canAr,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="حسابداری مالی"
        description="دفتر کل، خزانه، چک و حساب‌های باز (P0 + P1)"
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
