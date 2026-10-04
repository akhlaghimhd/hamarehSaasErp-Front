/**
 * FE-ORG — سلسله‌مراتب (derived map) RESTORED
 * Product law:
 * - SYS trees: read-only mirror of company/branch/BU (auto-synced on backend).
 * - No user-triggered rebuild.
 * - CUSTOM trees: only when tenant feature pack custom_org_hierarchy is enabled.
 * - Expand by clicking tree title.
 */
"use client";

import { Fragment, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, Info, Loader2, Network, Plus, Search } from "lucide-react";
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
import { FEATURE_PACK_CODES, useFeaturePackEnabled } from "../hooks/use-feature-packs";
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

type HierForm = { code: string; name: string };

function isSystemHierarchy(h: { code?: string; is_system?: boolean }): boolean {
  if (h.is_system === true) return true;
  return String(h.code ?? "").startsWith("SYS-");
}

function purposeLabel(p?: string) {
  return PURPOSE_LABEL[p ?? ""] ?? p ?? "—";
}

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

function nodeLabel(n: HierarchyNodeDto, companyMap: Map<string, string>): string {
  if (n.entity_label) return n.entity_label;
  if (n.entity_type === "COMPANY") {
    return companyMap.get(n.entity_id) || n.entity_code || n.entity_id.slice(0, 8);
  }
  return n.entity_code || `${ENTITY_LABEL[n.entity_type] ?? n.entity_type} ${n.entity_id.slice(0, 8)}`;
}

