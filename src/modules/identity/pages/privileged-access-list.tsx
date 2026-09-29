/** Privileged / Emergency access grants — ID-W2-02 FE */

"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search, ShieldAlert } from "lucide-react";
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
  privilegedAccessService,
  type PrivilegedGrantDto,
} from "../services/privileged-access-service";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "در انتظار",
  APPROVED: "تأیید شده",
  ACTIVE: "فعال",
  DENIED: "رد شده",
  REVOKED: "لغو شده",
  EXPIRED: "منقضی",
};

export function PrivilegedAccessListPage() {
  const canView = usePermission(IdentityPermissions.privilegedView);
  const canApprove = usePermission(IdentityPermissions.privilegedApprove);
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["identity", "privileged-access"],
    queryFn: () => privilegedAccessService.list(),
    enabled: canView,
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => privilegedAccessService.approve(id),
    onSuccess: () => {
      toast.success("درخواست تأیید شد");
      void qc.invalidateQueries({ queryKey: ["identity", "privileged-access"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "تأیید ناموفق بود"),
  });

  const denyMut = useMutation({
    mutationFn: (id: string) => privilegedAccessService.deny(id),
    onSuccess: () => {
      toast.success("درخواست رد شد");
      void qc.invalidateQueries({ queryKey: ["identity", "privileged-access"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "رد درخواست ناموفق بود"),
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => privilegedAccessService.revoke(id),
    onSuccess: () => {
      toast.success("دسترسی لغو شد");
      void qc.invalidateQueries({ queryKey: ["identity", "privileged-access"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "لغو ناموفق بود"),
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((r) =>
      [r.status, r.reason, r.user_id, r.tenant_role_id].some((v) =>
        String(v ?? "").toLowerCase().includes(term)
      )
    );
  }, [data, q]);

  const columns: DataTableColumn<PrivilegedGrantDto>[] = [
    {
      id: "status",
      header: "وضعیت",
      cell: (r) => (
        <StatusChip
          label={STATUS_LABEL[String(r.status ?? "")] ?? String(r.status ?? "—")}
          tone={
            r.status === "ACTIVE" || r.status === "APPROVED"
              ? "success"
              : r.status === "PENDING"
                ? "warning"
                : "neutral"
          }
        />
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
      id: "reason",
      header: "دلیل",
      cell: (r) => (
        <span className="line-clamp-2 max-w-[240px] text-xs">{r.reason ?? "—"}</span>
      ),
    },
    {
      id: "window",
      header: "بازه",
      cell: (r) =>
        r.starts_at || r.ends_at ? (
          <span dir="ltr" className="text-[11px] tabular-nums">
            {String(r.starts_at ?? "").slice(0, 16)} → {String(r.ends_at ?? "").slice(0, 16)}
          </span>
        ) : (
          "—"
        ),
    },
    {
      id: "actions",
      header: "عملیات",
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {canApprove && r.status === "PENDING" ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={approveMut.isPending}
                onClick={() => void approveMut.mutateAsync(r.grant_id)}
              >
                تأیید
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                disabled={denyMut.isPending}
                onClick={() => void denyMut.mutateAsync(r.grant_id)}
              >
                رد
              </Button>
            </>
          ) : null}
          {canApprove && (r.status === "ACTIVE" || r.status === "APPROVED") ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={revokeMut.isPending}
              onClick={() => void revokeMut.mutateAsync(r.grant_id)}
            >
              لغو
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  if (!canView) {
    return (
      <div className="space-y-4">
        <PageHeader title="دسترسی اضطراری" description="مجوز مشاهده ندارید." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="دسترسی اضطراری (Privileged Access)"
        description="درخواست‌ها و گرنت‌های زمان‌دار نقش‌های حساس"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "دسترسی اضطراری" },
        ]}
        icon={<ShieldAlert className="h-5 w-5" />}
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
        <DataTable columns={columns} data={rows} emptyMessage="درخواستی ثبت نشده است." />
      )}
    </div>
  );
}
