/**
 * FE-ORG — فهرست سراسری شعب (tenant-wide list + per-company fallback)
 */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  GitBranch, Loader2, Pencil, Plus, Power, PowerOff, RotateCcw, Search, Trash2, X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { usePermission } from "@/auth";
import { ApiClientError, tokenStorage } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { useCompanies } from "../hooks/use-companies";
import { useAllBranches, useCreateBranch, useUpdateBranch, useSoftDeleteBranch } from "../hooks/use-branches";
import { branchService, type BranchListFilter } from "../services/branch-service";
import { companyDetailPath } from "../lib/company-ref";
import { OrganizationPermissions, BRANCH_KIND_LABELS, type BranchDto } from "../types";

const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";
const ALL = "__all__";

type BranchRow = BranchDto & { company_name: string };
type BranchForm = {
  company_id: string; code: string; name: string; address: string; branch_kind: string;
  is_active: boolean; supports_shipping: boolean; supports_receiving: boolean; is_manufacturing_site: boolean;
};

const emptyForm = (): BranchForm => ({
  company_id: "", code: "", name: "", address: "", branch_kind: "OFFICE",
  is_active: true, supports_shipping: false, supports_receiving: false, is_manufacturing_site: false,
});

function rowToForm(r: BranchRow): BranchForm {
  return {
    company_id: r.company_id, code: r.code ?? "", name: r.name ?? "", address: r.address ?? "",
    branch_kind: (r.branch_kind as string) || "OFFICE", is_active: r.is_active !== false,
    supports_shipping: Boolean(r.supports_shipping), supports_receiving: Boolean(r.supports_receiving),
    is_manufacturing_site: Boolean(r.is_manufacturing_site),
  };
}

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

