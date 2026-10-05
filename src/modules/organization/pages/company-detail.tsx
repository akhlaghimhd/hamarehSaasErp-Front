/**
 * FE-ORG — جزئیات شرکت (URL ثابت /detail؛ شناسه فقط در session focus)
 * + پنل شعب و واحدهای سازمانی + نمایش ارقام فارسی + هویت بصری (مونوگرام)
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleHelp, Loader2, Plus, Search, Building2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  DataTable,
  type DataTableColumn,
} from "@/shared/components/data-display/data-table";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { toFaDigits, cn } from "@/shared/lib/utils";
import {
  getCompanyFocusId,
  getCompanyFocusFrom,
  orgListPathFromQuery,
} from "../lib/company-ref";
import {
  useCompany,
  useUpdateCompany,
  useCompanies,
  useRestoreCompany,
} from "../hooks/use-companies";
import {
  useBranches,
  useCreateBranch,
  useSoftDeleteBranch,
} from "../hooks/use-branches";
import {
  useDepartments,
  useCreateDepartment,
  useSoftDeleteDepartment,
} from "../hooks/use-departments";
import {
  OrganizationPermissions,
  ENTITY_KIND_LABELS,
  ENTITY_KIND_FIELD_LABEL,
  ENTITY_KIND_OPTIONS,
  BRANCH_KIND_LABELS,
  STATUS_LABELS,
  type BranchDto,
  type DepartmentDto,
} from "../types";

const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";
const MSG_LOAD = "بارگذاری اطلاعات شرکت ممکن نشد.";
const MSG_NO_ACCESS = "برای مشاهده این بخش مجوز لازم را ندارید.";
const MSG_NO_FOCUS =
  "شرکتی انتخاب نشده است. از فهرست شرکت‌ها یک شرکت را باز کنید.";

/** Stable brand color from company id (no logo field yet). */
function brandFromId(id: string): { bg: string; fg: string; ring: string } {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return {
    bg: `hsl(${hue} 48% 92%)`,
    fg: `hsl(${hue} 55% 28%)`,
    ring: `hsl(${hue} 45% 70%)`,
  };
}

