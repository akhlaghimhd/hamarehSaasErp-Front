"use client";

import { useState } from "react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { usePermission } from "@/auth";
import { useTenantUsers } from "../hooks/use-tenant-users";
import { IdentityPermissions } from "../types";
import { MembersCompanyFilter } from "../components/members-company-filter";
import type { MembershipListFilter } from "../services/tenant-user-service";
import { MSG_NO_ACCESS } from "../lib/ui-copy";
import { Users } from "lucide-react";

/**
 * Temporary minimal restore after accidental wipe.
 * Full UI is in artifacts/members-list-impl.CRITICAL-RESTORE.tsx — will be restored next.
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
        <MembersCompanyFilter
          value={companyFilter}
          onChange={(v) => setCompanyFilter(v)}
        />
        <button type="button" className="h-8 rounded border px-3 text-sm" onClick={() => void refetch()}>
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
              <tr className="border-b bg-muted/40 text-start">
                <th className="p-2 text-start">نام</th>
                <th className="p-2 text-start">ایمیل</th>
                <th className="p-2 text-start">موبایل</th>
                <th className="p-2 text-start">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.tenant_user_id ?? r.user_id} className="border-b">
                  <td className="p-2">{(r as { display_name?: string }).display_name || (r as { full_name?: string }).full_name || "—"}</td>
                  <td className="p-2">{r.email || "—"}</td>
                  <td className="p-2">{(r as { mobile?: string }).mobile || "—"}</td>
                  <td className="p-2">{r.status === 1 || (r as { status_code?: string }).status_code === "active" ? "فعال" : "غیرفعال"}</td>
                </tr>
              ))}
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
