"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { usePermission } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import {
  useBalanceSheet,
  useProfitAndLoss,
  useTrialBalance,
} from "../hooks/use-reports";
import { DEMO_PERIOD_ID, FinancePermissions } from "../types";

export function ReportsPage() {
  const canView = usePermission(FinancePermissions.reportView);
  const { data: companies } = useCompanies();

  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    const p = list.find((c) => c.is_primary) ?? list[0];
    return p?.company_id ?? null;
  }, [companies]);

  const [companyId, setCompanyId] = useState<string>("");
  const [periodId, setPeriodId] = useState(DEMO_PERIOD_ID);
  const [tab, setTab] = useState<"tb" | "pl" | "bs">("tb");

  const effectiveCompany = companyId || primaryCompanyId;

  const tb = useTrialBalance(effectiveCompany, periodId);
  const pl = useProfitAndLoss(effectiveCompany, periodId);
  const bs = useBalanceSheet(effectiveCompany, periodId);

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده گزارش را ندارید.</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="گزارش‌های مالی"
        description="تراز آزمایشی، سود و زیان، ترازنامه (اسناد POSTED)"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "گزارش" },
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
        <div className="space-y-1 flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">شناسه دوره (UUID)</label>
          <Input value={periodId} onChange={(e) => setPeriodId(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {(
            [
              ["tb", "تراز آزمایشی"],
              ["pl", "سود و زیان"],
              ["bs", "ترازنامه"],
            ] as const
          ).map(([k, label]) => (
            <Button
              key={k}
              size="sm"
              variant={tab === k ? "default" : "outline"}
              onClick={() => setTab(k)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        {tab === "tb" ? (
          tb.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground text-right">
                  <th className="py-1">کد</th>
                  <th className="py-1">نام</th>
                  <th className="py-1">بدهکار</th>
                  <th className="py-1">بستانکار</th>
                  <th className="py-1">مانده</th>
                </tr>
              </thead>
              <tbody>
                {(tb.data ?? []).map((r) => (
                  <tr key={r.account_id} className="border-b border-border/40">
                    <td className="py-1 font-mono text-xs">{r.account_code}</td>
                    <td className="py-1">{r.name}</td>
                    <td className="py-1 font-mono text-xs">{r.debit}</td>
                    <td className="py-1 font-mono text-xs">{r.credit}</td>
                    <td className="py-1 font-mono text-xs">{r.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : null}

        {tab === "pl" ? (
          pl.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : pl.data ? (
            <div className="space-y-2 text-sm">
              <div>جمع درآمد: <strong>{pl.data.total_revenue}</strong></div>
              <div>جمع هزینه: <strong>{pl.data.total_expense}</strong></div>
              <div>سود (زیان) خالص: <strong>{pl.data.net_income}</strong></div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">داده‌ای نیست</p>
          )
        ) : null}

        {tab === "bs" ? (
          bs.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : bs.data ? (
            <div className="space-y-2 text-sm">
              <div>جمع دارایی: <strong>{bs.data.total_assets}</strong></div>
              <div>
                جمع بدهی و حقوق:{" "}
                <strong>{bs.data.total_liabilities_equity}</strong>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">داده‌ای نیست</p>
          )
        ) : null}
      </div>
    </div>
  );
}
