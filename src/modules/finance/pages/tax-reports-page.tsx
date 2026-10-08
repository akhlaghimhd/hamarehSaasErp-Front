"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { usePermission } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import { taxService } from "../services/tax-service";
import { FinancePermissions } from "../types";

export function TaxReportsPage() {
  const canView = usePermission(FinancePermissions.taxView);
  const { data: companies } = useCompanies();
  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    return (list.find((c) => c.is_primary) ?? list[0])?.company_id ?? "";
  }, [companies]);

  const [companyId, setCompanyId] = useState("");
  const effectiveCo = companyId || primaryCompanyId;
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-12-31");
  const [runKey, setRunKey] = useState(0);

  const summaryQ = useQuery({
    queryKey: ["finance", "vat-summary", effectiveCo, from, to, runKey],
    queryFn: () => taxService.vatSummary(effectiveCo, from, to),
    enabled: canView && !!effectiveCo && runKey > 0,
  });

  const reconQ = useQuery({
    queryKey: ["finance", "moodian-recon", effectiveCo, from, to, runKey],
    queryFn: () => taxService.moodianRecon(effectiveCo, from, to),
    enabled: canView && !!effectiveCo && runKey > 0,
  });

  if (!canView) {
    return <div className="p-6 text-sm text-amber-700">مجوز مشاهده گزارش مالیاتی را ندارید.</div>;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="گزارش VAT و تطبیق مودیان"
        description="P2-06 / P2-07 — خلاصه دوره و شکاف ارسال"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "گزارش مالیات" },
        ]}
      />

      <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-4">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">شرکت</label>
          <select
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            value={effectiveCo}
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
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">از</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">تا</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button
            size="sm"
            className="w-full"
            disabled={!effectiveCo}
            onClick={() => setRunKey((k) => k + 1)}
          >
            اجرا
          </Button>
        </div>
      </div>

      {summaryQ.isFetching || reconQ.isFetching ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> در حال محاسبه…
        </div>
      ) : null}

      {summaryQ.data ? (
        <div className="rounded-xl border bg-card p-3 space-y-2">
          <div className="text-sm font-medium">خلاصه VAT دوره</div>
          <div className="grid gap-2 sm:grid-cols-4 text-sm">
            <div>خروجی: {summaryQ.data.totals.output_tax}</div>
            <div>ورودی: {summaryQ.data.totals.input_tax}</div>
            <div>خالص قابل پرداخت: {summaryQ.data.totals.net_payable}</div>
            <div>تعداد: {summaryQ.data.totals.txn_count}</div>
          </div>
        </div>
      ) : null}

      {reconQ.data ? (
        <div className="rounded-xl border bg-card p-3 space-y-2">
          <div className="text-sm font-medium">
            تطبیق دفتر (تراکنش مالیاتی) ↔ مودیان — شکاف: {reconQ.data.gap_count}
          </div>
          <div className="text-xs text-muted-foreground">
            accepted={reconQ.data.moodian.accepted} · pending={reconQ.data.moodian.pending} ·
            failed={reconQ.data.moodian.failed}
          </div>
          {reconQ.data.gaps.length ? (
            <ul className="space-y-1 text-sm">
              {reconQ.data.gaps.map((g) => (
                <li key={g.tax_transaction_id} className="rounded-md border px-2 py-1">
                  {g.transaction_date} · {g.tax_code} · {g.tax_amount} ·{" "}
                  <span className="text-amber-700">{g.reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">شکافی نیست.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
