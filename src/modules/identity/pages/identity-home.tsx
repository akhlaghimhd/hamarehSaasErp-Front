/**
 * FE-P1 — Identity module landing hub.
 * Open features: profile, members. Sprint 3/4 cards stay «به‌زودی».
 */

"use client";

import Link from "next/link";
import { UserRound, Users, Shield, KeyRound, Scan } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { usePermission } from "@/auth";
import { IdentityPermissions } from "../types";

type HubCard = {
  href: string;
  title: string;
  description: string;
  icon: typeof UserRound;
  open: boolean;
  permission?: string;
};

const cards: HubCard[] = [
  {
    href: "/dashboard/identity/me",
    title: "پروفایل من",
    description: "ویرایش اطلاعات تکمیلی حساب",
    icon: UserRound,
    open: true,
  },
  {
    href: "/dashboard/identity/members",
    title: "اعضای مستأجر",
    description: "لیست و مدیریت اعضای مستأجر",
    icon: Users,
    permission: IdentityPermissions.userView,
    open: true,
  },
  {
    href: "/dashboard/identity/roles",
    title: "نقش‌ها",
    description: "اسپرینت ۳ — نقش و تخصیص مجوز",
    icon: Shield,
    permission: IdentityPermissions.roleView,
    open: false,
  },
  {
    href: "/dashboard/identity/permissions",
    title: "مجوزها",
    description: "اسپرینت ۳ — فهرست مجوزها",
    icon: KeyRound,
    permission: IdentityPermissions.permissionView,
    open: false,
  },
  {
    href: "/dashboard/identity/scopes",
    title: "Scope",
    description: "اسپرینت ۴ — محدوده دسترسی",
    icon: Scan,
    permission: IdentityPermissions.scopeView,
    open: false,
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
          نیاز به مجوز: {card.permission}
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

export function IdentityHome() {
  const canViewUsers = usePermission(IdentityPermissions.userView);
  const canViewRoles = usePermission(IdentityPermissions.roleView);
  const canViewPermissions = usePermission(IdentityPermissions.permissionView);
  const canViewScopes = usePermission(IdentityPermissions.scopeView);

  const allowedByHref: Record<string, boolean> = {
    "/dashboard/identity/me": true,
    "/dashboard/identity/members": canViewUsers,
    "/dashboard/identity/roles": canViewRoles,
    "/dashboard/identity/permissions": canViewPermissions,
    "/dashboard/identity/scopes": canViewScopes,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="هویت و دسترسی"
        description="پروفایل، اعضا، نقش‌ها، مجوزها و Scope در سطح مستأجر"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی" },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <HubCardView
            key={card.href}
            card={card}
            allowed={allowedByHref[card.href] ?? true}
          />
        ))}
      </div>

      {!canViewUsers ? (
        <p className="text-xs text-muted-foreground">
          برای باز شدن «اعضای مستأجر» نقش شما باید مجوز{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[11px]" dir="ltr">
            identity.user.view
          </code>{" "}
          داشته باشد (در JWT / security_context.permissions).
        </p>
      ) : null}
    </div>
  );
}
