/**
 * FE-P0 — Organization module placeholder (next priority after Foundation).
 * Demonstrates PageHeader + Breadcrumb + EmptyState + Can patterns.
 */

"use client";

import { Building2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Can } from "@/auth";

export function OrganizationHome() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="سازمان"
        description="شرکت، شعبه و واحد سازمانی — اسکلت ماژول برای توسعه بعدی"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "سازمان" },
        ]}
      />
      <Can
        permission="organization.view"
        fallback={
          <EmptyState
            icon={Building2}
            title="دسترسی ندارید"
            description="برای مشاهده ساختار سازمانی به مجوز organization.view نیاز است."
          />
        }
      >
        <EmptyState
          icon={Building2}
          title="ماژول سازمان آماده اتصال است"
          description="پس از تکمیل APIهای Layer 5 Organization، لیست شرکت/شعبه/واحد اینجا نمایش داده می‌شود."
        />
      </Can>
    </div>
  );
}
