/**
 * FE-ORG — فهرست سلسله‌مراتب سازمانی
 * گره‌ها با نام موجودیت نمایش داده می‌شوند (نه شناسه دیتابیس).
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
import { apiGet, ApiClientError, tokenStorage } from "@/api";
import type { ApiSuccessResponse } from "@/api/types";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { useCompanies } from "../hooks/use-companies";
import {
  businessUnitService,
  hierarchyService,
  type HierarchyDto,
  type HierarchyNodeDto,
} from "../services/org-extended-service";
import { organizationPaths } from "../services/paths";
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

type CatalogItem = { id: string; label: string; sub?: string };

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

function purposeLabel(p?: string) {
  if (!p) return "—";
  return PURPOSE_LABEL[p] ?? p;
}

function unwrapList<T>(envelope: unknown): T[] {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    const d = (envelope as ApiSuccessResponse<T[] | { data?: T[] }>).data;
    if (Array.isArray(d)) return d;
    if (d && typeof d === "object" && Array.isArray((d as { data?: T[] }).data)) {
      return (d as { data: T[] }).data;
    }
  }
  return Array.isArray(envelope) ? (envelope as T[]) : [];
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

  const buQuery = useQuery({
    queryKey: ["org", "business-units", "active"],
    queryFn: () => businessUnitService.list({ membership: "active" }),
    enabled: canView && hasAuthContext(),
    staleTime: 60_000,
  });

  /** شعب + واحدهای سازمانی + مراکز هزینه از همه شرکت‌ها (برای برچسب و فرم) */
  const structureCatalog = useQuery({
    queryKey: ["org", "hierarchy-structure-catalog", (companies ?? []).map((c) => c.company_id).join(",")],
    queryFn: async () => {
      const list = companies ?? [];
      const branches: CatalogItem[] = [];
      const departments: CatalogItem[] = [];
      const costCenters: CatalogItem[] = [];

      await Promise.all(
        list.map(async (c) => {
          const cName = c.legal_name || c.name || "";
          try {
            const brEnv = await apiGet(organizationPaths.companyBranches(c.company_id));
            for (const b of unwrapList<{ branch_id: string; name?: string; code?: string }>(brEnv)) {
              branches.push({
                id: b.branch_id,
                label: b.name || b.code || b.branch_id,
                sub: cName,
              });
            }
          } catch { /* skip */ }
          try {
            const depEnv = await apiGet(organizationPaths.companyDepartments(c.company_id));
            for (const d of unwrapList<{ department_id: string; name?: string; code?: string }>(depEnv)) {
              departments.push({
                id: d.department_id,
                label: d.name || d.code || d.department_id,
                sub: cName,
              });
            }
          } catch { /* skip */ }
          try {
            const ccEnv = await apiGet(organizationPaths.companyCostCenters(c.company_id));
            for (const cc of unwrapList<{ cost_center_id: string; name?: string; code?: string }>(ccEnv)) {
              costCenters.push({
                id: cc.cost_center_id,
                label: cc.name || cc.code || cc.cost_center_id,
                sub: cName,
              });
            }
          } catch { /* skip */ }
        })
      );

      return { branches, departments, costCenters };
    },
    enabled: canView && hasAuthContext() && (companies ?? []).length > 0,
    staleTime: 60_000,
  });

  const companyCatalog: CatalogItem[] = useMemo(
    () =>
      (companies ?? []).map((c) => ({
        id: c.company_id,
        label: c.legal_name || c.name || c.code,
        sub: c.code,
      })),
    [companies]
  );

  const buCatalog: CatalogItem[] = useMemo(
    () =>
      (buQuery.data ?? []).map((b) => ({
        id: b.business_unit_id,
        label: b.name || b.code,
        sub: b.code,
      })),
    [buQuery.data]
  );

  const entityCatalog = useMemo(() => {
    return {
      COMPANY: companyCatalog,
      BRANCH: structureCatalog.data?.branches ?? [],
      DEPARTMENT: structureCatalog.data?.departments ?? [],
      BUSINESS_UNIT: buCatalog,
      COST_CENTER: structureCatalog.data?.costCenters ?? [],
    } as Record<string, CatalogItem[]>;
  }, [companyCatalog, buCatalog, structureCatalog.data]);

  function resolveEntityLabel(entityType: string, entityId: string): string {
    const hit = (entityCatalog[entityType] ?? []).find((x) => x.id === entityId);
    if (hit) return hit.label;
    return `${ENTITY_LABEL[entityType] ?? entityType}`;
  }

  function resolveEntitySub(entityType: string, entityId: string): string | undefined {
    const hit = (entityCatalog[entityType] ?? []).find((x) => x.id === entityId);
    return hit?.sub;
  }

  const nodeById = useMemo(() => {
    const map = new Map<string, HierarchyNodeDto>();
    for (const n of nodesQuery.data ?? []) map.set(n.node_id, n);
    return map;
  }, [nodesQuery.data]);

  function parentCaption(node: HierarchyNodeDto): string | null {
    if (!node.parent_node_id) return null;
    const parent = nodeById.get(node.parent_node_id);
    if (!parent) return "زیرمجموعه";
    return `زیر ${resolveEntityLabel(parent.entity_type, parent.entity_id)}`;
  }

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
    const firstCompany = companyCatalog[0]?.id ?? "";
    nodeForm.reset({
      entity_type: "COMPANY",
      entity_id: firstCompany,
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

  const watchedType = nodeForm.watch("entity_type");
  const optionsForType = entityCatalog[watchedType] ?? [];

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
                          {nodesQuery.isLoading || structureCatalog.isLoading || buQuery.isLoading ? (
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
                                .map((n) => {
                                  const name = resolveEntityLabel(n.entity_type, n.entity_id);
                                  const sub = resolveEntitySub(n.entity_type, n.entity_id);
                                  const parentTxt = parentCaption(n);
                                  return (
                                    <li
                                      key={n.node_id}
                                      className="flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-1.5"
                                    >
                                      <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                        {ENTITY_LABEL[n.entity_type] ?? n.entity_type}
                                      </span>
                                      <span className="font-medium">{name}</span>
                                      {sub ? (
                                        <span className="text-xs text-muted-foreground">{sub}</span>
                                      ) : null}
                                      {parentTxt ? (
                                        <span className="text-xs text-muted-foreground">({parentTxt})</span>
                                      ) : (
                                        <span className="text-xs text-emerald-600">ریشه</span>
                                      )}
                                    </li>
                                  );
                                })}
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
                  {...nodeForm.register("entity_type", {
                    onChange: () => {
                      nodeForm.setValue("entity_id", "");
                    },
                  })}
                >
                  {Object.entries(ENTITY_LABEL).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>موجودیت *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...nodeForm.register("entity_id", { required: true })}
                >
                  <option value="">انتخاب کنید</option>
                  {optionsForType.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}{item.sub ? ` — ${item.sub}` : ""}
                    </option>
                  ))}
                </select>
                {optionsForType.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">
                    موردی برای این نوع ثبت نشده است.
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
                      {ENTITY_LABEL[n.entity_type] ?? n.entity_type}
                      {" · "}
                      {resolveEntityLabel(n.entity_type, n.entity_id)}
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
