/**
 * FE-ORG — سلسله‌مراتب
 * Product Law: system trees are derived maps (view + rebuild only).
 * Structure changes belong on company/branch/BU forms — not this page.
 */
"use client";

import { Fragment, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown, ChevronLeft, Info, Loader2, Network, Plus, RefreshCw, Search,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Link from "next/link";
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
import { Checkbox } from "@/shared/components/ui/checkbox";
import { usePermission } from "@/auth";
import { ApiClientError, tokenStorage } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { useCompanies } from "../hooks/use-companies";
import {
  businessUnitService,
  hierarchyService,
  type HierarchyDto,
  type HierarchyNodeDto,
} from "../services/org-extended-service";
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
  DEPARTMENT: "دپارتمان",
  BUSINESS_UNIT: "واحد کسب‌وکار",
  COST_CENTER: "مرکز هزینه",
};

type CatalogItem = { id: string; label: string; sub?: string };
type HierForm = { code: string; name: string };
type NodeForm = { entity_type: string; entity_id: string; parent_node_id: string };

function isSystemHierarchy(h: { code?: string; is_system?: boolean }): boolean {
  if (h.is_system === true) return true;
  return String(h.code ?? "").startsWith("SYS-");
}

function purposeLabel(p?: string) {
  return PURPOSE_LABEL[p ?? ""] ?? p ?? "—";
}

function nodeOriginBadge(origin?: string | null) {
  if (origin === "SYSTEM") {
    return <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">سیستمی</span>;
  }
  if (origin === "MANUAL") {
    return <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">دستی</span>;
  }
  return null;
}

