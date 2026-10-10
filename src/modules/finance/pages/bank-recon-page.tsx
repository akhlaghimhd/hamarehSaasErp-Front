"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  X,
  ChevronDown,
  ChevronLeft,
  Landmark,
} from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ShamsiDatePicker } from "@/shared/components/ui/shamsi-date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { usePermission } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import {
  bankReconService,
  type BankStatement,
  type BankStatementLine,
} from "../services/bank-recon-service";
import { treasuryService } from "../services/treasury-service";
import { FinancePermissions } from "../types";
import { ApiClientError } from "@/api";
import {
  cn,
  toFaDigits,
  toAsciiDigits,
  formatJalaliDate,
  jalaliToIso,
  toJalaliParts,
} from "@/shared/lib/utils";

const statusFa: Record<string, string> = {
  OPEN: "باز",
  DRAFT: "پیش‌نویس",
  MATCHED: "تطبیق‌شده",
  RECONCILED: "تسویه کامل",
  PARTIAL: "ناقص",
};

const statusChip: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-800 border-amber-200",
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  MATCHED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  RECONCILED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  PARTIAL: "bg-sky-50 text-sky-800 border-sky-200",
};

function todayIso(): string {
  const n = new Date();
  const { jy, jm, jd } = toJalaliParts(
    n.getFullYear(),
    n.getMonth() + 1,
    n.getDate()
  );
  return jalaliToIso(jy, jm, jd);
}

