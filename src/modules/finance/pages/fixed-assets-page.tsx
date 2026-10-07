"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import { fixedAssetService } from "../services/fixed-asset-service";
import { DEMO_PERIOD_ID, FinancePermissions } from "../types";

export function FixedAssetsPage() {
  const canView = usePermission(FinancePermissions.faView);
  const canManage = usePermission(FinancePermissions.faManage);
  const canDep = usePermission(FinancePermissions.faDepreciate);
  const qc = useQueryClient();
  const { data: companies } = useCompanies();

  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    const p = list.find((c) => c.is_primary) ?? list[0];
    return p?.company_id ?? null;
  }, [companies]);

  const [companyId, setCompanyId] = useState("");
  const [ledgerId, setLedgerId] = useState("");
  const [periodId, setPeriodId] = useState(DEMO_PERIOD_ID);
  const [msg, setMsg] = useState<string | null>(null);
  const effectiveCompany = companyId || primaryCompanyId;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["finance", "fixed-assets", effectiveCompany],
    queryFn: () => fixedAssetService.list(effectiveCompany as string),
    enabled: canView && !!effectiveCompany,
  });

  const runMut = useMutation({
    mutationFn: () =>
      fixedAssetService.runDepreciation({
        company_id: effectiveCompany as string,
        period_id: periodId,
        ledger_id: ledgerId,
      }),
    onSuccess: (r) => {
      setMsg(
        `استهلاک اجرا شد. پیش‌نویس سند: ${r.journal_entry_id?.slice(0, 8) ?? "—"}… (ثبت قطعی نشده)`
      );
      void qc.invalidateQueries({ queryKey: ["finance", "fixed-assets"] });
    },
    onError: (e: Error) => setMsg(e.message || "خطا در استهلاک"),
  });

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده دارایی ثابت را ندارید.</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="دارایی ثابت"
        description="ثبت دارایی و اجرای استهلاک → فقط پیش‌نویس سند (بدون ثبت قطعی خودکار)"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "دارایی ثابت" },
        ]}
      />

      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">شرکت</label>
          <select
            className="h-9 min-w-[180px] rounded-md border bg-background px-2 text-sm"
            value={effectiveCompany ?? ""}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="">—</option>
            {(companies ?? []).map((c) => (
              <option key={c.company_id} value={c.company_id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {canDep ? (
          <>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Ledger ID</label>
              <input
                className="h-9 w-64 rounded-md border bg-background px-2 font-mono text-xs"
                value={ledgerId}
                onChange={(e) => setLedgerId(e.target.value)}
                placeholder="uuid دفتر"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Period ID</label>
              <input
                className="h-9 w-64 rounded-md border bg-background px-2 font-mono text-xs"
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={!effectiveCompany || !ledgerId || runMut.isPending}
              onClick={() => void runMut.mutateAsync()}
            >
              {runMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              اجرای استهلاک → پیش‌نویس
            </Button>
          </>
        ) : null}
      </div>

      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      {!canManage ? (
        <p className="text-xs text-muted-foreground">
          ایجاد دارایی از API با مجوز finance.fa.manage (فرم کامل در نسخه بعد).
        </p>
      ) : null}

      <div className="rounded-xl border bg-card overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-destructive">
            خطا.{" "}
            <button type="button" className="underline" onClick={() => void refetch()}>
              تلاش مجدد
            </button>
          </div>
        ) : !data?.length ? (
          <div className="p-4 text-sm text-muted-foreground">دارایی‌ای ثبت نشده.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-3 py-2">کد</th>
                <th className="px-3 py-2">نام</th>
                <th className="px-3 py-2">بهای تمام‌شده</th>
                <th className="px-3 py-2">ارزش دفتری</th>
                <th className="px-3 py-2">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.fixed_asset_id} className="border-b border-border/50">
                  <td className="px-3 py-2 font-mono text-xs">{a.asset_code}</td>
                  <td className="px-3 py-2">{a.name}</td>
                  <td className="px-3 py-2">{String(a.acquisition_cost)}</td>
                  <td className="px-3 py-2">{String(a.book_value)}</td>
                  <td className="px-3 py-2 text-xs">{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
