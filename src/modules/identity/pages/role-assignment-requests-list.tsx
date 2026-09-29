/** Role assignment approval queue — ID-W3-02 FE */

"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitPullRequestArrow, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  DataTable,
  type DataTableColumn,
} from "@/shared/components/data-display/data-table";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
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
  const canAssign = usePermission(IdentityPermissions.roleAssign);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [reason, setReason] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");

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

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["identity", "role-assignment-requests"],
    queryFn: () => roleAssignmentRequestService.listPending(),
    enabled: canView,
  });

  const createMut = useMutation({
    mutationFn: () =>
      roleAssignmentRequestService.create({
        user_id: userId,
        tenant_role_id: roleId,
        reason: reason.trim() || null,
        valid_from: validFrom || null,
        valid_to: validTo || null,
      }),
    onSuccess: () => {
      toast.success("درخواست ثبت شد");
      setCreateOpen(false);
      setUserId("");
      setRoleId("");
      setReason("");
      setValidFrom("");
      setValidTo("");
      void qc.invalidateQueries({ queryKey: ["identity", "role-assignment-requests"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "ثبت درخواست ناموفق بود"),
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
      id: "user",
      header: "کاربر",
      cell: (r) => {
        const id = String(r.user_id ?? "");
        return (
          <div className="min-w-0">
            <div className="text-sm font-medium">{userLabel.get(id) ?? shortId(id)}</div>
            <div dir="ltr" className="font-mono text-[10px] text-muted-foreground">
              {shortId(id)}
            </div>
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
            <div dir="ltr" className="font-mono text-[10px] text-muted-foreground">
              {shortId(id)}
            </div>
          </div>
        );
      },
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
        actions={
          canAssign ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              درخواست جدید
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو نام کاربر یا نقش…"
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>درخواست تخصیص نقش</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rar-user">کاربر</Label>
              <select
                id="rar-user"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={createMut.isPending}
              >
                <option value="">انتخاب کاربر…</option>
                {members.map((m) => {
                  const uid = String(m.user_id ?? "");
                  if (!uid) return null;
                  return (
                    <option key={uid} value={uid}>
                      {userLabel.get(uid) ?? shortId(uid)}
                    </option>
                  );
                })}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rar-role">نقش</Label>
              <select
                id="rar-role"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                disabled={createMut.isPending}
              >
                <option value="">انتخاب نقش…</option>
                {roles.map((r) => (
                  <option key={r.tenant_role_id} value={r.tenant_role_id}>
                    {r.name || r.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="rar-from">از تاریخ (اختیاری)</Label>
                <Input
                  id="rar-from"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  disabled={createMut.isPending}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rar-to">تا تاریخ (اختیاری)</Label>
                <Input
                  id="rar-to"
                  type="date"
                  value={validTo}
                  onChange={(e) => setValidTo(e.target.value)}
                  disabled={createMut.isPending}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rar-reason">دلیل</Label>
              <Input
                id="rar-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="اختیاری"
                disabled={createMut.isPending}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={createMut.isPending}
              onClick={() => setCreateOpen(false)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={createMut.isPending || !userId || !roleId}
              onClick={() => void createMut.mutateAsync()}
            >
              {createMut.isPending ? (
                <>
                  <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                  در حال ثبت…
                </>
              ) : (
                "ثبت درخواست"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
