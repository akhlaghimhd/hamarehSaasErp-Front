"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { MemberCreateDrawer } from "../components/member-create-drawer";

/**
 * Members list — Add User opens MemberCreateDrawer (Sheet).
 * Full data-table: copy members-list-impl.FIXED.tsx from project artifacts over this file.
 */
export function MembersListPage() {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <PageHeader
        title="کاربران سازمان"
        description="با دکمه افزودن، فرم به‌صورت دراور باز می‌شود"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "کاربران" },
        ]}
        actions={
          <Button
            type="button"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            افزودن کاربر
          </Button>
        }
      />

      <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">دراور افزودن کاربر فعال است.</p>
        <p className="mt-2">
          برای جدول کامل، فایل members-list-impl.FIXED.tsx از artifacts پروژه را روی این فایل کپی کنید.
        </p>
      </div>

      <MemberCreateDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