export function HierarchiesListPage() {
  const qc = useQueryClient();
  const canView =
    usePermission(OrganizationPermissions.hierarchyView) ||
    usePermission(OrganizationPermissions.companyView);
  const canManage =
    usePermission(OrganizationPermissions.hierarchyManage) ||
    usePermission(OrganizationPermissions.companyUpdate);
  const { enabled: hasCustomHierarchy, isLoading: customPackLoading } = useFeaturePackEnabled(
    FEATURE_PACK_CODES.customOrgHierarchy
  );
  const canCustom = canManage && hasCustomHierarchy;
  const { data: companies } = useCompanies();

  const companyMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of companies ?? []) {
      m.set(c.company_id, (c.legal_name || c.name || "").trim() || c.code || c.company_id);
    }
    return m;
  }, [companies]);

  const [search, setSearch] = useState("");
  const [membership, setMembership] = useState<"active" | "deleted">("active");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nodeMembership, setNodeMembership] = useState<"active" | "deleted">("active");
  const form = useForm<HierForm>({ defaultValues: { code: "", name: "" } });

  const listQuery = useQuery({
    queryKey: ["org", "hierarchies", membership],
    queryFn: () => hierarchyService.list({ membership }),
    enabled: hasAuthContext() && canView,
  });

  const healthQuery = useQuery({
    queryKey: ["org", "hierarchy-health"],
    queryFn: () => hierarchyService.health(),
    enabled: hasAuthContext() && canView,
    staleTime: 30_000,
  });

  const nodesQuery = useQuery({
    queryKey: ["org", "hierarchy-nodes", expandedId, nodeMembership],
    queryFn: () => hierarchyService.listNodes(expandedId!, { membership: nodeMembership }),
    enabled: Boolean(expandedId) && hasAuthContext(),
  });

  const rows = useMemo(() => {
    const list = listQuery.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((h) =>
      [h.code, h.name, h.purpose].map((x) => String(x ?? "").toLowerCase()).join(" ").includes(q)
    );
  }, [listQuery.data, search]);

  const healthStatus = (healthQuery.data as { status?: string; message?: string } | undefined)?.status;
  const healthMessage = (healthQuery.data as { message?: string } | undefined)?.message;

  async function onCreateCustom(v: HierForm) {
    if (!canCustom) {
      toast.message("بسته custom_org_hierarchy فعال نیست");
      return;
    }
    try {
      await hierarchyService.create({ code: v.code.trim(), name: v.name.trim(), purpose: "CUSTOM" });
      toast.success("سلسله‌مراتب سفارشی ایجاد شد");
      setSheetOpen(false);
      form.reset({ code: "", name: "" });
      await qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : MSG_ERR);
    }
  }

  if (!canView) {
    return (
      <div className="p-6">
        <EmptyState title="مجوز مشاهده این بخش را ندارید" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="سلسله‌مراتب سازمانی"
        description="نقشه مشتق‌شده از شرکت/شعبه/واحد + درخت‌های سفارشی"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "سلسله‌مراتب" },
        ]}
        icon={<Network className="h-4 w-4" />}
        actions={
          canCustom ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setSheetOpen(true)}>
              <Plus className="h-4 w-4" />
              درخت CUSTOM
            </Button>
          ) : null
        }
      />

      {healthQuery.isLoading ? (
        <Skeleton className="h-12 w-full rounded-xl" />
      ) : healthQuery.data ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm",
            healthStatus === "healthy"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : healthStatus === "needs_sync"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-border bg-muted/40 text-foreground"
          )}
        >
          <Info className="h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-medium">
              وضعیت نقشه:{" "}
              {healthStatus === "healthy"
                ? "سالم"
                : healthStatus === "needs_sync"
                  ? "نیاز به همگام‌سازی"
                  : String(healthStatus ?? "—")}
            </div>
            {healthMessage ? (
              <p className="mt-0.5 text-xs opacity-90">{healthMessage}</p>
            ) : (
              <p className="mt-0.5 text-xs opacity-90">
                درخت‌های SYS از CRUD شرکت/شعبه/واحد به‌صورت خودکار همگام می‌شوند؛ بازسازی دستی توسط کاربر وجود ندارد.
              </p>
            )}
          </div>
          {healthQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin opacity-60" /> : null}
        </div>
      ) : null}

      {!customPackLoading && !hasCustomHierarchy ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            بسته <span className="font-mono text-xs">custom_org_hierarchy</span> فعال نیست. درخت‌های SYS
            همچنان همگام می‌شوند؛ ایجاد CUSTOM مسدود است.
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 ps-9"
            placeholder="جستجو در کد، نام، هدف…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={membership} onValueChange={(v) => setMembership(v as "active" | "deleted")}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">جاری</SelectItem>
            <SelectItem value="deleted">حذف‌شده</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {listQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="سلسله‌مراتبی یافت نشد" />
      ) : (
        <div className="overflow-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-3">کد</TableHead>
                <TableHead className="px-3">نام</TableHead>
                <TableHead className="px-3">هدف</TableHead>
                <TableHead className="px-3">نوع</TableHead>
                <TableHead className="px-3">گره‌ها</TableHead>
                <TableHead className="px-3">وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((h: HierarchyDto) => {
                const open = expandedId === h.hierarchy_id;
                return (
                  <Fragment key={h.hierarchy_id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => {
                        setExpandedId(open ? null : h.hierarchy_id);
                        setNodeMembership("active");
                      }}
                    >
                      <TableCell className="px-3 font-mono text-xs" dir="ltr">
                        <span className="inline-flex items-center gap-1">
                          {open ? (
                            <ChevronDown className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronLeft className="h-3.5 w-3.5" />
                          )}
                          {h.code}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 font-medium">{h.name}</TableCell>
                      <TableCell className="px-3">{purposeLabel(h.purpose)}</TableCell>
                      <TableCell className="px-3">
                        {isSystemHierarchy(h) ? (
                          <StatusChip tone="neutral" label="SYS" />
                        ) : (
                          <StatusChip tone="success" label="CUSTOM" />
                        )}
                      </TableCell>
                      <TableCell className="px-3 text-xs text-muted-foreground">
                        {h.nodes_count != null ? toFaDigits(h.nodes_count) : "—"}
                      </TableCell>
                      <TableCell className="px-3">
                        <StatusChip
                          tone={h.is_active !== false ? "success" : "neutral"}
                          label={h.is_active !== false ? "فعال" : "غیرفعال"}
                        />
                      </TableCell>
                    </TableRow>
                    {open ? (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30 px-3 py-3">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs text-muted-foreground">گره‌های درخت</span>
                            <Select
                              value={nodeMembership}
                              onValueChange={(v) => setNodeMembership(v as "active" | "deleted")}
                            >
                              <SelectTrigger className="h-7 w-[8rem] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">جاری</SelectItem>
                                <SelectItem value="deleted">حذف‌شده</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {nodesQuery.isLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری گره‌ها…
                            </div>
                          ) : (nodesQuery.data ?? []).length === 0 ? (
                            <div className="text-sm text-muted-foreground">گره‌ای ثبت نشده</div>
                          ) : (
                            <ul className="space-y-1.5 text-sm">
                              {(nodesQuery.data ?? []).map((n: HierarchyNodeDto) => (
                                <li
                                  key={n.node_id}
                                  className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background px-2 py-1.5"
                                >
                                  <span className="text-xs text-muted-foreground">
                                    {ENTITY_LABEL[n.entity_type] ?? n.entity_type}
                                  </span>
                                  <span className="font-medium">{nodeLabel(n, companyMap)}</span>
                                  {n.node_origin === "SYSTEM" ? (
                                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
                                      سیستمی
                                    </span>
                                  ) : n.node_origin === "MANUAL" ? (
                                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">
                                      دستی
                                    </span>
                                  ) : null}
                                  {n.is_active === false ? (
                                    <StatusChip tone="neutral" label="غیرفعال" />
                                  ) : null}
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
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>درخت CUSTOM جدید</SheetTitle>
          </SheetHeader>
          <form
            className="flex flex-1 flex-col"
            onSubmit={form.handleSubmit(onCreateCustom)}
          >
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="space-y-1.5">
                <Label>کد *</Label>
                <Input dir="ltr" className="h-9" {...form.register("code", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>نام *</Label>
                <Input className="h-9" {...form.register("name", { required: true })} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                هدف این درخت به‌صورت CUSTOM ثبت می‌شود.
              </p>
            </div>
            <SheetFooter className="gap-2 border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={!canCustom}>
                ایجاد
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
