/**
 * FE-ORG-T02 — جزئیات شرکت + مدیریت شعب و واحدها
 */

"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Plus, Search } from "lucide-react";
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
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import { useCompany, useUpdateCompany } from "../hooks/use-companies";
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
  type BranchDto,
  type DepartmentDto,
} from "../types";

const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";
const MSG_LOAD = "بارگذاری اطلاعات شرکت ممکن نشد.";
const MSG_NO_ACCESS = "برای مشاهده این بخش مجوز لازم را ندارید.";

export function CompanyDetailPage() {
  const params = useParams();
  const companyId = typeof params?.id === "string" ? params.id : "";

  const canView = usePermission(OrganizationPermissions.companyView);
  const canUpdate = usePermission(OrganizationPermissions.companyUpdate);
  const canViewBranch = usePermission(OrganizationPermissions.branchView);
  const canCreateBranch = usePermission(OrganizationPermissions.branchCreate);
  const canDeleteBranch = usePermission(OrganizationPermissions.branchDelete);
  const canViewDept = usePermission(OrganizationPermissions.departmentView);
  const canCreateDept = usePermission(OrganizationPermissions.departmentCreate);
  const canDeleteDept = usePermission(OrganizationPermissions.departmentDelete);

  const {
    data: company,
    isLoading,
    isError,
    error,
    refetch,
  } = useCompany(companyId);
  const updateCompany = useUpdateCompany();
  const {
    data: branches,
    isLoading: branchesLoading,
    refetch: refetchBranches,
  } = useBranches(canViewBranch ? companyId : null);
  const createBranch = useCreateBranch(companyId);
  const deleteBranch = useSoftDeleteBranch(companyId);
  const {
    data: departments,
    isLoading: deptsLoading,
  } = useDepartments(canViewDept ? companyId : null);
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
      registration_number: company?.registration_number ?? "",
      economic_code: company?.economic_code ?? "",
      is_active: company?.is_active ?? true,
    },
  });

  const branchForm = useForm({
    defaultValues: { code: "", name: "", address: "", is_active: true },
  });

  const deptForm = useForm({
    defaultValues: {
      branch_id: "",
      code: "",
      name: "",
      is_active: true,
    },
  });

  const branchRows = useMemo(() => {
    const rows = branches ?? [];
    const q = branchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.code, r.name, r.address].filter(Boolean).join(" ").toLowerCase().includes(q)
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
        <span className="font-mono text-xs" dir="ltr">
          {row.code}
        </span>
      ),
    },
    {
      id: "address",
      header: "آدرس",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.address || "—"}
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
        canDeleteBranch ? (
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
        <span className="font-mono text-xs" dir="ltr">
          {row.code}
        </span>
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
        canDeleteDept ? (
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
    try {
      await updateCompany.mutateAsync({
        companyId,
        payload: {
          code: values.code.trim(),
          name: values.name.trim(),
          registration_number: values.registration_number.trim() || null,
          economic_code: values.economic_code.trim() || null,
          is_active: values.is_active,
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
        is_active: values.is_active,
      });
      toast.success("شعبه ثبت شد");
      setBranchOpen(false);
      branchForm.reset({ code: "", name: "", address: "", is_active: true });
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
            { label: "شرکت‌ها", href: "/dashboard/organization/companies" },
            { label: "جزئیات" },
          ]}
        />
        <div className="text-sm text-destructive">
          {error instanceof ApiClientError && error.message
            ? error.message
            : MSG_LOAD}
          <Button variant="outline" size="sm" className="ms-2" onClick={() => void refetch()}>
            تلاش مجدد
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={company.name}
        description={
          <span className="font-mono text-xs" dir="ltr">
            {company.code}
          </span>
        }
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "شرکت‌ها", href: "/dashboard/organization/companies" },
          { label: company.name },
        ]}
        actions={
          canUpdate ? (
            <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
              ویرایش شرکت
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 rounded-xl border border-border/80 bg-card p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-xs text-muted-foreground">شماره ثبت</div>
          <div dir="ltr">{company.registration_number || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">کد اقتصادی</div>
          <div dir="ltr">{company.economic_code || "—"}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">وضعیت</div>
          <div>
            {company.is_active ? (
              <StatusChip label="فعال" tone="success" />
            ) : (
              <StatusChip label="غیرفعال" tone="neutral" />
            )}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">نسخه ردیف</div>
          <div>{toFaDigits(company.row_version ?? 1)}</div>
        </div>
      </div>

      {canViewBranch ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">شعب</h2>
            {canCreateBranch ? (
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
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold">واحدهای سازمانی</h2>
            {canCreateDept ? (
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
        <DialogContent
          onInteractOutside={(e) => {
            if (editForm.formState.isDirty) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>ویرایش شرکت</DialogTitle>
          </DialogHeader>
          <form onSubmit={onEditCompany} className="space-y-3">
            <div className="space-y-1.5">
              <Label>کد *</Label>
              <Input className="h-9" dir="ltr" {...editForm.register("code", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>نام *</Label>
              <Input className="h-9" {...editForm.register("name", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>شماره ثبت</Label>
              <Input className="h-9" dir="ltr" {...editForm.register("registration_number")} />
            </div>
            <div className="space-y-1.5">
              <Label>کد اقتصادی</Label>
              <Input className="h-9" dir="ltr" {...editForm.register("economic_code")} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label>فعال</Label>
              <Switch
                checked={editForm.watch("is_active")}
                onCheckedChange={(v) => editForm.setValue("is_active", v)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" size="sm" disabled={updateCompany.isPending}>
                {updateCompany.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={branchOpen} onOpenChange={setBranchOpen}>
        <DialogContent
          onInteractOutside={(e) => {
            if (branchForm.formState.isDirty) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>شعبه جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreateBranch} className="space-y-3">
            <div className="space-y-1.5">
              <Label>کد *</Label>
              <Input className="h-9" dir="ltr" {...branchForm.register("code", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>نام *</Label>
              <Input className="h-9" {...branchForm.register("name", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>آدرس</Label>
              <Input className="h-9" {...branchForm.register("address")} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label>فعال</Label>
              <Switch
                checked={branchForm.watch("is_active")}
                onCheckedChange={(v) => branchForm.setValue("is_active", v)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setBranchOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" size="sm" disabled={createBranch.isPending}>
                {createBranch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deptOpen} onOpenChange={setDeptOpen}>
        <DialogContent
          onInteractOutside={(e) => {
            if (deptForm.formState.isDirty) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>واحد سازمانی جدید</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreateDept} className="space-y-3">
            <div className="space-y-1.5">
              <Label>شعبه *</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...deptForm.register("branch_id", { required: true })}
              >
                <option value="">انتخاب شعبه…</option>
                {(branches ?? []).map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>کد *</Label>
              <Input className="h-9" dir="ltr" {...deptForm.register("code", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>نام *</Label>
              <Input className="h-9" {...deptForm.register("name", { required: true })} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label>فعال</Label>
              <Switch
                checked={deptForm.watch("is_active")}
                onCheckedChange={(v) => deptForm.setValue("is_active", v)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setDeptOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" size="sm" disabled={createDept.isPending}>
                {createDept.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
