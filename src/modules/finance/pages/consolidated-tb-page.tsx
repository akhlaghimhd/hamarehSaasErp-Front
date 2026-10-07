"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import { intercompanyService } from "../services/intercompany-service";
import { DEMO_PERIOD_ID, FinancePermissions } from "../types";

export function ConsolidatedTbPage() {
  const canView = usePermission(FinancePermissions.icView);
  const { data: companies } = useCompanies();

  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    const p = list.find((c) => c.is_primary) ?? list[0];
    return p?.company_id ?? null;
  }, [companies]);

  const [companyId, setCompanyId] = useState("");
  const [periodId, setPeriodId] = useState(DEMO_PERIOD_ID);
  const [enabled, setEnabled] = useState(false);
  const effective = companyId || primaryCompanyId;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["finance", "consol-tb", effective, periodId],
    queryFn: () =>
      intercompanyService.consolidatedTrialBalance(effective as string, periodId),
    enabled: canView && enabled && !!effective,
  });

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده تراز تلفیقی را ندارید.</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="تراز آزمایشی تلفیقی"
        description="جمع اسناد قطعی شرکت‌های OPERATING زیر ریشه گروه (بدون تبدیل ارز)"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "تراز تلفیقی" },
        ]}
      />

      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">شرکت ریشه گروه</label>
          <select
            className="h-9 min-w-[180px] rounded-md border bg-background px-2 text-sm"
            value={effective ?? ""}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setEnabled(false);
            }}
          >
            <option value="">—</option>
            {(companies ?? []).map((c) => (
              <option key={c.company_id} value={c.company_id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Period ID</label>
          <input
            className="h-9 w-64 rounded-md border bg-background px-2 font-mono text-xs"
            value={periodId}
            onChange={(e) => {
              setPeriodId(e.target.value);
              setEnabled(false);
            }}
          />
        </div>
        <Button
          size="sm"
          disabled={!effective}
          onClick={() => {
            setEnabled(true);
            void refetch();
          }}
        >
          اجرا
        </Button>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-destructive">خطا در گزارش.</div>
        ) : !enabled ? (
          <div className="p-4 text-sm text-muted-foreground">پارامترها را انتخاب و اجرا کنید.</div>
        ) : !data?.length ? (
          <div className="p-4 text-sm text-muted-foreground">ردیفی نیست.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-3 py-2">کد</th>
                <th className="px-3 py-2">نام</th>
                <th className="px-3 py-2">بدهکار</th>
                <th className="px-3 py-2">بستانکار</th>
                <th className="px-3 py-2">مانده</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.account_id} className="border-b border-border/50">
                  <td className="px-3 py-2 font-mono text-xs">{r.account_code}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2">{r.debit}</td>
                  <td className="px-3 py-2">{r.credit}</td>
                  <td className="px-3 py-2">{r.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
