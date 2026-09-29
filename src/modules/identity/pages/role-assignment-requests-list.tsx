/** Role assignment approval queue — ID-W3-02 FE */

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
import {
  roleAssignmentRequestService,
  type RoleAssignmentRequestDto,
} from "../services/role-assignment-request-service";

export function RoleAssignmentRequestsListPage() {
  const canView = usePermission(IdentityPermissions.roleView);
  const canAssign = usePermission(IdentityPermissions.roleAssign);
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["identity", "role-assignment-requests"],
    queryFn: () => roleAssignmentRequestService.listPending(),
    enabled: canView,
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => roleAssignmentRequestService.approve(id),
    onSuccess: () => {
      toast.success("درخواست تخصیص نقش تأیید شد");
      void qc.invalidateQueries({ queryKey: ["identity", "role-assignment-requests"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "تأیید ناموفق بود"),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => roleAssignmentRequestService.reject(id),
    onSuccess: () => {
      toast.success("درخواست رد شد");
      void qc.invalidateQueries({ queryKey: ["identity", "role-assignment-requests"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "رد درخواست ناموفق بود"),
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((r) =>
      [r.user_id, r.tenant_role_id, r.reason, r.status].some((v) =>
        String(v ?? "").toLowerCase().includes(term)
      )
    );
  }, [data, q]);

  const columns: DataTableColumn<RoleAssignmentRequestDto>[] = [
    {
      id: "status",
      header: "وضعیت",
      cell: (r) => (
        <StatusChip label={String(r.status ?? "PENDING")} tone="warning" />
      ),
    },
    {
      id: "user",
      header: "کاربر",
      cell: (r) => (
        <span dir="ltr" className="font-mono text-[11px]">
          {String(r.user_id ?? "—").slice(0, 8)}…
        </span>
      ),
    },
    {
      id: "role",
      header: "نقش",
      cell: (r) => (
        <span dir="ltr" className="font-mono text-[11px]">
          {String(r.tenant_role_id ?? "—").slice(0, 8)}…
        </span>
      ),
    },
    {
      id: "window",
      header: "اعتبار",
      cell: (r) =>
        r.valid_from || r.valid_to ? (
          <span dir="ltr" className="text-[11px] tabular-nums">
            {String(r.valid_from ?? "").slice(0, 10)} → {String(r.valid_to ?? "").slice(0, 10)}
          </span>
        ) : (
          "—"
        ),
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
        canAssign ? (
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
        description="درخواست‌های در انتظار تأیید برای تخصیص نقش"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "تأیید تخصیص نقش" },
        ]}
        icon={<GitPullRequestArrow className="h-5 w-5" />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو…"
            className="ps-8 h-9"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          بروزرسانی
        </Button>
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
