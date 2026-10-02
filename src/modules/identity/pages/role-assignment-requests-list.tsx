/** Role assignment approval queue — dual-approval only (no create here) */

"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitPullRequestArrow, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  DataTable,
  type DataTableColumn,
} from "@/shared/components/data-display/data-table";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { ApiClientError } from "@/api";
import { usePermission } from "@/auth";
import { IdentityPermissions } from "../types";
import { useTenantUsers } from "../hooks/use-tenant-users";
import { useRoles } from "../hooks/use-roles";
import {
  roleAssignmentRequestService,
  type RoleAssignmentRequestDto,
} from "../services/role-assignment-request-service";

function shortId(id?: string | null): string {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export function RoleAssignmentRequestsListPage() {
  const canView = usePermission(IdentityPermissions.roleView);
  const canApprove = usePermission(IdentityPermissions.roleApprove);
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data: members = [] } = useTenantUsers("active");
  const { data: roles = [] } = useRoles();

  const userLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      const uid = String(m.user_id ?? "");
      if (!uid) continue;
      const name =
        m.user?.display_name ||
        [m.user?.first_name, m.user?.last_name].filter(Boolean).join(" ") ||
        m.user?.email ||
        m.user?.mobile ||
        shortId(uid);
      map.set(uid, name);
    }
    return map;
  }, [members]);

  const roleLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roles) {
      map.set(r.tenant_role_id, r.name || r.code || shortId(r.tenant_role_id));
    }
    return map;
  }, [roles]);

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["identity", "role-assignment-requests"],
    queryFn: () => roleAssignmentRequestService.listPending(),
    enabled: canView,
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => roleAssignmentRequestService.approve(id),
    onSuccess: () => {
      toast.success("درخواست تأیید شد و نقش اعمال شد");
      void qc.invalidateQueries({ queryKey: ["identity", "role-assignment-requests"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "تأیید ناموفق بود"),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => roleAssignmentRequestService.reject(id),
    onSuccess: () => {
      toast.success(
        "درخواست رد شد — برای اعمال دوباره باید از صفحه کاربر درخواست جدید ثبت شود"
      );
      void qc.invalidateQueries({ queryKey: ["identity", "role-assignment-requests"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "رد درخواست ناموفق بود"),
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((r) => {
      const u = userLabel.get(String(r.user_id ?? "")) ?? "";
      const role = roleLabel.get(String(r.tenant_role_id ?? "")) ?? "";
      return [u, role, r.reason, r.status, r.user_id, r.tenant_role_id].some((v) =>
        String(v ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, q, userLabel, roleLabel]);

  const columns: DataTableColumn<RoleAssignmentRequestDto>[] = [
    {
      id: "status",
      header: "وضعیت",
      cell: (r) => <StatusChip label={String(r.status ?? "PENDING")} tone="warning" />,
    },
    {
      id: "action",
      header: "نوع",
      cell: (r) => {
        const a = String(
          (r as { request_action?: string }).request_action ?? "GRANT"
        ).toUpperCase();
        const isRevoke = a === "REVOKE";
        return (
          <StatusChip
            label={isRevoke ? "برداشتن نقش" : "اعطای نقش"}
            tone={isRevoke ? "neutral" : "success"}
          />
        );
      },
    },
    {
      id: "user",
      header: "کاربر",
      cell: (r) => {
        const id = String(r.user_id ?? "");
        return (
          <div className="min-w-0">
            <div className="text-sm font-medium">{userLabel.get(id) ?? shortId(id)}</div>
          </div>
        );
      },
    },
    {
      id: "role",
      header: "نقش",
      cell: (r) => {
        const id = String(r.tenant_role_id ?? "");
        return (
          <div className="min-w-0">
            <div className="text-sm font-medium">{roleLabel.get(id) ?? shortId(id)}</div>
          </div>
        );
      },
    },
    {
      id: "reason",
      header: "دلیل",
      cell: (r) => (
        <span className="line-clamp-2 max-w-[220px] text-xs">{r.reason ?? "—"}</span>
      ),
    },
    {
      id: "actions",
      header: "عملیات",
      cell: (r) =>
        canApprove ? (
          <div className="flex flex-wrap gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={approveMut.isPending}
              onClick={() => void approveMut.mutateAsync(r.request_id)}
            >
              تأیید
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              disabled={rejectMut.isPending}
              onClick={() => void rejectMut.mutateAsync(r.request_id)}
            >
              رد
            </Button>
          </div>
        ) : (
          "—"
        ),
    },
  ];

  if (!canView) {
    return (
      <div className="space-y-4">
        <PageHeader title="تأیید تخصیص نقش" description="مجوز مشاهده ندارید." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="تأیید تخصیص نقش"
        description="فقط صف تأیید/رد درخواست‌هایی که از صفحه کاربر ثبت شده‌اند. از اینجا درخواست جدید ساخته نمی‌شود."
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "تأیید تخصیص نقش" },
        ]}
        icon={<GitPullRequestArrow className="h-5 w-5" />}
      />

      <div className="relative min-w-[200px] max-w-sm">
        <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجو نام کاربر یا نقش…"
          className="ps-8 h-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال بارگذاری…
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {error instanceof ApiClientError ? error.message : "خطا در بارگذاری"}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          getRowKey={(r) => r.request_id}
          isFiltered={q.trim().length > 0}
          emptyTitle="درخواست در انتظاری وجود ندارد."
          emptySearchTitle="نتیجه‌ای پیدا نشد."
        />
      )}
    </div>
  );
}