function hasAuthContext(): boolean {
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
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
  const [purposeFilter, setPurposeFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [nodeSheetOpen, setNodeSheetOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeHierarchy, setActiveHierarchy] = useState<HierarchyDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [membership, setMembership] = useState<"active" | "deleted">("active");
  const [nodeMembership, setNodeMembership] = useState<"active" | "deleted">("active");
  const [rebuildOpen, setRebuildOpen] = useState(false);
  const [rebuildPreview, setRebuildPreview] = useState<{
    has_changes: boolean;
    items: { kind: string; message: string }[];
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    kind: "hier" | "nodes";
    action: "activate" | "deactivate" | "delete" | "restore";
    ids: string[];
  } | null>(null);

  const form = useForm<HierForm>({ defaultValues: { code: "", name: "" } });
  const nodeForm = useForm<NodeForm>({
    defaultValues: { entity_type: "COMPANY", entity_id: "", parent_node_id: "" },
  });

  const listQuery = useQuery({
    queryKey: ["org", "hierarchies", membership],
    queryFn: () => hierarchyService.list({ membership }),
    enabled: canView && hasAuthContext(),
  });

  const healthQuery = useQuery({
    queryKey: ["org", "hierarchy-health"],
    queryFn: () => hierarchyService.health(),
    enabled: canView && hasAuthContext(),
    refetchInterval: 90_000,
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
        BRANCH: [] as CatalogItem[],
        DEPARTMENT: [] as CatalogItem[],
        BUSINESS_UNIT: buCatalog,
        COST_CENTER: [] as CatalogItem[],
      }) as Record<string, CatalogItem[]>,
    [companyCatalog, buCatalog]
  );

  function resolveEntityLabel(entityType: string, entityId: string, apiLabel?: string | null): string {
    if (apiLabel && apiLabel.trim()) return apiLabel.trim();
    const hit = (entityCatalog[entityType] ?? []).find((x) => x.id === entityId);
    if (hit?.label) return hit.label;
    return ENTITY_LABEL[entityType] ?? "مورد";
  }

  function resolveEntityCode(entityType: string, entityId: string, apiCode?: string | null): string {
    if (apiCode && apiCode.trim()) return apiCode.trim();
    return (entityCatalog[entityType] ?? []).find((x) => x.id === entityId)?.sub ?? "";
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

  const rows = listQuery.data ?? [];
  const filtered = useMemo(() => {
    let list = rows;
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

  async function openRebuildPreview() {
    if (!canManage) return;
    setBusy(true);
    try {
      const preview = await hierarchyService.previewRebuild();
      setRebuildPreview({ has_changes: !!preview.has_changes, items: preview.items ?? [] });
      setRebuildOpen(true);
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
        const r = data?.rebuild as { companies?: number; branches?: number } | undefined;
        toast.success(
          `هم‌تراز شد${r ? ` (شرکت: ${toFaDigits(String(r.companies ?? 0))}، شعبه: ${toFaDigits(String(r.branches ?? 0))})` : ""}`
        );
      }
      setRebuildOpen(false);
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
      await qc.invalidateQueries({ queryKey: ["org", "hierarchy-health"] });
      await qc.invalidateQueries({ queryKey: ["org", "hierarchy-nodes"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function onCreateHier(v: HierForm) {
    if (!canManage) return;
    setBusy(true);
    try {
      await hierarchyService.create({ code: v.code.trim(), name: v.name.trim(), purpose: "CUSTOM" });
      toast.success("درخت سفارشی ساخته شد");
      setSheetOpen(false);
      form.reset({ code: "", name: "" });
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function onAddNode(v: NodeForm) {
    if (!canManage || !activeHierarchy || !v.entity_id) return;
    if (isSystemHierarchy(activeHierarchy)) {
      toast.error("افزودن گره به درخت سیستمی مجاز نیست. ساختار را در شرکت/شعبه تغییر دهید.");
      return;
    }
    setBusy(true);
    try {
      await hierarchyService.addNode(activeHierarchy.hierarchy_id, {
        entity_type: v.entity_type,
        entity_id: v.entity_id.trim(),
        parent_node_id: v.parent_node_id || null,
      });
      toast.success("گره افزوده شد");
      setNodeSheetOpen(false);
      nodeForm.reset({ entity_type: "COMPANY", entity_id: "", parent_node_id: "" });
      await qc.invalidateQueries({ queryKey: ["org", "hierarchy-nodes", expandedId] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function runHierBulk(action: "activate" | "deactivate" | "delete" | "restore") {
    if (!canManage || selectedIds.length === 0) return;
    for (const h of rows.filter((x) => selectedIds.includes(x.hierarchy_id))) {
      if (isSystemHierarchy(h) && (action === "delete" || action === "deactivate")) {
        toast.error(`درخت سیستمی «${h.code}» قابل ${action === "delete" ? "حذف" : "غیرفعال‌سازی"} نیست.`);
        return;
      }
    }
    setConfirmAction({ kind: "hier", action, ids: [...selectedIds] });
  }

  async function runNodesBulk(action: "activate" | "deactivate" | "delete" | "restore") {
    if (!canManage || selectedNodeIds.length === 0) return;
    if (activeHierarchy && isSystemHierarchy(activeHierarchy)) {
      toast.error("گره‌های درخت سیستمی از اینجا قابل تغییر نیستند. ساختار را در شرکت/شعبه عوض کنید یا بازنشانی بزنید.");
      return;
    }
    setConfirmAction({ kind: "nodes", action, ids: [...selectedNodeIds] });
  }

  async function executeConfirm() {
    if (!confirmAction || !canManage) return;
    setBusy(true);
    try {
      if (confirmAction.kind === "hier") {
        for (const id of confirmAction.ids) {
          const a = confirmAction.action;
          if (a === "activate") await hierarchyService.setActive(id, true);
          else if (a === "deactivate") await hierarchyService.setActive(id, false);
          else if (a === "delete") await hierarchyService.softDelete(id);
          else await hierarchyService.restore(id);
        }
        toast.success("انجام شد");
        setSelectedIds([]);
        await qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
      } else {
        if (activeHierarchy && isSystemHierarchy(activeHierarchy)) {
          toast.error("گره‌های درخت سیستمی از اینجا قابل تغییر نیستند.");
        } else if (confirmAction.action === "restore") {
          for (const id of confirmAction.ids) await hierarchyService.restoreNode(id);
          toast.success("گره‌ها بازیابی شدند");
        } else {
          await hierarchyService.bulkNodes(
            confirmAction.ids,
            confirmAction.action as "activate" | "deactivate" | "delete"
          );
          toast.success("گره‌ها به‌روز شدند");
        }
        setSelectedNodeIds([]);
        await qc.invalidateQueries({ queryKey: ["org", "hierarchy-nodes", expandedId] });
        await qc.invalidateQueries({ queryKey: ["org", "hierarchy-health"] });
      }
      setConfirmAction(null);
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  const healthStatus = (healthQuery.data as { status?: string } | undefined)?.status;

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="سلسله‌مراتب"
          description="نقشه سازمان"
          breadcrumbs={[
            { label: "سازمان", href: "/dashboard/organization" },
            { label: "سلسله‌مراتب" },
          ]}
          icon={<Network className="h-4 w-4" />}
        />
        <p className="text-sm text-muted-foreground">دسترسی ندارید.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="سلسله‌مراتب"
        description="ساختار را در شرکت، شعبه و واحد کسب‌وکار بسازید. این صفحه فقط نقشهٔ مشتق‌شده است."
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "سلسله‌مراتب" },
        ]}
        icon={<Network className="h-4 w-4" />}
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={busy} onClick={openRebuildPreview}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                پیش‌نمایش بازنشانی
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  form.reset({ code: "", name: "" });
                  setSheetOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                درخت سفارشی (گزارشی)
              </Button>
            </div>
          ) : null
        }
      />

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
        <p className="font-medium">نقشهٔ مشتق‌شده از ساختار سازمان</p>
        <p className="mt-1 text-muted-foreground leading-relaxed">
          درخت‌های سیستمی (SYS) فقط‌خواندنی‌اند. برای تغییر ساختار به{" "}
          <Link className="underline underline-offset-2" href="/dashboard/organization/companies">
            شرکت‌ها
          </Link>{" "}
          یا{" "}
          <Link className="underline underline-offset-2" href="/dashboard/organization/branches">
            شعبه‌ها
          </Link>{" "}
          بروید. اگر نقشه با واقعیت یکی نیست، «پیش‌نمایش بازنشانی» را بزنید تا از روی شرکت/شعبه دوباره ساخته شود.
        </p>
      </div>

      {healthQuery.data ? (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm flex flex-wrap items-center gap-3",
            healthStatus === "healthy"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          )}
        >
          <Info className="h-4 w-4 shrink-0" />
          <span className="font-medium">
            وضعیت سلامت:{" "}
            {healthStatus === "healthy"
              ? "سالم"
              : healthStatus === "needs_sync"
                ? "نیاز به هم‌ترازی"
                : String(healthStatus ?? "—")}
          </span>
          {canManage && healthStatus !== "healthy" ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={openRebuildPreview}>
              پیش‌نمایش و هم‌ترازی
            </Button>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pr-9" placeholder="جستجو…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={purposeFilter} onValueChange={setPurposeFilter}>
          <SelectTrigger className="w-[10rem]">
            <SelectValue placeholder="هدف" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه اهداف</SelectItem>
            {Object.entries(PURPOSE_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={membership} onValueChange={(v) => setMembership(v as "active" | "deleted")}>
          <SelectTrigger className="w-[8rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">فعال</SelectItem>
            <SelectItem value="deleted">حذف‌شده</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedIds.length > 0 && canManage ? (
        <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="text-xs text-muted-foreground self-center">
            {toFaDigits(String(selectedIds.length))} انتخاب
          </span>
          {membership === "active" ? (
            <>
              <Button size="sm" variant="outline" onClick={() => runHierBulk("activate")}>
                فعال
              </Button>
              <Button size="sm" variant="outline" onClick={() => runHierBulk("deactivate")}>
                غیرفعال
              </Button>
              <Button size="sm" variant="destructive" onClick={() => runHierBulk("delete")}>
                حذف
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" onClick={() => runHierBulk("restore")}>
              بازیابی
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
            لغو
          </Button>
        </div>
      ) : null}

      {listQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="درختی نیست"
          description="پیش‌نمایش بازنشانی را بزنید تا درخت‌های سیستمی از شرکت و شعبه ساخته شوند."
          action={
            canManage ? (
              <Button size="sm" onClick={openRebuildPreview}>
                پیش‌نمایش بازنشانی
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onCheckedChange={(c) => {
                      if (c)
                        setSelectedIds(
                          filtered
                            .filter((h) => !isSystemHierarchy(h) || membership === "deleted")
                            .map((h) => h.hierarchy_id)
                        );
                      else setSelectedIds([]);
                    }}
                  />
                </TableHead>
                <TableHead>نام</TableHead>
                <TableHead>کد</TableHead>
                <TableHead>هدف</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="w-28"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((h) => {
                const sys = isSystemHierarchy(h);
                const open = expandedId === h.hierarchy_id;
                return (
                  <Fragment key={h.hierarchy_id}>
                    <TableRow className={cn(open && "bg-muted/30")}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(h.hierarchy_id)}
                          disabled={sys && membership === "active"}
                          onCheckedChange={(c) => {
                            if (c) setSelectedIds((prev) => [...prev, h.hierarchy_id]);
                            else setSelectedIds((prev) => prev.filter((id) => id !== h.hierarchy_id));
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {sys ? (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
                              سیستمی
                            </span>
                          ) : null}
                          <span className="font-medium">{h.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{h.code}</TableCell>
                      <TableCell>{purposeLabel(h.purpose)}</TableCell>
                      <TableCell>
                        <StatusChip
                          label={h.is_active === false ? "غیرفعال" : "فعال"}
                          tone={h.is_active === false ? "neutral" : "success"}
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 gap-1"
                          onClick={() => {
                            setExpandedId(open ? null : h.hierarchy_id);
                            setActiveHierarchy(h);
                            setSelectedNodeIds([]);
                            if (sys) setNodeMembership("active");
                          }}
                        >
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                          گره‌ها
                        </Button>
                      </TableCell>
                    </TableRow>
                    {open ? (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/20 p-3">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {toFaDigits(String(indentedNodes.length))} گره
                            </span>
                            {sys ? (
                              <span className="text-[11px] text-muted-foreground">
                                فقط‌خواندنی · تغییر ساختار از شرکت/شعبه · هم‌ترازی با بازنشانی
                              </span>
                            ) : (
                              <>
                                <Select
                                  value={nodeMembership}
                                  onValueChange={(v) => setNodeMembership(v as "active" | "deleted")}
                                >
                                  <SelectTrigger className="h-8 w-[7rem]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="active">فعال</SelectItem>
                                    <SelectItem value="deleted">حذف‌شده</SelectItem>
                                  </SelectContent>
                                </Select>
                                {canManage ? (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8"
                                    onClick={() => {
                                      setActiveHierarchy(h);
                                      nodeForm.reset({
                                        entity_type: "COMPANY",
                                        entity_id: "",
                                        parent_node_id: "",
                                      });
                                      setNodeSheetOpen(true);
                                    }}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    گره از موجودیت موجود
                                  </Button>
                                ) : null}
                              </>
                            )}
                          </div>
                          {nodesQuery.isLoading ? (
                            <Skeleton className="h-16 w-full" />
                          ) : indentedNodes.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              {sys
                                ? "گره‌ای نیست. پیش‌نمایش بازنشانی را بزنید تا از شرکت و شعبه ساخته شود."
                                : "گره‌ای نیست."}
                            </p>
                          ) : (
                            <ul className="space-y-1.5">
                              {indentedNodes.map(({ node: n, depth }) => {
                                const label = resolveEntityLabel(n.entity_type, n.entity_id, n.entity_label);
                                const code = resolveEntityCode(n.entity_type, n.entity_id, n.entity_code);
                                return (
                                  <li
                                    key={n.node_id}
                                    className={cn(
                                      "flex flex-wrap items-center gap-2 rounded-md border bg-background px-3 py-1.5",
                                      depth > 0 && "border-s-2 border-s-primary/30"
                                    )}
                                    style={{ marginInlineStart: depth * 20 }}
                                  >
                                    {canManage && !sys ? (
                                      <Checkbox
                                        checked={selectedNodeIds.includes(n.node_id)}
                                        onCheckedChange={(c) => {
                                          if (c) setSelectedNodeIds((prev) => [...prev, n.node_id]);
                                          else setSelectedNodeIds((prev) => prev.filter((id) => id !== n.node_id));
                                        }}
                                      />
                                    ) : null}
                                    <span className="text-[11px] text-muted-foreground">
                                      {ENTITY_LABEL[n.entity_type] ?? n.entity_type}
                                    </span>
                                    <span className="font-medium">{label}</span>
                                    {code ? (
                                      <span className="font-mono text-[11px] text-muted-foreground">{code}</span>
                                    ) : null}
                                    {nodeOriginBadge(n.node_origin)}
                                    {!n.parent_node_id ? (
                                      <span className="text-[11px] text-emerald-700">ریشه</span>
                                    ) : null}
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                          {canManage && !sys && selectedNodeIds.length > 0 ? (
                            <div className="mt-2 flex gap-2">
                              {nodeMembership === "deleted" ? (
                                <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => runNodesBulk("restore")}>
                                  بازیابی
                                </Button>
                              ) : (
                                <>
                                  <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => runNodesBulk("activate")}>
                                    فعال
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7" disabled={busy} onClick={() => runNodesBulk("deactivate")}>
                                    غیرفعال
                                  </Button>
                                  <Button size="sm" variant="destructive" className="h-7" disabled={busy} onClick={() => runNodesBulk("delete")}>
                                    حذف
                                  </Button>
                                </>
                              )}
                              <Button size="sm" variant="ghost" className="h-7" onClick={() => setSelectedNodeIds([])}>
                                لغو
                              </Button>
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
      )}

      <Sheet open={rebuildOpen} onOpenChange={setRebuildOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
          <SheetHeader className="border-b px-5 py-4 text-start">
            <SheetTitle>پیش‌نمایش بازنشانی</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-3 overflow-auto px-5 py-4 text-sm">
            <p className="text-muted-foreground">
              بازنشانی درخت‌های سیستمی را از روی شرکت، شعبه و واحد کسب‌وکار دوباره می‌سازد. گره‌های سیستمی حذف‌شده در صورت وجود موجودیت برمی‌گردند.
            </p>
            {rebuildPreview ? (
              <ul className="space-y-1.5">
                {rebuildPreview.items.map((it, i) => (
                  <li key={i} className="rounded-md border px-3 py-1.5 text-xs">
                    {it.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <SheetFooter className="gap-2 border-t px-5 py-3">
            <Button type="button" variant="outline" onClick={() => setRebuildOpen(false)}>
              انصراف
            </Button>
            <Button type="button" disabled={busy || !rebuildPreview?.has_changes} onClick={confirmRebuild}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأیید و بازنشانی"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-5 py-4 text-start">
            <SheetTitle>درخت سفارشی (گزارشی)</SheetTitle>
          </SheetHeader>
          <form className="flex flex-1 flex-col" onSubmit={form.handleSubmit(onCreateHier)}>
            <div className="flex-1 space-y-3 overflow-auto px-5 py-4">
              <p className="text-xs text-muted-foreground">
                درخت‌های حقوقی/استقرار/محصول را سیستم می‌سازد. اینجا فقط برای چیدمان گزارش سفارشی از موجودیت‌های موجود.
              </p>
              <div className="space-y-1.5">
                <Label>کد</Label>
                <Input {...form.register("code", { required: true })} placeholder="مثلاً MY-REPORT" />
              </div>
              <div className="space-y-1.5">
                <Label>نام</Label>
                <Input {...form.register("name", { required: true })} />
              </div>
            </div>
            <SheetFooter className="gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ایجاد"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={nodeSheetOpen} onOpenChange={setNodeSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-5 py-4 text-start">
            <SheetTitle>افزودن گره از موجودیت موجود</SheetTitle>
          </SheetHeader>
          <form className="flex flex-1 flex-col" onSubmit={nodeForm.handleSubmit(onAddNode)}>
            <div className="flex-1 space-y-3 overflow-auto px-5 py-4">
              <div className="space-y-1.5">
                <Label>نوع</Label>
                <Select
                  value={nodeForm.watch("entity_type")}
                  onValueChange={(v) => {
                    nodeForm.setValue("entity_type", v);
                    nodeForm.setValue("entity_id", "");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ENTITY_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>موجودیت</Label>
                <select
                  className="flex h-9 w-full rounded-md border px-3 text-sm"
                  {...nodeForm.register("entity_id", { required: true })}
                >
                  <option value="">انتخاب…</option>
                  {(entityCatalog[nodeForm.watch("entity_type")] ?? []).map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                      {x.sub ? ` (${x.sub})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>والد (اختیاری)</Label>
                <select className="flex h-9 w-full rounded-md border px-3 text-sm" {...nodeForm.register("parent_node_id")}>
                  <option value="">ریشه</option>
                  {(nodesQuery.data ?? []).map((n) => (
                    <option key={n.node_id} value={n.node_id}>
                      {ENTITY_LABEL[n.entity_type]} · {resolveEntityLabel(n.entity_type, n.entity_id, n.entity_label)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <SheetFooter className="gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setNodeSheetOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "افزودن"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {confirmAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border bg-background p-5 shadow-lg">
            <p className="text-sm font-medium">تأیید عملیات؟</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {toFaDigits(String(confirmAction.ids.length))} مورد · {confirmAction.action}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmAction(null)}>
                انصراف
              </Button>
              <Button size="sm" disabled={busy} onClick={executeConfirm}>
                تأیید
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
