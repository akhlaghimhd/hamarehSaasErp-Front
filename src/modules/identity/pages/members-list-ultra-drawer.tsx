"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Columns3, Download, FileSpreadsheet, FileText, Loader2, Plus, Search, Trash2, UserMinus, Users, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Can, useAuthStore, usePermission } from "@/auth";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { useSoftDeleteTenantUser, useTenantUsers, useUpdateTenantUser } from "../hooks/use-tenant-users";
import { IdentityPermissions, type TenantUserDto } from "../types";
import { MSG_LOAD_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import { exportMembersExcel, exportMembersPdf } from "../lib/members-export";
import { MemberCreateDrawer } from "../components/member-create-drawer";

type SF = "all" | "active" | "inactive";
type SK = "name" | "email" | "mobile" | "status" | "joined";
type SD = "asc" | "desc";
type CID = "name" | "email" | "mobile" | "status" | "joined" | "actions";
const COLS: { id: CID; label: string; hideable?: boolean; sort?: SK }[] = [
  { id: "name", label: "نام", hideable: false, sort: "name" },
  { id: "email", label: "ایمیل", sort: "email" },
  { id: "mobile", label: "موبایل", sort: "mobile" },
  { id: "status", label: "وضعیت", sort: "status" },
  { id: "joined", label: "تاریخ عضویت", sort: "joined" },
  { id: "actions", label: "عملیات", hideable: false },
];
const SKY = "identity.members.columns.v2";
function dn(r: TenantUserDto) { const u = r.user; if (!u) return "—"; const n = [u.first_name, u.last_name].filter(Boolean).join(" ").trim(); return n || u.email || "—"; }
function ini(r: TenantUserDto) { const u = r.user; if (!u) return "؟"; const s = `${(u.first_name ?? "").charAt(0)}${(u.last_name ?? "").charAt(0)}`.trim(); return s || (u.email ?? "؟").charAt(0).toUpperCase(); }
function fd(v?: string | null) { if (!v) return "—"; try { return toFaDigits(new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(v))); } catch { return toFaDigits(v); } }
function fdt(v?: string | null) { if (!v) return "—"; try { return toFaDigits(new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(v))); } catch { return toFaDigits(v); } }
function sv(r: TenantUserDto, k: SK): string | number { if (k === "name") return dn(r).toLowerCase(); if (k === "email") return (r.user?.email ?? "").toLowerCase(); if (k === "mobile") return r.user?.mobile ?? ""; if (k === "status") return Number(r.status) === 1 ? 1 : 0; return r.created_at ? new Date(r.created_at).getTime() : 0; }

