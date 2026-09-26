/**
 * FE-ORG — سلسله‌مراتب (Smart Hierarchy Product Law v1.0)
 * درخت خوانا · انتخاب آبشاری · حذف/بازگردانی · بازنشانی واقعی
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

const PURPOSE_HINT: Record<string, string> = {
  LEGAL: "از روی شرکت‌ها و رابطهٔ مادر/زیرمجموعه ساخته می‌شود",
  ESTABLISHMENT: "از روی شرکت و شعبه‌های هر شرکت ساخته می‌شود",
  MANAGEMENT: "نمای مدیریتی (در صورت وجود داده)",
  TAX: "در نسخهٔ فعلی به‌صورت خودکار اجباری نیست",
  CUSTOM: "معمولاً بر اساس واحدهای کسب‌وکار",
};

const ENTITY_LABEL: Record<string, string> = {
  COMPANY: "شرکت",
  BRANCH: "شعبه",
  DEPARTMENT: "واحد سازمانی",
  BUSINESS_UNIT: "واحد کسب‌وکار",
  COST_CENTER: "مرکز هزینه",
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
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedHierIds, setSelectedHierIds] = useState<string[]>([]);
  const [membership, setMembership] = useState<"active" | "deleted">("active");
  const [nodeMembership, setNodeMembership] = useState<"active" | "deleted">("active");

  const form = useForm<HierForm>({ defaultValues: { code: "", name: "", purpose: "LEGAL" } });
  const nodeForm = useForm<NodeForm>({
    defaultValues: { entity_type: "COMPANY", entity_id: "", parent_node_id: "" },
  });

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
            const brEnv = await apiGet(organizationPaths.companyBranches(c.company_id));
            const brs = unwrapList<{ branch_id: string; name?: string; code?: string }>(brEnv);
            branchCount += brs.length;
            for (const b of brs) branches.push({ id: b.branch_id, label: b.name || b.code || "شعبه", sub: cName });
          } catch { /* skip */ }
          try {
            const depEnv = await apiGet(organizationPaths.companyDepartments(c.company_id));
            for (const d of unwrapList<{ department_id: string; name?: string; code?: string }>(depEnv))
              departments.push({ id: d.department_id, label: d.name || d.code || "واحد", sub: cName });
          } catch { /* skip */ }
          try {
            const ccEnv = await apiGet(organizationPaths.companyCostCenters(c.company_id));
            for (const cc of unwrapList<{ cost_center_id: string; name?: string; code?: string }>(ccEnv))
              costCenters.push({ id: cc.cost_center_id, label: cc.name || cc.code || "مرکز هزینه", sub: cName });
          } catch { /* skip */ }
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
  function resolveEntitySub(entityType: string, entityId: string): string | undefined {
    return (entityCatalog[entityType] ?? []).find((x) => x.id === entityId)?.sub;
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

  const allowCreateHierarchy = canManage && tier === "advanced";
  const allowAddNode = canManage && (tier === "advanced" || tier === "standard") && membership === "active";

  function openCreate() {
    if (!allowCreateHierarchy) {
      toast.message("در این سطح، درخت‌ها توسط سیستم از روی شرکت و شعبه ساخته می‌شوند.");
      return;
    }
    form.reset({ code: "", name: "", purpose: "CUSTOM" });
    setSheetOpen(true);
  }

  function openAddNode(h: HierarchyDto) {
    if (!allowAddNode) {
      toast.message("برای تغییر ساختار، شرکت یا شعبه را از همان بخش‌ها ویرایش کنید.");
      return;
    }
    setActiveHierarchy(h);
    setExpandedId(h.hierarchy_id);
    const allowed = PURPOSE_ENTITY_TYPES[h.purpose] ?? ["COMPANY"];
    nodeForm.reset({ entity_type: allowed[0] ?? "COMPANY", entity_id: "", parent_node_id: "" });
    setNodeSheetOpen(true);
  }

  async function submitHier(v: HierForm) {
    if (!canManage) return;
    setBusy(true);
    try {
      await hierarchyService.create({ code: v.code.trim(), name: v.name.trim(), purpose: v.purpose });
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
      toast.success("به نقشه افزوده شد");
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
    setSelectedNodeIds([]);
    setNodeMembership("active");
  }

  async function doRebuild() {
    if (!canManage) return;
    setBusy(true);
    try {
      const data = (await hierarchyService.rebuild()) as {
        rebuild?: { companies?: number; branches?: number };
      };
      const r = data?.rebuild;
      toast.success(
        r
          ? `بازنشانی انجام شد: ${toFaDigits(r.companies ?? 0)} شرکت · ${toFaDigits(r.branches ?? 0)} شعبه`
          : "درخت‌های سیستمی بازسازی شدند"
      );
      setMembership("active");
      setNodeMembership("active");
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
      await qc.invalidateQueries({ queryKey: ["org", "hierarchy-nodes"] });
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
      toast.success("روی درخت‌های انتخاب‌شده اعمال شد");
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
      const res = await hierarchyService.bulkNodes(selectedNodeIds, action);
      toast.success(`اعمال شد (${toFaDigits(res?.affected ?? selectedNodeIds.length)})`);
      setSelectedNodeIds([]);
      await qc.invalidateQueries({ queryKey: ["org", "hierarchy-nodes", expandedId] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function restoreSelectedNodes() {
    if (!canManage || selectedNodeIds.length === 0) return;
    setBusy(true);
    try {
      for (const id of selectedNodeIds) await hierarchyService.restoreNode(id);
      toast.success("گره‌ها بازگردانی شدند");
      setSelectedNodeIds([]);
      setNodeMembership("active");
      await qc.invalidateQueries({ queryKey: ["org", "hierarchy-nodes"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  const watchedType = nodeForm.watch("entity_type");
  const optionsForType = entityCatalog[watchedType] ?? [];

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="سلسله‌مراتب" description="نقشهٔ ساختار سازمان" breadcrumbs={[{ label: "سازمان", href: "/dashboard/organization" }, { label: "سلسله‌مراتب" }]} icon={<Network className="h-4 w-4" />} />
        <EmptyState title="دسترسی ندارید" description="برای مشاهده این بخش مجوز لازم را ندارید." />
      </div>
    );
  }

  if (tier === "simple" && !structureCatalog.isLoading && !listQuery.isLoading && membership === "active") {
    return (
      <div className="space-y-6">
        <PageHeader title="سلسله‌مراتب" description="سازمان تک‌خطی" breadcrumbs={[{ label: "سازمان", href: "/dashboard/organization" }, { label: "سلسله‌مراتب" }]} icon={<Network className="h-4 w-4" />} />
        <div className="rounded-xl border bg-card p-6">
          <div className="flex max-w-lg flex-col gap-3">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold">ساختار ساده — سیستم خودش مدیریت می‌کند</h2>
            <p className="text-sm text-muted-foreground">با یک شرکت، درخت را دستی نچینید. از بخش شرکت و شعبه کار کنید.</p>
            <Button asChild size="sm"><Link href="/dashboard/organization/companies">شرکت‌ها</Link></Button>
          </div>
        </div>
      </div>
    );
  }

  const showSkeleton = listQuery.isLoading && !listQuery.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="سلسله‌مراتب"
        description="نقشهٔ ساختار: ریشه → شاخه اصلی → زیرشاخه"
        breadcrumbs={[{ label: "سازمان", href: "/dashboard/organization" }, { label: "سلسله‌مراتب" }]}
        icon={<Network className="h-4 w-4" />}
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={doRebuild}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                بازنشانی از سازمان
              </Button>
            ) : null}
            {allowCreateHierarchy ? (
              <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> نقشهٔ سفارشی</Button>
            ) : null}
          </div>
        }
      />

      <div className="flex gap-3 rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-2.5 text-sm dark:border-sky-900 dark:bg-sky-950/40">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1 text-sm leading-relaxed">
          <p><strong>ریشه:</strong> بالاترین سطح بدون والد (معمولاً شرکت). <strong>شاخه اصلی:</strong> سطح یک زیر ریشه. <strong>زیرشاخه:</strong> سطوح عمیق‌تر.</p>
          <p className="text-xs opacity-80">انتخاب والد، فرزندان را هم انتخاب می‌کند. حذف نرم والد، فرزندان را هم برمی‌دارد. بازنشانی فقط درخت‌های سیستمی را از شرکت/شعبه دوباره می‌سازد.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border p-0.5 text-xs">
          <button type="button" className={cn("rounded px-2.5 py-1", membership === "active" ? "bg-primary text-primary-foreground" : "text-muted-foreground")} onClick={() => { setMembership("active"); setSelectedHierIds([]); }}>درخت‌های فعال</button>
          <button type="button" className={cn("rounded px-2.5 py-1", membership === "deleted" ? "bg-primary text-primary-foreground" : "text-muted-foreground")} onClick={() => { setMembership("deleted"); setSelectedHierIds([]); }}>درخت‌های حذف‌شده</button>
        </div>
        {canManage && selectedHierIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span>{toFaDigits(selectedHierIds.length)} درخت</span>
            {membership === "active" ? (
              <>
                <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => runHierAction("activate")}>فعال</Button>
                <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => runHierAction("deactivate")}>غیرفعال</Button>
                <Button size="sm" variant="destructive" className="h-7" disabled={busy} onClick={() => runHierAction("delete")}>حذف نرم</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => runHierAction("restore")}>بازگردانی</Button>
            )}
            <Button size="sm" variant="ghost" className="h-7" onClick={() => setSelectedHierIds([])}>لغو</Button>
          </div>
        ) : null}
        <div className="relative min-w-[160px] flex-1">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-9 ps-9" placeholder="جستجو…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={purposeFilter} onValueChange={setPurposeFilter}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="هدف" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه اهداف</SelectItem>
            {Object.entries(PURPOSE_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead className="w-10" />
              <TableHead>نام درخت</TableHead>
              <TableHead>کد</TableHead>
              <TableHead>هدف</TableHead>
              <TableHead>وضعیت</TableHead>
              <TableHead className="w-[120px]">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {showSkeleton
              ? Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
              : filtered.map((h) => {
                  const open = expandedId === h.hierarchy_id;
                  return (
                    <Fragment key={h.hierarchy_id}>
                      <TableRow>
                        <TableCell>
                          {canManage ? (
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5"
                              checked={selectedHierIds.includes(h.hierarchy_id)}
                              onChange={() =>
                                setSelectedHierIds((prev) =>
                                  prev.includes(h.hierarchy_id)
                                    ? prev.filter((x) => x !== h.hierarchy_id)
                                    : [...prev, h.hierarchy_id]
                                )
                              }
                            />
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => toggleExpand(h.hierarchy_id)}>
                            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{h.name}</div>
                          {PURPOSE_HINT[h.purpose] ? <div className="mt-0.5 text-[11px] text-muted-foreground">{PURPOSE_HINT[h.purpose]}</div> : null}
                        </TableCell>
                        <TableCell className="font-mono text-xs" dir="ltr">{h.code}</TableCell>
                        <TableCell>{purposeLabel(h.purpose)}</TableCell>
                        <TableCell>
                          <StatusChip label={h.is_active !== false ? "فعال" : "غیرفعال"} tone={h.is_active !== false ? "success" : "neutral"} />
                        </TableCell>
                        <TableCell>
                          {allowAddNode ? (
                            <Button size="sm" variant="outline" className="h-8" onClick={() => openAddNode(h)}>
                              <GitBranch className="h-3.5 w-3.5" /> افزودن
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">{membership === "deleted" ? "حذف‌شده" : "—"}</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {open ? (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={7} className="p-3">
                            {nodesQuery.isLoading ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex rounded-md border p-0.5 text-[11px] w-fit">
                                  <button type="button" className={cn("rounded px-2 py-0.5", nodeMembership === "active" ? "bg-primary text-primary-foreground" : "text-muted-foreground")} onClick={() => { setNodeMembership("active"); setSelectedNodeIds([]); }}>گره‌های فعال</button>
                                  <button type="button" className={cn("rounded px-2 py-0.5", nodeMembership === "deleted" ? "bg-primary text-primary-foreground" : "text-muted-foreground")} onClick={() => { setNodeMembership("deleted"); setSelectedNodeIds([]); }}>گره‌های حذف‌شده</button>
                                </div>
                                {canManage && selectedNodeIds.length > 0 ? (
                                  <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
                                    <span>{toFaDigits(selectedNodeIds.length)} مورد (با زیرمجموعه‌ها)</span>
                                    {nodeMembership === "active" ? (
                                      <>
                                        <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => runBulkNodes("activate")}>فعال</Button>
                                        <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => runBulkNodes("deactivate")}>غیرفعال</Button>
                                        <Button size="sm" variant="destructive" className="h-7" disabled={busy} onClick={() => runBulkNodes("delete")}>حذف نرم</Button>
                                      </>
                                    ) : (
                                      <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={restoreSelectedNodes}>بازگردانی</Button>
                                    )}
                                    <Button size="sm" variant="ghost" className="h-7" onClick={() => setSelectedNodeIds([])}>لغو</Button>
                                  </div>
                                ) : null}
                                {indentedNodes.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    {nodeMembership === "deleted" ? "گره حذف‌شده‌ای نیست." : "گره‌ای نیست — بازنشانی از سازمان را بزنید."}
                                  </p>
                                ) : (
                                  <ul className="space-y-1 text-sm">
                                    {indentedNodes.map(({ node: n, depth }) => {
                                      const name = resolveEntityLabel(n.entity_type, n.entity_id);
                                      const sub = resolveEntitySub(n.entity_type, n.entity_id);
                                      const isRoot = !n.parent_node_id;
                                      const checked = selectedNodeIds.includes(n.node_id);
                                      return (
                                        <li
                                          key={n.node_id}
                                          className={cn(
                                            "flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-1.5",
                                            depth > 0 && "border-s-2 border-s-primary/30",
                                            isRoot && "border-primary/40 bg-primary/5",
                                            n.is_active === false && "opacity-60"
                                          )}
                                          style={{ marginInlineStart: depth * 20 }}
                                        >
                                          {canManage ? (
                                            <input
                                              type="checkbox"
                                              className="h-3.5 w-3.5"
                                              checked={checked}
                                              onChange={() => toggleNodeSelect(n.node_id, !checked)}
                                            />
                                          ) : null}
                                          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                                            {ENTITY_LABEL[n.entity_type] ?? n.entity_type}
                                          </span>
                                          <span className="font-medium">{name}</span>
                                          {sub ? <span className="text-xs text-muted-foreground">{sub}</span> : null}
                                          {isRoot ? (
                                            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-700">ریشه درخت</span>
                                          ) : depth === 1 ? (
                                            <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[11px] text-sky-700">شاخه اصلی</span>
                                          ) : (
                                            <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">زیرشاخه · سطح {toFaDigits(depth)}</span>
                                          )}
                                          {n.is_active === false ? <span className="text-xs text-amber-600">غیرفعال</span> : null}
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <form onSubmit={form.handleSubmit(submitHier)} className="flex h-full flex-col">
            <SheetHeader className="border-b px-5 py-4 text-start"><SheetTitle>نقشهٔ سفارشی</SheetTitle></SheetHeader>
            <div className="flex-1 space-y-4 overflow-auto px-5 py-4">
              <div className="space-y-1.5"><Label>کد *</Label><Input dir="ltr" {...form.register("code", { required: true })} /></div>
              <div className="space-y-1.5"><Label>نام *</Label><Input {...form.register("name", { required: true })} /></div>
              <div className="space-y-1.5">
                <Label>هدف</Label>
                <Select value={form.watch("purpose")} onValueChange={(v) => form.setValue("purpose", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PURPOSE_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SheetFooter className="gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={busy || !canManage}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={nodeSheetOpen} onOpenChange={setNodeSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <form onSubmit={nodeForm.handleSubmit(submitNode)} className="flex h-full flex-col">
            <SheetHeader className="border-b px-5 py-4 text-start"><SheetTitle>افزودن به نقشه</SheetTitle></SheetHeader>
            <div className="flex-1 space-y-4 overflow-auto px-5 py-4">
              <div className="space-y-1.5">
                <Label>نوع *</Label>
                <Select value={nodeForm.watch("entity_type")} onValueChange={(v) => { nodeForm.setValue("entity_type", v); nodeForm.setValue("entity_id", ""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ENTITY_LABEL)
                      .filter(([k]) => (PURPOSE_ENTITY_TYPES[activeHierarchy?.purpose ?? "CUSTOM"] ?? Object.keys(ENTITY_LABEL)).includes(k))
                      .map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">فقط انواع مجاز برای هدف این درخت نمایش داده می‌شود.</p>
              </div>
              <div className="space-y-1.5">
                <Label>مورد *</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...nodeForm.register("entity_id", { required: true })}>
                  <option value="">انتخاب کنید</option>
                  {optionsForType.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}{item.sub ? ` — ${item.sub}` : ""}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>والد (اختیاری)</Label>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  خالی = <strong>ریشه درخت</strong> (بالاترین سطح). معمولاً ریشه یک شرکت است. زیرشاخه را با انتخاب والد مشخص کنید.
                </p>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...nodeForm.register("parent_node_id")}>
                  <option value="">— ریشه (بدون والد) —</option>
                  {(nodesQuery.data ?? []).map((n) => (
                    <option key={n.node_id} value={n.node_id}>
                      {ENTITY_LABEL[n.entity_type] ?? n.entity_type} · {resolveEntityLabel(n.entity_type, n.entity_id)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <SheetFooter className="gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setNodeSheetOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={busy || !canManage}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "افزودن"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
