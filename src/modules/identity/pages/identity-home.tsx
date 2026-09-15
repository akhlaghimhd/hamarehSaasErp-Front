/**
 * FE-P1 — صفحه اصلی هویت و دسترسی
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
};

const cards: HubCard[] = [
  {
    href: "/dashboard/identity/me",
    title: "پروفایل من",
    description: "مشاهده و ویرایش اطلاعات حساب کاربری",
    icon: UserRound,
    open: true,
  },
  {
    href: "/dashboard/identity/members",
    title: "کاربران سازمان",
    description: "افزودن و مدیریت اعضای سازمان",
    icon: Users,
    open: true,
  },
  {
    href: "/dashboard/identity/roles",
    title: "نقش‌ها",
    description: "تعریف نقش و تعیین سطح دسترسی",
    icon: Shield,
    open: true,
  },
  {
    href: "/dashboard/identity/permissions",
    title: "مجوزها",
    description: "فهرست دسترسی‌های قابل تخصیص در سازمان",
    icon: KeyRound,
    open: true,
  },
  {
    href: "/dashboard/identity/scopes",
    title: "محدوده دسترسی",
    description: "تعیین محدوده کار مثل شعبه یا واحد سازمانی",
    icon: Scan,
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
        description="مدیریت حساب کاربری، اعضای سازمان، نقش‌ها، مجوزها و محدوده دسترسی"
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
    </div>
  );
}
