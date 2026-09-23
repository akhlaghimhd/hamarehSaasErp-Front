/**
 * FE-ORG — Organization module hub
 *
 * Product rule: the primary company is created at tenant onboarding.
 * - «شرکت‌ها» always opens the list (never auto-redirect to one company).
 * - «شعب» / «واحدها» deep-link to the primary company when known.
 */

"use client";

import Link from "next/link";
import { Building2, GitBranch, Network, Loader2 } from "lucide-react";
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

  /** Oldest company acts as primary HQ for deep-links until explicit is_primary exists. */
  const primary = (() => {
    const list = companies ?? [];
    if (list.length === 0) return null;
    const sorted = [...list].sort((a, b) =>
      String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""))
    );
    return sorted[0] ?? null;
  })();

  const companyCount = companies?.length ?? 0;

  // Always the list — never skip to a single company detail.
  const companyHref = "/dashboard/organization/companies";

  const branchesHref = primary
    ? `/dashboard/organization/companies/${primary.company_id}#branches`
    : "/dashboard/organization/companies";

  const deptsHref = primary
    ? `/dashboard/organization/companies/${primary.company_id}#departments`
    : "/dashboard/organization/companies";

  const cards: HubCard[] = [
    {
      key: "companies",
      href: companyHref,
      title: "شرکت‌ها",
      description:
        companyCount > 0
          ? `فهرست ${companyCount} شرکت — شرکت اصلی و شرکت‌های فرعی`
          : "شرکت اصلی هنگام عضویت در پلتفرم ثبت می‌شود؛ در صورت نیاز شرکت فرعی اضافه کنید",
      icon: Building2,
      open: true,
    },
    {
      key: "branches",
      href: branchesHref,
      title: "شعب",
      description: primary
        ? `شعب «${primary.name}» را از صفحه همان شرکت مدیریت کنید`
        : "پس از وجود شرکت اصلی، شعب از صفحه جزئیات شرکت تعریف می‌شوند",
      icon: GitBranch,
      open: true,
    },
    {
      key: "departments",
      href: deptsHref,
      title: "واحدهای سازمانی",
      description: primary
        ? `واحدهای «${primary.name}» زیر نظر شعب همان شرکت`
        : "واحد سازمانی زیر نظر شعبه و شرکت تعریف می‌شود",
      icon: Network,
      open: true,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="سازمان"
        description="ساختار سازمانی: شرکت، شعبه و واحد سازمانی — شرکت اصلی از هویت سازمانی هنگام عضویت می‌آید"
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
          هنوز شرکت اصلی برای این مستأجر ثبت نشده است. در حالت عادی شرکت
          حقوقی هنگام عضویت در پلتفرم ساخته می‌شود. برای محیط آزمایشی سیدر
          مالک دمو را اجرا کنید یا یک شرکت ثبت نمایید.
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
