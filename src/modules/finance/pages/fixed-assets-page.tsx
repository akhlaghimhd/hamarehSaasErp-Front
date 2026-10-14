"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Building2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/auth";
import { useFinanceCompanyScope } from "../hooks/use-finance-company-scope";
import { fixedAssetService } from "../services/fixed-asset-service";
import { DEMO_PERIOD_ID, FinancePermissions, type FixedAssetDto } from "../types";
import { toFaDigits } from "@/shared/lib/utils";

export function FixedAssetsPage() {
  const canView = usePermission(FinancePermissions.faView);
  const canManage = usePermission(FinancePermissions.faManage);
  const canDep = usePermission(FinancePermissions.faDepreciate);
  const {
    companies,
    multiCompany,
    companyId,
    setCompanyId,
    canOperateSelected,
    isTechnicalOwnerReadOnly,
    isGroupObserver,
  } = useFinanceCompanyScope();
  const canManageOp = canManage && canOperateSelected;
  const canDepOp = canDep && canOperateSelected;

  const qc = useQueryClient();
  const [periodId, setPeriodId] = useState(DEMO_PERIOD_ID);
  const [ledgerId, setLedgerId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const { data: assets, isLoading, error, refetch } = useQuery({
    queryKey: ["fin", "fixed-assets", companyId],
    queryFn: () => fixedAssetService.list(companyId),
    enabled: !!companyId && canView,
  });

  const createMut = useMutation({
    mutationFn: () =>
      fixedAssetService.create({
        company_id: companyId,
        asset_code: `FA-${Date.now().toString().slice(-6)}`,
        name: "دارایی آزمایشی",
        asset_account_id: "",
        accum_depr_account_id: "",
        depr_expense_account_id: "",
        acquisition_date: new Date().toISOString().slice(0, 10),
        acquisition_cost: 12000000,
        salvage_value: 0,
        useful_life_months: 60,
      }),
    onSuccess: async () => {
      setMsg("دارایی ثبت شد (نیازمند حساب‌های واقعی در فرم کامل).");
      await qc.invalidateQueries({ queryKey: ["fin", "fixed-assets"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const depMut = useMutation({
    mutationFn: () =>
      fixedAssetService.runDepreciation({
        company_id: companyId,
        period_id: periodId,
        ledger_id: ledgerId,
      }),
    onSuccess: (r) => {
      setMsg(`استهلاک اجرا شد — journal: ${r.journal_entry_id?.slice(0, 8) ?? "—"}`);
      void refetch();
    },
    onError: (e: Error) => setMsg(e.message),
  });

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده دارایی ثابت را ندارید.</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="دارایی‌های ثابت"
        description="ثبت دارایی و اجرای استهلاک دوره‌ای"
        icon={<Building2 className="h-4 w-4" />}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "دارایی ثابت" },
        ]}
      />

      {(isTechnicalOwnerReadOnly || isGroupObserver) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
          دسترسی شما در این سطح فقط مشاهده و گزارش است؛ ثبت یا ویرایش روی شرکت‌های زیرمجموعه مجاز نیست.
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        {multiCompany ? (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">شرکت</label>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {(c as { name?: string }).name || c.company_id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Period</label>
          <input
            className="h-9 w-56 rounded-md border bg-background px-2 font-mono text-xs"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Ledger</label>
          <input
            className="h-9 w-56 rounded-md border bg-background px-2 font-mono text-xs"
            value={ledgerId}
            onChange={(e) => setLedgerId(e.target.value)}
            placeholder="uuid دفتر"
          />
        </div>
        {canDepOp ? (
          <Button
            size="sm"
            disabled={!companyId || !ledgerId || depMut.isPending}
            onClick={() => void depMut.mutateAsync()}
          >
            {depMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            اجرای استهلاک
          </Button>
        ) : null}
      </div>

      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      {error ? (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      ) : null}

      {canManageOp ? (
        <Button
          size="sm"
          variant="outline"
          disabled={!companyId || createMut.isPending}
          onClick={() => void createMut.mutateAsync()}
        >
          افزودن دارایی آزمایشی
        </Button>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-right">کد</th>
              <th className="px-3 py-2 text-right">نام</th>
              <th className="px-3 py-2 text-right">بهای تمام‌شده</th>
              <th className="px-3 py-2 text-right">ارزش دفتری</th>
              <th className="px-3 py-2 text-right">وضعیت</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                </td>
              </tr>
            ) : (assets ?? []).length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  دارایی‌ای ثبت نشده است.
                </td>
              </tr>
            ) : (
              (assets as FixedAssetDto[]).map((a) => (
                <tr key={a.fixed_asset_id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{toFaDigits(a.asset_code)}</td>
                  <td className="px-3 py-2">{a.name}</td>
                  <td className="px-3 py-2 tabular-nums">{toFaDigits(String(a.acquisition_cost))}</td>
                  <td className="px-3 py-2 tabular-nums">{toFaDigits(String(a.book_value))}</td>
                  <td className="px-3 py-2 text-xs">{a.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
