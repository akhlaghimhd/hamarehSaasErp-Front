/**
 * FE-ORG — Organization module hub
 */

"use client";

import Link from "next/link";
import {
  Building2,
  GitBranch,
  Network,
  Loader2,
  Layers,
  Landmark,
  ArrowLeftRight,
  ShoppingCart,
} from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { usePermission } from "@/auth";
import { useCompanies } from "../hooks/use-companies";
import { OrganizationPermissions } from "../types";

type HubCard = {
  key: string;
  href: string;
  title: string;
  description: string;
  icon: typeof Building2;
  open: boolean;
};

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
  const canViewBranch = usePermission(OrganizationPermissions.branchView);
  const canViewDept = usePermission(OrganizationPermissions.departmentView);

  const { data: companies, isLoading } = useCompanies();

  const primary = (() => {
    const list = companies ?? [];
    if (list.length === 0) return null;
    const flagged = list.find((c) => c.is_primary);
    if (flagged) return flagged;
    const sorted = [...list].sort((a, b) =>
      String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""))
    );
    return sorted[0] ?? null;
  })();

  const companyHref = "/dashboard/organization/companies";
  const branchesHref = "/dashboard/organization/branches";
  const deptsHref = "/dashboard/organization/departments";

  const cards: HubCard[] = [
    {
      key: "companies",
      href: companyHref,
      title: "شرکت‌ها",
      description:
        "فهرست و مشخصات حقوقی شرکت‌های سازمان؛ پایهٔ تعریف ساختار و مالکیت",
      icon: Building2,
      open: true,
    },
    {
      key: "branches",
      href: branchesHref,
      title: "شعب / سایت",
      description:
        "مکان‌های فعالیت مثل دفتر، کارخانه و سایت انبار زیر هر شرکت",
      icon: GitBranch,
      open: true,
    },
    {
      key: "departments",
      href: deptsHref,
      title: "واحدهای سازمانی",
      description:
        "واحدهای داخلی سازمان زیر شعبه‌ها برای چیدمان نیروی انسانی و مسئولیت",
      icon: Network,
      open: true,
    },
    {
      key: "bu",
      href: "/dashboard/organization/business-units",
      title: "واحد کسب‌وکار",
      description:
        "بخش‌بندی مدیریتی مستقل از ساختار حقوقی برای گزارش و کنترل عملکرد",
      icon: Layers,
      open: true,
    },
    {
      key: "hierarchy",
      href: "/dashboard/organization/hierarchies",
      title: "سلسله‌مراتب",
      description:
        "درخت روابط شرکت‌ها از نظر حقوقی، مدیریتی و مالیاتی",
      icon: Landmark,
      open: true,
    },
    {
      key: "ic",
      href: "/dashboard/organization/intercompany",
      title: "بین‌شرکتی",
      description:
        "تعریف شرکای گروه و قواعد ثبت معامله بین شرکت‌های یک سازمان",
      icon: ArrowLeftRight,
      open: true,
    },
    {
      key: "salesPurch",
      href: "/dashboard/organization/sales-purch",
      title: "فروش و خرید",
      description:
        "سازمان‌دهی مسیر فروش و خرید برای عملیات بازرگانی روزمره",
      icon: ShoppingCart,
      open: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="سازمان"
        description="ساختار سازمانی چندشرکتی: شرکت، شعبه، واحد، و ابعاد مدیریتی"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "سازمان" },
        ]}
      />

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال بارگذاری ساختار سازمان…
        </div>
      ) : null}

      {!isLoading && !primary && canViewCompany ? (
        <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          هنوز شرکت اصلی برای این مستأجر ثبت نشده است.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <HubCardView
            key={card.key}
            card={card}
            allowed={
              card.key === "branches"
                ? canViewBranch || canViewCompany
                : card.key === "departments"
                  ? canViewDept || canViewCompany
                  : canViewCompany
            }
          />
        ))}
      </div>
    </div>
  );
}
