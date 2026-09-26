/**
 * TEMPORARY RECOVERY STUB
 * Full file was briefly corrupted during tree-view push.
 * Restore the real page with:
 *   git fetch origin
 *   git checkout 4fa553d90584dbe656d70e8a71f257d742e1c565 -- src/modules/organization/pages/hierarchies-list.tsx
 * Tree-view helpers already exist: hierarchies-tree-helpers.tsx
 * Full tree-view version saved in project artifacts as hierarchies-list.WITH-TREE-VIEW.tsx
 */
"use client";

import { Network } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import Link from "next/link";

export function HierarchiesListPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="سلسله‌مراتب"
        description="بازیابی فایل"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "سلسله‌مراتب" },
        ]}
        icon={<Network className="h-4 w-4" />}
      />
      <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-6 text-sm leading-relaxed">
        <p className="font-medium">فایل این صفحه موقتاً نیاز به بازیابی از گیت دارد.</p>
        <p className="mt-2 text-muted-foreground">
          در پوشه فرانت این دستور را بزنید تا نسخهٔ پایدار قبل از نمای درختی برگردد:
        </p>
        <pre className="mt-3 overflow-auto rounded-lg bg-muted p-3 text-xs" dir="ltr">
{`git fetch origin
git checkout 4fa553d90584dbe656d70e8a71f257d742e1c565 -- src/modules/organization/pages/hierarchies-list.tsx
git add src/modules/organization/pages/hierarchies-list.tsx
git status`}
        </pre>
        <p className="mt-3 text-muted-foreground">
          سپس با کانکتور گیت‌هاب همان فایل را روی main پوش کنید (طبق روال پروژه).
        </p>
        <div className="mt-4">
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/organization">بازگشت به سازمان</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
