"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Hash, Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { usePermission } from "@/auth";
import { useFinanceCompanyScope } from "../hooks/use-finance-company-scope";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import { companyNumberingService } from "../services/company-numbering-service";
import { FinancePermissions } from "../types";

/**
 * FIN-HOLD-W3 / ADR-FIN-003 L07 — optional branch document series from fiscal year.
 */
export function CompanyNumberingPage() {
  const canView = usePermission(FinancePermissions.periodView);
  const canManage = usePermission(FinancePermissions.periodClose);
  const {
    canOperateCompany,
    isTechnicalOwnerReadOnly,
    isGroupObserver,
    companyId: scopeCompanyId,
    setCompanyId: setScopeCompanyId,
  } = useFinanceCompanyScope();

  const { data: companies } = useCompanies();
  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    return (list.find((c) => c.is_primary) ?? list[0])?.company_id ?? "";
  }, [companies]);

  const [localCompanyId, setLocalCompanyId] = useState("");
  const effectiveCo = localCompanyId || scopeCompanyId || primaryCompanyId;
  const canManageOp = canManage && canOperateCompany(effectiveCo);
  const [fyInput, setFyInput] = useState("1404");
  const [msg, setMsg] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["finance", "company-numbering", effectiveCo],
    queryFn: () => companyNumberingService.get(effectiveCo),
    enabled: canView && !!effectiveCo,
  });

  const enableMut = useMutation({
    mutationFn: () => companyNumberingService.enableBranchSeries(effectiveCo, fyInput.trim()),
    onSuccess: () => {
      setMsg("سری شعبه از سال مالی مشخص فعال شد.");
      void qc.invalidateQueries({ queryKey: ["finance", "company-numbering", effectiveCo] });
    },
    onError: (e: Error) => setMsg(e.message || "خطا در فعال‌سازی"),
  });

  const disableMut = useMutation({
    mutationFn: () => companyNumberingService.disableBranchSeries(effectiveCo),
    onSuccess: () => {
      setMsg("سری شعبه غیرفعال شد؛ شماره‌گذاری فقط در سطح شرکت است.");
      void qc.invalidateQueries({ queryKey: ["finance", "company-numbering", effectiveCo] });
    },
    onError: (e: Error) => setMsg(e.message || "خطا در غیرفعال‌سازی"),
  });

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده تنظیمات شماره‌گذاری را ندارید.</div>
    );
  }

  const fyOk = /^\d{4}$/.test(fyInput.trim());

  return (
    <div className="space-y-4">
      <PageHeader
        title="شماره‌گذاری اسناد"
        description="سری پیش‌فرض شرکت؛ سری جداگانه شعبه فقط از ابتدای سال مالی (L07)"
        icon={<Hash className="h-4 w-4" />}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "شماره‌گذاری" },
        ]}
      />

      {(isTechnicalOwnerReadOnly || isGroupObserver) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
          دسترسی شما در این سطح فقط مشاهده است؛ تغییر تنظیم شماره‌گذاری روی شرکت‌های زیرمجموعه مجاز نیست.
        </div>
      )}

      <div className="space-y-3 rounded-xl border bg-card p-3">
        <div className="max-w-sm space-y-1">
          <label className="text-xs text-muted-foreground">شرکت</label>
          <select
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={effectiveCo}
            onChange={(e) => {
              setLocalCompanyId(e.target.value);
              setScopeCompanyId(e.target.value);
              setMsg(null);
            }}
          >
            {(companies ?? []).map((c) => (
              <option key={c.company_id} value={c.company_id}>
                {(c as { name?: string }).name || c.company_id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>

        {isLoading || isFetching ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">
            خطا در دریافت تنظیم.{" "}
            <button type="button" className="underline" onClick={() => void refetch()}>
              تلاش مجدد
            </button>
          </div>
        ) : data ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-3">
              <span className="rounded-md bg-muted px-2 py-1 text-xs">
                وضعیت:{" "}
                {data.branch_series_enabled ? (
                  <span className="font-medium text-emerald-700">سری شعبه فعال</span>
                ) : (
                  <span className="font-medium">فقط سری شرکت</span>
                )}
              </span>
              {data.branch_series_from_fiscal_year ? (
                <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                  از سال {data.branch_series_from_fiscal_year}
                </span>
              ) : null}
            </div>
            <ul className="list-disc space-y-1 pe-4 text-xs text-muted-foreground">
              <li>پیش‌فرض: سری (شرکت + سال مالی + نوع سند) — حتی با انتخاب شعبه روی سند.</li>
              <li>
                با فعال‌سازی: سند دارای شعبه از همان سال مالی به بعد سری جدا (شرکت + شعبه + سال +
                نوع) می‌گیرد.
              </li>
              <li>سند بدون شعبه همچنان از سری شرکت استفاده می‌کند.</li>
              <li>فعال‌سازی فقط از ابتدای یک سال مالی چهاررقمی (مثلاً ۱۴۰۴) اعمال می‌شود.</li>
            </ul>
          </div>
        ) : null}

        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}

        {canManageOp ? (
          <div className="flex flex-wrap items-end gap-2 border-t pt-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">سال مالی شروع (۴ رقم)</label>
              <Input
                value={fyInput}
                onChange={(e) => setFyInput(e.target.value)}
                className="w-28 font-mono"
                placeholder="1404"
                maxLength={4}
              />
            </div>
            <Button
              size="sm"
              disabled={!effectiveCo || !fyOk || enableMut.isPending}
              onClick={() => void enableMut.mutateAsync()}
            >
              {enableMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              فعال‌سازی سری شعبه
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!effectiveCo || !data?.branch_series_enabled || disableMut.isPending}
              onClick={() => void disableMut.mutateAsync()}
            >
              {disableMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              غیرفعال‌سازی
            </Button>
          </div>
        ) : (
          <p className="border-t pt-3 text-xs text-muted-foreground">
            برای تغییر تنظیم، مجوز بستن دوره و دسترسی عملیاتی روی شرکت انتخاب‌شده لازم است.
          </p>
        )}
      </div>
    </div>
  );
}
