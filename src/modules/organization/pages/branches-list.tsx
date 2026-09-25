/**
 * FE-ORG — فهرست سراسری شعب (همه شرکت‌ها) با فیلتر شرکت
 * Option C: independent list; aggregates per-company branch APIs client-side.
 */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { usePermission } from "@/auth";
import { ApiClientError, tokenStorage } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import { useCompanies } from "../hooks/use-companies";
import { useCreateBranch, branchesQueryKey } from "../hooks/use-branches";
import { branchService } from "../services/branch-service";
import { companyDetailPath } from "../lib/company-ref";
import {
  OrganizationPermissions,
  BRANCH_KIND_LABELS,
  type BranchDto,
} from "../types";

const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";
const MSG_NO_ACCESS = "برای مشاهده این بخش مجوز لازم را ندارید.";
const ALL = "__all__";

type BranchRow = BranchDto & { company_name: string };

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

export function BranchesListPage() {
  const canView =
    usePermission(OrganizationPermissions.branchView) ||
    usePermission(OrganizationPermissions.companyView);
  const canCreate = usePermission(OrganizationPermissions.branchCreate);

  const { data: companies, isLoading: companiesLoading } = useCompanies();
  const companyList = companies ?? [];

  const branchQueries = useQueries({
    queries: companyList.map((c) => ({
      queryKey: branchesQueryKey(c.company_id),
      queryFn: () => branchService.listByCompany(c.company_id),
      enabled: hasAuthContext() && companyList.length > 0,
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const isLoading =
    companiesLoading || branchQueries.some((q) => q.isLoading || q.isFetching);
  const isError = branchQueries.some((q) => q.isError);

  const companyNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of companyList) {
      m.set(c.company_id, c.legal_name || c.name);
    }
    return m;
  }, [companyList]);

  const allRows: BranchRow[] = useMemo(() => {
    const out: BranchRow[] = [];
    companyList.forEach((c, i) => {
      const list = branchQueries[i]?.data ?? [];
      for (const b of list) {
        out.push({
          ...b,
          company_name: companyNameById.get(c.company_id) ?? c.name,
        });
      }
    });
    return out;
  }, [companyList, branchQueries, companyNameById]);

  const [companyFilter, setCompanyFilter] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);

  const createForm = useForm({
    defaultValues: {
      company_id: "",
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

  const selectedCompanyId = createForm.watch("company_id");
  const createBranch = useCreateBranch(selectedCompanyId || "");

  const filtered = useMemo(() => {
    let rows = allRows;
    if (companyFilter !== ALL) {
      rows = rows.filter((r) => r.company_id === companyFilter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) =>
        [r.code, r.name, r.address, r.branch_kind, r.company_name]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return rows;
  }, [allRows, companyFilter, query]);

  const total = filtered.length;
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const isFiltered = companyFilter !== ALL || query.trim().length > 0;

  const columns: DataTableColumn<BranchRow>[] = [
    {
      id: "name",
      header: "نام شعبه",
      cell: (row) => (
        <Link
          href={`${companyDetailPath(row.company_id)}#branches`}
          className="font-medium text-primary hover:underline"
        >
          {row.name}
        </Link>
      ),
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
      id: "company",
      header: "شرکت",
      cell: (row) => (
        <Link
          href={companyDetailPath(row.company_id)}
          className="text-xs hover:underline"
        >
          {row.company_name}
        </Link>
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
      id: "active",
      header: "وضعیت",
      cell: (row) =>
        row.is_active ? (
          <StatusChip label="فعال" tone="success" />
        ) : (
          <StatusChip label="غیرفعال" tone="neutral" />
        ),
    },
  ];

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="شعب / سایت"
          breadcrumbs={[
            { label: "سازمان", href: "/dashboard/organization" },
            { label: "شعب" },
          ]}
        />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="شعب / سایت"
        description="فهرست شعب همه شرکت‌های سازمان — فیلتر بر اساس شرکت"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "شعب" },
        ]}
        actions={
          canCreate ? (
            <Button size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              شعبه جدید
            </Button>
          ) : null
        }
      />

      {isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          بارگذاری بخشی از شعب ممکن نشد. صفحه را تازه کنید.
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={pageRows}
        getRowKey={(r) => r.branch_id}
        loading={isLoading}
        isFiltered={isFiltered}
        emptyTitle="شعبه‌ای ثبت نشده"
        emptyDescription="اولین شعبه را برای یکی از شرکت‌ها ثبت کنید."
        emptySearchTitle="نتیجه‌ای پیدا نشد"
        emptySearchDescription="فیلتر شرکت یا عبارت جستجو را تغییر دهید."
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setPage(1);
        }}
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2">
            <div className="w-full min-w-[10rem] sm:w-48">
              <Select
                value={companyFilter}
                onValueChange={(v) => {
                  setCompanyFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="شرکت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>همه شرکت‌ها</SelectItem>
                  {companyList.map((c) => (
                    <SelectItem key={c.company_id} value={c.company_id}>
                      {c.legal_name || c.name}
                      {c.is_primary ? " (اصلی)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative min-w-[12rem] max-w-xs flex-1">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 ps-8"
                placeholder="جستجوی شعبه…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {toFaDigits(total)} مورد
            </span>
          </div>
        }
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>شعبه جدید</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={createForm.handleSubmit(async (values) => {
              if (!values.company_id) {
                toast.error("شرکت را انتخاب کنید.");
                return;
              }
              try {
                await createBranch.mutateAsync({
                  company_id: values.company_id,
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
                setCreateOpen(false);
                createForm.reset({
                  company_id: "",
                  code: "",
                  name: "",
                  address: "",
                  branch_kind: "OFFICE",
                  is_active: true,
                  supports_shipping: false,
                  supports_receiving: false,
                  is_manufacturing_site: false,
                });
              } catch (e) {
                toast.error(
                  e instanceof ApiClientError && e.message ? e.message : MSG_ERR
                );
              }
            })}
          >
            <div className="space-y-1.5">
              <Label>شرکت *</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...createForm.register("company_id", { required: true })}
              >
                <option value="">— انتخاب شرکت —</option>
                {companyList.map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.legal_name || c.name}
                    {c.is_primary ? " (اصلی)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>کد *</Label>
              <Input
                className="h-9"
                dir="ltr"
                {...createForm.register("code", { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>نام *</Label>
              <Input
                className="h-9"
                {...createForm.register("name", { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>آدرس</Label>
              <Input className="h-9" {...createForm.register("address")} />
            </div>
            <div className="space-y-1.5">
              <Label>نوع شعبه</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...createForm.register("branch_kind")}
              >
                {Object.entries(BRANCH_KIND_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label>فعال</Label>
              <Switch
                checked={createForm.watch("is_active")}
                onCheckedChange={(v) => createForm.setValue("is_active", v)}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
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
    </div>
  );
}
