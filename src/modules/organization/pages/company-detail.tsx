/**
 * FE-ORG — جزئیات شرکت (URL ثابت /detail؛ شناسه فقط در session focus)
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import {
  getCompanyFocusId,
  getCompanyFocusFrom,
  orgListPathFromQuery,
} from "../lib/company-ref";
import { useCompany, useCompanies, useRestoreCompany } from "../hooks/use-companies";
import {
  OrganizationPermissions,
  ENTITY_KIND_LABELS,
} from "../types";

const MSG_LOAD = "بارگذاری اطلاعات شرکت ممکن نشد.";
const MSG_NO_ACCESS = "برای مشاهده این بخش مجوز لازم را ندارید.";
const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";
const MSG_NO_FOCUS =
  "شرکتی انتخاب نشده است. از فهرست شرکت‌ها یک شرکت را باز کنید.";

export function CompanyDetailPage() {
  const searchParams = useSearchParams();
  const [companyId, setCompanyId] = useState("");

  useEffect(() => {
    setCompanyId(getCompanyFocusId() ?? "");
  }, []);

  const listNav = orgListPathFromQuery(
    searchParams.get("from") ?? getCompanyFocusFrom()
  );

  const canView = usePermission(OrganizationPermissions.companyView);
  const { data: company, isLoading, isError, error, refetch } = useCompany(
    companyId || null
  );
  const { data: allCompanies } = useCompanies();
  const restoreCompany = useRestoreCompany();

  const parentName = useMemo(() => {
    if (!company?.parent_company_id) return null;
    return (allCompanies ?? []).find(
      (c) => c.company_id === company.parent_company_id
    )?.name;
  }, [company, allCompanies]);

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
            <span className="font-mono" dir="ltr">
              {company.code}
            </span>
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
      />

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

      <div className="grid gap-3 rounded-xl border border-border/80 bg-card p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
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
          <div>
            {company.is_active ? "فعال" : "غیرفعال"}
            {isDeleted ? " · حذف‌شده" : ""}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">شرکت والد</div>
          <div>{parentName || "—"}</div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        آدرس مرورگر ثابت است (
        <span className="font-mono" dir="ltr">
          /companies/detail
        </span>
        ) و شناسه شرکت در URL نیست.
      </p>
    </div>
  );
}
