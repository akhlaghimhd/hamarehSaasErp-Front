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
  DEPARTMENT: "دپارتمان",
  BUSINESS_UNIT: "واحد کسب‌وکار",
  COST_CENTER: "مرکز هزینه",
};

function isSystemHierarchy(h: HierarchyDto | { code?: string; is_system?: boolean }) {
  if (h.is_system === true) return true;
  const code = String(h.code ?? "");
  return code.startsWith("SYS-");
}

function nodeOriginBadge(origin?: string | null) {
  if (!origin) return null;
  if (origin === "SYSTEM") {
    return (
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">سیستمی</span>
    );
  }
  return (
    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">دستی</span>
  );
}

type HierForm = {
  name: string;
  code: string;
  purpose: string;
  is_active: boolean;
};

type NodeForm = {
  entity_type: string;
  entity_id: string;
  parent_node_id: string;
};

export function HierarchiesListPage() {
  const canView =
    usePermission(OrganizationPermissions.hierarchyView) ||
    usePermission(OrganizationPermissions.companyView);
  const canManage =
    usePermission(OrganizationPermissions.hierarchyManage) ||
    usePermission(OrganizationPermissions.companyUpdate);

  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hierSheetOpen, setHierSheetOpen] = useState(false);
  const [editingHier, setEditingHier] = useState<HierarchyDto | null>(null);
  const [nodeSheetOpen, setNodeSheetOpen] = useState(false);
  const [confirmHier, setConfirmHier] = useState<{ action: "activate" | "deactivate" | "delete"; h: HierarchyDto } | null>(null);
  const [confirmNodes, setConfirmNodes] = useState<{ action: "delete"; nodes: HierarchyNodeDto[] } | null>(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  const hierForm = useForm<HierForm>({
    defaultValues: { name: "", code: "", purpose: "CUSTOM", is_active: true },
  });
  const nodeForm = useForm<NodeForm>({
    defaultValues: { entity_type: "COMPANY", entity_id: "", parent_node_id: "" },
  });

  const listQuery = useQuery({
    queryKey: ["org", "hierarchies", "list"],
    queryFn: () => hierarchyService.list({ membership: "active" }),
    enabled: canView,
  });

  const healthQuery = useQuery({
    queryKey: ["org", "hierarchies", "health"],
    queryFn: () => hierarchyService.health(),
    enabled: canView,
    refetchInterval: 60_000,
  });

  const nodesQuery = useQuery({
    queryKey: ["org", "hierarchies", "nodes", selectedId],
    queryFn: () => hierarchyService.listNodes(selectedId!),
    enabled: !!selectedId && canView,
  });

  const companiesQuery = useCompanies({ enabled: canView });
  const buQuery = useQuery({
    queryKey: ["org", "business-units", "list-for-hier"],
    queryFn: () => businessUnitService.list({ membership: "active" }),
    enabled: canView && nodeSheetOpen,
  });

  const filtered = useMemo(() => {
    const rows = listQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (h) =>
        h.name?.toLowerCase().includes(q) ||
        h.code?.toLowerCase().includes(q) ||
        (PURPOSE_LABEL[h.purpose] ?? h.purpose)?.toLowerCase().includes(q)
    );
  }, [listQuery.data, search]);

  function resolveEntityLabel(entityType: string, entityId: string) {
    if (entityType === "COMPANY") {
      const c = (companiesQuery.data ?? []).find((x: { company_id: string }) => x.company_id === entityId);
      return c?.name ?? entityId.slice(0, 8);
    }
    if (entityType === "BUSINESS_UNIT") {
      const b = (buQuery.data ?? []).find((x: { business_unit_id: string }) => x.business_unit_id === entityId);
      return b?.name ?? entityId.slice(0, 8);
    }
    return entityId.slice(0, 8);
  }

  async function onSaveHier(values: HierForm) {
    if (!canManage) return;
    setBusy(true);
    try {
      if (editingHier) {
        if (isSystemHierarchy(editingHier)) {
          toast.error("درخت سیستمی قابل ویرایش نام/کد نیست.");
          return;
        }
        await hierarchyService.update(editingHier.hierarchy_id, {
          name: values.name,
          purpose: values.purpose,
          is_active: values.is_active,
        });
        toast.success("به‌روز شد");
      } else {
        await hierarchyService.create({
          name: values.name,
          code: values.code,
          purpose: values.purpose,
          is_active: values.is_active,
        });
        toast.success("ساخته شد");
      }
      setHierSheetOpen(false);
      setEditingHier(null);
      hierForm.reset({ name: "", code: "", purpose: "CUSTOM", is_active: true });
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function onAddNode(values: NodeForm) {
    if (!canManage || !selectedId) return;
    const hier = (listQuery.data ?? []).find((h) => h.hierarchy_id === selectedId);
    if (hier && isSystemHierarchy(hier)) {
      toast.error("افزودن گره دستی به درخت سیستمی مجاز نیست.");
      return;
    }
    setBusy(true);
    try {
      await hierarchyService.addNode(selectedId, {
        entity_type: values.entity_type,
        entity_id: values.entity_id,
        parent_node_id: values.parent_node_id || null,
      });
      toast.success("گره افزوده شد");
      setNodeSheetOpen(false);
      nodeForm.reset({ entity_type: "COMPANY", entity_id: "", parent_node_id: "" });
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies", "nodes", selectedId] });
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies", "health"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function runRebuild(asyncMode = false) {
    if (!canManage) return;
    setBusy(true);
    try {
      if (asyncMode) {
        await hierarchyService.rebuildAsync();
        toast.message("بازنشانی در صف قرار گرفت.");
      } else {
        const data = await hierarchyService.rebuild();
        if (data?.skipped) toast.message("بازنشانی لازم نبود.");
        else toast.success("هم‌تراز شد");
      }
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function confirmHierAction() {
    if (!confirmHier || !canManage) return;
    const { action, h } = confirmHier;
    if (isSystemHierarchy(h) && (action === "delete" || action === "deactivate")) {
      toast.error("درخت سیستمی قابل حذف/غیرفعال‌سازی نیست.");
      setConfirmHier(null);
      return;
    }
    setBusy(true);
    try {
      if (action === "delete") {
        await hierarchyService.softDelete(h.hierarchy_id);
        toast.success("حذف شد");
        if (selectedId === h.hierarchy_id) setSelectedId(null);
      } else if (action === "activate") {
        await hierarchyService.update(h.hierarchy_id, { is_active: true });
        toast.success("فعال شد");
      } else {
        await hierarchyService.update(h.hierarchy_id, { is_active: false });
        toast.success("غیرفعال شد");
      }
      setConfirmHier(null);
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function confirmNodesAction() {
    if (!confirmNodes || !canManage || !selectedId) return;
    setBusy(true);
    try {
      for (const n of confirmNodes.nodes) {
        if (n.node_origin === "SYSTEM") {
          toast.error("گره سیستمی قابل حذف دستی نیست.");
          continue;
        }
        await hierarchyService.deleteNode(n.node_id);
      }
      toast.success("گره‌ها حذف شدند");
      setConfirmNodes(null);
      setSelectedNodeIds(new Set());
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies", "nodes", selectedId] });
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies", "health"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  function openEditHier(h: HierarchyDto) {
    if (isSystemHierarchy(h)) {
      toast.error("درخت سیستمی قابل ویرایش نام/کد نیست.");
      return;
    }
    setEditingHier(h);
    hierForm.reset({
      name: h.name,
      code: h.code,
      purpose: h.purpose || "CUSTOM",
      is_active: h.is_active !== false,
    });
    setHierSheetOpen(true);
  }

  function openCreateHier() {
    setEditingHier(null);
    hierForm.reset({ name: "", code: "", purpose: "CUSTOM", is_active: true });
    setHierSheetOpen(true);
  }

  const health = healthQuery.data;
  const healthOk = health?.ok === true || (health?.issues?.length ?? 0) === 0;

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
        description="پایه پلتفرم = شرکت و شعبه. بازنشانی = روز اول از روی باکس‌ها. درخت‌های SYS محافظت‌شده‌اند."
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "سلسله‌مراتب" },
        ]}
        icon={<Network className="h-4 w-4" />}
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => runRebuild(false)}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  بازنشانی
                </Button>
                <Button size="sm" variant="ghost" disabled={busy} onClick={() => runRebuild(true)}>
                  <Sparkles className="h-4 w-4" />
                  صف
                </Button>
                <Button size="sm" onClick={openCreateHier}>
                  <Plus className="h-4 w-4" />
                  درخت سفارشی
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      {/* Health banner */}
      {healthQuery.isLoading ? null : health && !healthOk ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex flex-wrap items-start gap-3">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="font-medium">سلامت سلسله‌مراتب نیاز به توجه دارد</p>
            <ul className="list-disc pr-5 text-xs space-y-0.5">
              {(health.issues ?? []).slice(0, 5).map((iss: string, i: number) => (
                <li key={i}>{iss}</li>
              ))}
            </ul>
          </div>
          {canManage ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => runRebuild(false)}>
              هم‌ترازی
            </Button>
          ) : null}
        </div>
      ) : healthOk && health ? (
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-2 text-xs text-emerald-800 flex items-center gap-2">
          <Info className="h-3.5 w-3.5" />
          درخت‌های سیستمی هم‌تراز هستند.
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* List */}
        <div className="lg:w-2/5 space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pr-9"
              placeholder="جستجو نام یا کد…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {listQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="درختی نیست"
              description="بازنشانی از سازمان را بزنید یا درخت سفارشی بسازید."
              action={
                canManage ? (
                  <Button size="sm" onClick={() => runRebuild(false)}>
                    بازنشانی
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="rounded-xl border bg-card divide-y max-h-[28rem] overflow-y-auto">
              {filtered.map((h) => {
                const sys = isSystemHierarchy(h);
                const active = selectedId === h.hierarchy_id;
                return (
                  <button
                    key={h.hierarchy_id}
                    type="button"
                    onClick={() => {
                      setSelectedId(h.hierarchy_id);
                      setSelectedNodeIds(new Set());
                    }}
                    className={cn(
                      "w-full text-right px-4 py-3 hover:bg-muted/40 transition flex flex-col gap-1",
                      active && "bg-muted/60"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{h.name}</span>
                      {sys ? (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">سیستمی</span>
                      ) : null}
                      {h.is_active === false ? (
                        <StatusChip status="inactive" label="غیرفعال" />
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono" dir="ltr">{h.code}</span>
                      <span>·</span>
                      <span>{PURPOSE_LABEL[h.purpose] ?? h.purpose}</span>
                    </div>
                    {!sys && canManage ? (
                      <div className="flex gap-1 pt-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openEditHier(h)}>
                          ویرایش
                        </Button>
                        {h.is_active !== false ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setConfirmHier({ action: "deactivate", h })}
                          >
                            غیرفعال
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setConfirmHier({ action: "activate", h })}
                          >
                            فعال
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive"
                          onClick={() => setConfirmHier({ action: "delete", h })}
                        >
                          حذف
                        </Button>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Nodes panel */}
        <div className="lg:w-3/5 space-y-3">
          {!selectedId ? (
            <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
              یک درخت را از سمت راست انتخاب کنید تا گره‌ها نمایش داده شوند.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  گره‌ها
                </h2>
                {canManage && selectedId ? (
                  <div className="flex gap-2">
                    {(() => {
                      const hier = (listQuery.data ?? []).find((h) => h.hierarchy_id === selectedId);
                      const sys = hier ? isSystemHierarchy(hier) : false;
                      return !sys ? (
                        <Button size="sm" variant="outline" onClick={() => setNodeSheetOpen(true)}>
                          <Plus className="h-4 w-4" />
                          افزودن گره
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">درخت سیستمی — فقط خواندنی</span>
                      );
                    })()}
                    {selectedNodeIds.size > 0 ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          const nodes = (nodesQuery.data ?? []).filter((n) => selectedNodeIds.has(n.node_id));
                          setConfirmNodes({ action: "delete", nodes });
                        }}
                      >
                        حذف انتخاب‌شده ({toFaDigits(String(selectedNodeIds.size))})
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {nodesQuery.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (nodesQuery.data ?? []).length === 0 ? (
                <EmptyState title="گره‌ای نیست" description="بازنشانی یا افزودن دستی." />
              ) : (
                <div className="rounded-xl border bg-card overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={
                              (nodesQuery.data ?? []).length > 0 &&
                              selectedNodeIds.size === (nodesQuery.data ?? []).length
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedNodeIds(new Set((nodesQuery.data ?? []).map((n) => n.node_id)));
                              } else {
                                setSelectedNodeIds(new Set());
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>نوع</TableHead>
                        <TableHead>موجودیت</TableHead>
                        <TableHead>منشأ</TableHead>
                        <TableHead>سطح</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(nodesQuery.data ?? []).map((n) => (
                        <TableRow key={n.node_id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              className="rounded"
                              disabled={n.node_origin === "SYSTEM"}
                              checked={selectedNodeIds.has(n.node_id)}
                              onChange={(e) => {
                                const next = new Set(selectedNodeIds);
                                if (e.target.checked) next.add(n.node_id);
                                else next.delete(n.node_id);
                                setSelectedNodeIds(next);
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-sm">{ENTITY_LABEL[n.entity_type] ?? n.entity_type}</TableCell>
                          <TableCell className="text-sm font-mono text-xs" dir="ltr">
                            {resolveEntityLabel(n.entity_type, n.entity_id)}
                          </TableCell>
                          <TableCell>{nodeOriginBadge(n.node_origin)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{toFaDigits(String(n.level ?? 0))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Confirm hierarchy action */}
      {confirmHier ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border bg-background p-5 space-y-4 shadow-lg">
            <p className="text-sm font-medium">
              {confirmHier.action === "delete"
                ? "این درخت حذف نرم شود؟"
                : confirmHier.action === "deactivate"
                  ? "این درخت غیرفعال شود؟"
                  : "این درخت فعال شود؟"}
            </p>
            <p className="text-xs text-muted-foreground">{confirmHier.h.name}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmHier(null)}>
                انصراف
              </Button>
              <Button size="sm" variant={confirmHier.action === "delete" ? "destructive" : "default"} disabled={busy} onClick={confirmHierAction}>
                تأیید
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirm nodes delete */}
      {confirmNodes ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border bg-background p-5 space-y-4 shadow-lg">
            <p className="text-sm font-medium">
              {toFaDigits(String(confirmNodes.nodes.length))} گره حذف شوند؟ (گره‌های سیستمی رد می‌شوند)
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmNodes(null)}>
                انصراف
              </Button>
              <Button size="sm" variant="destructive" disabled={busy} onClick={confirmNodesAction}>
                تأیید حذف
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Hierarchy create/edit sheet */}
      <Sheet open={hierSheetOpen} onOpenChange={setHierSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingHier ? "ویرایش درخت" : "درخت سفارشی جدید"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={hierForm.handleSubmit(onSaveHier)} className="space-y-4 px-5 py-4">
            <div className="space-y-1.5">
              <Label>نام</Label>
              <Input {...hierForm.register("name", { required: true })} />
            </div>
            {!editingHier ? (
              <div className="space-y-1.5">
                <Label>کد (انگلیسی)</Label>
                <Input dir="ltr" {...hierForm.register("code", { required: true })} />
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>هدف</Label>
              <Select
                value={hierForm.watch("purpose")}
                onValueChange={(v) => hierForm.setValue("purpose", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PURPOSE_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="hier-active" {...hierForm.register("is_active")} className="rounded" />
              <Label htmlFor="hier-active">فعال</Label>
            </div>
            <SheetFooter className="gap-2 border-t px-0 pt-3">
              <Button type="button" variant="outline" onClick={() => setHierSheetOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={busy}>
                ذخیره
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Node add sheet */}
      <Sheet open={nodeSheetOpen} onOpenChange={setNodeSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>افزودن گره</SheetTitle>
          </SheetHeader>
          <form onSubmit={nodeForm.handleSubmit(onAddNode)} className="space-y-4 px-5 py-4">
            <div className="space-y-1.5">
              <Label>نوع موجودیت</Label>
              <Select
                value={nodeForm.watch("entity_type")}
                onValueChange={(v) => nodeForm.setValue("entity_type", v)}
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
              <Label>شناسه موجودیت (UUID)</Label>
              <Input dir="ltr" {...nodeForm.register("entity_id", { required: true })} placeholder="uuid…" />
            </div>
            <div className="space-y-1.5">
              <Label>والد (خالی = ریشه)</Label>
              <select className="flex h-9 w-full rounded-md border px-3 text-sm" {...nodeForm.register("parent_node_id")}>
                <option value="">— ریشه —</option>
                {(nodesQuery.data ?? []).map((n) => (
                  <option key={n.node_id} value={n.node_id}>
                    {ENTITY_LABEL[n.entity_type]} · {resolveEntityLabel(n.entity_type, n.entity_id)}
                  </option>
                ))}
              </select>
            </div>
            <SheetFooter className="gap-2 border-t px-0 pt-3">
              <Button type="button" variant="outline" onClick={() => setNodeSheetOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={busy}>
                افزودن
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
