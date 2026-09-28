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
import { Checkbox } from "@/shared/components/ui/checkbox";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";
import {
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

const PURPOSE_ENTITY_TYPES: Record<string, string[]> = {
  LEGAL: ["COMPANY"],
  ESTABLISHMENT: ["COMPANY", "BRANCH"],
  MANAGEMENT: ["COMPANY", "BRANCH", "DEPARTMENT", "BUSINESS_UNIT"],
  TAX: ["COMPANY"],
  CUSTOM: ["COMPANY", "BRANCH", "DEPARTMENT", "BUSINESS_UNIT", "COST_CENTER"],
};

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

type HierForm = { code: string; name: string; purpose: string };
type NodeForm = { entity_type: string; entity_id: string; parent_node_id: string };

export function HierarchiesListPage() {
  const canView =
    usePermission(OrganizationPermissions.hierarchyView) ||
    usePermission(OrganizationPermissions.companyView);
  const canManage =
    usePermission(OrganizationPermissions.hierarchyManage) ||
    usePermission(OrganizationPermissions.companyUpdate);

  const qc = useQueryClient();
  const [membership, setMembership] = useState<"active" | "deleted">("active");
  const [nodeMembership, setNodeMembership] = useState<"active" | "deleted">("active");
  const [search, setSearch] = useState("");
  const [purposeFilter, setPurposeFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeHierarchy, setActiveHierarchy] = useState<HierarchyDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [nodeSheetOpen, setNodeSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
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

  const form = useForm<HierForm>({ defaultValues: { code: "", name: "", purpose: "CUSTOM" } });
  const nodeForm = useForm<NodeForm>({
    defaultValues: { entity_type: "COMPANY", entity_id: "", parent_node_id: "" },
  });

  const listQuery = useQuery({
    queryKey: ["org", "hierarchies", membership],
    queryFn: () => hierarchyService.list({ membership }),
    enabled: canView,
  });

  const healthQuery = useQuery({
    queryKey: ["org", "hierarchy-health"],
    queryFn: () => hierarchyService.health(),
    enabled: canView,
    refetchInterval: 90_000,
  });

  const nodesQuery = useQuery({
    queryKey: ["org", "hierarchy-nodes", expandedId, nodeMembership],
    queryFn: () => hierarchyService.listNodes(expandedId!, { membership: nodeMembership }),
    enabled: !!expandedId && canView,
  });

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
      setRebuildPreview({
        has_changes: !!preview.has_changes,
        items: preview.items ?? [],
      });
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
        const r = data?.rebuild as { companies?: number; branches?: number; custom_removed?: number } | undefined;
        toast.success(
          `هم‌تراز شد${r ? ` (شرکت: ${toFaDigits(String(r.companies ?? 0))}، شعبه: ${toFaDigits(String(r.branches ?? 0))})` : ""}`
        );
      }
      setRebuildOpen(false);
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
      await qc.invalidateQueries({ queryKey: ["org", "hierarchy-health"] });
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
      await hierarchyService.create({ code: v.code.trim(), name: v.name.trim(), purpose: v.purpose });
      toast.success("درخت ساخته شد");
      setSheetOpen(false);
      form.reset({ code: "", name: "", purpose: "CUSTOM" });
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function onAddNode(v: NodeForm) {
    if (!canManage || !activeHierarchy) return;
    if (isSystemHierarchy(activeHierarchy)) {
      toast.error("افزودن گره دستی به درخت سیستمی مجاز نیست.");
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
      await qc.invalidateQueries({ queryKey: ["org", "hierarchy-health"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    } finally {
      setBusy(false);
    }
  }

  async function runHierBulk(action: "activate" | "deactivate" | "delete" | "restore") {
    if (!canManage || selectedIds.length === 0) return;
    const targets = rows.filter((h) => selectedIds.includes(h.hierarchy_id));
    for (const h of targets) {
      if (isSystemHierarchy(h) && (action === "delete" || action === "deactivate")) {
        toast.error(`درخت سیستمی «${h.code}» قابل ${action === "delete" ? "حذف" : "غیرفعال‌سازی"} نیست.`);
        return;
      }
    }
    setConfirmAction({ kind: "hier", action, ids: [...selectedIds] });
  }

  async function runNodesBulk(action: "activate" | "deactivate" | "delete") {
    if (!canManage || selectedNodeIds.length === 0) return;
    setConfirmAction({ kind: "nodes", action, ids: [...selectedNodeIds] });
  }

  async function executeConfirm() {
    if (!confirmAction || !canManage) return;
    setBusy(true);
    try {
      if (confirmAction.kind === "hier") {
        for (const id of confirmAction.ids) {
          const action = confirmAction.action;
          if (action === "activate") await hierarchyService.setActive(id, true);
          else if (action === "deactivate") await hierarchyService.setActive(id, false);
          else if (action === "delete") await hierarchyService.softDelete(id);
          else await hierarchyService.restore(id);
        }
        toast.success("انجام شد");
        setSelectedIds([]);
        await qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
      } else {
        await hierarchyService.bulkNodes(confirmAction.ids, confirmAction.action as "activate" | "deactivate" | "delete");
        toast.success("گره‌ها به‌روز شدند");
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
        description="پایه پلتفرم = شرکت و شعبه. درخت‌های SYS محافظت‌شده‌اند. بازنشانی = هم‌ترازی از روی ساختار سازمان."
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
                  form.reset({ code: "", name: "", purpose: "CUSTOM" });
                  setSheetOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                درخت سفارشی
              </Button>
            </div>
          ) : null
        }
      />

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
          description="پیش‌نمایش بازنشانی را بزنید یا درخت سفارشی بسازید."
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
                      if (c) setSelectedIds(filtered.map((h) => h.hierarchy_id));
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
                            setSelectedIds((prev) =>
                              c ? [...prev, h.hierarchy_id] : prev.filter((x) => x !== h.hierarchy_id)
                            );
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="font-medium text-sm hover:underline"
                            onClick={() => {
                              setExpandedId(open ? null : h.hierarchy_id);
                              setActiveHierarchy(h);
                              setSelectedNodeIds([]);
                            }}
                          >
                            {h.name}
                          </button>
                          {sys ? (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">سیستمی</span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs" dir="ltr">
                        {h.code}
                      </TableCell>
                      <TableCell>{purposeLabel(h.purpose)}</TableCell>
                      <TableCell>
                        <StatusChip
                          label={h.is_active !== false ? "فعال" : "غیرفعال"}
                          tone={h.is_active !== false ? "success" : "neutral"}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8"
                            onClick={() => {
                              setExpandedId(h.hierarchy_id);
                              setActiveHierarchy(h);
                            }}
                          >
                            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                          </Button>
                          {!sys && canManage && membership === "active" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => {
                                setActiveHierarchy(h);
                                setExpandedId(h.hierarchy_id);
                                nodeForm.reset({
                                  entity_type: (PURPOSE_ENTITY_TYPES[h.purpose] ?? ["COMPANY"])[0] ?? "COMPANY",
                                  entity_id: "",
                                  parent_node_id: "",
                                });
                                setNodeSheetOpen(true);
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                    {open ? (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/20 p-0">
                          <div className="p-3 space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs font-medium flex items-center gap-1">
                                <GitBranch className="h-3.5 w-3.5" /> گره‌ها
                              </span>
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
                            </div>
                            {selectedNodeIds.length > 0 && canManage ? (
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline" onClick={() => runNodesBulk("activate")}>
                                  فعال
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => runNodesBulk("deactivate")}>
                                  غیرفعال
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => runNodesBulk("delete")}>
                                  حذف
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setSelectedNodeIds([])}>
                                  لغو
                                </Button>
                              </div>
                            ) : null}
                            {nodesQuery.isLoading ? (
                              <Skeleton className="h-16 w-full" />
                            ) : (nodesQuery.data ?? []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">گره‌ای نیست.</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-8" />
                                    <TableHead>نوع</TableHead>
                                    <TableHead>شناسه</TableHead>
                                    <TableHead>منشأ</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {(nodesQuery.data ?? []).map((n) => (
                                    <TableRow key={n.node_id}>
                                      <TableCell>
                                        <Checkbox
                                          checked={selectedNodeIds.includes(n.node_id)}
                                          disabled={n.node_origin === "SYSTEM"}
                                          onCheckedChange={(c) => {
                                            setSelectedNodeIds((prev) =>
                                              c
                                                ? [...prev, n.node_id]
                                                : prev.filter((x) => x !== n.node_id)
                                            );
                                          }}
                                        />
                                      </TableCell>
                                      <TableCell className="text-xs">
                                        {ENTITY_LABEL[n.entity_type] ?? n.entity_type}
                                      </TableCell>
                                      <TableCell className="font-mono text-[11px]" dir="ltr">
                                        {n.entity_id.slice(0, 8)}…
                                      </TableCell>
                                      <TableCell>{nodeOriginBadge(n.node_origin)}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
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

      {/* Confirm dialog */}
      {confirmAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl border bg-background p-5 space-y-4 shadow-lg">
            <p className="text-sm font-medium">
              {confirmAction.action === "delete"
                ? "حذف نرم انجام شود؟"
                : confirmAction.action === "deactivate"
                  ? "غیرفعال شود؟"
                  : confirmAction.action === "activate"
                    ? "فعال شود؟"
                    : "بازیابی شود؟"}
            </p>
            <p className="text-xs text-muted-foreground">
              {toFaDigits(String(confirmAction.ids.length))} مورد
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmAction(null)}>
                انصراف
              </Button>
              <Button
                size="sm"
                variant={confirmAction.action === "delete" ? "destructive" : "default"}
                disabled={busy}
                onClick={executeConfirm}
              >
                تأیید
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Rebuild preview sheet */}
      <Sheet open={rebuildOpen} onOpenChange={setRebuildOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>پیش‌نمایش بازنشانی</SheetTitle>
          </SheetHeader>
          <div className="px-5 py-4 space-y-3">
            {rebuildPreview ? (
              <>
                {rebuildPreview.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">تغییری لازم نیست.</p>
                ) : (
                  <ul className="space-y-1 text-sm list-disc pr-5">
                    {rebuildPreview.items.map((it, i) => (
                      <li key={i}>
                        <span className="text-xs text-muted-foreground">{it.kind}</span> — {it.message}
                      </li>
                    ))}
                  </ul>
                )}
                <SheetFooter className="gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setRebuildOpen(false)}>
                    انصراف
                  </Button>
                  <Button type="button" disabled={busy || !rebuildPreview.has_changes} onClick={confirmRebuild}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    اجرای هم‌ترازی
                  </Button>
                </SheetFooter>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Create hierarchy sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>درخت سفارشی جدید</SheetTitle>
          </SheetHeader>
          <form onSubmit={form.handleSubmit(onCreateHier)} className="space-y-4 px-5 py-4">
            <div className="space-y-1.5">
              <Label>نام</Label>
              <Input {...form.register("name", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>کد (انگلیسی، بدون SYS-)</Label>
              <Input dir="ltr" {...form.register("code", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>هدف</Label>
              <Select value={form.watch("purpose")} onValueChange={(v) => form.setValue("purpose", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PURPOSE_LABEL)
                    .filter(([k]) => k !== "LEGAL" && k !== "ESTABLISHMENT")
                    .map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <SheetFooter className="gap-2 border-t px-0 pt-3">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={busy}>
                ساخت
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Add node sheet */}
      <Sheet open={nodeSheetOpen} onOpenChange={setNodeSheetOpen}>
        <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>افزودن گره دستی</SheetTitle>
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
                  {Object.entries(ENTITY_LABEL)
                    .filter(([k]) =>
                      (PURPOSE_ENTITY_TYPES[activeHierarchy?.purpose ?? "CUSTOM"] ?? Object.keys(ENTITY_LABEL)).includes(k)
                    )
                    .map(([k, v]) => (
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
              <select
                className="flex h-9 w-full rounded-md border px-3 text-sm"
                {...nodeForm.register("parent_node_id")}
              >
                <option value="">— ریشه —</option>
                {(nodesQuery.data ?? []).map((n) => (
                  <option key={n.node_id} value={n.node_id}>
                    {ENTITY_LABEL[n.entity_type] ?? n.entity_type} · {n.entity_id.slice(0, 8)}
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
