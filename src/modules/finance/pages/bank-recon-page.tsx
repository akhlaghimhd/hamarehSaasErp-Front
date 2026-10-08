"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { usePermission } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import { bankReconService } from "../services/bank-recon-service";
import { FinancePermissions } from "../types";

export function BankReconPage() {
  const canView = usePermission(FinancePermissions.treasuryView);
  const canManage = usePermission(FinancePermissions.treasuryManage);
  const qc = useQueryClient();
  const { data: companies } = useCompanies();

  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    return (list.find((c) => c.is_primary) ?? list[0])?.company_id ?? "";
  }, [companies]);

  const [companyId, setCompanyId] = useState("");
  const effectiveCo = companyId || primaryCompanyId;
  const [cashAccountId, setCashAccountId] = useState("");
  const [statementDate, setStatementDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [lineDesc, setLineDesc] = useState("واریز");
  const [lineDebit, setLineDebit] = useState("0");
  const [lineCredit, setLineCredit] = useState("100");
  const [matchJournalId, setMatchJournalId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["finance", "bank-statements", effectiveCo],
    queryFn: () => bankReconService.list(effectiveCo || undefined),
    enabled: canView,
  });

  const createMut = useMutation({
    mutationFn: () =>
      bankReconService.create({
        company_id: effectiveCo,
        cash_account_id: cashAccountId,
        statement_date: statementDate,
        lines: [
          {
            line_date: statementDate,
            description: lineDesc,
            debit_amount: Number(lineDebit) || 0,
            credit_amount: Number(lineCredit) || 0,
          },
        ],
      }),
    onSuccess: () => {
      setMsg("صورت‌حساب ثبت شد.");
      void qc.invalidateQueries({ queryKey: ["finance", "bank-statements"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  const matchMut = useMutation({
    mutationFn: (lineId: string) =>
      bankReconService.matchLine(lineId, {
        journal_entry_id: matchJournalId || undefined,
      }),
    onSuccess: () => {
      setMsg("سطر تطبیق شد.");
      void qc.invalidateQueries({ queryKey: ["finance", "bank-statements"] });
    },
    onError: (e: Error) => setMsg(e.message),
  });

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده تطبیق بانکی را ندارید.</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="تطبیق بانکی"
        description="صورت‌حساب بانک و تطبیق سطر با سند خزانه/دفتر"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "تطبیق بانکی" },
        ]}
      />

      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}

      <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-3">
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
          <label className="text-xs text-muted-foreground">Cash account ID</label>
          <Input
            className="font-mono text-xs"
            value={cashAccountId}
            onChange={(e) => setCashAccountId(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">تاریخ صورت‌حساب</label>
          <Input
            type="date"
            value={statementDate}
            onChange={(e) => setStatementDate(e.target.value)}
          />
        </div>
      </div>

      {canManage ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
          <Input
            className="min-w-[120px] flex-1"
            value={lineDesc}
            onChange={(e) => setLineDesc(e.target.value)}
            placeholder="شرح سطر"
          />
          <Input
            className="w-24"
            value={lineDebit}
            onChange={(e) => setLineDebit(e.target.value)}
            placeholder="بدهکار"
          />
          <Input
            className="w-24"
            value={lineCredit}
            onChange={(e) => setLineCredit(e.target.value)}
            placeholder="بستانکار"
          />
          <Button
            size="sm"
            disabled={!effectiveCo || !cashAccountId || createMut.isPending}
            onClick={() => void createMut.mutateAsync()}
          >
            {createMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="ms-1">ثبت صورت‌حساب</span>
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
        <div className="space-y-1 flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">
            Journal entry ID برای تطبیق
          </label>
          <Input
            className="font-mono text-xs"
            value={matchJournalId}
            onChange={(e) => setMatchJournalId(e.target.value)}
          />
        </div>
        <Button size="sm" variant="outline" onClick={() => void refetch()}>
          بروزرسانی
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">صورت‌حسابی نیست.</p>
        ) : (
          data.map((st) => (
            <div key={st.bank_statement_id} className="rounded-xl border bg-card p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {st.statement_date}{" "}
                  <span className="text-xs text-muted-foreground">{st.reference ?? ""}</span>
                </span>
                <span className="rounded-full border px-2 py-0.5 text-xs">{st.status}</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right text-xs text-muted-foreground">
                    <th className="px-2 py-1">تاریخ</th>
                    <th className="px-2 py-1">شرح</th>
                    <th className="px-2 py-1">بدهکار</th>
                    <th className="px-2 py-1">بستانکار</th>
                    <th className="px-2 py-1">وضعیت</th>
                    <th className="px-2 py-1" />
                  </tr>
                </thead>
                <tbody>
                  {(st.lines ?? []).map((ln) => (
                    <tr key={ln.bank_statement_line_id} className="border-b border-border/40">
                      <td className="px-2 py-1">{ln.line_date}</td>
                      <td className="px-2 py-1">{ln.description ?? "—"}</td>
                      <td className="px-2 py-1 font-mono text-xs">{ln.debit_amount}</td>
                      <td className="px-2 py-1 font-mono text-xs">{ln.credit_amount}</td>
                      <td className="px-2 py-1 text-xs">{ln.status}</td>
                      <td className="px-2 py-1">
                        {canManage && ln.status !== "MATCHED" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!matchJournalId || matchMut.isPending}
                            onClick={() => void matchMut.mutateAsync(ln.bank_statement_line_id)}
                          >
                            تطبیق
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