function companyMonogram(name: string): string {
  const t = (name || "").trim();
  if (!t) return "ش";
  const parts = t.split(/\s+/).filter(Boolean);
  if (/^[A-Za-z]/.test(t) && parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return t[0]!.toUpperCase();
}

export function CompanyDetailPage() {
  const searchParams = useSearchParams();
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    setCompanyId(getCompanyFocusId() ?? "");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const t = window.setTimeout(() => {
      document
        .getElementById(hash)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    return () => window.clearTimeout(t);
  }, [companyId]);

  const listNav = orgListPathFromQuery(
    searchParams.get("from") ?? getCompanyFocusFrom()
  );

  const canView = usePermission(OrganizationPermissions.companyView);
  const canUpdate = usePermission(OrganizationPermissions.companyUpdate);
  const canViewBranch = usePermission(OrganizationPermissions.branchView);
  const canCreateBranch = usePermission(OrganizationPermissions.branchCreate);
  const canDeleteBranch = usePermission(OrganizationPermissions.branchDelete);
  const canViewDept = usePermission(OrganizationPermissions.departmentView);
  const canCreateDept = usePermission(OrganizationPermissions.departmentCreate);
  const canDeleteDept = usePermission(OrganizationPermissions.departmentDelete);

  const { data: company, isLoading, isError, error, refetch } = useCompany(
    companyId || null
  );
  const { data: allCompanies } = useCompanies();
  const updateCompany = useUpdateCompany();
  const restoreCompany = useRestoreCompany();
  const {
    data: branches,
    isLoading: branchesLoading,
    refetch: refetchBranches,
  } = useBranches(canViewBranch && companyId ? companyId : null);
  const createBranch = useCreateBranch(companyId);
  const deleteBranch = useSoftDeleteBranch(companyId);
  const { data: departments, isLoading: deptsLoading } = useDepartments(
    canViewDept && companyId ? companyId : null
  );
  const createDept = useCreateDepartment(companyId);
  const deleteDept = useSoftDeleteDepartment(companyId);

  const [branchQuery, setBranchQuery] = useState("");
  const [deptQuery, setDeptQuery] = useState("");
  const [branchOpen, setBranchOpen] = useState(false);
  const [deptOpen, setDeptOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const editForm = useForm({
    values: {
      code: company?.code ?? "",
      name: company?.name ?? "",
      legal_name: company?.legal_name ?? "",
      trade_name: company?.trade_name ?? "",
      registration_number: company?.registration_number ?? "",
      economic_code: company?.economic_code ?? "",
      tax_identifier: company?.tax_identifier ?? "",
      entity_kind: company?.entity_kind ?? "OPERATING",
      is_primary: company?.is_primary ?? false,
      parent_company_id: company?.parent_company_id ?? "",
      default_consol_rate_type: company?.default_consol_rate_type ?? "",
      is_active: company?.is_active ?? true,
    },
  });

  const branchForm = useForm({
    defaultValues: {
      code: "",
      name: "",
      address: "",
      branch_kind: "OFFICE",
      is_active: true,
      supports_shipping: false,
      supports_receiving: false,
      is_manufacturing_site: false,
    },
  });

  const deptForm = useForm({
    defaultValues: { branch_id: "", code: "", name: "", is_active: true },
  });

  const branchRows = useMemo(() => {
    const rows = branches ?? [];
    const q = branchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.code, r.name, r.address, r.branch_kind]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [branches, branchQuery]);

  const deptRows = useMemo(() => {
    const rows = departments ?? [];
    const q = deptQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.code, r.name].filter(Boolean).join(" ").toLowerCase().includes(q)
    );
  }, [departments, deptQuery]);

  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of branches ?? []) map.set(b.branch_id, b.name);
    return map;
  }, [branches]);

  const parentName = useMemo(() => {
    if (!company?.parent_company_id) return null;
    return (allCompanies ?? []).find(
      (c) => c.company_id === company.parent_company_id
    )?.name;
  }, [company, allCompanies]);

  const brand = useMemo(
    () => brandFromId(companyId || "default"),
    [companyId]
  );

  const branchColumns: DataTableColumn<BranchDto>[] = [
    {
      id: "name",
      header: "نام شعبه",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: "code",
      header: "کد",
      cell: (row) => (
        <span className="font-mono text-xs">{toFaDigits(row.code)}</span>
      ),
    },
    {
      id: "kind",
      header: "نوع",
      cell: (row) => (
        <span className="text-xs">
          {BRANCH_KIND_LABELS[row.branch_kind ?? "OFFICE"] ??
            row.branch_kind ??
            "—"}
        </span>
      ),
    },
    {
      id: "address",
      header: "آدرس",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.address ? toFaDigits(row.address) : "—"}
        </span>
      ),
    },
    {
      id: "active",
      header: "وضعیت",
      cell: (row) =>
        row.is_active ? (
          <StatusChip label="فعال" tone="success" />
        ) : (
          <StatusChip label="غیرفعال" tone="neutral" />
        ),
    },
    {
      id: "actions",
      header: "",
      cell: (row) =>
        canDeleteBranch && !company?.deleted_at ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-destructive"
            onClick={async () => {
              if (!window.confirm(`شعبه «${row.name}» حذف شود؟`)) return;
              try {
                await deleteBranch.mutateAsync(row.branch_id);
                toast.success("شعبه حذف شد");
              } catch (e) {
                toast.error(
                  e instanceof ApiClientError && e.message ? e.message : MSG_ERR
                );
              }
            }}
          >
            حذف
          </Button>
        ) : null,
    },
  ];

  const deptColumns: DataTableColumn<DepartmentDto>[] = [
    {
      id: "name",
      header: "نام واحد",
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      id: "code",
      header: "کد",
      cell: (row) => (
        <span className="font-mono text-xs">{toFaDigits(row.code)}</span>
      ),
    },
    {
      id: "branch",
      header: "شعبه",
      cell: (row) => (
        <span className="text-xs">
          {branchNameById.get(row.branch_id) ?? "—"}
        </span>
      ),
    },
    {
      id: "active",
      header: "وضعیت",
      cell: (row) =>
        row.is_active ? (
          <StatusChip label="فعال" tone="success" />
        ) : (
          <StatusChip label="غیرفعال" tone="neutral" />
        ),
    },
    {
      id: "actions",
      header: "",
      cell: (row) =>
        canDeleteDept && !company?.deleted_at ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-destructive"
            onClick={async () => {
              if (!window.confirm(`واحد «${row.name}» حذف شود؟`)) return;
              try {
                await deleteDept.mutateAsync(row.department_id);
                toast.success("واحد حذف شد");
              } catch (e) {
                toast.error(
                  e instanceof ApiClientError && e.message ? e.message : MSG_ERR
                );
              }
            }}
          >
            حذف
          </Button>
        ) : null,
    },
  ];

  const onEditCompany = editForm.handleSubmit(async (values) => {
    if (!companyId) return;
    try {
      await updateCompany.mutateAsync({
        companyId,
        payload: {
          code: values.code.trim(),
          name: values.name.trim(),
          legal_name: values.legal_name.trim() || null,
          trade_name: values.trade_name.trim() || null,
          registration_number: values.registration_number.trim() || null,
          economic_code: values.economic_code.trim() || null,
          tax_identifier: values.tax_identifier.trim() || null,
          entity_kind: values.entity_kind || "OPERATING",
          is_primary: values.is_primary,
          parent_company_id: values.parent_company_id.trim() || null,
          is_active: values.is_active,
          row_version: company?.row_version,
        },
      });
      toast.success("اطلاعات شرکت به‌روز شد");
      setEditOpen(false);
      void refetch();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_ERR
      );
    }
  });

  const onCreateBranch = branchForm.handleSubmit(async (values) => {
    try {
      await createBranch.mutateAsync({
        company_id: companyId,
        code: values.code.trim(),
        name: values.name.trim(),
        address: values.address.trim() || null,
        branch_kind: values.branch_kind || "OFFICE",
        supports_shipping: values.supports_shipping,
        supports_receiving: values.supports_receiving,
        is_manufacturing_site: values.is_manufacturing_site,
        is_active: values.is_active,
      });
      toast.success("شعبه ثبت شد");
      setBranchOpen(false);
      branchForm.reset({
        code: "",
        name: "",
        address: "",
        branch_kind: "OFFICE",
        is_active: true,
        supports_shipping: false,
        supports_receiving: false,
        is_manufacturing_site: false,
      });
      void refetchBranches();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_ERR
      );
    }
  });

  const onCreateDept = deptForm.handleSubmit(async (values) => {
    if (!values.branch_id) {
      toast.error("انتخاب شعبه الزامی است.");
      return;
    }
    try {
      await createDept.mutateAsync({
        branch_id: values.branch_id,
        code: values.code.trim(),
        name: values.name.trim(),
        is_active: values.is_active,
      });
      toast.success("واحد سازمانی ثبت شد");
      setDeptOpen(false);
      deptForm.reset({ branch_id: "", code: "", name: "", is_active: true });
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_ERR
      );
    }
  });

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="شرکت"
          breadcrumbs={[
            { label: "سازمان", href: "/dashboard/organization" },
            { label: "شرکت" },
          ]}
        />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="جزئیات شرکت"
          breadcrumbs={[
            { label: "سازمان", href: "/dashboard/organization" },
            { label: listNav.label, href: listNav.href },
            { label: "جزئیات" },
          ]}
          backHref={listNav.href}
        />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_FOCUS}
          <div className="mt-3">
            <Button asChild size="sm" variant="outline">
              <a href={listNav.href}>بازگشت به فهرست</a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        در حال بارگذاری…
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="شرکت"
          breadcrumbs={[
            { label: "سازمان", href: "/dashboard/organization" },
            { label: listNav.label, href: listNav.href },
            { label: "جزئیات" },
          ]}
          backHref={listNav.href}
        />
        <div className="text-sm text-destructive">
          {error instanceof ApiClientError && error.message
            ? error.message
            : MSG_LOAD}
          <Button
            variant="outline"
            size="sm"
            className="ms-2"
            onClick={() => void refetch()}
          >
            تلاش مجدد
          </Button>
        </div>
      </div>
    );
  }

  const isDeleted = Boolean(company.deleted_at);
  const isInactive = company.is_active === false;
  const displayName = company.legal_name || company.name;
  const monogram = companyMonogram(displayName);

  const onRestore = async () => {
    try {
      await restoreCompany.mutateAsync(companyId);
      toast.success("شرکت بازگردانی شد و غیرفعال باقی ماند.");
      void refetch();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_ERR
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={displayName}
        description={
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono">{toFaDigits(company.code)}</span>
            {company.is_primary ? (
              <StatusChip label="شرکت اصلی" tone="warning" />
            ) : null}
            {isDeleted ? (
              <StatusChip label="حذف‌شده" tone="danger" />
            ) : isInactive ? (
              <StatusChip label="غیرفعال" tone="warning" />
            ) : null}
            <span className="text-muted-foreground">
              {ENTITY_KIND_LABELS[company.entity_kind ?? "OPERATING"] ??
                company.entity_kind}
            </span>
          </span>
        }
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "سازمان", href: "/dashboard/organization" },
          { label: listNav.label, href: listNav.href },
          { label: displayName },
        ]}
        backHref={listNav.href}
        actions={
          canUpdate && !isDeleted ? (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              ویرایش شرکت
            </Button>
          ) : null
        }
      />

      <div
        className="overflow-hidden rounded-xl border border-border/80 bg-card"
        style={{ borderColor: brand.ring }}
      >
        <div
          className="h-2 w-full"
          style={{ background: brand.ring }}
          aria-hidden
        />
        <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <div
            className={
              "flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold shadow-sm"
            }
            style={{
              background: brand.bg,
              color: brand.fg,
              boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${brand.ring}`,
            }}
            title="نشان بصری شرکت (مونوگرام)"
          >
            {monogram}
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-semibold tracking-tight">
                {displayName}
              </h2>
              {company.trade_name && company.trade_name !== displayName ? (
                <span className="text-sm text-muted-foreground">
                  · {company.trade_name}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                کد {toFaDigits(company.code)}
              </span>
              <span>
                {ENTITY_KIND_LABELS[company.entity_kind ?? "OPERATING"] ??
                  company.entity_kind}
              </span>
              {parentName ? <span>والد: {parentName}</span> : null}
            </div>
            <p className="text-[11px] text-muted-foreground/80">
              بارگذاری لوگو و پالت برند رسمی پس از افزودن فیلدهای بصری در بک‌اند
              فعال می‌شود؛ فعلاً مونوگرام پایدار از نام شرکت نمایش داده می‌شود.
            </p>
          </div>
        </div>
      </div>

      {isDeleted ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            این شرکت حذف شده است
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            مشاهده اطلاعات مجاز است؛ ثبت شعبه، واحد یا ویرایش تا زمان بازگردانی
            غیرفعال است. پس از بازگردانی، شرکت غیرفعال می‌ماند تا خودتان فعال
            کنید.
          </p>
          <div className="mt-3">
            <Button
              size="sm"
              variant="outline"
              disabled={restoreCompany.isPending}
              onClick={() => void onRestore()}
            >
              {restoreCompany.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              بازگردانی از حذف
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 rounded-xl border border-border/80 bg-card p-4 text-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div>
          <div className="text-xs text-muted-foreground">نام تجاری</div>
          <div>{company.trade_name || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">شماره ثبت</div>
          <div>
            {company.registration_number
              ? toFaDigits(company.registration_number)
              : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">کد اقتصادی</div>
          <div>
            {company.economic_code ? toFaDigits(company.economic_code) : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">شناسه مالیاتی</div>
          <div>
            {company.tax_identifier ? toFaDigits(company.tax_identifier) : "—"}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">وضعیت حقوقی</div>
          <div>
            {STATUS_LABELS[company.status ?? (company.is_active ? 1 : 2)] ??
              (company.is_active ? "فعال" : "غیرفعال")}
            {isDeleted ? " · حذف‌شده" : ""}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">شرکت والد</div>
          <div>{parentName || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">نرخ تسعیر پیش‌فرض</div>
          <div>{company.default_consol_rate_type || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">نسخه ردیف</div>
          <div>{toFaDigits(company.row_version ?? 1)}</div>
        </div>
      </div>

      {canViewBranch ? (
        <section id="branches" className="scroll-mt-20 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">
              شعب
              {branches ? (
                <span className="ms-2 text-xs font-normal text-muted-foreground">
                  ({toFaDigits(branchRows.length)})
                </span>
              ) : null}
            </h2>
            {canCreateBranch && !isDeleted ? (
              <Button size="sm" onClick={() => setBranchOpen(true)}>
                <Plus className="h-4 w-4" />
                شعبه جدید
              </Button>
            ) : null}
          </div>
          <DataTable
            columns={branchColumns}
            data={branchRows}
            getRowKey={(r) => r.branch_id}
            loading={branchesLoading}
            isFiltered={branchQuery.trim().length > 0}
            emptyTitle="شعبه‌ای ثبت نشده"
            emptyDescription="اولین شعبه این شرکت را ثبت کنید."
            emptySearchTitle="نتیجه‌ای پیدا نشد"
            emptySearchDescription="عبارت جستجو را تغییر دهید."
            page={1}
            pageSize={50}
            total={branchRows.length}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
            toolbar={
              <div className="relative min-w-[12rem] max-w-xs flex-1">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 ps-8"
                  placeholder="جستجوی شعبه…"
                  value={branchQuery}
                  onChange={(e) => setBranchQuery(e.target.value)}
                />
              </div>
            }
          />
        </section>
      ) : null}

      {canViewDept ? (
        <section id="departments" className="scroll-mt-20 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">
              واحدهای سازمانی
              {departments ? (
                <span className="ms-2 text-xs font-normal text-muted-foreground">
                  ({toFaDigits(deptRows.length)})
                </span>
              ) : null}
            </h2>
            {canCreateDept && !isDeleted ? (
              <Button size="sm" onClick={() => setDeptOpen(true)}>
                <Plus className="h-4 w-4" />
                واحد جدید
              </Button>
            ) : null}
          </div>
          <DataTable
            columns={deptColumns}
            data={deptRows}
            getRowKey={(r) => r.department_id}
            loading={deptsLoading}
            isFiltered={deptQuery.trim().length > 0}
            emptyTitle="واحدی ثبت نشده"
            emptyDescription="اولین واحد سازمانی این شرکت را ثبت کنید."
            emptySearchTitle="نتیجه‌ای پیدا نشد"
            emptySearchDescription="عبارت جستجو را تغییر دهید."
            page={1}
            pageSize={50}
            total={deptRows.length}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
            toolbar={
              <div className="relative min-w-[12rem] max-w-xs flex-1">
                <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-9 ps-8"
                  placeholder="جستجوی واحد…"
                  value={deptQuery}
                  onChange={(e) => setDeptQuery(e.target.value)}
                />
              </div>
            }
          />
        </section>
      ) : null}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>ویرایش شرکت</DialogTitle>
          </DialogHeader>
          <form onSubmit={onEditCompany} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>کد</Label>
                <Input className="h-9" dir="ltr" {...editForm.register("code")} />
              </div>
              <div className="space-y-1.5">
                <Label>نام</Label>
                <Input className="h-9" {...editForm.register("name")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>نام حقوقی</Label>
              <Input className="h-9" {...editForm.register("legal_name")} />
            </div>
            <div className="space-y-1.5">
              <Label>نام تجاری</Label>
              <Input className="h-9" {...editForm.register("trade_name")} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>شماره ثبت</Label>
                <Input
                  className="h-9"
                  dir="ltr"
                  {...editForm.register("registration_number")}
                />
              </div>
              <div className="space-y-1.5">
                <Label>کد اقتصادی</Label>
                <Input
                  className="h-9"
                  dir="ltr"
                  {...editForm.register("economic_code")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>شناسه مالیاتی</Label>
              <Input
                className="h-9"
                dir="ltr"
                {...editForm.register("tax_identifier")}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label>{ENTITY_KIND_FIELD_LABEL}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground">
                        <CircleHelp className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      نقش شرکت در ساختار گروه (عملیاتی، هلدینگ، حذفی).
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...editForm.register("entity_kind")}
              >
                {ENTITY_KIND_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {!company.is_primary ? (
              <div className="space-y-1.5">
                <Label>شرکت والد</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...editForm.register("parent_company_id")}
                >
                  <option value="">بدون والد</option>
                  {(allCompanies ?? [])
                    .filter((c) => c.company_id !== companyId)
                    .map((c) => (
                      <option key={c.company_id} value={c.company_id}>
                        {c.legal_name || c.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : null}
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <Label>فعال</Label>
              <Switch
                checked={editForm.watch("is_active")}
                onCheckedChange={(v) => editForm.setValue("is_active", v)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={updateCompany.isPending}>
                {updateCompany.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "ذخیره"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={branchOpen} onOpenChange={setBranchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>شعبه جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreateBranch} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>کد</Label>
                <Input className="h-9" dir="ltr" {...branchForm.register("code")} />
              </div>
              <div className="space-y-1.5">
                <Label>نام</Label>
                <Input className="h-9" {...branchForm.register("name")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>آدرس</Label>
              <Input className="h-9" {...branchForm.register("address")} />
            </div>
            <div className="space-y-1.5">
              <Label>نوع شعبه</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...branchForm.register("branch_kind")}
              >
                {Object.entries(BRANCH_KIND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 rounded-lg border px-3 py-2 text-sm">
              <div className="flex items-center justify-between">
                <Label>فعال</Label>
                <Switch
                  checked={branchForm.watch("is_active")}
                  onCheckedChange={(v) => branchForm.setValue("is_active", v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>ارسال کالا</Label>
                <Switch
                  checked={branchForm.watch("supports_shipping")}
                  onCheckedChange={(v) =>
                    branchForm.setValue("supports_shipping", v)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>دریافت کالا</Label>
                <Switch
                  checked={branchForm.watch("supports_receiving")}
                  onCheckedChange={(v) =>
                    branchForm.setValue("supports_receiving", v)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>سایت تولیدی</Label>
                <Switch
                  checked={branchForm.watch("is_manufacturing_site")}
                  onCheckedChange={(v) =>
                    branchForm.setValue("is_manufacturing_site", v)
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setBranchOpen(false)}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={createBranch.isPending}>
                {createBranch.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "ثبت"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deptOpen} onOpenChange={setDeptOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>واحد سازمانی جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreateDept} className="space-y-3">
            <div className="space-y-1.5">
              <Label>شعبه</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...deptForm.register("branch_id")}
              >
                <option value="">انتخاب شعبه…</option>
                {(branches ?? []).map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>کد</Label>
                <Input className="h-9" dir="ltr" {...deptForm.register("code")} />
              </div>
              <div className="space-y-1.5">
                <Label>نام</Label>
                <Input className="h-9" {...deptForm.register("name")} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <Label>فعال</Label>
              <Switch
                checked={deptForm.watch("is_active")}
                onCheckedChange={(v) => deptForm.setValue("is_active", v)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeptOpen(false)}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={createDept.isPending}>
                {createDept.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "ثبت"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
