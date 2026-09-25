/**
 * FE-ORG — فهرست سلسله‌مراتب سازمانی
 */
"use client";

import { Fragment, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown, ChevronLeft, GitBranch, Loader2, Network, Plus, Search,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { usePermission } from "@/auth";
import { ApiClientError, tokenStorage } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { useCompanies } from "../hooks/use-companies";
import { hierarchyService, type HierarchyDto, type HierarchyNodeDto } from "../services/org-extended-service";
import { OrganizationPermissions } from "../types";

const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";

const PURPOSE_LABEL: Record<string, string> = {
  LEGAL: "حقوقی",
  MANAGEMENT: "مدیریتی",
  TAX: "مالیاتی",
  ESTABLISHMENT: "استقرار",
  CUSTOM: "سفارشی",
};

const ENTITY_LABEL: Record<string, string> = {
  COMPANY: "شرکت",
  BRANCH: "شعبه",
  DEPARTMENT: "واحد سازمانی",
  BUSINESS_UNIT: "واحد کسب‌وکار",
  COST_CENTER: "مرکز هزینه",
};

type HierForm = { code: string; name: string; purpose: string };
type NodeForm = { entity_type: string; entity_id: string; parent_node_id: string };

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

function purposeLabel(p?: string) {
  if (!p) return "—";
  return PURPOSE_LABEL[p] ?? p;
}

export function HierarchiesListPage() {
  const qc = useQueryClient();
  const canView =
    usePermission(OrganizationPermissions.hierarchyView) ||
    usePermission(OrganizationPermissions.companyView);
  const canManage =
    usePermission(OrganizationPermissions.hierarchyManage) ||
    usePermission(OrganizationPermissions.companyUpdate);

  const { data: companies } = useCompanies();
  const [search, setSearch] = useState("");
  const [purposeFilter, setPurposeFilter] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [nodeSheetOpen, setNodeSheetOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeHierarchy, setActiveHierarchy] = useState<HierarchyDto | null>(null);
  const [busy, setBusy] = useState(false);

  const form = useForm<HierForm>({
    defaultValues: { code: "", name: "", purpose: "LEGAL" },
  });
  const nodeForm = useForm<NodeForm>({
    defaultValues: { entity_type: "COMPANY", entity_id: "", parent_node_id: "" },
  });

  const listQuery = useQuery({
    queryKey: ["org", "hierarchies"],
    queryFn: () => hierarchyService.list(),
    enabled: canView && hasAuthContext(),
  });

  const nodesQuery = useQuery({
    queryKey: ["org", "hierarchy-nodes", expandedId],
    queryFn: () => hierarchyService.listNodes(expandedId!),
    enabled: !!expandedId && hasAuthContext(),
  });

  const rows = listQuery.data ?? [];

  const filtered = useMemo(() => {
    let list = [...rows];
    if (purposeFilter !== "all") list = list.filter((r) => r.purpose === purposeFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.name ?? "").toLowerCase().includes(q) ||
          (r.code ?? "").toLowerCase().includes(q) ||
          purposeLabel(r.purpose).includes(q)
      );
    }
    return list;
  }, [rows, purposeFilter, search]);

  function openCreate() {
    form.reset({ code: "", name: "", purpose: "LEGAL" });
    setSheetOpen(true);
  }

  function openAddNode(h: HierarchyDto) {
    setActiveHierarchy(h);
    setExpandedId(h.hierarchy_id);
    nodeForm.reset({
      entity_type: "COMPANY",
      entity_id: companies?.[0]?.company_id ?? "",
      parent_node_id: "",
    });
    setNodeSheetOpen(true);
  }

  async function submitHier(v: HierForm) {
    if (!canManage) return;
    setBusy(true);
    try {
      await hierarchyService.create({
        code: v.code.trim(),
        name: v.name.trim(),
        purpose: v.purpose,
      });
      toast.success("سلسله‌مراتب ثبت شد");
      setSheetOpen(false);
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function submitNode(v: NodeForm) {
    if (!canManage || !activeHierarchy) return;
    if (!v.entity_id) {
      toast.message("موجودیت را انتخاب کنید.");
      return;
    }
    setBusy(true);
    try {
      await hierarchyService.addNode(activeHierarchy.hierarchy_id, {
        entity_type: v.entity_type,
        entity_id: v.entity_id,
        parent_node_id: v.parent_node_id || null,
      });
      toast.success("گره به سلسله‌مراتب افزوده شد");
      setNodeSheetOpen(false);
      await qc.invalidateQueries({ queryKey: ["org", "hierarchy-nodes", activeHierarchy.hierarchy_id] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function entityName(node: HierarchyNodeDto): string {
    if (node.entity_type === "COMPANY") {
      const c = (companies ?? []).find((x) => x.company_id === node.entity_id);
      if (c) return c.legal_name || c.name || node.entity_id.slice(0, 8);
    }
    return `${ENTITY_LABEL[node.entity_type] ?? node.entity_type} · ${node.entity_id.slice(0, 8)}…`;
  }

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="سلسله‌مراتب"
          description="نقشه‌های درختی برای ساختار حقوقی، مدیریتی و استقرار"
          breadcrumbs={[
            { label: "سازمان", href: "/dashboard/organization" },
            { label: "سلسله‌مراتب" },
          ]}
          icon={<Network className="h-4 w-4" />}
        />
        <EmptyState title="دسترسی ندارید" description="برای مشاهده این بخش مجوز لازم را ندارید." />
      </div>
    );
  }

  const showSkeleton = listQuery.isLoading && !listQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="سلسله‌مراتب"
        description="تعریف درخت‌های موازی با هدف حقوقی، مدیریتی، مالیاتی یا استقرار"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "سلسله‌مراتب" },
        ]}
        icon={<Network className="h-4 w-4" />}
        actions={
          canManage ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> سلسله‌مراتب جدید
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 ps-9"
            placeholder="جستجو در نام، کد، هدف…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={purposeFilter} onValueChange={setPurposeFilter}>
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder="هدف" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه هدف‌ها</SelectItem>
            {Object.entries(PURPOSE_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className={cn("rounded-xl border bg-card", listQuery.isFetching && listQuery.data ? "opacity-70" : "")}>
        {showSkeleton ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : listQuery.isError ? (
          <div className="p-6 text-sm text-destructive">
            {listQuery.error instanceof ApiClientError ? listQuery.error.message : MSG_ERR}
            <Button variant="outline" size="sm" className="ms-2" onClick={() => void listQuery.refetch()}>تلاش مجدد</Button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Network}
            title="سلسله‌مراتبی ثبت نشده"
            description="برای شروع، اولین درخت سازمانی را ثبت کنید."
            actionLabel={canManage ? "سلسله‌مراتب جدید" : undefined}
            onAction={canManage ? openCreate : undefined}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>نام</TableHead>
                <TableHead>کد</TableHead>
                <TableHead>هدف</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="w-[120px]">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((h) => {
                const open = expandedId === h.hierarchy_id;
                return (
                  <Fragment key={h.hierarchy_id}>
                    <TableRow>
                      <TableCell>
                        <button
                          type="button"
                          className="rounded p-1 hover:bg-muted"
                          onClick={() => toggleExpand(h.hierarchy_id)}
                          aria-label={open ? "بستن گره‌ها" : "نمایش گره‌ها"}
                        >
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </button>
                      </TableCell>
                      <TableCell className="font-medium">{h.name}</TableCell>
                      <TableCell className="font-mono text-xs" dir="ltr">{h.code}</TableCell>
                      <TableCell>{purposeLabel(h.purpose)}</TableCell>
                      <TableCell>
                        <StatusChip
                          label={h.is_active !== false ? "فعال" : "غیرفعال"}
                          tone={h.is_active !== false ? "success" : "neutral"}
                        />
                      </TableCell>
                      <TableCell>
                        {canManage ? (
                          <Button size="sm" variant="outline" className="h-8" onClick={() => openAddNode(h)}>
                            <GitBranch className="h-3.5 w-3.5" /> افزودن گره
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                    {open ? (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={6} className="p-3">
                          {nodesQuery.isLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" /> در حال بارگذاری گره‌ها…
                            </div>
                          ) : (nodesQuery.data ?? []).length === 0 ? (
                            <p className="text-sm text-muted-foreground">هنوز گره‌ای ثبت نشده است.</p>
                          ) : (
                            <ul className="space-y-1 text-sm">
                              {(nodesQuery.data ?? [])
                                .slice()
                                .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                                .map((n) => (
                                  <li
                                    key={n.node_id}
                                    className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-1.5"
                                  >
                                    <span className="text-xs text-muted-foreground">
                                      {ENTITY_LABEL[n.entity_type] ?? n.entity_type}
                                    </span>
                                    <span className="font-medium">{entityName(n)}</span>
                                    {n.parent_node_id ? (
                                      <span className="text-xs text-muted-foreground">
                                        (زیر گره {n.parent_node_id.slice(0, 6)}…)
                                      </span>
                                    ) : (
                                      <span className="text-xs text-emerald-600">ریشه</span>
                                    )}
                                  </li>
                                ))}
                            </ul>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {toFaDigits(filtered.length)} سلسله‌مراتب
      </p>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>سلسله‌مراتب جدید</SheetTitle>
          </SheetHeader>
          <form className="flex flex-1 flex-col" onSubmit={form.handleSubmit(submitHier)}>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>کد *</Label>
                  <Input dir="ltr" className="h-9" {...form.register("code", { required: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>هدف *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    {...form.register("purpose", { required: true })}
                  >
                    {Object.entries(PURPOSE_LABEL).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>نام *</Label>
                <Input className="h-9" {...form.register("name", { required: true })} />
              </div>
            </div>
            <SheetFooter className="gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={busy || !canManage}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={nodeSheetOpen} onOpenChange={setNodeSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>افزودن گره به «{activeHierarchy?.name}»</SheetTitle>
          </SheetHeader>
          <form className="flex flex-1 flex-col" onSubmit={nodeForm.handleSubmit(submitNode)}>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="space-y-1.5">
                <Label>نوع موجودیت</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...nodeForm.register("entity_type")}
                >
                  {Object.entries(ENTITY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>موجودیت *</Label>
                {nodeForm.watch("entity_type") === "COMPANY" ? (
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    {...nodeForm.register("entity_id", { required: true })}
                  >
                    <option value="">انتخاب شرکت</option>
                    {(companies ?? []).map((c) => (
                      <option key={c.company_id} value={c.company_id}>
                        {c.legal_name || c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    dir="ltr"
                    className="h-9"
                    placeholder="شناسه موجودیت (UUID)"
                    {...nodeForm.register("entity_id", { required: true })}
                  />
                )}
                {nodeForm.watch("entity_type") !== "COMPANY" ? (
                  <p className="text-[11px] text-muted-foreground">
                    فعلاً انتخاب سریع فقط برای شرکت فعال است؛ برای بقیه شناسه را وارد کنید.
                  </p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label>گره والد (اختیاری)</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...nodeForm.register("parent_node_id")}
                >
                  <option value="">— ریشه —</option>
                  {(nodesQuery.data ?? []).map((n) => (
                    <option key={n.node_id} value={n.node_id}>
                      {ENTITY_LABEL[n.entity_type] ?? n.entity_type} · {n.node_id.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <SheetFooter className="gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setNodeSheetOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={busy || !canManage}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "افزودن"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
