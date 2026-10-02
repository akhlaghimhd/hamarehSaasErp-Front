"use client";

import { useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/shared/components/layout/page-header";
import { usePermission } from "@/auth";
import { useTenantUsers } from "../hooks/use-tenant-users";
import { IdentityPermissions } from "../types";
import { MembersCompanyFilter } from "../components/members-company-filter";
import type { MembershipListFilter } from "../services/tenant-user-service";
import { MSG_NO_ACCESS } from "../lib/ui-copy";
import { memberDetailPath } from "../lib/member-ref";
import { Users } from "lucide-react";

/**
 * Temporary members list after accidental wipe of full UI.
 * Full DataTable UI: artifacts/members-list-impl.CRITICAL-RESTORE.tsx
 */
export function MembersListPage() {
  const canView = usePermission(IdentityPermissions.userView);
  const [membershipFilter, setMembershipFilter] = useState<MembershipListFilter>("active");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const { data, isLoading, isError, error, refetch } = useTenantUsers(
    membershipFilter,
    companyFilter !== "all" ? { companyId: companyFilter } : undefined
  );
  const rows = data ?? [];

  if (!canView) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{MSG_NO_ACCESS}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <PageHeader title="کاربران سازمان" description="فهرست اعضای مستأجر" icon={Users} />
      <div className="flex flex-wrap gap-2">
        <select
          className="h-8 rounded border px-2 text-sm"
          value={membershipFilter}
          onChange={(e) => setMembershipFilter(e.target.value as MembershipListFilter)}
        >
          <option value="active">کاربران جاری</option>
          <option value="deleted">کاربران حذف‌شده</option>
        </select>
        <MembersCompanyFilter value={companyFilter} onChange={(v) => setCompanyFilter(v)} />
        <button
          type="button"
          className="h-8 rounded border px-3 text-sm"
          onClick={() => void refetch()}
        >
          تازه‌سازی
        </button>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
      ) : isError ? (
        <p className="text-sm text-destructive">{String((error as Error)?.message ?? "خطا")}</p>
      ) : (
        <div className="overflow-auto rounded border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="p-2 text-start">نام</th>
                <th className="p-2 text-start">ایمیل</th>
                <th className="p-2 text-start">موبایل</th>
                <th className="p-2 text-start">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const name =
                  r.user?.display_name ||
                  [r.user?.first_name, r.user?.last_name].filter(Boolean).join(" ") ||
                  "—";
                return (
                  <tr key={r.tenant_user_id} className="border-b">
                    <td className="p-2">
                      <Link
                        href={memberDetailPath(r.tenant_user_id)}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {name}
                      </Link>
                    </td>
                    <td className="p-2">{r.user?.email || "—"}</td>
                    <td className="p-2">{r.user?.mobile || "—"}</td>
                    <td className="p-2">{r.status === 1 ? "فعال" : "غیرفعال"}</td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-muted-foreground">
                    عضوی یافت نشد
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