function formatMoney(n: number): string {
  return toFaDigits(
    n.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

function parseAmount(raw: string): number {
  const n = Number(toAsciiDigits(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

type DraftLine = {
  key: string;
  line_date: string;
  description: string;
  debit: string;
  credit: string;
};

function newDraftLine(date: string): DraftLine {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    line_date: date,
    description: "",
    debit: "",
    credit: "",
  };
}

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
  const [msg, setMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["finance", "bank-statements", effectiveCo],
    queryFn: () => bankReconService.list(effectiveCo || undefined),
    enabled: canView && !!effectiveCo,
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ["finance", "cash-accounts", effectiveCo],
    queryFn: () => treasuryService.listCashAccounts(effectiveCo),
    enabled: canView && !!effectiveCo,
  });

  const cashLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of cashAccounts ?? []) {
      m.set(c.cash_account_id, `${toFaDigits(c.code)} — ${c.name}`);
    }
    return m;
  }, [cashAccounts]);

  const [formOpen, setFormOpen] = useState(false);
  const [cashAccountId, setCashAccountId] = useState("");
  const [statementDate, setStatementDate] = useState(todayIso());
  const [reference, setReference] = useState("");
  const [openingBal, setOpeningBal] = useState("");
  const [closingBal, setClosingBal] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([newDraftLine(todayIso())]);
  const [formError, setFormError] = useState<string | null>(null);

  const [matchLine, setMatchLine] = useState<BankStatementLine | null>(null);
  const [matchTreasuryId, setMatchTreasuryId] = useState("");
  const [matchJournalId, setMatchJournalId] = useState("");
  const [matchError, setMatchError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: () =>
      bankReconService.create({
        company_id: effectiveCo,
        cash_account_id: cashAccountId,
        statement_date: statementDate,
        reference: reference.trim() || undefined,
        opening_balance: openingBal ? parseAmount(openingBal) : undefined,
        closing_balance: closingBal ? parseAmount(closingBal) : undefined,
        lines: lines
          .filter((l) => l.description.trim() || parseAmount(l.debit) || parseAmount(l.credit))
          .map((l) => ({
            line_date: l.line_date || statementDate,
            description: l.description.trim() || undefined,
            debit_amount: parseAmount(l.debit),
            credit_amount: parseAmount(l.credit),
          })),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance", "bank-statements"] });
    },
  });

  const matchMut = useMutation({
    mutationFn: (lineId: string) =>
      bankReconService.matchLine(lineId, {
        treasury_document_id: matchTreasuryId.trim() || undefined,
        journal_entry_id: matchJournalId.trim() || undefined,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance", "bank-statements"] });
    },
  });

  function openNew() {
    setFormOpen(true);
    setCashAccountId(cashAccounts?.[0]?.cash_account_id ?? "");
    setStatementDate(todayIso());
    setReference("");
    setOpeningBal("");
    setClosingBal("");
    setLines([newDraftLine(todayIso())]);
    setFormError(null);
    setMsg(null);
  }

  async function saveForm() {
    setFormError(null);
    if (!effectiveCo) {
      setFormError("شرکت را انتخاب کنید.");
      return;
    }
    if (!cashAccountId) {
      setFormError("حساب بانکی/نقدی الزامی است.");
      return;
    }
    if (!statementDate) {
      setFormError("تاریخ صورت‌حساب الزامی است.");
      return;
    }
    const validLines = lines.filter(
      (l) => l.description.trim() || parseAmount(l.debit) || parseAmount(l.credit)
    );
    if (!validLines.length) {
      setFormError("حداقل یک سطر با شرح یا مبلغ وارد کنید.");
      return;
    }
    try {
      await createMut.mutateAsync();
      setMsg("صورت‌حساب بانک ثبت شد.");
      setFormOpen(false);
    } catch (e) {
      setFormError(
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "ذخیره ناموفق بود"
      );
    }
  }

  async function doMatch() {
    if (!matchLine) return;
    setMatchError(null);
    if (!matchTreasuryId.trim() && !matchJournalId.trim()) {
      setMatchError("شناسه سند خزانه یا سند دفتر را وارد کنید.");
      return;
    }
    try {
      await matchMut.mutateAsync(matchLine.bank_statement_line_id);
      setMsg("سطر تطبیق شد.");
      setMatchLine(null);
      setMatchTreasuryId("");
      setMatchJournalId("");
    } catch (e) {
      setMatchError(
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "تطبیق ناموفق بود"
      );
    }
  }

  function lineTotals(stmt: BankStatement) {
    let d = 0;
    let c = 0;
    let open = 0;
    for (const ln of stmt.lines ?? []) {
      d += Number(ln.debit_amount || 0);
      c += Number(ln.credit_amount || 0);
      if (ln.status === "OPEN") open++;
    }
    return { d, c, open, total: (stmt.lines ?? []).length };
  }

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">
        مجوز مشاهده تطبیق بانکی را ندارید.
      </div>
    );
  }

  if (formOpen) {
    return (
      <div className="space-y-4 pb-20">
        <PageHeader
          title="ثبت صورت‌حساب بانک"
          description="سطرهای صورت‌حساب برای تطبیق با اسناد خزانه / دفتر"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "حسابداری", href: "/dashboard/finance" },
            { label: "تطبیق بانکی", href: "/dashboard/finance/bank-recon" },
            { label: "جدید" },
          ]}
        />

        <div className="grid gap-3 sm:grid-cols-2 rounded-xl border bg-card p-4">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">حساب بانکی / نقدی</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={cashAccountId}
              onChange={(e) => setCashAccountId(e.target.value)}
            >
              <option value="">انتخاب…</option>
              {(cashAccounts ?? []).map((c) => (
                <option key={c.cash_account_id} value={c.cash_account_id}>
                  {toFaDigits(c.code)} — {c.name}
                </option>
              ))}
            </select>
            {(cashAccounts ?? []).length === 0 ? (
              <p className="text-[11px] text-amber-700">
                ابتدا از صفحه خزانه یک حساب نقدی/بانکی تعریف کنید.
              </p>
            ) : null}
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">تاریخ صورت‌حساب</label>
            <ShamsiDatePicker
              value={statementDate}
              onChange={(v) => {
                setStatementDate(v);
                setLines((prev) =>
                  prev.map((l) => ({ ...l, line_date: l.line_date || v }))
                );
              }}
              className="h-9 w-full"
              placeholder="تاریخ"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">مرجع / شماره</label>
            <Input
              className="h-9"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="اختیاری"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">مانده اول دوره</label>
            <Input
              className="h-9 font-mono text-left"
              dir="ltr"
              inputMode="decimal"
              value={openingBal ? toFaDigits(openingBal) : ""}
              onChange={(e) =>
                setOpeningBal(toAsciiDigits(e.target.value).replace(/[^\d.]/g, ""))
              }
              placeholder="۰"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">مانده پایان</label>
            <Input
              className="h-9 font-mono text-left"
              dir="ltr"
              inputMode="decimal"
              value={closingBal ? toFaDigits(closingBal) : ""}
              onChange={(e) =>
                setClosingBal(toAsciiDigits(e.target.value).replace(/[^\d.]/g, ""))
              }
              placeholder="۰"
            />
          </div>
        </div>

        <div className="rounded-xl border bg-card overflow-x-auto">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-xs font-medium text-muted-foreground">
              سطرهای صورت‌حساب
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() =>
                setLines((prev) => [...prev, newDraftLine(statementDate)])
              }
            >
              <Plus className="h-3.5 w-3.5 ml-0.5" />
              سطر
            </Button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-2 py-2 font-medium">تاریخ</th>
                <th className="px-2 py-2 font-medium">شرح</th>
                <th className="px-2 py-2 font-medium">بدهکار (برداشت)</th>
                <th className="px-2 py-2 font-medium">بستانکار (واریز)</th>
                <th className="px-2 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={l.key} className="border-b border-border/40">
                  <td className="px-2 py-1.5">
                    <ShamsiDatePicker
                      value={l.line_date}
                      onChange={(v) =>
                        setLines((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, line_date: v } : x
                          )
                        )
                      }
                      className="h-8 w-[130px]"
                      placeholder="تاریخ"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      className="h-8"
                      value={l.description}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? { ...x, description: e.target.value }
                              : x
                          )
                        )
                      }
                      placeholder="شرح بانک"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      className="h-8 font-mono text-left"
                      dir="ltr"
                      inputMode="decimal"
                      value={l.debit ? toFaDigits(l.debit) : ""}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? {
                                  ...x,
                                  debit: toAsciiDigits(e.target.value).replace(
                                    /[^\d.]/g,
                                    ""
                                  ),
                                  credit: "",
                                }
                              : x
                          )
                        )
                      }
                      placeholder="۰"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      className="h-8 font-mono text-left"
                      dir="ltr"
                      inputMode="decimal"
                      value={l.credit ? toFaDigits(l.credit) : ""}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? {
                                  ...x,
                                  credit: toAsciiDigits(e.target.value).replace(
                                    /[^\d.]/g,
                                    ""
                                  ),
                                  debit: "",
                                }
                              : x
                          )
                        )
                      }
                      placeholder="۰"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    {lines.length > 1 ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          setLines((prev) => prev.filter((_, i) => i !== idx))
                        }
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {formError ? (
          <p className="text-sm text-destructive">{formError}</p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" onClick={() => setFormOpen(false)}>
            <X className="h-4 w-4 ml-1" />
            انصراف
          </Button>
          <Button
            type="button"
            disabled={createMut.isPending}
            onClick={() => void saveForm()}
          >
            {createMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin ml-1" />
            ) : null}
            ثبت صورت‌حساب
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="تطبیق بانکی"
        description="صورت‌حساب بانک و تطبیق سطرها با اسناد خزانه / دفتر"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "تطبیق بانکی" },
        ]}
        actions={
          canManage ? (
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 ml-1" />
              صورت‌حساب جدید
            </Button>
          ) : undefined
        }
      />

      {msg ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {msg}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">شرکت</label>
          <select
            className="h-9 min-w-[160px] rounded-md border bg-background px-2 text-sm"
            value={effectiveCo}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="">—</option>
            {(companies ?? []).map((c) => (
              <option key={c.company_id} value={c.company_id}>
                {c.name_fa || c.name || c.legal_name || c.company_id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground rounded-xl border bg-card">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-destructive rounded-xl border bg-card">
            خطا.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void refetch()}
            >
              تلاش مجدد
            </button>
          </div>
        ) : !(data ?? []).length ? (
          <div className="p-8 text-center space-y-2 rounded-xl border bg-card">
            <Landmark className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              صورت‌حسابی ثبت نشده است.
            </p>
            {canManage ? (
              <Button size="sm" onClick={openNew}>
                <Plus className="h-4 w-4 ml-1" />
                ثبت اولین صورت‌حساب
              </Button>
            ) : null}
          </div>
        ) : (
          (data ?? []).map((stmt) => {
            const id = stmt.bank_statement_id;
            const open = !!expanded[id];
            const t = lineTotals(stmt);
            return (
              <div
                key={id}
                className="rounded-xl border bg-card overflow-hidden"
              >
                <button
                  type="button"
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-right hover:bg-muted/40"
                  onClick={() =>
                    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
                  }
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronLeft className="h-4 w-4 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div>
                      <div className="text-muted-foreground">تاریخ</div>
                      <div>{formatJalaliDate(stmt.statement_date)}</div>
                    </div>
                    <div className="truncate">
                      <div className="text-muted-foreground">حساب</div>
                      <div className="truncate">
                        {cashLabel.get(stmt.cash_account_id) ?? "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">مرجع</div>
                      <div className="font-mono">
                        {stmt.reference ? toFaDigits(stmt.reference) : "—"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">سطرها</div>
                      <div>
                        {toFaDigits(t.total)}
                        {t.open > 0
                          ? ` · ${toFaDigits(t.open)} باز`
                          : " · کامل"}
                      </div>
                    </div>
                    <div>
                      <span
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                          statusChip[stmt.status] ?? "bg-muted"
                        )}
                      >
                        {statusFa[stmt.status] ?? stmt.status}
                      </span>
                    </div>
                  </div>
                </button>

                {open ? (
                  <div className="border-t overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-right text-xs text-muted-foreground bg-muted/20">
                          <th className="px-3 py-2 font-medium">تاریخ</th>
                          <th className="px-3 py-2 font-medium">شرح</th>
                          <th className="px-3 py-2 font-medium">برداشت</th>
                          <th className="px-3 py-2 font-medium">واریز</th>
                          <th className="px-3 py-2 font-medium">وضعیت</th>
                          <th className="px-3 py-2 font-medium">عملیات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(stmt.lines ?? []).map((ln) => (
                          <tr
                            key={ln.bank_statement_line_id}
                            className="border-b border-border/40"
                          >
                            <td className="px-3 py-2 text-xs">
                              {formatJalaliDate(ln.line_date)}
                            </td>
                            <td className="px-3 py-2 text-xs max-w-[180px] truncate">
                              {ln.description ?? "—"}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-rose-700">
                              {Number(ln.debit_amount || 0) > 0
                                ? formatMoney(Number(ln.debit_amount))
                                : "—"}
                            </td>
                            <td className="px-3 py-2 font-mono text-xs text-emerald-700">
                              {Number(ln.credit_amount || 0) > 0
                                ? formatMoney(Number(ln.credit_amount))
                                : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={cn(
                                  "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                                  statusChip[ln.status] ?? "bg-muted"
                                )}
                              >
                                {statusFa[ln.status] ?? ln.status}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              {canManage && ln.status === "OPEN" ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 text-[11px]"
                                  onClick={() => {
                                    setMatchLine(ln);
                                    setMatchTreasuryId("");
                                    setMatchJournalId("");
                                    setMatchError(null);
                                  }}
                                >
                                  تطبیق
                                </Button>
                              ) : ln.matched_journal_entry_id ||
                                ln.matched_treasury_document_id ? (
                                <span className="text-[10px] text-muted-foreground">
                                  تطبیق شده
                                </span>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="px-3 py-2 text-[11px] text-muted-foreground border-t flex flex-wrap gap-4">
                      <span>
                        جمع برداشت:{" "}
                        <span className="font-mono text-rose-700">
                          {formatMoney(t.d)}
                        </span>
                      </span>
                      <span>
                        جمع واریز:{" "}
                        <span className="font-mono text-emerald-700">
                          {formatMoney(t.c)}
                        </span>
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <Dialog
        open={!!matchLine}
        onOpenChange={(o) => !o && setMatchLine(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تطبیق سطر بانک</DialogTitle>
            <DialogDescription>
              {matchLine?.description
                ? `«${matchLine.description}» — `
                : ""}
              یکی از شناسه‌های زیر را وارد کنید.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                شناسه سند خزانه (اختیاری)
              </label>
              <Input
                className="h-9 font-mono text-xs"
                value={matchTreasuryId}
                onChange={(e) => setMatchTreasuryId(e.target.value)}
                placeholder="UUID سند خزانه"
                dir="ltr"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                شناسه سند دفتر (اختیاری)
              </label>
              <Input
                className="h-9 font-mono text-xs"
                value={matchJournalId}
                onChange={(e) => setMatchJournalId(e.target.value)}
                placeholder="UUID سند حسابداری"
                dir="ltr"
              />
            </div>
            {matchError ? (
              <p className="text-sm text-destructive">{matchError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMatchLine(null)}>
              انصراف
            </Button>
            <Button
              disabled={matchMut.isPending}
              onClick={() => void doMatch()}
            >
              {matchMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              ) : null}
              تأیید تطبیق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
