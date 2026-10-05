/**
 * FE-ORG — جزئیات شرکت (URL ثابت /detail)
 * شعب / واحدها: فقط نمایش جذاب + لینک به صفحات تخصصی (بدون CRUD اینجا)
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  CircleHelp,
  ExternalLink,
  GitBranch,
  Loader2,
  MapPin,
  Network,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
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
import { useBranches } from "../hooks/use-branches";
import { useDepartments } from "../hooks/use-departments";
import { CompanyAddressContactPanel } from "./company-address-contact-panel";
import { CompanyOwnershipPanel } from "./company-ownership-panel";
import { CompanyExtendedPanels } from "./company-extended-panels";
import {
  OrganizationPermissions,
  ENTITY_KIND_LABELS,
  ENTITY_KIND_FIELD_LABEL,
  ENTITY_KIND_OPTIONS,
  BRANCH_KIND_LABELS,
  STATUS_LABELS,
} from "../types";

const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";
const MSG_LOAD = "بارگذاری اطلاعات شرکت ممکن نشد.";
const MSG_NO_ACCESS = "برای مشاهده این بخش مجوز لازم را ندارید.";
const MSG_NO_FOCUS =
  "شرکتی انتخاب نشده است. از فهرست شرکت‌ها یک شرکت را باز کنید.";

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
  const [editOpen, setEditOpen] = useState(false);

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
  const canViewDept = usePermission(OrganizationPermissions.departmentView);

  const { data: company, isLoading, isError, error, refetch } = useCompany(
    companyId || null
  );
  const { data: allCompanies } = useCompanies();
  const updateCompany = useUpdateCompany();
  const restoreCompany = useRestoreCompany();
  const { data: branches, isLoading: branchesLoading } = useBranches(
    canViewBranch && companyId ? companyId : null
  );
  const { data: departments, isLoading: deptsLoading } = useDepartments(
    canViewDept && companyId ? companyId : null
  );

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
      is_active: company?.is_active ?? true,
    },
  });
  const { isDirty: editDirty } = editForm.formState;

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

  const activeBranches = useMemo(
    () => (branches ?? []).filter((b) => b.is_active !== false),
    [branches]
  );
  const activeDepts = useMemo(
    () => (departments ?? []).filter((d) => d.is_active !== false),
    [departments]
  );

  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of branches ?? []) map.set(b.branch_id, b.name);
    return map;
  }, [branches]);

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
      editForm.reset(values);
      setEditOpen(false);
      void refetch();
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_ERR
      );
    }
  });

  const closeEditForced = () => {
    editForm.reset();
    setEditOpen(false);
  };
  const handleEditOpenChange = (next: boolean) => {
    if (!next) editForm.reset();
    setEditOpen(next);
  };

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
        <div className="h-2 w-full" style={{ background: brand.ring }} aria-hidden />
        <div className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold shadow-sm"
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
          </div>
        </div>
      </div>

      {isDeleted ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium text-amber-900 dark:text-amber-200">
            این شرکت حذف شده است
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
            <div>
              <h2 className="text-base font-semibold">شعب</h2>
              <p className="text-[11px] text-muted-foreground">
                فقط نمایش — ایجاد، ویرایش و حذف در صفحه تخصصی شعب
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/organization/branches">
                مدیریت شعب
                <ExternalLink className="ms-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          {branchesLoading ? (
            <div className="flex gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
            </div>
          ) : activeBranches.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              شعبه‌ای برای این شرکت ثبت نشده است.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeBranches.map((b) => (
                <div
                  key={b.branch_id}
                  className="group relative overflow-hidden rounded-xl border border-border/80 bg-card p-4 transition-shadow hover:shadow-sm"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <GitBranch className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{b.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {toFaDigits(b.code)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <StatusChip
                      label={
                        BRANCH_KIND_LABELS[b.branch_kind ?? "OFFICE"] ??
                        b.branch_kind ??
                        "—"
                      }
                      tone="neutral"
                    />
                    {b.is_active === false ? (
                      <StatusChip label="غیرفعال" tone="warning" />
                    ) : (
                      <StatusChip label="فعال" tone="success" />
                    )}
                  </div>
                  {b.address ? (
                    <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="line-clamp-2">{toFaDigits(b.address)}</span>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {canViewDept ? (
        <section id="departments" className="scroll-mt-20 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">واحدهای سازمانی</h2>
              <p className="text-[11px] text-muted-foreground">
                فقط نمایش — ایجاد، ویرایش و حذف در صفحه تخصصی واحدها
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/organization/departments">
                مدیریت واحدها
                <ExternalLink className="ms-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          {deptsLoading ? (
            <div className="flex gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
            </div>
          ) : activeDepts.length === 0 ? (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              واحدی برای این شرکت ثبت نشده است.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeDepts.map((d) => (
                <div
                  key={d.department_id}
                  className="overflow-hidden rounded-xl border border-border/80 bg-card p-4 transition-shadow hover:shadow-sm"
                >
                  <div className="mb-3 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      <Network className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{d.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {toFaDigits(d.code)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      شعبه: {branchNameById.get(d.branch_id) ?? "—"}
                    </span>
                    {d.is_active === false ? (
                      <StatusChip label="غیرفعال" tone="warning" />
                    ) : (
                      <StatusChip label="فعال" tone="success" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <CompanyAddressContactPanel
        companyId={companyId}
        readOnly={isDeleted || isInactive}
      />

      <CompanyOwnershipPanel
        companyId={companyId}
        readOnly={isDeleted || isInactive}
      />

      <CompanyExtendedPanels
        companyId={companyId}
        readOnly={isDeleted || isInactive}
      />

      <Sheet open={editOpen} onOpenChange={handleEditOpenChange}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md"
          onInteractOutside={(e) => {
            if (editDirty) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (editDirty) e.preventDefault();
          }}
        >
          <SheetHeader className="space-y-1.5 pb-4">
            <SheetTitle>ویرایش شرکت</SheetTitle>
            <SheetDescription>
              هویت حقوقی و نقش شرکت در گروه
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={onEditCompany} className="flex flex-1 flex-col gap-4">
            <div className="space-y-1.5">
              <Label>کد</Label>
              <Input className="h-9" dir="ltr" {...editForm.register("code")} />
            </div>
            <div className="space-y-1.5">
              <Label>نام</Label>
              <Input className="h-9" {...editForm.register("name")} />
            </div>
            <div className="space-y-1.5">
              <Label>نام حقوقی</Label>
              <Input className="h-9" {...editForm.register("legal_name")} />
            </div>
            <div className="space-y-1.5">
              <Label>نام تجاری</Label>
              <Input className="h-9" {...editForm.register("trade_name")} />
            </div>
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
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <Label>فعال</Label>
              <Switch
                checked={editForm.watch("is_active")}
                onCheckedChange={(v) => editForm.setValue("is_active", v, { shouldDirty: true })}
              />
            </div>
            <SheetFooter className="mt-auto gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={closeEditForced}>
                انصراف
              </Button>
              <Button type="submit" disabled={updateCompany.isPending}>
                {updateCompany.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "ذخیره"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