export function MembersListPage() {
  const canView = usePermission(IdentityPermissions.userView);
  const canUpdate = usePermission(IdentityPermissions.userUpdate);
  const canDelete = usePermission(IdentityPermissions.userDelete);
  const canCreate = usePermission(IdentityPermissions.userCreate);
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  useEffect(() => {
    if (searchParams.get("create") === "1" && canCreate) setCreateOpen(true);
  }, [searchParams, canCreate]);
  const currentUserId = useAuthStore((s) => s.user?.user_id);
  const { data, isLoading, isError, error, refetch, isFetching } = useTenantUsers();
  const updateMutation = useUpdateTenantUser();
  const deleteMutation = useSoftDeleteTenantUser();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SF>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<SK>("name");
  const [sortDir, setSortDir] = useState<SD>("asc");
  const [visible, setVisible] = useState<Record<CID, boolean>>(() => {
    const base = Object.fromEntries(COLS.map((c) => [c.id, true])) as Record<CID, boolean>;
    if (typeof window === "undefined") return base;
    try { const raw = localStorage.getItem(SKY); return raw ? { ...base, ...JSON.parse(raw) } : base; } catch { return base; }
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  useEffect(() => { try { localStorage.setItem(SKY, JSON.stringify(visible)); } catch {} }, [visible]);
  const rows = data ?? [];
  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((row) => {
      const st = Number(row.status);
      if (statusFilter === "active" && st !== 1) return false;
      if (statusFilter === "inactive" && st !== 0) return false;
      if (!q) return true;
      const u = row.user;
      return [u?.first_name, u?.last_name, u?.email, u?.mobile].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
    return [...list].sort((a, b) => {
      const va = sv(a, sortKey); const vb = sv(b, sortKey);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, query, statusFilter, sortKey, sortDir]);
  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const isFiltered = query.trim().length > 0 || statusFilter !== "all";
  const pageIds = pageRows.map((r) => r.tenant_user_id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));
  const selectedRows = useMemo(() => filteredSorted.filter((r) => selected.has(r.tenant_user_id)), [filteredSorted, selected]);
  const toggleSort = (key: SK) => { if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc")); else { setSortKey(key); setSortDir(key === "joined" ? "desc" : "asc"); } };
  const SortIcon = ({ k }: { k: SK }) => { if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />; return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />; };

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="کاربران سازمان" breadcrumbs={[{ label: "داشبورد", href: "/dashboard" }, { label: "هویت و دسترسی", href: "/dashboard/identity" }, { label: "کاربران" }]} />
        <div className="rounded-xl border border-dashed bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">{MSG_NO_ACCESS}</div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex min-h-0 flex-col gap-3">
        <PageHeader
          title="کاربران سازمان"
          description="جستجو، مرتب‌سازی و مدیریت اعضای سازمان"
          breadcrumbs={[{ label: "داشبورد", href: "/dashboard" }, { label: "هویت و دسترسی", href: "/dashboard/identity" }, { label: "کاربران" }]}
          actions={
            <Can permission={IdentityPermissions.userCreate}>
              <Button type="button" size="sm" className="h-8" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />افزودن کاربر
              </Button>
            </Can>
          }
        />

        {isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">دریافت فهرست ممکن نشد</p>
            <p className="mt-1 text-xs">{error instanceof Error ? error.message : MSG_LOAD_ERROR}</p>
            <Button variant="outline" size="sm" className="mt-3 h-8" onClick={() => void refetch()}>تلاش مجدد</Button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className={cn("h-8 ps-8 text-sm", query && "pe-8")} placeholder="جستجو نام، ایمیل یا موبایل…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
            {query ? <button type="button" className="absolute end-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setQuery("")}><X className="h-3.5 w-3.5" /></button> : null}
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as SF); setPage(1); }}>
            <SelectTrigger className="h-8 w-[8.5rem]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              <SelectItem value="active">فعال</SelectItem>
              <SelectItem value="inactive">غیرفعال</SelectItem>
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5"><Columns3 className="h-3.5 w-3.5" />ستون‌ها</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>نمایش ستون</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COLS.filter((c) => c.hideable !== false).map((c) => (
                <DropdownMenuItem key={c.id} onSelect={(e) => e.preventDefault()} onClick={() => setVisible((v) => ({ ...v, [c.id]: !v[c.id] }))}>
                  <Checkbox checked={visible[c.id]} className="me-2" />{c.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" disabled={!filteredSorted.length} onClick={() => exportMembersExcel(filteredSorted)}>
            <FileSpreadsheet className="h-3.5 w-3.5" />اکسل
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" disabled={!filteredSorted.length} onClick={() => exportMembersPdf(filteredSorted)}>
            <FileText className="h-3.5 w-3.5" />PDF
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8" disabled={isFetching} onClick={() => void refetch()}>
            {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {selected.size > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
            <span className="tabular-nums text-muted-foreground">{toFaDigits(selected.size)} انتخاب‌شده</span>
            {canUpdate ? (
              <>
                <Button type="button" variant="outline" size="sm" className="h-8" disabled={bulkBusy} onClick={async () => {
                  setBulkBusy(true); let ok = 0;
                  for (const r of selectedRows) { try { await updateMutation.mutateAsync({ tenantUserId: r.tenant_user_id, payload: { status: 1 } }); ok++; } catch {} }
                  setBulkBusy(false); setSelected(new Set()); if (ok) toast.success(`${toFaDigits(ok)} کاربر فعال شد`);
                }}>فعال‌سازی</Button>
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" disabled={bulkBusy} onClick={async () => {
                  setBulkBusy(true); let ok = 0;
                  for (const r of selectedRows) {
                    if (currentUserId && r.user_id === currentUserId) continue;
                    try { await updateMutation.mutateAsync({ tenantUserId: r.tenant_user_id, payload: { status: 0 } }); ok++; } catch {}
                  }
                  setBulkBusy(false); setSelected(new Set()); if (ok) toast.success(`${toFaDigits(ok)} کاربر غیرفعال شد`);
                }}><UserMinus className="h-3.5 w-3.5" />غیرفعال</Button>
              </>
            ) : null}
            {canDelete ? (
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-destructive" disabled={bulkBusy} onClick={async () => {
                const targets = selectedRows.filter((r) => !(currentUserId && r.user_id === currentUserId));
                if (!targets.length) { toast.error("مورد قابل حذف نیست."); return; }
                if (!window.confirm(`${toFaDigits(targets.length)} کاربر حذف شوند؟`)) return;
                setBulkBusy(true); let ok = 0;
                for (const r of targets) { try { await deleteMutation.mutateAsync(r.tenant_user_id); ok++; } catch {} }
                setBulkBusy(false); setSelected(new Set()); if (ok) toast.success(`${toFaDigits(ok)} کاربر حذف شد`);
              }}><Trash2 className="h-3.5 w-3.5" />حذف</Button>
            ) : null}
            <Button type="button" variant="ghost" size="sm" className="h-8 ms-auto" onClick={() => setSelected(new Set())}><X className="h-3.5 w-3.5" />لغو</Button>
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-2 rounded-lg border p-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-11 w-full" />)}</div>
        ) : pageRows.length === 0 ? (
          <EmptyState icon={Search} title={isFiltered ? "نتیجه‌ای پیدا نشد" : "هنوز کاربری ثبت نشده"} description={isFiltered ? "عبارت یا فیلتر را تغییر دهید." : "اولین کاربر را اضافه کنید."} />
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-xs)]">
            <div className="max-h-[min(68vh,42rem)] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-10 pe-0">
                      <Checkbox checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false} onCheckedChange={(v) => {
                        const on = Boolean(v);
                        setSelected((prev) => { const next = new Set(prev); pageIds.forEach((id) => (on ? next.add(id) : next.delete(id))); return next; });
                      }} />
                    </TableHead>
                    {COLS.filter((c) => visible[c.id]).map((c) => (
                      <TableHead key={c.id} className="whitespace-nowrap">
                        {c.sort ? (
                          <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(c.sort!)}>
                            {c.label}<SortIcon k={c.sort} />
                          </button>
                        ) : c.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((row) => (
                    <TableRow key={row.tenant_user_id} data-state={selected.has(row.tenant_user_id) ? "selected" : undefined}>
                      <TableCell className="pe-0">
                        <Checkbox checked={selected.has(row.tenant_user_id)} onCheckedChange={(v) => {
                          setSelected((prev) => { const next = new Set(prev); if (v) next.add(row.tenant_user_id); else next.delete(row.tenant_user_id); return next; });
                        }} />
                      </TableCell>
                      {visible.name !== false ? (
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">{ini(row)}</span>
                            <div className="min-w-0">
                              <Link href={`/dashboard/identity/members/${row.tenant_user_id}`} className="block truncate font-medium hover:underline">{dn(row)}</Link>
                              {row.is_owner ? <StatusChip label="مالک" tone="primary" /> : null}
                            </div>
                          </div>
                        </TableCell>
                      ) : null}
                      {visible.email !== false ? <TableCell className="font-mono text-xs" dir="ltr">{row.user?.email ?? "—"}</TableCell> : null}
                      {visible.mobile !== false ? <TableCell className="tabular-nums text-xs">{row.user?.mobile ? toFaDigits(row.user.mobile) : "—"}</TableCell> : null}
                      {visible.status !== false ? (
                        <TableCell>{Number(row.status) === 1 ? <StatusChip label="فعال" tone="success" /> : <StatusChip label="غیرفعال" tone="neutral" />}</TableCell>
                      ) : null}
                      {visible.joined !== false ? <TableCell className="text-xs text-muted-foreground">{fd(row.created_at)}</TableCell> : null}
                      {visible.actions !== false ? (
                        <TableCell className="text-end">
                          <Button type="button" variant="ghost" size="sm" className="h-7" asChild>
                            <Link href={`/dashboard/identity/members/${row.tenant_user_id}`}>جزئیات</Link>
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
              <span className="tabular-nums">{toFaDigits(total)} کاربر</span>
              <div className="flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-7 w-[4.5rem]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50].map((n) => <SelectItem key={n} value={String(n)}>{toFaDigits(n)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="sm" className="h-7" disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)}>قبلی</Button>
                <span className="tabular-nums">{toFaDigits(safePage)} / {toFaDigits(totalPages)}</span>
                <Button type="button" variant="outline" size="sm" className="h-7" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>بعدی</Button>
              </div>
            </div>
          </div>
        )}

        <MemberCreateDrawer
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={() => { void refetch(); }}
        />
      </div>
    </TooltipProvider>
  );
}