export function BranchesListPage() {
  const canView = usePermission(OrganizationPermissions.branchView) || usePermission(OrganizationPermissions.companyView);
  const canCreate = usePermission(OrganizationPermissions.branchCreate);
  const canUpdate = usePermission(OrganizationPermissions.branchUpdate);
  const canDelete = usePermission(OrganizationPermissions.branchDelete);

  const qc = useQueryClient();
  const { data: companies, isLoading: companiesLoading } = useCompanies();
  const companyList = companies ?? [];

  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState(ALL);
  const [membershipFilter, setMembershipFilter] = useState<BranchListFilter>("active");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<BranchRow | null>(null);

  const form = useForm<BranchForm>({ defaultValues: emptyForm() });
  const isDeletedView = membershipFilter === "deleted";
  const formCompanyId = form.watch("company_id");

  const {
    data: branchesData,
    isLoading: branchesLoading,
    isError,
    refetch: refetchBranches,
  } = useAllBranches(
    membershipFilter,
    companyList.map((c) => c.company_id)
  );

  const isInitialLoading = companiesLoading || (hasAuthContext() && branchesLoading && !branchesData);

  const companyNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of companyList) m.set(c.company_id, c.legal_name || c.name);
    return m;
  }, [companyList]);

  const allRows: BranchRow[] = useMemo(() => {
    return (branchesData ?? []).map((b) => ({
      ...b,
      company_name: companyNameById.get(b.company_id) || b.company?.legal_name || b.company?.name || "—",
    }));
  }, [branchesData, companyNameById]);

  const filtered = useMemo(() => {
    let list = allRows;
    if (companyFilter !== ALL) list = list.filter((r) => r.company_id === companyFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) =>
        [r.code, r.name, r.company_name, r.branch_kind].filter(Boolean).join(" ").toLowerCase().includes(q)
      );
    }
    return list;
  }, [allRows, companyFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const createMutation = useCreateBranch(formCompanyId || "");
  const updateMutation = useUpdateBranch(editing?.company_id || formCompanyId || "");

  const invalidate = (companyId?: string) => {
    void qc.invalidateQueries({ queryKey: ["organization", "branches"] });
    if (companyId) void qc.invalidateQueries({ queryKey: ["organization", "companies", companyId, "branches"] });
  };

  const onCreate = form.handleSubmit(async (values) => {
    if (!values.company_id) { toast.error("شرکت را انتخاب کنید."); return; }
    try {
      await createMutation.mutateAsync({
        company_id: values.company_id, code: values.code.trim(), name: values.name.trim(),
        address: values.address.trim() || null, branch_kind: values.branch_kind || "OFFICE",
        supports_shipping: values.supports_shipping, supports_receiving: values.supports_receiving,
        is_manufacturing_site: values.is_manufacturing_site, is_active: values.is_active,
      });
      toast.success("شعبه ثبت شد"); setCreateOpen(false); form.reset(emptyForm()); invalidate(values.company_id);
    } catch (e) { toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR); }
  });

  const onEdit = form.handleSubmit(async (values) => {
    if (!editing) return;
    try {
      await updateMutation.mutateAsync({
        branchId: editing.branch_id,
        payload: {
          code: values.code.trim(), name: values.name.trim(), address: values.address.trim() || null,
          branch_kind: values.branch_kind || "OFFICE", supports_shipping: values.supports_shipping,
          supports_receiving: values.supports_receiving, is_manufacturing_site: values.is_manufacturing_site,
          is_active: values.is_active, company_id: values.company_id || editing.company_id,
        },
      });
      toast.success("اطلاعات شعبه به‌روز شد"); setEditOpen(false); setEditing(null); form.reset(emptyForm());
      invalidate(editing.company_id);
    } catch (e) { toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR); }
  });

  if (!canView) {
    return (
      <div className="p-6">
        <EmptyState title="بدون دسترسی" description="برای مشاهده این بخش مجوز لازم را ندارید." />
      </div>
    );
  }

  const formFields = (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>شرکت</Label>
        <Select value={form.watch("company_id") || undefined} onValueChange={(v) => form.setValue("company_id", v, { shouldDirty: true })} disabled={!!editing}>
          <SelectTrigger><SelectValue placeholder="انتخاب شرکت" /></SelectTrigger>
          <SelectContent>
            {companyList.map((c) => (
              <SelectItem key={c.company_id} value={c.company_id}>{c.legal_name || c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>کد</Label>
          <Input {...form.register("code", { required: true })} />
        </div>
        <div className="space-y-1.5">
          <Label>نام</Label>
          <Input {...form.register("name", { required: true })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>آدرس</Label>
        <Input {...form.register("address")} />
      </div>
      <div className="space-y-1.5">
        <Label>نوع شعبه</Label>
        <Select value={form.watch("branch_kind")} onValueChange={(v) => form.setValue("branch_kind", v, { shouldDirty: true })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(BRANCH_KIND_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={form.watch("is_active")} onCheckedChange={(v) => form.setValue("is_active", v, { shouldDirty: true })} />
        <Label>فعال</Label>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        title="شعب"
        description="فهرست سراسری شعب همه شرکت‌ها"
        icon={<GitBranch className="h-4 w-4" />}
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "شعب" },
        ]}
        actions={canCreate && !isDeletedView ? (
          <Button size="sm" className="h-8 gap-1.5" onClick={() => {
            const base = emptyForm();
            if (companyFilter !== ALL) base.company_id = companyFilter;
            form.reset(base); setEditing(null); setCreateOpen(true);
          }}>
            <Plus className="h-4 w-4" />شعبه جدید
          </Button>
        ) : null}
      />

      {isError ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span>بارگذاری شعب ممکن نشد. دوباره تلاش کنید.</span>
          <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => void refetchBranches()}>
            تلاش مجدد
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input className={cn("h-8 ps-8 text-sm", query && "pe-8")} placeholder="نام، کد، شرکت…" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} />
          {query ? (
            <button type="button" className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted" aria-label="پاک کردن" onClick={() => { setQuery(""); setPage(1); }}>
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <Select value={companyFilter} onValueChange={(v) => { setCompanyFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-[12rem]"><SelectValue placeholder="شرکت" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>همه شرکت‌ها</SelectItem>
            {companyList.map((c) => (
              <SelectItem key={c.company_id} value={c.company_id}>{c.legal_name || c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={membershipFilter} onValueChange={(v) => { setMembershipFilter(v as BranchListFilter); setPage(1); }}>
          <SelectTrigger className="h-8 w-[9rem]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">فعال / موجود</SelectItem>
            <SelectItem value="deleted">حذف‌شده</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isInitialLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
      ) : pageRows.length === 0 ? (
        <EmptyState title="شعبه‌ای یافت نشد" description="با فیلترهای فعلی موردی نیست یا هنوز شعبه‌ای ثبت نشده. از دکمه «شعبه جدید» یکی ثبت کنید یا در جزئیات شرکت، تب شعب را بررسی کنید." />
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام شعبه</TableHead>
                <TableHead>کد</TableHead>
                <TableHead>شرکت</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="w-[8rem]">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.branch_id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">{r.code}</TableCell>
                  <TableCell>
                    <Link className="text-primary hover:underline" href={companyDetailPath(r.company_id)}>{r.company_name}</Link>
                  </TableCell>
                  <TableCell>{BRANCH_KIND_LABELS[r.branch_kind ?? ""] ?? r.branch_kind ?? "—"}</TableCell>
                  <TableCell>
                    <StatusChip label={r.is_active !== false ? "فعال" : "غیرفعال"} tone={r.is_active !== false ? "success" : "neutral"} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {canUpdate && !isDeletedView ? (
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(r); form.reset(rowToForm(r)); setEditOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {canUpdate && !isDeletedView ? (
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={async () => {
                          try {
                            await updateMutation.mutateAsync({
                              branchId: r.branch_id,
                              payload: {
                                code: r.code, name: r.name, address: r.address ?? null,
                                branch_kind: r.branch_kind ?? "OFFICE", supports_shipping: r.supports_shipping,
                                supports_receiving: r.supports_receiving, is_manufacturing_site: r.is_manufacturing_site,
                                is_active: r.is_active === false, company_id: r.company_id,
                              },
                            });
                            toast.success(r.is_active === false ? "شعبه فعال شد" : "شعبه غیرفعال شد");
                            invalidate(r.company_id);
                          } catch (e) { toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR); }
                        }}>
                          {r.is_active === false ? <Power className="h-3.5 w-3.5" /> : <PowerOff className="h-3.5 w-3.5" />}
                        </Button>
                      ) : null}
                      {canDelete && !isDeletedView ? (
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={async () => {
                          try {
                            await branchService.softDelete(r.branch_id);
                            toast.success("شعبه حذف شد");
                            invalidate(r.company_id);
                          } catch (e) { toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR); }
                        }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {isDeletedView && canUpdate ? (
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={async () => {
                          try {
                            await branchService.restore(r.branch_id);
                            toast.success("شعبه بازگردانی شد و غیرفعال باقی ماند.");
                            invalidate(r.company_id);
                          } catch (e) { toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR); }
                        }}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {filtered.length > pageSize ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{toFaDigits(filtered.length)} مورد</span>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>قبلی</Button>
            <span>{toFaDigits(safePage)} / {toFaDigits(totalPages)}</span>
            <Button type="button" size="sm" variant="outline" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>بعدی</Button>
          </div>
        </div>
      ) : null}

      <Sheet open={createOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); form.reset(emptyForm()); } }}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader><SheetTitle>شعبه جدید</SheetTitle></SheetHeader>
          <form onSubmit={onCreate} className="flex flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-1 py-4">{formFields}</div>
            <SheetFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => { setCreateOpen(false); form.reset(emptyForm()); }}>انصراف</Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={editOpen} onOpenChange={(o) => { if (!o) { setEditOpen(false); setEditing(null); form.reset(emptyForm()); } }}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader><SheetTitle>ویرایش شعبه</SheetTitle></SheetHeader>
          <form onSubmit={onEdit} className="flex flex-1 flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto px-1 py-4">{formFields}</div>
            <SheetFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => { setEditOpen(false); setEditing(null); form.reset(emptyForm()); }}>انصراف</Button>
              <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
