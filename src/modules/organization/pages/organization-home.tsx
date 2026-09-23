/**
 * FE-ORG — Organization module hub
 */

"use client";

import Link from "next/link";
import { Building2, GitBranch, Network } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { usePermission } from "@/auth";
import { OrganizationPermissions } from "../types";

type HubCard = {
  href: string;
  title: string;
  description: string;
  icon: typeof Building2;
  open: boolean;
};

const cards: HubCard[] = [
  {
    href: "/dashboard/organization/companies",
    title: "شرکت‌ها",
    description: "تعریف و مدیریت شرکت‌های سازمان",
    icon: Building2,
    open: true,
  },
  {
    href: "/dashboard/organization/companies",
    title: "شعب",
    description: "شعب هر شرکت از صفحه جزئیات شرکت مدیریت می‌شود",
    icon: GitBranch,
    open: true,
  },
  {
    href: "/dashboard/organization/companies",
    title: "واحدهای سازمانی",
    description: "دپارتمان‌ها از داخل شرکت و شعبه تعریف می‌شوند",
    icon: Network,
    open: true,
  },
];

function HubCardView({
  card,
  allowed,
}: {
  card: HubCard;
  allowed: boolean;
}) {
  const Icon = card.icon;
  const interactive = card.open && allowed;

  const body = (
    <div
      className={
        interactive
          ? "group flex h-full flex-col gap-2 rounded-xl border border-border/80 bg-card p-4 shadow-[var(--shadow-xs)] transition hover:border-primary/40 hover:shadow-[var(--shadow-sm)]"
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
          برای ورود به این بخش مجوز لازم را ندارید
        </span>
      ) : null}
    </div>
  );

  if (interactive) {
    return (
      <Link href={card.href} className="block">
        {body}
      </Link>
    );
  }

  return <div>{body}</div>;
}

export function OrganizationHome() {
  const canViewCompany = usePermission(OrganizationPermissions.companyView);

  return (
    <div className="space-y-6">
      <PageHeader
        title="سازمان"
        description="ساختار سازمانی: شرکت، شعبه و واحد سازمانی"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "سازمان" },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <HubCardView
            key={card.title}
            card={card}
            allowed={canViewCompany}
          />
        ))}
      </div>
    </div>
  );
}
