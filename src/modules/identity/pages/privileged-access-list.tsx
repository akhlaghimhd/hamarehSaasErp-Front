/** Privileged / Emergency access grants — ID-W2-02 FE */

"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search, ShieldAlert } from "lucide-react";
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

function shortId(id?: string | null): string {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export function PrivilegedAccessListPage() {
  const canView = usePermission(IdentityPermissions.privilegedView);
  const canApprove = usePermission(IdentityPermissions.privilegedApprove);
  const canRequest = usePermission(IdentityPermissions.privilegedRequest);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [reason, setReason] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");

  const { data: members = [] } = useTenantUsers("active");
  const { data: roles = [] } = useRoles();

  const privilegedRoles = useMemo(() => {
    const flagged = roles.filter((r) => Boolean(r.is_privileged));
    return flagged.length > 0 ? flagged : roles;
  }, [roles]);

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
    queryKey: ["identity", "privileged-access"],
    queryFn: () => privilegedAccessService.list(),
    enabled: canView,
  });

  const requestMut = useMutation({
    mutationFn: () =>
      privilegedAccessService.request({
        user_id: userId,
        tenant_role_id: roleId,
        reason: reason.trim(),
        duration_minutes: Math.max(5, Math.min(480, Number(durationMinutes) || 60)),
      }),
    onSuccess: () => {
      toast.success("درخواست دسترسی اضطراری ثبت شد");
      setCreateOpen(false);
      setUserId("");
      setRoleId("");
      setReason("");
      setDurationMinutes("60");
      void qc.invalidateQueries({ queryKey: ["identity", "privileged-access"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "ثبت درخواست ناموفق بود"),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => privilegedAccessService.approve(id),
    onSuccess: () => {
      toast.success("درخواست تأیید و فعال شد");
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
    return data.filter((r) => {
      const u = userLabel.get(String(r.user_id ?? "")) ?? "";
      const role = roleLabel.get(String(r.tenant_role_id ?? "")) ?? "";
      return [u, role, r.status, r.reason, r.user_id, r.tenant_role_id].some((v) =>
        String(v ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, q, userLabel, roleLabel]);

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
      id: "duration",
      header: "مدت (دقیقه)",
      cell: (r) => (
        <span className="tabular-nums text-xs">{r.duration_minutes ?? "—"}</span>
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
          {canApprove && r.status === "ACTIVE" ? (
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
        actions={
          canRequest || canApprove ? (
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
          getRowKey={(r) => r.grant_id}
          isFiltered={q.trim().length > 0}
          emptyTitle="درخواستی ثبت نشده است."
          emptySearchTitle="نتیجه‌ای پیدا نشد."
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>درخواست دسترسی اضطراری</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pa-user">کاربر</Label>
              <select
                id="pa-user"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={requestMut.isPending}
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
              <Label htmlFor="pa-role">نقش ممتاز</Label>
              <select
                id="pa-role"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                disabled={requestMut.isPending}
              >
                <option value="">انتخاب نقش…</option>
                {privilegedRoles.map((r) => (
                  <option key={r.tenant_role_id} value={r.tenant_role_id}>
                    {r.name || r.code}
                    {r.is_privileged ? " (ممتاز)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground">
                فقط نقش‌هایی که is_privileged دارند از سمت سرور پذیرفته می‌شوند.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pa-duration">مدت (دقیقه، حداکثر ۴۸۰)</Label>
              <Input
                id="pa-duration"
                type="number"
                min={5}
                max={480}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                disabled={requestMut.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pa-reason">دلیل (حداقل ۵ کاراکتر)</Label>
              <Input
                id="pa-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: رفع حادثه تولید…"
                disabled={requestMut.isPending}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={requestMut.isPending}
              onClick={() => setCreateOpen(false)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={
                requestMut.isPending ||
                !userId ||
                !roleId ||
                reason.trim().length < 5
              }
              onClick={() => void requestMut.mutateAsync()}
            >
              {requestMut.isPending ? (
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
