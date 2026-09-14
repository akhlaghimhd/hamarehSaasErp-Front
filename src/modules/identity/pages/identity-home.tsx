/**
 * FE-P1-T01 — Identity module landing (hub for upcoming membership/roles UI).
 */

"use client";

import Link from "next/link";
import { UserRound, Users, Shield, KeyRound, Scan } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Can } from "@/auth";
import { IdentityPermissions } from "../types";

const cards = [
  {
    href: "/dashboard/identity/me",
    title: "پروفایل من",
    description: "ویرایش اطلاعات تکمیلی حساب",
    icon: UserRound,
    open: true as const,
  },
  {
    href: "/dashboard/identity/members",
    title: "اعضای مستأجر",
    description: "اسپرینت ۲ — لیست و مدیریت اعضا",
    icon: Users,
    permission: IdentityPermissions.userView,
    open: false as const,
  },
  {
    href: "/dashboard/identity/roles",
    title: "نقش‌ها",
    description: "اسپرینت ۳ — نقش و تخصیص مجوز",
    icon: Shield,
    permission: IdentityPermissions.roleView,
    open: false as const,
  },
  {
    href: "/dashboard/identity/permissions",
    title: "مجوزها",
    description: "اسپرینت ۳ — فهرست مجوزها",
    icon: KeyRound,
    permission: IdentityPermissions.permissionView,
    open: false as const,
  },
  {
    href: "/dashboard/identity/scopes",
    title: "Scope",
    description: "اسپرینت ۴ — محدوده دسترسی",
    icon: Scan,
    permission: IdentityPermissions.scopeView,
    open: false as const,
  },
];

export function IdentityHome() {
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
        {cards.map((card) => {
          const Icon = card.icon;
          const body = (
            <div
              className={
                card.open
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
              {!card.open && (
                <span className="mt-auto text-[10px] text-muted-foreground">به‌زودی</span>
              )}
            </div>
          );

          if (!card.open) {
            return (
              <div key={card.href}>
                {"permission" in card && card.permission ? (
                  <Can permission={card.permission} fallback={body}>
                    {body}
                  </Can>
                ) : (
                  body
                )}
              </div>
            );
          }

          return (
            <Link key={card.href} href={card.href} className="block">
              {body}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
