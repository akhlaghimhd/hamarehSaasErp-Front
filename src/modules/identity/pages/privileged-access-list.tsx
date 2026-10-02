/** Privileged / Emergency access grants — list UX aligned with members list */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown, ArrowUp, ArrowUpDown, Check, Loader2, Plus, Search,
  ShieldAlert, X as XIcon, Ban, Undo2, Clock, RotateCcw, Pencil, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { ApiClientError } from "@/api";
import { usePermission } from "@/auth";
import { cn, toFaDigits, formatJalaliDateTime } from "@/shared/lib/utils";
import { IdentityPermissions } from "../types";
import { useTenantUsers } from "../hooks/use-tenant-users";
import { useRoles } from "../hooks/use-roles";
import {
  privilegedAccessService,
  type PrivilegedGrantDto,
} from "../services/privileged-access-service";
import { MSG_LOAD_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import { PrivilegedRequestSheet } from "../components/privileged-request-sheet";

type StatusFilter = "all" | "PENDING" | "ACTIVE" | "DENIED" | "REVOKED" | "EXPIRED";
type SortKey = "status" | "user" | "role" | "duration" | "created" | "ends";
type SortDir = "asc" | "desc";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "در انتظار", APPROVED: "تأیید شده", ACTIVE: "فعال",
  DENIED: "رد شده", REVOKED: "لغو شده", EXPIRED: "منقضی",
};
const STATUS_FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "همه وضعیت‌ها" },
  { value: "PENDING", label: "در انتظار" },
  { value: "ACTIVE", label: "فعال" },
  { value: "DENIED", label: "رد شده" },
  { value: "REVOKED", label: "لغو شده" },
  { value: "EXPIRED", label: "منقضی" },
];

function shortId(id?: string | null): string {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}
function statusTone(status?: string | null): "success" | "warning" | "danger" | "neutral" {
  switch (String(status ?? "").toUpperCase()) {
    case "ACTIVE": case "APPROVED": return "success";
    case "PENDING": return "warning";
    case "DENIED": case "REVOKED": return "danger";
    default: return "neutral";
  }
}
function fmtDt(v?: string | null): string {
  return formatJalaliDateTime(v);
}

