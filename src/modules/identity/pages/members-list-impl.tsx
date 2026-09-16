"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { MemberCreateDrawer } from "../components/member-create-drawer";

/**
 * Temporary stub. Restore full list with:
 * git show 44e43d9b5950bb5615fe82112929e6323e90b72e:src/modules/identity/pages/members-list-impl.tsx > src/modules/identity/pages/members-list-impl.tsx
 * Or copy artifacts/MEMBERS_LIST_FULL_RESTORE.tsx over this file.
 */
export function MembersListPage() {
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <PageHeader
        title="کاربران سازمان"
        description="فهرست کامل را از کامیت 44e43d9 بازیابی کنید (دستور در کامنت بالای فایل)"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "کاربران" },
        ]}
        actions={
          <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />افزودن کاربر
          </Button>
        }
      />
      <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
        برای بازگرداندن جدول کامل، در ریشه فرانت اجرا کنید:
        <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-start text-xs dir-ltr">
{`git show 44e43d9b5950bb5615fe82112929e6323e90b72e:src/modules/identity/pages/members-list-impl.tsx > src/modules/identity/pages/members-list-impl.tsx`}
        </pre>
        سپس import و MemberCreateDrawer را طبق نسخهٔ artifacts/MEMBERS_LIST_FULL_RESTORE.tsx اضافه کنید،
        یا همان فایل READY را جایگزین کنید.
      </div>
      <MemberCreateDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
