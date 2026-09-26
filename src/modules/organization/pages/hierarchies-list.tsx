/**
 * FE-ORG — سلسله‌مراتب
 */
"use client";

import { Fragment, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown, ChevronLeft, GitBranch, Info, Loader2, Network, Plus, RefreshCw, Search, Sparkles,
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
import Link from "next/link";

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

const PARENT_CHILD_TYPES: Record<string, string[]> = {
  COMPANY: ["COMPANY", "BRANCH", "DEPARTMENT", "BUSINESS_UNIT", "COST_CENTER"],
  BRANCH: ["DEPARTMENT"],
  DEPARTMENT: ["DEPARTMENT", "COST_CENTER"],
  BUSINESS_UNIT: [],
  COST_CENTER: [],
};

const PURPOSE_ENTITY_TYPES: Record<string, string[]> = {
  LEGAL: ["COMPANY"],
  ESTABLISHMENT: ["COMPANY", "BRANCH"],
  MANAGEMENT: ["COMPANY", "BUSINESS_UNIT", "DEPARTMENT", "COST_CENTER"],
  TAX: ["COMPANY"],
  CUSTOM: ["COMPANY", "BRANCH", "DEPARTMENT", "BUSINESS_UNIT", "COST_CENTER"],
};

type HierForm = { code: string; name: string; purpose: string };
type NodeForm = { entity_type: string; entity_id: string; parent_node_id: string };
type CatalogItem = { id: string; label: string; sub?: string };
type HierarchyTier = "simple" | "standard" | "advanced";

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

function purposeLabel(p?: string) {
  return p ? PURPOSE_LABEL[p] ?? p : "—";
}

function unwrapList<T>(envelope: unknown): T[] {
  if (envelope && typeof envelope === "object" && "data" in envelope) {
    const d = (envelope as ApiSuccessResponse<T[] | { data?: T[] }>).data;
    if (Array.isArray(d)) return d;
    if (d && typeof d === "object" && Array.isArray((d as { data?: T[] }).data)) return (d as { data: T[] }).data;
  }
  return Array.isArray(envelope) ? (envelope as T[]) : [];
}

export function HierarchiesListPage() {
  const qc = useQueryClient();
  const canView = usePermission(OrganizationPermissions.hierarchyView) || usePermission(OrganizationPermissions.companyView);
  const canManage = usePermission(OrganizationPermissions.hierarchyManage) || usePermission(OrganizationPermissions.companyUpdate);
  const { data: companies } = useCompanies();

  const [search, setSearch] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [nodeSheetOpen, setNodeSheetOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeHierarchy, setActiveHierarchy] = useState<HierarchyDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedHierIds, setSelectedHierIds] = useState<string[]>([]);
  const [membership, setMembership] = useState<"active" | "deleted">("active");
  const [nodeMembership, setNodeMembership] = useState<"active" | "deleted">("active");
  const [rebuildOpen, setRebuildOpen] = useState(false);
  const [rebuildPreview, setRebuildPreview] = useState<{
    has_changes: boolean;
    summary: Record<string, number>;
    items: { kind: string; message: string }[];
  } | null>(null);

  const form = useForm<HierForm>({ defaultValues: { code: "", name: "", purpose: "CUSTOM" } });
  const nodeForm = useForm<NodeForm>({ defaultValues: { entity_type: "COMPANY", entity_id: "", parent_node_id: "" } });

  const listQuery = useQuery({
    queryKey: ["org", "hierarchies", membership],
    queryFn: () => hierarchyService.list({ membership }),
    enabled: canView && hasAuthContext(),
  });

  const nodesQuery = useQuery({
    queryKey: ["org", "hierarchy-nodes", expandedId, nodeMembership],
    queryFn: () => hierarchyService.listNodes(expandedId!, { membership: nodeMembership }),
    enabled: !!expandedId && hasAuthContext(),
  });

  const buQuery = useQuery({
    queryKey: ["org", "business-units", "active"],
    queryFn: () => businessUnitService.list({ membership: "active" }),
    enabled: canView && hasAuthContext(),
    staleTime: 60_000,
  });

  const structureCatalog = useQuery({
    queryKey: ["org", "hierarchy-structure-catalog", (companies ?? []).map((c) => c.company_id).join(",")],
    queryFn: async () => {
      const list = companies ?? [];
      const branches: CatalogItem[] = [];
      const departments: CatalogItem[] = [];
      const costCenters: CatalogItem[] = [];
      let branchCount = 0;
      await Promise.all(
        list.map(async (c) => {
          const cName = c.legal_name || c.name || "";
          try {
            const brs = unwrapList<{ branch_id: string; name?: string; code?: string }>(await apiGet(organizationPaths.companyBranches(c.company_id)));
            branchCount += brs.length;
            for (const b of brs) branches.push({ id: b.branch_id, label: b.name || b.code || "شعبه", sub: cName });
          } catch { /* */ }
          try {
            for (const d of unwrapList<{ department_id: string; name?: string; code?: string }>(await apiGet(organizationPaths.companyDepartments(c.company_id))))
              departments.push({ id: d.department_id, label: d.name || d.code || "واحد", sub: cName });
          } catch { /* */ }
          try {
            for (const cc of unwrapList<{ cost_center_id: string; name?: string; code?: string }>(await apiGet(organizationPaths.companyCostCenters(c.company_id))))
              costCenters.push({ id: cc.cost_center_id, label: cc.name || cc.code || "مرکز هزینه", sub: cName });
          } catch { /* */ }
        })
      );
      return { branches, departments, costCenters, branchCount };
    },
    enabled: canView && hasAuthContext() && (companies ?? []).length > 0,
    staleTime: 60_000,
  });

  const companyCount = (companies ?? []).length;
  const branchCount = structureCatalog.data?.branchCount ?? 0;
  const buCount = (buQuery.data ?? []).length;
  const tier: HierarchyTier = useMemo(() => {
    if (companyCount <= 1 && branchCount <= 1 && buCount <= 1) return "simple";
    if (companyCount > 1 || buCount > 1) return "advanced";
    return "standard";
  }, [companyCount, branchCount, buCount]);

  const companyCatalog: CatalogItem[] = useMemo(
    () => (companies ?? []).map((c) => ({ id: c.company_id, label: c.legal_name || c.name || c.code, sub: c.code })),
    [companies]
  );
  const buCatalog: CatalogItem[] = useMemo(
    () => (buQuery.data ?? []).map((b) => ({ id: b.business_unit_id, label: b.name || b.code, sub: b.code })),
    [buQuery.data]
  );
  const entityCatalog = useMemo(
    () =>
      ({
        COMPANY: companyCatalog,
        BRANCH: structureCatalog.data?.branches ?? [],
        DEPARTMENT: structureCatalog.data?.departments ?? [],
        BUSINESS_UNIT: buCatalog,
        COST_CENTER: structureCatalog.data?.costCenters ?? [],
      }) as Record<string, CatalogItem[]>,
    [companyCatalog, buCatalog, structureCatalog.data]
  );

  function resolveEntityLabel(entityType: string, entityId: string): string {
    return (entityCatalog[entityType] ?? []).find((x) => x.id === entityId)?.label ?? ENTITY_LABEL[entityType] ?? "مورد";
  }

  const indentedNodes = useMemo(() => {
    const nodes = nodesQuery.data ?? [];
    const byParent = new Map<string, HierarchyNodeDto[]>();
    for (const n of nodes) {
      const k = n.parent_node_id || "__root__";
      const arr = byParent.get(k) ?? [];
      arr.push(n);
      byParent.set(k, arr);
    }
    for (const arr of byParent.values()) arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const out: { node: HierarchyNodeDto; depth: number }[] = [];
    const walk = (parentKey: string, depth: number) => {
      for (const n of byParent.get(parentKey) ?? []) {
        out.push({ node: n, depth });
        walk(n.node_id, depth + 1);
      }
    };
    walk("__root__", 0);
    const seen = new Set(out.map((x) => x.node.node_id));
    for (const n of nodes) if (!seen.has(n.node_id)) out.push({ node: n, depth: 0 });
    return out;
  }, [nodesQuery.data]);

  function descendantIds(rootId: string): string[] {
    const nodes = nodesQuery.data ?? [];
    const byParent = new Map<string, string[]>();
    for (const n of nodes) {
      const k = n.parent_node_id || "__root__";
      const arr = byParent.get(k) ?? [];
      arr.push(n.node_id);
      byParent.set(k, arr);
    }
    const out: string[] = [];
    const stack = [...(byParent.get(rootId) ?? [])];
    while (stack.length) {
      const id = stack.pop()!;
      out.push(id);
      for (const c of byParent.get(id) ?? []) stack.push(c);
    }
    return out;
  }

  function toggleNodeSelect(nodeId: string, checked: boolean) {
    const cascade = [nodeId, ...descendantIds(nodeId)];
    setSelectedNodeIds((prev) => {
      if (checked) {
        const s = new Set(prev);
        cascade.forEach((id) => s.add(id));
        return Array.from(s);
      }
      const drop = new Set(cascade);
      return prev.filter((id) => !drop.has(id));
    });
  }

  const rows = listQuery.data ?? [];
  const filtered = useMemo(() => {
    let list = [...rows];
    if (purposeFilter !== "all") list = list.filter((r) => r.purpose === purposeFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((r) => (r.name ?? "").toLowerCase().includes(q) || (r.code ?? "").toLowerCase().includes(q) || purposeLabel(r.purpose).includes(q));
    return list;
  }, [rows, purposeFilter, search]);

  const allowCreateHierarchy = canManage && tier === "advanced";
  const allowAddNode = canManage && (tier === "advanced" || tier === "standard") && membership === "active";

  async function openRebuildPreview() {
    if (!canManage) return;
    setBusy(true);
    try {
      const preview = await hierarchyService.previewRebuild();
      setRebuildPreview(preview);
      setRebuildOpen(true);
      if (!preview?.has_changes) toast.message("تفاوتی با حالت پلتفرم نیست.");
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function confirmRebuild() {
    if (!canManage) return;
    if (rebuildPreview && !rebuildPreview.has_changes) {
      setRebuildOpen(false);
      return;
    }
    setBusy(true);
    try {
      const data = await hierarchyService.rebuild();
      if (data?.skipped) toast.message("بازنشانی لازم نبود.");
      else {
        const r = data?.rebuild as { companies?: number; branches?: number; custom_removed?: number } | undefined;
        toast.success(r ? `بازنشانی روز‌اول: ${toFaDigits(r.companies ?? 0)} شرکت · ${toFaDigits(r.branches ?? 0)} شعبه · سفارشی حذف‌شده ${toFaDigits(r.custom_removed ?? 0)}` : "هم‌تراز شد");
      }
      setRebuildOpen(false);
      setRebuildPreview(null);
      setMembership("active");
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
      await qc.invalidateQueries({ queryKey: ["org", "hierarchy-nodes"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function submitHier(v: HierForm) {
    if (!canManage) return;
    setBusy(true);
    try {
      await hierarchyService.create({ code: v.code.trim(), name: v.name.trim(), purpose: v.purpose });
      toast.success("ثبت شد");
      setSheetOpen(false);
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function submitNode(v: NodeForm) {
    if (!canManage || !activeHierarchy || !v.entity_id) return;
    setBusy(true);
    try {
      await hierarchyService.addNode(activeHierarchy.hierarchy_id, {
        entity_type: v.entity_type,
        entity_id: v.entity_id,
        parent_node_id: v.parent_node_id || null,
      });
      toast.success("افزوده شد");
      setNodeSheetOpen(false);
      await qc.invalidateQueries({ queryKey: ["org", "hierarchy-nodes", activeHierarchy.hierarchy_id] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function runHierAction(action: "activate" | "deactivate" | "delete" | "restore") {
    if (!canManage || selectedHierIds.length === 0) return;
    setBusy(true);
    try {
      for (const id of selectedHierIds) {
        if (action === "activate") await hierarchyService.setActive(id, true);
        else if (action === "deactivate") await hierarchyService.setActive(id, false);
        else if (action === "delete") await hierarchyService.softDelete(id);
        else await hierarchyService.restore(id);
      }
      toast.success("اعمال شد");
      setSelectedHierIds([]);
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function runBulkNodes(action: "activate" | "deactivate" | "delete") {
    if (!canManage || selectedNodeIds.length === 0) return;
    setBusy(true);
    try {
      await hierarchyService.bulkNodes(selectedNodeIds, action);
      toast.success("اعمال شد");
      setSelectedNodeIds([]);
      await qc.invalidateQueries({ queryKey: ["org", "hierarchy-nodes", expandedId] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="سلسله‌مراتب" description="نقشه سازمان" breadcrumbs={[{ label: "سازمان", href: "/dashboard/organization" }, { label: "سلسله‌مراتب" }]} icon={<Network className="h-4 w-4" />} />
        <EmptyState title="دسترسی ندارید" description="مجوز مشاهده ندارید." />
      </div>
    );
  }

  // فقط وقتی هیچ درختی نیست و سطح ساده است، پیام ساده نشان بده — جدول را قایم نکن
  if (tier === "simple" && !structureCatalog.isLoading && !listQuery.isLoading && membership === "active" && rows.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="سلسله‌مراتب" description="سازمان تک‌خطی" breadcrumbs={[{ label: "سازمان", href: "/dashboard/organization" }, { label: "سلسله‌مراتب" }]} icon={<Network className="h-4 w-4" />} />
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold">هنوز درخت سیستمی نیست</h2>
          <p className="text-sm text-muted-foreground">بازنشانی از سازمان را بزنید تا از روی شرکت و شعبه ساخته شود.</p>
          {canManage ? <Button size="sm" disabled={busy} onClick={openRebuildPreview}>بازنشانی از سازمان</Button> : null}
        </div>
      </div>
    );
  }

  const showSkeleton = listQuery.isLoading && !listQuery.data;
  const watchedType = nodeForm.watch("entity_type");
  const optionsForType = entityCatalog[watchedType] ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="سلسله‌مراتب"
        description="پایه پلتفرم = شرکت و شعبه. بازنشانی = روز اول از روی باکس‌ها."
        breadcrumbs={[{ label: "سازمان", href: "/dashboard/organization" }, { label: "سلسله‌مراتب" }]}
        icon={<Network className="h-4 w-4" />}
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={openRebuildPreview}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                بازنشانی از سازمان
              </Button>
            ) : null}
            {allowCreateHierarchy ? (
              <Button size="sm" onClick={() => { form.reset({ code: "", name: "", purpose: "CUSTOM" }); setSheetOpen(true); }}>
                <Plus className="h-4 w-4" /> سفارشی
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex gap-3 rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-2.5 text-sm dark:border-sky-900 dark:bg-sky-950/40">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="leading-relaxed">
          درخت‌های <strong>حقوقی</strong> و <strong>استقرار</strong> از شرکت و شعبه ساخته می‌شوند.
          بازنشانی درخت‌های سفارشی و گره‌های دستی را برمی‌دارد و فقط پایه را از باکس‌ها می‌سازد.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border p-0.5 text-xs">
          <button type="button" className={cn("rounded px-2.5 py-1", membership === "active" ? "bg-primary text-primary-foreground" : "text-muted-foreground")} onClick={() => { setMembership("active"); setSelectedHierIds([]); }}>فعال</button>
          <button type="button" className={cn("rounded px-2.5 py-1", membership === "deleted" ? "bg-primary text-primary-foreground" : "text-muted-foreground")} onClick={() => { setMembership("deleted"); setSelectedHierIds([]); }}>حذف‌شده</button>
        </div>
        {canManage && selectedHierIds.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 text-xs">
            {membership === "active" ? (
              <>
                <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => runHierAction("activate")}>فعال</Button>
                <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => runHierAction("deactivate")}>غیرفعال</Button>
                <Button size="sm" variant="destructive" className="h-7" disabled={busy} onClick={() => runHierAction("delete")}>حذف</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => runHierAction("restore")}>بازگردانی</Button>
            )}
          </div>
        ) : null}
        <div className="relative min-w-[160px] flex-1">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-9 ps-9" placeholder="جستجو…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" /><TableHead className="w-10" />
              <TableHead>نام</TableHead><TableHead>کد</TableHead><TableHead>هدف</TableHead><TableHead>وضعیت</TableHead><TableHead className="w-[100px]">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showSkeleton
              ? Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
              : filtered.map((h) => {
                  const open = expandedId === h.hierarchy_id;
                  return (
                    <Fragment key={h.hierarchy_id}>
                      <TableRow>
                        <TableCell>
                          {canManage ? (
                            <input type="checkbox" className="h-3.5 w-3.5" checked={selectedHierIds.includes(h.hierarchy_id)} onChange={() => setSelectedHierIds((p) => p.includes(h.hierarchy_id) ? p.filter((x) => x !== h.hierarchy_id) : [...p, h.hierarchy_id])} />
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => { setExpandedId(open ? null : h.hierarchy_id); setSelectedNodeIds([]); setNodeMembership("active"); }}>
                            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">{h.name}</TableCell>
                        <TableCell className="font-mono text-xs" dir="ltr">{h.code}</TableCell>
                        <TableCell>{purposeLabel(h.purpose)}</TableCell>
                        <TableCell><StatusChip label={h.is_active !== false ? "فعال" : "غیرفعال"} tone={h.is_active !== false ? "success" : "neutral"} /></TableCell>
                        <TableCell>
                          {allowAddNode ? (
                            <Button size="sm" variant="outline" className="h-8" onClick={() => { setActiveHierarchy(h); setExpandedId(h.hierarchy_id); nodeForm.reset({ entity_type: (PURPOSE_ENTITY_TYPES[h.purpose] ?? ["COMPANY"])[0] ?? "COMPANY", entity_id: "", parent_node_id: "" }); setNodeSheetOpen(true); }}>
                              <GitBranch className="h-3.5 w-3.5" /> افزودن
                            </Button>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                      </TableRow>
                      {open ? (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={7} className="p-3">
                            {nodesQuery.isLoading ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…</div>
                            ) : indentedNodes.length === 0 ? (
                              <p className="text-sm text-muted-foreground">گره‌ای نیست — بازنشانی از سازمان را بزنید.</p>
                            ) : (
                              <ul className="space-y-1 text-sm">
                                {indentedNodes.map(({ node: n, depth }) => (
                                  <li key={n.node_id} className={cn("flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-1.5", depth > 0 && "border-s-2 border-s-primary/30")} style={{ marginInlineStart: depth * 20 }}>
                                    {canManage ? (
                                      <input type="checkbox" className="h-3.5 w-3.5" checked={selectedNodeIds.includes(n.node_id)} onChange={() => toggleNodeSelect(n.node_id, !selectedNodeIds.includes(n.node_id))} />
                                    ) : null}
                                    <span className="text-[11px] text-muted-foreground">{ENTITY_LABEL[n.entity_type] ?? n.entity_type}</span>
                                    <span className="font-medium">{resolveEntityLabel(n.entity_type, n.entity_id)}</span>
                                    {!n.parent_node_id ? <span className="text-[11px] text-emerald-700">ریشه</span> : null}
                                  </li>
                                ))}
                              </ul>
                            )}
                            {canManage && selectedNodeIds.length > 0 ? (
                              <div className="mt-2 flex gap-2">
                                <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => runBulkNodes("activate")}>فعال</Button>
                                <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => runBulkNodes("deactivate")}>غیرفعال</Button>
                                <Button size="sm" variant="destructive" className="h-7" disabled={busy} onClick={() => runBulkNodes("delete")}>حذف</Button>
                              </div>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      <Sheet open={rebuildOpen} onOpenChange={setRebuildOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-5 py-4 text-start"><SheetTitle>پیش‌نمایش بازنشانی (روز اول)</SheetTitle></SheetHeader>
          <div className="flex-1 space-y-3 overflow-auto px-5 py-4 text-sm">
            <p className="text-muted-foreground">فقط درخت سیستمی از شرکت/شعبه. سفارشی‌ها حذف می‌شوند.</p>
            {rebuildPreview ? (
              <ul className="space-y-1.5">
                {rebuildPreview.items.map((it, i) => (
                  <li key={i} className="rounded-md border px-3 py-1.5 text-xs">{it.message}</li>
                ))}
              </ul>
            ) : null}
          </div>
          <SheetFooter className="gap-2 border-t px-5 py-3">
            <Button type="button" variant="outline" onClick={() => setRebuildOpen(false)}>انصراف</Button>
            <Button type="button" disabled={busy || !rebuildPreview?.has_changes} onClick={confirmRebuild}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأیید و بازنشانی"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <form onSubmit={form.handleSubmit(submitHier)} className="flex h-full flex-col">
            <SheetHeader className="border-b px-5 py-4 text-start"><SheetTitle>درخت سفارشی</SheetTitle></SheetHeader>
            <div className="flex-1 space-y-4 overflow-auto px-5 py-4">
              <div className="space-y-1.5"><Label>کد</Label><Input dir="ltr" {...form.register("code", { required: true })} /></div>
              <div className="space-y-1.5"><Label>نام</Label><Input {...form.register("name", { required: true })} /></div>
            </div>
            <SheetFooter className="gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={busy}>ثبت</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={nodeSheetOpen} onOpenChange={setNodeSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <form onSubmit={nodeForm.handleSubmit(submitNode)} className="flex h-full flex-col">
            <SheetHeader className="border-b px-5 py-4 text-start"><SheetTitle>افزودن گره</SheetTitle></SheetHeader>
            <div className="flex-1 space-y-4 overflow-auto px-5 py-4">
              <div className="space-y-1.5">
                <Label>نوع</Label>
                <Select value={nodeForm.watch("entity_type")} onValueChange={(v) => { nodeForm.setValue("entity_type", v); nodeForm.setValue("entity_id", ""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ENTITY_LABEL)
                      .filter(([k]) => (PURPOSE_ENTITY_TYPES[activeHierarchy?.purpose ?? "CUSTOM"] ?? Object.keys(ENTITY_LABEL)).includes(k))
                      .map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>مورد</Label>
                <select className="flex h-9 w-full rounded-md border px-3 text-sm" {...nodeForm.register("entity_id", { required: true })}>
                  <option value="">انتخاب</option>
                  {optionsForType.map((item) => (<option key={item.id} value={item.id}>{item.label}</option>))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>والد (خالی = ریشه)</Label>
                <select className="flex h-9 w-full rounded-md border px-3 text-sm" {...nodeForm.register("parent_node_id")}>
                  <option value="">— ریشه —</option>
                  {(nodesQuery.data ?? []).map((n) => (
                    <option key={n.node_id} value={n.node_id}>{ENTITY_LABEL[n.entity_type]} · {resolveEntityLabel(n.entity_type, n.entity_id)}</option>
                  ))}
                </select>
              </div>
            </div>
            <SheetFooter className="gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setNodeSheetOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={busy}>افزودن</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