export function PrivilegedAccessListPage() {
  const canView = usePermission(IdentityPermissions.privilegedView);
  const canApprove = usePermission(IdentityPermissions.privilegedApprove);
  const canRequest = usePermission(IdentityPermissions.privilegedRequest);
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillUserId = searchParams.get("requestUserId") || searchParams.get("userId") || "";

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [lockedPrefillUserId, setLockedPrefillUserId] = useState<string | null>(null);
  const [extendMinutes, setExtendMinutes] = useState("60");
  const [editRoleId, setEditRoleId] = useState("");
  const [editReason, setEditReason] = useState("");
  const [editDuration, setEditDuration] = useState("60");
  const [confirm, setConfirm] = useState<{
    kind: "approve" | "deny" | "revoke" | "extend" | "reactivate" | "edit";
    targets: PrivilegedGrantDto[];
  } | null>(null);

  useEffect(() => {
    if (prefillUserId) {
      setLockedPrefillUserId(prefillUserId);
      setCreateOpen(true);
    }
  }, [prefillUserId]);

  const { data: members = [] } = useTenantUsers("active");
  const { data: roles = [] } = useRoles();
  const privilegedRoles = useMemo(
    () => roles.filter((r) => Boolean(r.is_privileged) && Number(r.status) === 1),
    [roles]
  );

  const userLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      const uid = String(m.user_id ?? "");
      if (!uid) continue;
      map.set(
        uid,
        m.user?.display_name ||
          [m.user?.first_name, m.user?.last_name].filter(Boolean).join(" ") ||
          m.user?.email ||
          m.user?.mobile ||
          shortId(uid)
      );
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

  const { data = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["identity", "privileged-access", statusFilter],
    queryFn: () =>
      privilegedAccessService.list(statusFilter === "all" ? undefined : statusFilter),
    enabled: canView,
  });

  const approveMut = useMutation({ mutationFn: (id: string) => privilegedAccessService.approve(id) });
  const denyMut = useMutation({ mutationFn: (id: string) => privilegedAccessService.deny(id) });
  const revokeMut = useMutation({ mutationFn: (id: string) => privilegedAccessService.revoke(id) });
  const extendMut = useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number }) =>
      privilegedAccessService.extend(id, minutes),
  });
  const reactivateMut = useMutation({
    mutationFn: (args: {
      id: string;
      duration_minutes: number;
      tenant_role_id?: string;
      reason?: string;
    }) =>
      privilegedAccessService.reactivate(args.id, {
        duration_minutes: args.duration_minutes,
        tenant_role_id: args.tenant_role_id,
        reason: args.reason,
      }),
  });
  const updateMut = useMutation({
    mutationFn: (args: {
      id: string;
      tenant_role_id?: string;
      duration_minutes?: number;
      reason?: string;
    }) =>
      privilegedAccessService.update(args.id, {
        tenant_role_id: args.tenant_role_id,
        duration_minutes: args.duration_minutes,
        reason: args.reason,
      }),
  });
  const busy =
    approveMut.isPending ||
    denyMut.isPending ||
    revokeMut.isPending ||
    extendMut.isPending ||
    reactivateMut.isPending ||
    updateMut.isPending;

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [q, statusFilter, sortKey, sortDir]);

  const filteredSorted = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = data;
    if (term) {
      list = list.filter((r) => {
        const u = userLabel.get(String(r.user_id ?? "")) ?? "";
        const role = roleLabel.get(String(r.tenant_role_id ?? "")) ?? "";
        return [u, role, r.status, r.reason, r.user_id, r.tenant_role_id].some((v) =>
          String(v ?? "").toLowerCase().includes(term)
        );
      });
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      let va = "";
      let vb = "";
      switch (sortKey) {
        case "status":
          va = String(a.status ?? ""); vb = String(b.status ?? ""); break;
        case "user":
          va = userLabel.get(String(a.user_id ?? "")) ?? "";
          vb = userLabel.get(String(b.user_id ?? "")) ?? "";
          break;
        case "role":
          va = roleLabel.get(String(a.tenant_role_id ?? "")) ?? "";
          vb = roleLabel.get(String(b.tenant_role_id ?? "")) ?? "";
          break;
        case "duration":
          return (Number(a.duration_minutes ?? 0) - Number(b.duration_minutes ?? 0)) * dir;
        case "ends":
          va = String(a.ends_at ?? ""); vb = String(b.ends_at ?? ""); break;
        default:
          va = String((a as { created_at?: string }).created_at ?? a.starts_at ?? "");
          vb = String((b as { created_at?: string }).created_at ?? b.starts_at ?? "");
      }
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [data, q, sortKey, sortDir, userLabel, roleLabel]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageIds = pageRows.map((r) => r.grant_id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "created" || key === "ends" ? "desc" : "asc");
    }
  };
  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const selectedRows = useMemo(
    () => data.filter((r) => selected.has(r.grant_id)),
    [data, selected]
  );
  const selectedPending = selectedRows.filter((r) => r.status === "PENDING");
  const selectedActive = selectedRows.filter((r) => r.status === "ACTIVE");

  async function runBulk(kind: "approve" | "deny" | "revoke", targets: PrivilegedGrantDto[]) {
    if (!targets.length) return;
    let ok = 0, fail = 0;
    for (const t of targets) {
      try {
        if (kind === "approve") await approveMut.mutateAsync(t.grant_id);
        else if (kind === "deny") await denyMut.mutateAsync(t.grant_id);
        else await revokeMut.mutateAsync(t.grant_id);
        ok++;
      } catch { fail++; }
    }
    setConfirm(null);
    setSelected(new Set());
    void qc.invalidateQueries({ queryKey: ["identity", "privileged-access"] });
    if (ok) {
      toast.success(
        kind === "approve" ? `${toFaDigits(ok)} درخواست تأیید شد`
        : kind === "deny" ? `${toFaDigits(ok)} درخواست رد شد`
        : `${toFaDigits(ok)} دسترسی لغو شد`
      );
    }
    if (fail) toast.error(`${toFaDigits(fail)} مورد ناموفق بود`);
  }

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="دسترسی اضطراری"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "دسترسی اضطراری" },
          ]}
        />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex min-h-0 flex-col gap-3">
        <PageHeader
          title="دسترسی اضطراری"
          description="درخواست و گرنت زمان‌دار نقش‌های ممتاز (break-glass)"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "دسترسی اضطراری" },
          ]}
          icon={<ShieldAlert className="h-5 w-5" />}
          actions={
            canRequest ? (
              <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                درخواست جدید
              </Button>
            ) : null
          }
        />

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-card px-3 py-2.5">
          <div className="relative min-w-[12rem] max-w-sm flex-1">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجوی کاربر، نقش یا دلیل…"
              className={cn("h-8 ps-8 text-sm", q && "pe-8")}
            />
            {q ? (
              <button
                type="button"
                className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
                aria-label="پاک کردن"
                onClick={() => setQ("")}
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-8 w-[9.5rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ms-auto flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
            {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {toFaDigits(total)} مورد
          </span>
        </div>

        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2">
            <span className="text-sm font-medium">{toFaDigits(selected.size)} انتخاب‌شده</span>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelected(new Set())}>
              لغو انتخاب
            </Button>
            {canApprove && selectedPending.length > 0 ? (
              <>
                <Button type="button" size="sm" className="h-7 gap-1" disabled={busy}
                  onClick={() => setConfirm({ kind: "approve", targets: selectedPending })}>
                  <Check className="h-3.5 w-3.5" /> تأیید ({toFaDigits(selectedPending.length)})
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-7 gap-1" disabled={busy}
                  onClick={() => setConfirm({ kind: "deny", targets: selectedPending })}>
                  <Ban className="h-3.5 w-3.5" /> رد ({toFaDigits(selectedPending.length)})
                </Button>
              </>
            ) : null}
            {canApprove && selectedActive.length > 0 ? (
              <Button type="button" size="sm" variant="destructive" className="h-7 gap-1" disabled={busy}
                onClick={() => setConfirm({ kind: "revoke", targets: selectedActive })}>
                <Undo2 className="h-3.5 w-3.5" /> لغو دسترسی ({toFaDigits(selectedActive.length)})
              </Button>
            ) : null}
          </div>
        ) : null}

        {isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">بارگذاری ممکن نشد</p>
            <p className="mt-1 text-xs">
              {error instanceof ApiClientError && error.message ? error.message : MSG_LOAD_ERROR}
            </p>
            <Button variant="outline" size="sm" className="mt-3 h-8" onClick={() => void refetch()}>تلاش مجدد</Button>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 px-2">
                    <Checkbox
                      checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                      onCheckedChange={(v) => {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          for (const id of pageIds) {
                            if (v) next.add(id); else next.delete(id);
                          }
                          return next;
                        });
                      }}
                      disabled={pageRows.length === 0}
                    />
                  </TableHead>
                  <TableHead className="w-10 px-1 text-center text-xs">#</TableHead>
                  {([
                    ["status", "وضعیت"], ["user", "کاربر"], ["role", "نقش"],
                    ["duration", "مدت"], ["created", "شروع / ثبت"], ["ends", "پایان"],
                  ] as const).map(([key, label]) => (
                    <TableHead key={key} className="px-2">
                      <button type="button" className="inline-flex items-center gap-1 text-xs font-medium hover:text-foreground"
                        onClick={() => toggleSort(key)}>
                        {label}<SortIcon k={key} />
                      </button>
                    </TableHead>
                  ))}
                  <TableHead className="px-2 text-xs">دلیل</TableHead>
                  <TableHead className="px-2 text-xs">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={9} className="px-3 py-2"><Skeleton className="h-9 w-full" /></TableCell></TableRow>
                  ))
                ) : pageRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12">
                      <EmptyState title={q.trim() || statusFilter !== "all" ? "نتیجه‌ای پیدا نشد" : "هنوز درخواستی ثبت نشده"} />
                    </TableCell>
                  </TableRow>
                ) : pageRows.map((r, idx) => {
                  const uid = String(r.user_id ?? "");
                  const rid = String(r.tenant_role_id ?? "");
                  const st = String(r.status ?? "");
                  return (
                    <TableRow key={r.grant_id} data-state={selected.has(r.grant_id) ? "selected" : undefined} className="h-11">
                      <TableCell className="px-2">
                        <Checkbox checked={selected.has(r.grant_id)}
                          onCheckedChange={(v) => setSelected((prev) => {
                            const next = new Set(prev);
                            if (v) next.add(r.grant_id); else next.delete(r.grant_id);
                            return next;
                          })} />
                      </TableCell>
                      <TableCell className="px-1 text-center text-xs tabular-nums text-muted-foreground">
                        {toFaDigits((safePage - 1) * pageSize + idx + 1)}
                      </TableCell>
                      <TableCell className="px-2">
                        <StatusChip label={(STATUS_LABEL[st] ?? st) || "—"} tone={statusTone(st)} />
                      </TableCell>
                      <TableCell className="px-2">
                        <div className="min-w-0 max-w-[10rem]">
                          <div className="truncate text-sm font-medium">{userLabel.get(uid) ?? shortId(uid)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="px-2">
                        <div className="truncate text-sm font-medium">{roleLabel.get(rid) ?? shortId(rid)}</div>
                      </TableCell>
                      <TableCell className="px-2 text-xs tabular-nums">
                        {r.duration_minutes != null ? `${toFaDigits(r.duration_minutes)} دقیقه` : "—"}
                      </TableCell>
                      <TableCell className="px-2">
                        <span dir="ltr" className="text-[11px] tabular-nums text-muted-foreground">
                          {fmtDt((r as { created_at?: string }).created_at ?? r.starts_at)}
                        </span>
                      </TableCell>
                      <TableCell className="px-2">
                        <span dir="ltr" className="text-[11px] tabular-nums text-muted-foreground">{fmtDt(r.ends_at)}</span>
                      </TableCell>
                      <TableCell className="px-2">
                        <span className="line-clamp-2 max-w-[12rem] text-xs text-muted-foreground" title={r.reason ?? undefined}>
                          {r.reason ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="px-2">
                        <div className="flex flex-wrap items-center gap-0.5">
                          {canApprove && st === "PENDING" ? (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" disabled={busy}
                                    onClick={() => setConfirm({ kind: "approve", targets: [r] })}>
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>تأیید و فعال‌سازی</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled={busy}
                                    onClick={() => setConfirm({ kind: "deny", targets: [r] })}>
                                    <Ban className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>رد درخواست</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={busy}
                                    onClick={() => {
                                      setEditRoleId(String(r.tenant_role_id ?? ""));
                                      setEditDuration(String(r.duration_minutes || 60));
                                      setEditReason(String(r.reason ?? ""));
                                      setConfirm({ kind: "edit", targets: [r] });
                                    }}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>ویرایش نقش / مدت / دلیل</TooltipContent>
                              </Tooltip>
                            </>
                          ) : null}
                          {canApprove && st === "ACTIVE" ? (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-primary" disabled={busy}
                                    onClick={() => {
                                      setExtendMinutes("60");
                                      setConfirm({ kind: "extend", targets: [r] });
                                    }}>
                                    <Clock className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>تمدید مدت دسترسی</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled={busy}
                                    onClick={() => setConfirm({ kind: "revoke", targets: [r] })}>
                                    <Undo2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>لغو دسترسی فعال</TooltipContent>
                              </Tooltip>
                            </>
                          ) : null}
                          {canApprove && (st === "EXPIRED" || st === "REVOKED" || st === "DENIED") ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-primary" disabled={busy}
                                  onClick={() => {
                                    setExtendMinutes(String(r.duration_minutes || 60));
                                    setEditRoleId(String(r.tenant_role_id ?? ""));
                                    setEditReason(String(r.reason ?? ""));
                                    setConfirm({ kind: "reactivate", targets: [r] });
                                  }}>
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>فعال‌سازی مجدد</TooltipContent>
                            </Tooltip>
                          ) : null}
                          {r.tenant_role_id ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground"
                                  onClick={() => router.push(`/dashboard/identity/roles/${r.tenant_role_id}`)}>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>مجوزهای نقش</TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-3 py-2">
            <span className="text-xs text-muted-foreground">
              {total === 0 ? "موردی نیست"
                : `نمایش ${toFaDigits((safePage - 1) * pageSize + 1)}–${toFaDigits(Math.min(safePage * pageSize, total))} از ${toFaDigits(total)}`}
            </span>
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-7 w-[4.5rem]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>{toFaDigits(n)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="sm" variant="outline" className="h-7" disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}>قبلی</Button>
              <span className="text-xs tabular-nums">{toFaDigits(safePage)} / {toFaDigits(totalPages)}</span>
              <Button type="button" size="sm" variant="outline" className="h-7" disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>بعدی</Button>
            </div>
          </div>
        </div>

        <Dialog open={Boolean(confirm)} onOpenChange={(o) => !o && setConfirm(null)}>
          <DialogContent className="sm:max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle>
                {confirm?.kind === "approve" && "تأیید درخواست‌ها"}
                {confirm?.kind === "deny" && "رد درخواست‌ها"}
                {confirm?.kind === "revoke" && "لغو دسترسی فعال"}
                {confirm?.kind === "extend" && "تمدید دسترسی"}
                {confirm?.kind === "reactivate" && "فعال‌سازی مجدد"}
                {confirm?.kind === "edit" && "ویرایش درخواست"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {confirm?.kind === "approve" &&
                `${toFaDigits(confirm.targets.length)} درخواست تأیید و بلافاصله فعال می‌شود. (مالک سازمان می‌تواند درخواست خود را هم تأیید کند.)`}
              {confirm?.kind === "deny" && `${toFaDigits(confirm?.targets.length ?? 0)} درخواست رد می‌شود.`}
              {confirm?.kind === "revoke" &&
                `${toFaDigits(confirm?.targets.length ?? 0)} دسترسی فعال لغو می‌شود و نقش موقتاً از کاربر برداشته می‌شود.`}
              {confirm?.kind === "extend" &&
                "مدت دسترسی از پایان فعلی (یا همین لحظه اگر گذشته) به اندازهٔ انتخاب‌شده تمدید می‌شود."}
              {confirm?.kind === "reactivate" &&
                "همین رکورد با مدت جدید دوباره فعال می‌شود؛ نیازی به ساخت درخواست تازه نیست."}
              {confirm?.kind === "edit" &&
                "نقش ممتاز، مدت و دلیل درخواست در انتظار را ویرایش کنید."}
            </p>
            {confirm?.kind === "extend" || confirm?.kind === "reactivate" ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { m: 60, l: "۱ ساعت" },
                  { m: 480, l: "۸ ساعت" },
                  { m: 10080, l: "۷ روز" },
                  { m: 43200, l: "۳۰ روز" },
                ].map((p) => (
                  <button
                    key={p.m}
                    type="button"
                    onClick={() => setExtendMinutes(String(p.m))}
                    className={
                      "rounded-lg border px-3 py-2 text-start text-sm " +
                      (Number(extendMinutes) === p.m
                        ? "border-primary bg-primary/10"
                        : "border-border/70 hover:bg-muted/40")
                    }
                  >
                    {p.l}
                  </button>
                ))}
              </div>
            ) : null}
            {confirm?.kind === "reactivate" ? (
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-medium text-muted-foreground">نقش ممتاز (اختیاری)</label>
                <Select value={editRoleId || undefined} onValueChange={setEditRoleId}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="نقش فعلی" /></SelectTrigger>
                  <SelectContent>
                    {privilegedRoles.map((r) => (
                      <SelectItem key={r.tenant_role_id} value={r.tenant_role_id}>
                        {r.name || r.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {confirm?.kind === "edit" ? (
              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">نقش ممتاز</label>
                  <Select value={editRoleId || undefined} onValueChange={setEditRoleId}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="انتخاب نقش" /></SelectTrigger>
                    <SelectContent>
                      {privilegedRoles.map((r) => (
                        <SelectItem key={r.tenant_role_id} value={r.tenant_role_id}>
                          {r.name || r.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { m: 60, l: "۱ ساعت" },
                    { m: 480, l: "۸ ساعت" },
                    { m: 10080, l: "۷ روز" },
                    { m: 43200, l: "۳۰ روز" },
                  ].map((p) => (
                    <button
                      key={p.m}
                      type="button"
                      onClick={() => setEditDuration(String(p.m))}
                      className={
                        "rounded-lg border px-3 py-2 text-start text-sm " +
                        (Number(editDuration) === p.m
                          ? "border-primary bg-primary/10"
                          : "border-border/70 hover:bg-muted/40")
                      }
                    >
                      {p.l}
                    </button>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">دلیل</label>
                  <Input value={editReason} onChange={(e) => setEditReason(e.target.value)} className="h-9" />
                </div>
              </div>
            ) : null}
            <DialogFooter className="gap-2 sm:justify-start">
              <Button type="button" variant="outline" onClick={() => setConfirm(null)} disabled={busy}>انصراف</Button>
              <Button type="button"
                variant={confirm?.kind === "revoke" || confirm?.kind === "deny" ? "destructive" : "default"}
                disabled={busy || !confirm}
                onClick={() => {
                  if (!confirm) return;
                  if (confirm.kind === "extend") {
                    const t = confirm.targets[0];
                    if (!t) return;
                    void extendMut
                      .mutateAsync({ id: t.grant_id, minutes: Number(extendMinutes) || 60 })
                      .then(() => {
                        toast.success("مدت دسترسی تمدید شد");
                        setConfirm(null);
                        void qc.invalidateQueries({ queryKey: ["identity", "privileged-access"] });
                      })
                      .catch((e) =>
                        toast.error(e instanceof ApiClientError ? e.message : "تمدید ناموفق بود")
                      );
                    return;
                  }
                  if (confirm.kind === "reactivate") {
                    const t = confirm.targets[0];
                    if (!t) return;
                    void reactivateMut
                      .mutateAsync({
                        id: t.grant_id,
                        duration_minutes: Number(extendMinutes) || 60,
                        tenant_role_id: editRoleId || undefined,
                        reason: editReason.trim().length >= 5 ? editReason.trim() : undefined,
                      })
                      .then(() => {
                        toast.success("دسترسی دوباره فعال شد");
                        setConfirm(null);
                        void qc.invalidateQueries({ queryKey: ["identity", "privileged-access"] });
                      })
                      .catch((e) =>
                        toast.error(e instanceof ApiClientError ? e.message : "فعال‌سازی مجدد ناموفق بود")
                      );
                    return;
                  }
                  if (confirm.kind === "edit") {
                    const t = confirm.targets[0];
                    if (!t) return;
                    void updateMut
                      .mutateAsync({
                        id: t.grant_id,
                        tenant_role_id: editRoleId || undefined,
                        duration_minutes: Number(editDuration) || undefined,
                        reason: editReason.trim().length >= 5 ? editReason.trim() : undefined,
                      })
                      .then(() => {
                        toast.success("درخواست به‌روز شد");
                        setConfirm(null);
                        void qc.invalidateQueries({ queryKey: ["identity", "privileged-access"] });
                      })
                      .catch((e) =>
                        toast.error(e instanceof ApiClientError ? e.message : "ویرایش ناموفق بود")
                      );
                    return;
                  }
                  void runBulk(confirm.kind as "approve" | "deny" | "revoke", confirm.targets);
                }}>
                {busy ? (<><Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />در حال اجرا…</>) : "تأیید"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <PrivilegedRequestSheet
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open && prefillUserId) {
              router.replace("/dashboard/identity/privileged-access");
              setLockedPrefillUserId(null);
            }
          }}
          roles={roles}
          initialUserId={lockedPrefillUserId ?? (prefillUserId || null)}
          onCreated={() => {
            void qc.invalidateQueries({ queryKey: ["identity", "privileged-access"] });
            if (prefillUserId) {
              router.replace("/dashboard/identity/privileged-access");
              setLockedPrefillUserId(null);
            }
          }}
        />
      </div>
    </TooltipProvider>
  );
}
