/**
 * FE-ORG — سلسله‌مراتب (Smart Hierarchy Product Law v1.0)
 * ساده: بدون اجبار به طراحی درخت
 * استاندارد+: نمای ساختار سیستمی + نام موجودیت‌ها
 * پیشرفته: افزودن گره دستی با انتخاب نام
 */
"use client";

import { Fragment, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown, ChevronLeft, GitBranch, Info, Loader2, Network, Plus, Search, Sparkles,
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

type HierForm = { code: string; name: string; purpose: string };
type NodeForm = { entity_type: string; entity_id: string; parent_node_id: string };
type CatalogItem = { id: string; label: string; sub?: string };
/** simple | standard | advanced — قانون محصول v1 */
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
            for (const b of brs) {
              branches.push({
                id: b.branch_id,
                label: b.name || b.code || "شعبه",
                sub: cName,
              });
            }
          } catch { /* skip */ }
          try {
            const depEnv = await apiGet(organizationPaths.companyDepartments(c.company_id));
            for (const d of unwrapList<{ department_id: string; name?: string; code?: string }>(depEnv)) {
              departments.push({
                id: d.department_id,
                label: d.name || d.code || "واحد",
                sub: cName,
              });
            }
          } catch { /* skip */ }
          try {
            const ccEnv = await apiGet(organizationPaths.companyCostCenters(c.company_id));
            for (const cc of unwrapList<{ cost_center_id: string; name?: string; code?: string }>(ccEnv)) {
              costCenters.push({
                id: cc.cost_center_id,
                label: cc.name || cc.code || "مرکز هزینه",
                sub: cName,
              });
            }
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

  /**
   * تا آماده‌شدن API فیچرپک: سطح از روی دادهٔ واقعی تخمین زده می‌شود.
   * simple: حداکثر یک شرکت و حداکثر یک شعبه
   * advanced: چند شرکت یا چند واحد کسب‌وکار (امکان گره دستی)
   * standard: چند شعبه یا بیش از ساختار حداقلی
   */
  const tier: HierarchyTier = useMemo(() => {
    if (companyCount <= 1 && branchCount <= 1 && buCount <= 1) return "simple";
    if (companyCount > 1 || buCount > 1) return "advanced";
    return "standard";
  }, [companyCount, branchCount, buCount]);

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
    return ENTITY_LABEL[entityType] ?? "مورد";
  }

  function resolveEntitySub(entityType: string, entityId: string): string | undefined {
    return (entityCatalog[entityType] ?? []).find((x) => x.id === entityId)?.sub;
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

  const allowCreateHierarchy = canManage && tier === "advanced";
  const allowAddNode = canManage && (tier === "advanced" || tier === "standard");

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
    if (tier === "standard") {
      toast.message("گره‌های سیستمی از روی شرکت و شعبه می‌آیند. افزودن دستی بیشتر برای حالت پیشرفته است.");
    }
    setActiveHierarchy(h);
    setExpandedId(h.hierarchy_id);
    nodeForm.reset({
      entity_type: "COMPANY",
      entity_id: companyCatalog[0]?.id ?? "",
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
  }

  const watchedType = nodeForm.watch("entity_type");
  const optionsForType = entityCatalog[watchedType] ?? [];

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="سلسله‌مراتب"
          description="نقشهٔ ساختار سازمان"
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

  /* ——— سطح ساده: بدون اجبار طراحی درخت ——— */
  if (tier === "simple" && !structureCatalog.isLoading && !listQuery.isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="سلسله‌مراتب"
          description="در سازمان تک‌خطی نیازی به تنظیم درخت نیست"
          breadcrumbs={[
            { label: "سازمان", href: "/dashboard/organization" },
            { label: "سلسله‌مراتب" },
          ]}
          icon={<Network className="h-4 w-4" />}
        />
        <div className="rounded-xl border bg-card p-6 md:p-8">
          <div className="mx-auto flex max-w-lg flex-col items-start gap-3 text-start">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold">ساختار شما ساده است — سیستم خودش مدیریت می‌کند</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              با یک شرکت (و در صورت نیاز یک محل استقرار)، لازم نیست درخت حقوقی یا استقرار را دستی بچینید.
              کار روزمره را از بخش شرکت و شعبه انجام دهید. وقتی چند شرکت یا چند شعبه داشته باشید،
              نقشه‌های ساختاری به‌صورت خودکار از روی همان داده‌ها ساخته و اینجا دیده می‌شوند.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button asChild size="sm" variant="default">
                <Link href="/dashboard/organization/companies">رفتن به شرکت‌ها</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/dashboard/organization">بازگشت به سازمان</Link>
              </Button>
            </div>
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
        description={
          tier === "advanced"
            ? "نقشه‌های ساختاری سیستم‌ساز + امکان تکمیل دستی"
            : "نمای ساختار؛ درخت‌ها از روی شرکت و شعبه ساخته می‌شوند"
        }
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "سلسله‌مراتب" },
        ]}
        icon={<Network className="h-4 w-4" />}
        actions={
          allowCreateHierarchy ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> نقشهٔ سفارشی
            </Button>
          ) : null
        }
      />

      <div className="flex gap-3 rounded-lg border border-sky-200/80 bg-sky-50/80 px-3 py-2.5 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
        <Info className="mt-0.5 h-4 w-4 shrink-0 opacity-80" />
        <div className="space-y-1 leading-relaxed">
          <p>
            {tier === "advanced"
              ? "بخشی از این نقشه‌ها را سیستم از روی شرکت، شعبه و واحد کسب‌وکار می‌سازد. می‌توانید گره دستی هم اضافه کنید؛ برای تغییر رابطهٔ واقعی (مثلاً شرکتِ یک شعبه) همان فرم شعبه یا شرکت را ویرایش کنید."
              : "این صفحه بیشتر «نمای ساختار» است. با ایجاد یا جابه‌جایی شرکت و شعبه، درخت حقوقی و استقرار باید با داده هم‌خوان بماند. ویرایش روزمره را از بخش شرکت و شعبه انجام دهید تا پشتیبانی و گزارش‌ها پایدار بمانند."}
          </p>
          <p className="text-xs opacity-80">
            سطح فعلی بر اساس دادهٔ سازمان شما:{" "}
            {tier === "advanced" ? "چندبعدی (امکان تکمیل دستی)" : "استاندارد (عمدتاً سیستمی)"}
            {" · "}
            {toFaDigits(companyCount)} شرکت · {toFaDigits(branchCount)} شعبه
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 ps-9"
            placeholder="جستجو نام یا کد…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={purposeFilter} onValueChange={setPurposeFilter}>
          <SelectTrigger className="h-9 w-[180px]">
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
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
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
            {showSkeleton
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : filtered.map((h) => {
                  const open = expandedId === h.hierarchy_id;
                  return (
                    <Fragment key={h.hierarchy_id}>
                      <TableRow>
                        <TableCell>
                          <button
                            type="button"
                            className="rounded p-1 hover:bg-muted"
                            onClick={() => toggleExpand(h.hierarchy_id)}
                            aria-label={open ? "بستن" : "نمایش اعضا"}
                          >
                            {open ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronLeft className="h-4 w-4" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{h.name}</div>
                          {PURPOSE_HINT[h.purpose] ? (
                            <div className="mt-0.5 text-[11px] text-muted-foreground">
                              {PURPOSE_HINT[h.purpose]}
                            </div>
                          ) : null}
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
                          {allowAddNode && tier === "advanced" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8"
                              onClick={() => openAddNode(h)}
                            >
                              <GitBranch className="h-3.5 w-3.5" /> افزودن
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">نمای سیستمی</span>
                          )}
                        </TableCell>
                      </TableRow>
                      {open ? (
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={6} className="p-3">
                            {nodesQuery.isLoading ||
                            structureCatalog.isLoading ||
                            buQuery.isLoading ? (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" /> در حال بارگذاری…
                              </div>
                            ) : (nodesQuery.data ?? []).length === 0 ? (
                              <p className="text-sm text-muted-foreground">
                                عضوی ثبت نشده. با تکمیل شرکت و شعبه، همگام‌سازی سیستم این بخش را پر
                                می‌کند.
                              </p>
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
                                          <span className="text-xs text-muted-foreground">
                                            ({parentTxt})
                                          </span>
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
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <form onSubmit={form.handleSubmit(submitHier)} className="flex h-full flex-col">
            <SheetHeader className="border-b px-5 py-4 text-start">
              <SheetTitle>نقشهٔ سفارشی</SheetTitle>
            </SheetHeader>
            <div className="flex-1 space-y-4 overflow-auto px-5 py-4">
              <div className="space-y-1.5">
                <Label>کد *</Label>
                <Input dir="ltr" {...form.register("code", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>نام *</Label>
                <Input {...form.register("name", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>هدف</Label>
                <Select
                  value={form.watch("purpose")}
                  onValueChange={(v) => form.setValue("purpose", v)}
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
            </div>
            <SheetFooter className="gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={busy || !canManage}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={nodeSheetOpen} onOpenChange={setNodeSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <form onSubmit={nodeForm.handleSubmit(submitNode)} className="flex h-full flex-col">
            <SheetHeader className="border-b px-5 py-4 text-start">
              <SheetTitle>افزودن به نقشه</SheetTitle>
            </SheetHeader>
            <div className="flex-1 space-y-4 overflow-auto px-5 py-4">
              <div className="space-y-1.5">
                <Label>نوع *</Label>
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
                <Label>مورد *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...nodeForm.register("entity_id", { required: true })}
                >
                  <option value="">انتخاب کنید</option>
                  {optionsForType.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                      {item.sub ? ` — ${item.sub}` : ""}
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
                <Label>زیرمجموعهٔ (اختیاری)</Label>
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
              <Button type="button" variant="outline" onClick={() => setNodeSheetOpen(false)}>
                انصراف
              </Button>
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
