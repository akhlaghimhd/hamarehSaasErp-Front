/**
 * FE-ORG — سلسله‌مراتب (derived map)
 * Product law:
 * - SYS trees: read-only mirror of company/branch/BU (auto-synced on backend).
 * - No user-triggered rebuild.
 * - CUSTOM trees: only when tenant feature pack custom_org_hierarchy is enabled.
 * - Expand by clicking tree title (no separate nodes button).
 */
"use client";

import { Fragment, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, Info, Loader2, Network, Plus, Search } from "lucide-react";
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
  FEATURE_PACK_CODES,
  useFeaturePackEnabled,
} from "../hooks/use-feature-packs";
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

type HierForm = { code: string; name: string };
type NodeForm = { entity_type: string; entity_id: string; parent_node_id: string };

function isSystemHierarchy(h: { code?: string; is_system?: boolean }): boolean {
  if (h.is_system === true) return true;
  return String(h.code ?? "").startsWith("SYS-");
}

function purposeLabel(p?: string) {
  return PURPOSE_LABEL[p ?? ""] ?? p ?? "—";
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
  const { enabled: hasCustomHierarchy, isLoading: customPackLoading } = useFeaturePackEnabled(
    FEATURE_PACK_CODES.customOrgHierarchy
  );
  const canCustom = canManage && hasCustomHierarchy;
  const { data: companies } = useCompanies();

  const [search, setSearch] = useState("");
  const [membership, setMembership] = useState<"active" | "deleted">("active");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nodeMembership, setNodeMembership] = useState<"active" | "deleted">("active");
  const [nodeSheetOpen, setNodeSheetOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const form = useForm<HierForm>({ defaultValues: { code: "", name: "" } });
  const nodeForm = useForm<NodeForm>({
    defaultValues: { entity_type: "COMPANY", entity_id: "", parent_node_id: "" },
  });

  const listQuery = useQuery({
    queryKey: ["org", "hierarchies", membership],
    queryFn: () => hierarchyService.list({ membership }),
    enabled: hasAuthContext() && canView,
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
    <div className="space-y-6">
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
            <Button size="sm" onClick={() => setSheetOpen(true)}>
              <Plus className="h-4 w-4" /> درخت CUSTOM
            </Button>
          ) : null
        }
      />

      {!customPackLoading && !hasCustomHierarchy ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            بسته <span className="font-mono">custom_org_hierarchy</span> فعال نیست. درخت‌های SYS
            همچنان از CRUD همگام می‌شوند؛ ایجاد CUSTOM مسدود است.
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 ps-9"
            placeholder="جستجو…"
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>کد</TableHead>
                <TableHead>نام</TableHead>
                <TableHead>هدف</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((h) => {
                const open = expandedId === h.hierarchy_id;
                return (
                  <Fragment key={h.hierarchy_id}>
                    <TableRow
                      className="cursor-pointer"
                      onClick={() => setExpandedId(open ? null : h.hierarchy_id)}
                    >
                      <TableCell className="font-mono text-xs" dir="ltr">
                        <span className="inline-flex items-center gap-1">
                          {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                          {h.code}
                        </span>
                      </TableCell>
                      <TableCell>{h.name}</TableCell>
                      <TableCell>{purposeLabel(h.purpose)}</TableCell>
                      <TableCell>
                        {isSystemHierarchy(h) ? (
                          <StatusChip tone="neutral" label="SYS" />
                        ) : (
                          <StatusChip tone="success" label="CUSTOM" />
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusChip
                          tone={h.is_active !== false ? "success" : "neutral"}
                          label={h.is_active !== false ? "فعال" : "غیرفعال"}
                        />
                      </TableCell>
                    </TableRow>
                    {open ? (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/30">
                          {nodesQuery.isLoading ? (
                            <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری گره‌ها…
                            </div>
                          ) : (nodesQuery.data ?? []).length === 0 ? (
                            <div className="p-2 text-sm text-muted-foreground">گره‌ای نیست</div>
                          ) : (
                            <ul className="space-y-1 p-2 text-sm">
                              {(nodesQuery.data ?? []).map((n: HierarchyNodeDto) => (
                                <li key={n.node_id} className="flex gap-2">
                                  <span className="text-muted-foreground">
                                    {ENTITY_LABEL[n.entity_type] ?? n.entity_type}
                                  </span>
                                  <span className="font-mono text-xs" dir="ltr">
                                    {String(n.entity_id).slice(0, 8)}…
                                  </span>
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
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>درخت CUSTOM جدید</SheetTitle>
          </SheetHeader>
          <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(onCreateCustom)}>
            <div className="space-y-1">
              <Label>کد</Label>
              <Input {...form.register("code", { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>نام</Label>
              <Input {...form.register("name", { required: true })} />
            </div>
            <SheetFooter>
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
