/**
 * FE-ORG — جزئیات شرکت + شعب و واحدها (P0–P3 display)
 * Restored full file; bank/officer/CC via CompanyDetailShell + CompanyExtendedPanels.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CircleHelp, Loader2, Plus, Search } from "lucide-react";
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
import { toFaDigits } from "@/shared/lib/utils";
import { decodeCompanyRef, orgListPathFromQuery } from "../lib/company-ref";
import { useCompany, useUpdateCompany, useCompanies, useRestoreCompany } from "../hooks/use-companies";
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

export function CompanyDetailPage() {
  const params = useParams();
  const companyId =
    decodeCompanyRef(typeof params?.id === "string" ? params.id : "") ?? "";
  const searchParams = useSearchParams();
  const listNav = orgListPathFromQuery(searchParams.get("from"));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    const t = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
    return () => window.clearTimeout(t);
  }, [companyId]);

  const canView = usePermission(OrganizationPermissions.companyView);
  const canUpdate = usePermission(OrganizationPermissions.companyUpdate);
  const canViewBranch = usePermission(OrganizationPermissions.branchView);
  const canCreateBranch = usePermission(OrganizationPermissions.branchCreate);
  const canDeleteBranch = usePermission(OrganizationPermissions.branchDelete);
  const canViewDept = usePermission(OrganizationPermissions.departmentView);
  const canCreateDept = usePermission(OrganizationPermissions.departmentCreate);
  const canDeleteDept = usePermission(OrganizationPermissions.departmentDelete);

  const { data: company, isLoading, isError, error, refetch } = useCompany(companyId);
  const { data: allCompanies } = useCompanies();
  const updateCompany = useUpdateCompany();
  const restoreCompany = useRestoreCompany();
  const { data: branches, isLoading: branchesLoading, refetch: refetchBranches } =
    useBranches(canViewBranch ? companyId : null);
  const createBranch = useCreateBranch(companyId);
  const deleteBranch = useSoftDeleteBranch(companyId);
  const { data: departments, isLoading: deptsLoading } = useDepartments(
    canViewDept ? companyId : null
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
    return (allCompanies ?? []).find((c) => c.company_id === company.parent_company_id)?.name;
  }, [company, allCompanies]);

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="شرکت" breadcrumbs={[{ label: "سازمان", href: "/dashboard/organization" }, { label: "شرکت" }]} />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
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
          {error instanceof ApiClientError && error.message ? error.message : MSG_LOAD}
          <Button variant="outline" size="sm" className="ms-2" onClick={() => void refetch()}>
            تلاش مجدد
          </Button>
        </div>
      </div>
    );
  }

  const isDeleted = Boolean(company.deleted_at);
  const isInactive = company.is_active === false;
  /** حذف‌شده یا غیرفعال: هیچ ویرایش/ثبتی مجاز نیست */
  const isReadOnly = isDeleted || isInactive;
  const displayName = company.legal_name || company.name;

  const onRestore = async () => {
    try {
      await restoreCompany.mutateAsync(companyId);
      toast.success("شرکت بازگردانی شد و غیرفعال باقی ماند.");
      void refetch();
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={displayName}
        description={
          <span className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono" dir="ltr">{company.code}</span>
            {company.is_primary ? <StatusChip label="شرکت اصلی" tone="warning" /> : null}
            {isDeleted ? <StatusChip label="حذف‌شده" tone="danger" /> : isInactive ? <StatusChip label="غیرفعال" tone="warning" /> : null}
            <span className="text-muted-foreground">
              {ENTITY_KIND_LABELS[company.entity_kind ?? "OPERATING"] ?? company.entity_kind}
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
          canUpdate && !isReadOnly ? (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              ویرایش شرکت
            </Button>
          ) : null
        }
      />

      {isReadOnly ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            {isDeleted ? "این شرکت حذف شده است" : "این شرکت غیرفعال است"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isDeleted
              ? "مشاهده اطلاعات مجاز است. ثبت شعبه، واحد، آدرس و هر ویرایش تا زمان بازگردانی غیرفعال است. پس از بازگردانی، شرکت همچنان غیرفعال می‌ماند تا خودتان فعال کنید."
              : "تا زمان فعال‌سازی مجدد، امکان ویرایش یا ثبت اطلاعات جدید (شعبه، واحد، آدرس و …) وجود ندارد."}
          </p>
          {isDeleted ? (
            <div className="mt-3">
              <Button size="sm" variant="outline" disabled={restoreCompany.isPending} onClick={() => void onRestore()}>
                {restoreCompany.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                بازگردانی از حذف
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 rounded-xl border border-border/80 bg-card p-4 text-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div>
          <div className="text-xs text-muted-foreground">نام تجاری</div>
          <div>{company.trade_name || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">شماره ثبت</div>
          <div dir="ltr">{company.registration_number || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">کد اقتصادی</div>
          <div dir="ltr">{company.economic_code || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">شناسه مالیاتی</div>
          <div dir="ltr">{company.tax_identifier || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">وضعیت</div>
          <div>{company.is_active ? "فعال" : "غیرفعال"}{isDeleted ? " · حذف‌شده" : ""}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">شرکت والد</div>
          <div>{parentName || "—"}</div>
        </div>
      </div>

      {canViewBranch ? (
        <section id="branches" className="scroll-mt-20 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">شعب</h2>
            {canCreateBranch && !isReadOnly ? (
              <Button size="sm" onClick={() => setBranchOpen(true)}>
                <Plus className="h-4 w-4" />
                شعبه جدید
              </Button>
            ) : null}
          </div>
          <DataTable
            columns={[
              { id: "name", header: "نام شعبه", cell: (row: BranchDto) => <span className="font-medium">{row.name}</span> },
              { id: "code", header: "کد", cell: (row: BranchDto) => <span className="font-mono text-xs" dir="ltr">{row.code}</span> },
              { id: "kind", header: "نوع", cell: (row: BranchDto) => <span className="text-xs">{BRANCH_KIND_LABELS[row.branch_kind ?? "OFFICE"] ?? row.branch_kind ?? "—"}</span> },
              { id: "active", header: "وضعیت", cell: (row: BranchDto) => row.is_active ? <StatusChip label="فعال" tone="success" /> : <StatusChip label="غیرفعال" tone="neutral" /> },
            ]}
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
                <Input className="h-9 ps-8" placeholder="جستجوی شعبه…" value={branchQuery} onChange={(e) => setBranchQuery(e.target.value)} />
              </div>
            }
          />
        </section>
      ) : null}

      {canViewDept ? (
        <section id="departments" className="scroll-mt-20 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">واحدهای سازمانی</h2>
            {canCreateDept && !isReadOnly ? (
              <Button size="sm" onClick={() => setDeptOpen(true)}>
                <Plus className="h-4 w-4" />
                واحد جدید
              </Button>
            ) : null}
          </div>
          <DataTable
            columns={[
              { id: "name", header: "نام واحد", cell: (row: DepartmentDto) => <span className="font-medium">{row.name}</span> },
              { id: "code", header: "کد", cell: (row: DepartmentDto) => <span className="font-mono text-xs" dir="ltr">{row.code}</span> },
              { id: "branch", header: "شعبه", cell: (row: DepartmentDto) => <span className="text-xs">{branchNameById.get(row.branch_id) ?? "—"}</span> },
              { id: "active", header: "وضعیت", cell: (row: DepartmentDto) => row.is_active ? <StatusChip label="فعال" tone="success" /> : <StatusChip label="غیرفعال" tone="neutral" /> },
            ]}
            data={deptRows}
            getRowKey={(r) => r.department_id}
            loading={deptsLoading}
            isFiltered={deptQuery.trim().length > 0}
            emptyTitle="واحدی ثبت نشده"
            emptyDescription="اولین واحد سازمانی را ثبت کنید."
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
                <Input className="h-9 ps-8" placeholder="جستجوی واحد…" value={deptQuery} onChange={(e) => setDeptQuery(e.target.value)} />
              </div>
            }
          />
        </section>
      ) : null}

      <Dialog open={branchOpen && !isReadOnly} onOpenChange={setBranchOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>شعبه جدید</DialogTitle></DialogHeader>
          <form
            className="space-y-3"
            onSubmit={branchForm.handleSubmit(async (values) => {
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
                branchForm.reset();
                void refetchBranches();
              } catch (e) {
                toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
              }
            })}
          >
            <div className="space-y-1.5"><Label>کد</Label><Input className="h-9" dir="ltr" {...branchForm.register("code", { required: true })} /></div>
            <div className="space-y-1.5"><Label>نام</Label><Input className="h-9" {...branchForm.register("name", { required: true })} /></div>
            <div className="space-y-1.5"><Label>آدرس</Label><Input className="h-9" {...branchForm.register("address")} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBranchOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={createBranch.isPending}>{createBranch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deptOpen && !isReadOnly} onOpenChange={setDeptOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>واحد سازمانی جدید</DialogTitle></DialogHeader>
          <form
            className="space-y-3"
            onSubmit={deptForm.handleSubmit(async (values) => {
              try {
                await createDept.mutateAsync({
                  company_id: companyId,
                  branch_id: values.branch_id,
                  code: values.code.trim(),
                  name: values.name.trim(),
                  is_active: values.is_active,
                });
                toast.success("واحد سازمانی ثبت شد");
                setDeptOpen(false);
                deptForm.reset();
              } catch (e) {
                toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
              }
            })}
          >
            <div className="space-y-1.5">
              <Label>شعبه</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...deptForm.register("branch_id", { required: true })}>
                <option value="">— انتخاب —</option>
                {(branches ?? []).map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5"><Label>کد</Label><Input className="h-9" dir="ltr" {...deptForm.register("code", { required: true })} /></div>
            <div className="space-y-1.5"><Label>نام</Label><Input className="h-9" {...deptForm.register("name", { required: true })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeptOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={createDept.isPending}>{createDept.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen && !isReadOnly} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>ویرایش شرکت</DialogTitle></DialogHeader>
          <form
            className="space-y-3"
            onSubmit={editForm.handleSubmit(async (values) => {
              try {
                await updateCompany.mutateAsync({
                  companyId,
                  payload: {
                    code: values.code.trim(),
                    name: values.name.trim(),
                    legal_name: values.legal_name.trim() || values.name.trim(),
                    trade_name: values.trade_name.trim() || null,
                    registration_number: values.registration_number.trim() || null,
                    economic_code: values.economic_code.trim() || null,
                    tax_identifier: values.tax_identifier.trim() || null,
                    entity_kind: values.entity_kind || "OPERATING",
                    is_primary: values.is_primary,
                    parent_company_id: values.parent_company_id || null,
                    default_consol_rate_type: values.default_consol_rate_type || null,
                    is_active: values.is_active,
                  },
                });
                toast.success("اطلاعات شرکت به‌روز شد");
                setEditOpen(false);
                void refetch();
              } catch (e) {
                toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR);
              }
            })}
          >
            <div className="space-y-1.5"><Label>کد</Label><Input className="h-9" dir="ltr" {...editForm.register("code", { required: true })} /></div>
            <div className="space-y-1.5"><Label>نام</Label><Input className="h-9" {...editForm.register("name", { required: true })} /></div>
            <div className="space-y-1.5"><Label>نام حقوقی</Label><Input className="h-9" {...editForm.register("legal_name")} /></div>
            <div className="flex items-center justify-between gap-2"><Label>فعال</Label><Switch checked={editForm.watch("is_active")} onCheckedChange={(v) => editForm.setValue("is_active", v)} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={updateCompany.isPending}>{updateCompany.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
