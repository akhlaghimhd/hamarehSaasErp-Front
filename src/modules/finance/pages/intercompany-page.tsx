"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import { accountService } from "../services/account-service";
import { intercompanyService } from "../services/intercompany-service";
import { DEMO_PERIOD_ID, FinancePermissions } from "../types";

export function IntercompanyPage() {
  const canView = usePermission(FinancePermissions.icView);
  const canManage = usePermission(FinancePermissions.icManage);
  const { data: companies } = useCompanies();

  const [fromCo, setFromCo] = useState("");
  const [toCo, setToCo] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [fromLedger, setFromLedger] = useState("");
  const [toLedger, setToLedger] = useState("");
  const [offsetFrom, setOffsetFrom] = useState("");
  const [offsetTo, setOffsetTo] = useState("");
  const [amount, setAmount] = useState("1000");
  const [periodId, setPeriodId] = useState(DEMO_PERIOD_ID);
  const [elimCo, setElimCo] = useState("");
  const [elimLedger, setElimLedger] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const { data: accounts } = useQuery({
    queryKey: ["finance", "accounts-flat"],
    queryFn: () => accountService.listFlat(),
    enabled: canManage,
  });

  const postable = useMemo(
    () => (accounts ?? []).filter((a) => a.is_postable !== false),
    [accounts]
  );

  const mapMut = useMutation({
    mutationFn: () =>
      intercompanyService.upsertMap({
        from_company_id: fromCo,
        to_company_id: toCo,
        due_from_account_id: dueFrom,
        due_to_account_id: dueTo,
      }),
    onSuccess: () => setMsg("نقشه حساب IC ذخیره شد."),
    onError: (e: Error) => setMsg(e.message),
  });

  const pairMut = useMutation({
    mutationFn: () =>
      intercompanyService.createPair({
        from_company_id: fromCo,
        to_company_id: toCo,
        from_ledger_id: fromLedger,
        to_ledger_id: toLedger,
        period_id: periodId,
        amount: Number(amount),
        from_offset_account_id: offsetFrom,
        to_offset_account_id: offsetTo,
        description: "IC از UI",
      }),
    onSuccess: (r) =>
      setMsg(
        `دو پیش‌نویس IC: ${r.from_journal_entry_id?.slice(0, 8)}… / ${r.to_journal_entry_id?.slice(0, 8)}… (ثبت قطعی نشده)`
      ),
    onError: (e: Error) => setMsg(e.message),
  });

  const elimMut = useMutation({
    mutationFn: () =>
      intercompanyService.createElimination({
        elimination_company_id: elimCo,
        ledger_id: elimLedger,
        period_id: periodId,
        due_from_account_id: dueFrom,
        due_to_account_id: dueTo,
        amount: Number(amount),
      }),
    onSuccess: (r) =>
      setMsg(`پیش‌نویس حذف: ${r.journal_entry_id?.slice(0, 8)}… (ثبت قطعی نشده)`),
    onError: (e: Error) => setMsg(e.message),
  });

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده بین شرکتی را ندارید.</div>
    );
  }

  const companyOptions = (companies ?? []).map((c) => (
    <option key={c.company_id} value={c.company_id}>
      {c.name}
    </option>
  ));

  const accountOptions = postable.map((a) => (
    <option key={a.account_id} value={a.account_id}>
      {a.account_code} — {a.name}
    </option>
  ));

  return (
    <div className="space-y-4">
      <PageHeader
        title="بین شرکتی (IC)"
        description="نقشه حساب · جفت پیش‌نویس · حذف — بدون ثبت قطعی خودکار"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "بین شرکتی" },
        ]}
      />

      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}

      {canManage ? (
        <div className="space-y-4">
          <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">شرکت مبدأ</label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={fromCo}
                onChange={(e) => setFromCo(e.target.value)}
              >
                <option value="">—</option>
                {companyOptions}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">شرکت مقصد</label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={toCo}
                onChange={(e) => setToCo(e.target.value)}
              >
                <option value="">—</option>
                {companyOptions}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Period ID</label>
              <input
                className="h-9 w-full rounded-md border bg-background px-2 font-mono text-xs"
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Due-from account</label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={dueFrom}
                onChange={(e) => setDueFrom(e.target.value)}
              >
                <option value="">—</option>
                {accountOptions}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Due-to account</label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={dueTo}
                onChange={(e) => setDueTo(e.target.value)}
              >
                <option value="">—</option>
                {accountOptions}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                disabled={!fromCo || !toCo || !dueFrom || !dueTo || mapMut.isPending}
                onClick={() => void mapMut.mutateAsync()}
              >
                ذخیره نقشه حساب
              </Button>
            </div>
          </div>

          <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Ledger مبدأ</label>
              <input
                className="h-9 w-full rounded-md border bg-background px-2 font-mono text-xs"
                value={fromLedger}
                onChange={(e) => setFromLedger(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Ledger مقصد</label>
              <input
                className="h-9 w-full rounded-md border bg-background px-2 font-mono text-xs"
                value={toLedger}
                onChange={(e) => setToLedger(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">مبلغ</label>
              <input
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">حساب مقابل مبدأ</label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={offsetFrom}
                onChange={(e) => setOffsetFrom(e.target.value)}
              >
                <option value="">—</option>
                {accountOptions}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">حساب مقابل مقصد</label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={offsetTo}
                onChange={(e) => setOffsetTo(e.target.value)}
              >
                <option value="">—</option>
                {accountOptions}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                disabled={
                  !fromCo ||
                  !toCo ||
                  !fromLedger ||
                  !toLedger ||
                  !offsetFrom ||
                  !offsetTo ||
                  pairMut.isPending
                }
                onClick={() => void pairMut.mutateAsync()}
              >
                {pairMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                ساخت جفت پیش‌نویس IC
              </Button>
            </div>
          </div>

          <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">شرکت حذف (ELIMINATION)</label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={elimCo}
                onChange={(e) => setElimCo(e.target.value)}
              >
                <option value="">—</option>
                {companyOptions}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Ledger حذف</label>
              <input
                className="h-9 w-full rounded-md border bg-background px-2 font-mono text-xs"
                value={elimLedger}
                onChange={(e) => setElimLedger(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                variant="outline"
                disabled={!elimCo || !elimLedger || !dueFrom || !dueTo || elimMut.isPending}
                onClick={() => void elimMut.mutateAsync()}
              >
                پیش‌نویس حذف IC
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">فقط مشاهده — مجوز manage ندارید.</p>
      )}
    </div>
  );
}
