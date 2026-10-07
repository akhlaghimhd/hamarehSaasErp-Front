"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import { accountService } from "../services/account-service";
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

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [assetAcc, setAssetAcc] = useState("");
  const [accumAcc, setAccumAcc] = useState("");
  const [expAcc, setExpAcc] = useState("");
  const [acqDate, setAcqDate] = useState(new Date().toISOString().slice(0, 10));
  const [cost, setCost] = useState("1000000");
  const [salvage, setSalvage] = useState("0");
  const [months, setMonths] = useState("36");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["finance", "fixed-assets", effectiveCompany],
    queryFn: () => fixedAssetService.list(effectiveCompany as string),
    enabled: canView && !!effectiveCompany,
  });

  const { data: accounts } = useQuery({
    queryKey: ["finance", "accounts-flat"],
    queryFn: () => accountService.listFlat(),
    enabled: canManage,
  });

  const postable = useMemo(
    () => (accounts ?? []).filter((a) => a.is_postable !== false),
    [accounts]
  );

  const createMut = useMutation({
    mutationFn: () =>
      fixedAssetService.create({
        company_id: effectiveCompany as string,
        asset_code: code.trim(),
        name: name.trim(),
        asset_account_id: assetAcc,
        accum_depr_account_id: accumAcc,
        depr_expense_account_id: expAcc,
        acquisition_date: acqDate,
        acquisition_cost: Number(cost),
        salvage_value: Number(salvage) || 0,
        useful_life_months: Number(months) || 1,
        depreciation_method: "STRAIGHT_LINE",
      }),
    onSuccess: () => {
      setMsg("دارایی ثبت شد.");
      setCode("");
      setName("");
      void qc.invalidateQueries({ queryKey: ["finance", "fixed-assets"] });
    },
    onError: (e: Error) => setMsg(e.message || "خطا در ثبت دارایی"),
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

      {canManage ? (
        <div className="grid gap-2 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">کد دارایی</label>
            <input
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">نام</label>
            <input
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">تاریخ تحصیل</label>
            <input
              type="date"
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={acqDate}
              onChange={(e) => setAcqDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">بهای تمام‌شده</label>
            <input
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">ارزش اسقاط</label>
            <input
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={salvage}
              onChange={(e) => setSalvage(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">عمر مفید (ماه)</label>
            <input
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">حساب دارایی</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={assetAcc}
              onChange={(e) => setAssetAcc(e.target.value)}
            >
              <option value="">—</option>
              {postable.map((a) => (
                <option key={a.account_id} value={a.account_id}>
                  {a.account_code} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">حساب استهلاک انباشته</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={accumAcc}
              onChange={(e) => setAccumAcc(e.target.value)}
            >
              <option value="">—</option>
              {postable.map((a) => (
                <option key={a.account_id} value={a.account_id}>
                  {a.account_code} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">حساب هزینه استهلاک</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={expAcc}
              onChange={(e) => setExpAcc(e.target.value)}
            >
              <option value="">—</option>
              {postable.map((a) => (
                <option key={a.account_id} value={a.account_id}>
                  {a.account_code} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button
              size="sm"
              disabled={
                !effectiveCompany ||
                !code.trim() ||
                !name.trim() ||
                !assetAcc ||
                !accumAcc ||
                !expAcc ||
                createMut.isPending
              }
              onClick={() => void createMut.mutateAsync()}
            >
              {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              ثبت دارایی
            </Button>
          </div>
        </div>
      ) : null}

      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}

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
