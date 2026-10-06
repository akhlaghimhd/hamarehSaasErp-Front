/**
 * FE-ORG — جزئیات شرکت (URL ثابت /detail)
 * شعب / واحدها: فقط نمایش + لینک به صفحات تخصصی (بدون CRUD اینجا)
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Building2,
  CircleHelp,
  ExternalLink,
  Loader2,
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
import { toFaDigits, toAsciiDigits, cn } from "@/shared/lib/utils";
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
import { CollapsibleSection } from "./collapsible-section";
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
    if (!company?.parent_company_id || !allCompanies) return null;
    const p = allCompanies.find((c) => c.company_id === company.parent_company_id);
    return p ? p.legal_name || p.name : null;
  }, [company?.parent_company_id, allCompanies]);

  const brand = useMemo(
    () => brandFromId(companyId || "default"),
    [companyId]
  );

  const activeBranches = useMemo(
    () => (branches ?? []).filter((b) => !b.deleted_at),
    [branches]
  );
  const activeDepartments = useMemo(
    () => (departments ?? []).filter((d) => !d.deleted_at),
    [departments]
  );

  const onEditCompany = editForm.handleSubmit(async (values) => {
    if (!companyId) return;
    try {
      await updateCompany.mutateAsync({
        id: companyId,
        body: {
          code: values.code.trim(),
          name: values.name.trim(),
          legal_name: values.legal_name.trim(),
          trade_name: values.trade_name.trim() || null,
          registration_number: values.registration_number.trim() || null,
          economic_code: values.economic_code.trim() || null,
          tax_identifier: values.tax_identifier.trim() || null,
          entity_kind: values.entity_kind,
          is_primary: values.is_primary,
          parent_company_id: values.parent_company_id || null,
          is_active: values.is_active,
        },
      });
      toast.success("شرکت به‌روز شد");
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
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        {MSG_NO_ACCESS}
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="space-y-4">
        <PageHeader title="جزئیات شرکت" description={MSG_NO_FOCUS} />
        <Button asChild variant="outline">
          <Link href="/dashboard/organization/companies">بازگشت به فهرست</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> بارگذاری…
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        {error instanceof ApiClientError && error.message
          ? error.message
          : MSG_LOAD}
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
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-semibold">{displayName}</h2>
            <p className="text-sm text-muted-foreground">
              کد {toFaDigits(company.code)}
              {company.trade_name ? ` · ${company.trade_name}` : ""}
            </p>
          </div>
        </div>
      </div>

      {isDeleted ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
          <div className="font-medium text-amber-800 dark:text-amber-200">
            این شرکت حذف نرم شده است.
          </div>
          <div className="mt-2">
            <Button
              size="sm"
              variant="outline"
              disabled={restoreCompany.isPending}
              onClick={onRestore}
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
        <CollapsibleSection
          id="branches"
          title="شعب"
          subtitle="فقط نمایش — مدیریت کامل در صفحه تخصصی شعب"
          count={activeBranches.length}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/organization/branches">
                مدیریت شعب
                <ExternalLink className="ms-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          }
        >
          {branchesLoading ? (
            <div className="flex gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
            </div>
          ) : activeBranches.length === 0 ? (
            <div className="py-5 text-center text-xs text-muted-foreground">
              شعبه‌ای برای این شرکت ثبت نشده است.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
                  <th className="px-2 py-1.5 text-start font-medium">نام</th>
                  <th className="w-24 px-2 py-1.5 text-start font-medium">کد</th>
                  <th className="w-28 px-2 py-1.5 text-start font-medium">نوع</th>
                  <th className="w-20 px-2 py-1.5 text-center font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeBranches.map((b) => (
                  <tr key={b.branch_id} className="hover:bg-muted/20">
                    <td className="px-2 py-1.5 font-medium">{b.name}</td>
                    <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground">
                      {toFaDigits(b.code)}
                    </td>
                    <td className="px-2 py-1.5 text-xs text-muted-foreground">
                      {BRANCH_KIND_LABELS[b.branch_kind ?? "OFFICE"] ??
                        b.branch_kind ??
                        "—"}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {b.is_active === false ? (
                        <StatusChip label="غیرفعال" tone="warning" />
                      ) : (
                        <StatusChip label="فعال" tone="success" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CollapsibleSection>
      ) : null}

      {canViewDept ? (
        <CollapsibleSection
          id="departments"
          title="واحدهای سازمانی"
          subtitle="فقط نمایش — مدیریت کامل در صفحه تخصصی واحدها"
          count={activeDepartments.length}
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/organization/departments">
                مدیریت واحدها
                <ExternalLink className="ms-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          }
        >
          {deptsLoading ? (
            <div className="flex gap-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
            </div>
          ) : activeDepartments.length === 0 ? (
            <div className="py-5 text-center text-xs text-muted-foreground">
              واحد سازمانی ثبت نشده است.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
                  <th className="px-2 py-1.5 text-start font-medium">نام</th>
                  <th className="w-24 px-2 py-1.5 text-start font-medium">کد</th>
                  <th className="w-20 px-2 py-1.5 text-center font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeDepartments.map((d) => (
                  <tr key={d.department_id} className="hover:bg-muted/20">
                    <td className="px-2 py-1.5 font-medium">{d.name}</td>
                    <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground">
                      {toFaDigits(d.code)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {d.is_active === false ? (
                        <StatusChip label="غیرفعال" tone="warning" />
                      ) : (
                        <StatusChip label="فعال" tone="success" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CollapsibleSection>
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
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg" side="left">
          <SheetHeader>
            <SheetTitle>ویرایش شرکت</SheetTitle>
            <SheetDescription>
              فیلدهای اصلی شرکت را به‌روز کنید.
            </SheetDescription>
          </SheetHeader>
          <form className="mt-4 space-y-4" onSubmit={onEditCompany}>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="code">کد</Label>
                <Input
                  id="code"
                  className="h-9 font-mono tabular-nums"
                  dir="rtl"
                  inputMode="text"
                  value={toFaDigits(editForm.watch("code") || "")}
                  onChange={(e) =>
                    editForm.setValue("code", toAsciiDigits(e.target.value), {
                      shouldDirty: true,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">نام</Label>
                <Input
                  id="name"
                  value={toFaDigits(editForm.watch("name") || "")}
                  onChange={(e) =>
                    editForm.setValue("name", toAsciiDigits(e.target.value), {
                      shouldDirty: true,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="legal_name">نام حقوقی</Label>
              <Input
                id="legal_name"
                value={toFaDigits(editForm.watch("legal_name") || "")}
                onChange={(e) =>
                  editForm.setValue("legal_name", toAsciiDigits(e.target.value), {
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trade_name">نام تجاری</Label>
              <Input
                id="trade_name"
                value={toFaDigits(editForm.watch("trade_name") || "")}
                onChange={(e) =>
                  editForm.setValue("trade_name", toAsciiDigits(e.target.value), {
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="registration_number">شماره ثبت</Label>
                <Input
                  id="registration_number"
                  className="h-9 font-mono tabular-nums"
                  dir="rtl"
                  inputMode="text"
                  value={toFaDigits(editForm.watch("registration_number") || "")}
                  onChange={(e) =>
                    editForm.setValue("registration_number", toAsciiDigits(e.target.value), {
                      shouldDirty: true,
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="economic_code">کد اقتصادی</Label>
                <Input
                  id="economic_code"
                  className="h-9 font-mono tabular-nums"
                  dir="rtl"
                  inputMode="text"
                  value={toFaDigits(editForm.watch("economic_code") || "")}
                  onChange={(e) =>
                    editForm.setValue("economic_code", toAsciiDigits(e.target.value), {
                      shouldDirty: true,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax_identifier">شناسه مالیاتی</Label>
              <Input
                id="tax_identifier"
                className="h-9 font-mono tabular-nums"
                dir="rtl"
                inputMode="text"
                value={toFaDigits(editForm.watch("tax_identifier") || "")}
                onChange={(e) =>
                  editForm.setValue("tax_identifier", toAsciiDigits(e.target.value), {
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="entity_kind" className="inline-flex items-center gap-1">
                {ENTITY_KIND_FIELD_LABEL}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CircleHelp className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      نقش شرکت در ساختار گروه
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <select
                id="entity_kind"
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
            <div className="space-y-1.5">
              <Label htmlFor="parent_company_id">شرکت والد</Label>
              <select
                id="parent_company_id"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...editForm.register("parent_company_id")}
              >
                <option value="">— بدون والد —</option>
                {(allCompanies ?? [])
                  .filter((c) => c.company_id !== companyId)
                  .map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.legal_name || c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label>شرکت اصلی</Label>
              <Switch
                checked={editForm.watch("is_primary")}
                onCheckedChange={(v) => editForm.setValue("is_primary", v, { shouldDirty: true })}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label>فعال</Label>
              <Switch
                checked={editForm.watch("is_active")}
                onCheckedChange={(v) => editForm.setValue("is_active", v, { shouldDirty: true })}
              />
            </div>
            <SheetFooter className="gap-2 sm:justify-start">
              <Button type="submit" disabled={!editDirty || updateCompany.isPending}>
                {updateCompany.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                ذخیره
              </Button>
              <Button type="button" variant="outline" onClick={closeEditForced}>
                انصراف
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
