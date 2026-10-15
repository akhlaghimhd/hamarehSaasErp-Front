"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/auth";
import { useFinanceCompanyScope } from "../hooks/use-finance-company-scope";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import { smartAssistService } from "../services/smart-assist-service";
import { DEMO_PERIOD_ID, FinancePermissions } from "../types";

export function SmartAssistPage() {
  const canView = usePermission(FinancePermissions.smartView);
  const canNl = usePermission(FinancePermissions.smartNl);
  const canDecide = usePermission(FinancePermissions.smartDecide);

  const {
    companies: scopeCompanies,
    multiCompany: scopeMulti,
    companyId: scopeCompanyId,
    setCompanyId: setScopeCompanyId,
    canOperateCompany,
    canOperateSelected,
    isTechnicalOwnerReadOnly,
    isGroupObserver,
  } = useFinanceCompanyScope();
  const canNlOp = canNl && canOperateSelected;
  const canDecideOp = canDecide && canOperateSelected;
  const canMutateCompany = canOperateSelected;
  const { data: companies } = useCompanies();

  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    return (list.find((c) => c.is_primary) ?? list[0])?.company_id ?? "";
  }, [companies]);

  const [companyId, setCompanyId] = useState("");
  const [periodId, setPeriodId] = useState(DEMO_PERIOD_ID);
  const [ledgerId, setLedgerId] = useState("");
  const [command, setCommand] = useState("بدهکار 5101 بستانکار 1101 مبلغ 1000");
  const [hint, setHint] = useState("هزینه");
  const [msg, setMsg] = useState<string | null>(null);
  const effectiveCo = companyId || primaryCompanyId;
  const canOperateEffective = canOperateCompany(effectiveCo);
  const canNlOpEff = canNl && canOperateEffective;
  const canDecideOpEff = canDecide && canOperateEffective;

  const suggestMut = useMutation({
    mutationFn: () =>
      smartAssistService.suggestAccounts({
        company_id: effectiveCo,
        description: hint,
      }),
    onError: (e: Error) => setMsg(e.message),
  });

  const nlMut = useMutation({
    mutationFn: () =>
      smartAssistService.nlDraft({
        company_id: effectiveCo,
        ledger_id: ledgerId,
        period_id: periodId,
        command,
      }),
    onSuccess: (r) =>
      setMsg(`${r.explanation} — id: ${r.journal_entry_id.slice(0, 8)}…`),
    onError: (e: Error) => setMsg(e.message),
  });

  const { data: insightsData, refetch: refetchInsights, isFetching } = useQuery({
    queryKey: ["fin", "pl-insights", effectiveCo, periodId],
    queryFn: () => smartAssistService.plInsights(effectiveCo, periodId),
    enabled: false,
  });

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز دستیار هوشمند را ندارید.</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="دستیار هوشمند حسابداری"
        description="پیشنهاد حساب، دستور زبان طبیعی، بینش P&L"
        icon={<Sparkles className="h-4 w-4" />}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "دستیار" },
        ]}
      />

      {(isTechnicalOwnerReadOnly || isGroupObserver) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
          دسترسی شما در این سطح فقط مشاهده و گزارش است؛ ثبت یا ویرایش روی شرکت‌های زیرمجموعه مجاز نیست.
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">شرکت</label>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={effectiveCo}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            {(companies ?? []).map((c) => (
              <option key={c.company_id} value={c.company_id}>
                {(c as { name?: string }).name || c.company_id.slice(0, 8)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Period</label>
          <input
            className="h-9 w-56 rounded-md border bg-background px-2 font-mono text-xs"
            value={periodId}
            onChange={(e) => setPeriodId(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Ledger ID (برای NL)</label>
          <input
            className="h-9 w-56 rounded-md border bg-background px-2 font-mono text-xs"
            value={ledgerId}
            onChange={(e) => setLedgerId(e.target.value)}
          />
        </div>
      </div>

      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}

      <div className="space-y-2 rounded-xl border bg-card p-3">
        <div className="text-sm font-medium">پیشنهاد حساب</div>
        <div className="flex flex-wrap gap-2">
          <input
            className="h-9 flex-1 min-w-[12rem] rounded-md border bg-background px-2 text-sm"
            value={hint}
            onChange={(e) => setHint(e.target.value)}
          />
          <Button
            size="sm"
            disabled={!effectiveCo || suggestMut.isPending}
            onClick={() => void suggestMut.mutateAsync()}
          >
            {suggestMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            پیشنهاد
          </Button>
        </div>
        {suggestMut.data?.suggestions?.length ? (
          <ul className="space-y-1 text-sm">
            {suggestMut.data.suggestions.map((s) => (
              <li
                key={s.account_id}
                className="flex items-center justify-between gap-2 rounded-md border px-2 py-1"
              >
                <span>
                  <span className="font-mono text-xs">{s.account_code}</span> {s.name}
                  <span className="ms-2 text-xs text-muted-foreground">{s.reason}</span>
                </span>
                {canDecideOpEff ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void smartAssistService.recordDecision({
                        decision: "ACCEPTED",
                        suggested_account_id: s.account_id,
                        chosen_account_id: s.account_id,
                      })
                    }
                  >
                    قبول
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-2 rounded-xl border bg-card p-3">
        <div className="text-sm font-medium">K6 — دستور زبان طبیعی → فقط پیش‌نویس</div>
        <textarea
          className="min-h-[72px] w-full rounded-md border bg-background p-2 text-sm"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
        />
        <Button
          size="sm"
          disabled={!canNlOpEff || !effectiveCo || !ledgerId || nlMut.isPending}
          onClick={() => void nlMut.mutateAsync()}
        >
          {nlMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          ساخت پیش‌نویس
        </Button>
      </div>

      <div className="space-y-2 rounded-xl border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-medium">K5 — بینش سود و زیان (غیرمسدودکننده)</div>
          <Button
            size="sm"
            variant="outline"
            disabled={!effectiveCo || isFetching}
            onClick={() => void refetchInsights()}
          >
            اجرا
          </Button>
        </div>
        {insightsData?.insights?.length ? (
          <ul className="space-y-1 text-sm">
            {insightsData.insights.map((i) => (
              <li key={i.code} className="rounded-md border px-2 py-1">
                <span className="text-xs uppercase text-muted-foreground">{i.severity}</span>{" "}
                {i.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted-foreground">برای مشاهده بینش، اجرا را بزنید.</p>
        )}
      </div>
    </div>
  );
}
