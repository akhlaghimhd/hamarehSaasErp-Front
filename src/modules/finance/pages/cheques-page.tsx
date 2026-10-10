"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X, FileCheck2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ShamsiDatePicker } from "@/shared/components/ui/shamsi-date-picker";
import { usePermission } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import { chequeService, type CreateChequePayload } from "../services/cheque-service";
import { treasuryService } from "../services/treasury-service";
import { FinancePermissions, type ChequeDto } from "../types";
import { ApiClientError } from "@/api";
import {
  cn,
  toFaDigits,
  toAsciiDigits,
  formatJalaliDate,
  jalaliToIso,
  toJalaliParts,
} from "@/shared/lib/utils";

/** چرخه مجاز مطابق بک‌اند Cheque::TRANSITIONS */
const TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ["DEPOSITED", "CANCELLED"],
  ISSUED: ["CLEARED", "BOUNCED", "CANCELLED"],
  DEPOSITED: ["CLEARED", "BOUNCED"],
  CLEARED: [],
  BOUNCED: ["CANCELLED"],
  CANCELLED: [],
};

const statusFa: Record<string, string> = {
  RECEIVED: "نزد صندوق",
  ISSUED: "صادر شده",
  DEPOSITED: "واگذار به بانک",
  CLEARED: "وصول شده",
  BOUNCED: "برگشتی",
  CANCELLED: "ابطال",
};

const statusChip: Record<string, string> = {
  RECEIVED: "bg-sky-50 text-sky-800 border-sky-200",
  ISSUED: "bg-violet-50 text-violet-800 border-violet-200",
  DEPOSITED: "bg-amber-50 text-amber-800 border-amber-200",
  CLEARED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  BOUNCED: "bg-rose-50 text-rose-800 border-rose-200",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-200",
};

const actionLabel: Record<string, string> = {
  DEPOSITED: "واگذاری به بانک",
  CLEARED: "وصول",
  BOUNCED: "برگشت",
  CANCELLED: "ابطال",
};

const actionVariant: Record<string, "secondary" | "destructive" | "outline"> = {
  DEPOSITED: "secondary",
  CLEARED: "secondary",
  BOUNCED: "destructive",
  CANCELLED: "outline",
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

export function ChequesPage() {
  const canView = usePermission(FinancePermissions.treasuryView);
  const canManage = usePermission(FinancePermissions.treasuryManage);
  const qc = useQueryClient();

  const { data: companies } = useCompanies();
  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    const p = list.find((c) => c.is_primary) ?? list[0];
    return p?.company_id ?? "";
  }, [companies]);

  const [statusFilter, setStatusFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["finance", "cheques", primaryCompanyId, statusFilter],
    queryFn: () =>
      chequeService.list({
        company_id: primaryCompanyId || undefined,
        status: statusFilter || undefined,
      }),
    enabled: canView && !!primaryCompanyId,
  });

  const { data: cashAccounts } = useQuery({
    queryKey: ["finance", "cash-accounts", primaryCompanyId],
    queryFn: () => treasuryService.listCashAccounts(primaryCompanyId),
    enabled: canView && !!primaryCompanyId,
  });

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (directionFilter) {
      list = list.filter((c) => c.direction === directionFilter);
    }
    const q = search.trim();
    if (q) {
      list = list.filter(
        (c) =>
          c.cheque_number.includes(q) ||
          (c.bank_name ?? "").includes(q) ||
          (c.payee_name ?? "").includes(q) ||
          (c.payer_name ?? "").includes(q)
      );
    }
    return list;
  }, [data, directionFilter, search]);

  const statusCounts = useMemo(() => {
    const all = data ?? [];
    const counts: Record<string, number> = { all: all.length };
    for (const s of Object.keys(statusFa)) {
      counts[s] = all.filter((c) => c.status === s).length;
    }
    return counts;
  }, [data]);

  const [formOpen, setFormOpen] = useState(false);
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [chequeNumber, setChequeNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [dueDate, setDueDate] = useState(todayIso());
  const [issueDate, setIssueDate] = useState(todayIso());
  const [amount, setAmount] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [drawerName, setDrawerName] = useState("");
  const [cashAccountId, setCashAccountId] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (payload: CreateChequePayload) => chequeService.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance", "cheques"] });
    },
  });

  const transitionMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      chequeService.transition(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance", "cheques"] });
    },
  });

  function openNew() {
    setFormOpen(true);
    setDirection("IN");
    setChequeNumber("");
    setBankName("");
    setDueDate(todayIso());
    setIssueDate(todayIso());
    setAmount("");
    setPayeeName("");
    setDrawerName("");
    setCashAccountId(cashAccounts?.[0]?.cash_account_id ?? "");
    setDescription("");
    setFormError(null);
    setMsg(null);
  }

  async function saveForm() {
    setFormError(null);
    if (!primaryCompanyId) {
      setFormError("شرکت اصلی یافت نشد.");
      return;
    }
    if (!chequeNumber.trim()) {
      setFormError("شماره چک الزامی است.");
      return;
    }
    if (!dueDate) {
      setFormError("تاریخ سررسید الزامی است.");
      return;
    }
    const amt = parseAmount(amount);
    if (amt <= 0) {
      setFormError("مبلغ باید بزرگ‌تر از صفر باشد.");
      return;
    }
    try {
      await createMut.mutateAsync({
        company_id: primaryCompanyId,
        direction,
        cheque_number: chequeNumber.trim(),
        due_date: dueDate,
        amount: amt,
        bank_name: bankName.trim() || undefined,
        issue_date: issueDate || undefined,
        payee_name: payeeName.trim() || undefined,
        drawer_name: drawerName.trim() || undefined,
        cash_account_id: cashAccountId || undefined,
        description: description.trim() || undefined,
      });
      setMsg(
        direction === "IN"
          ? "چک دریافتی ثبت شد (نزد صندوق)."
          : "چک پرداختی ثبت شد (صادر شده)."
      );
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

  async function doTransition(c: ChequeDto, status: string) {
    setMsg(null);
    try {
      await transitionMut.mutateAsync({ id: c.cheque_id, status });
      setMsg(`وضعیت چک به «${statusFa[status] ?? status}» تغییر کرد.`);
    } catch (e) {
      setMsg(
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "تغییر وضعیت ناموفق بود"
      );
    }
  }

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده چک را ندارید.</div>
    );
  }

  if (formOpen) {
    return (
      <div className="space-y-4 pb-20">
        <PageHeader
          title={direction === "IN" ? "ثبت چک دریافتی" : "ثبت چک پرداختی"}
          description="شماره، سررسید و مبلغ چک"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "حسابداری", href: "/dashboard/finance" },
            { label: "چک", href: "/dashboard/finance/cheques" },
            { label: "جدید" },
          ]}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={direction === "IN" ? "default" : "outline"}
            onClick={() => setDirection("IN")}
          >
            دریافتی
          </Button>
          <Button
            type="button"
            size="sm"
            variant={direction === "OUT" ? "default" : "outline"}
            onClick={() => setDirection("OUT")}
          >
            پرداختی
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 rounded-xl border bg-card p-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">شماره چک</label>
            <Input
              className="h-9 font-mono"
              value={chequeNumber}
              onChange={(e) => setChequeNumber(e.target.value)}
              placeholder="شماره روی چک"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">بانک</label>
            <Input
              className="h-9"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="نام بانک"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">تاریخ صدور</label>
            <ShamsiDatePicker
              value={issueDate}
              onChange={setIssueDate}
              className="h-9 w-full"
              placeholder="تاریخ صدور"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">سررسید</label>
            <ShamsiDatePicker
              value={dueDate}
              onChange={setDueDate}
              className="h-9 w-full"
              placeholder="تاریخ سررسید"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">مبلغ</label>
            <Input
              className="h-9 font-mono text-left"
              dir="ltr"
              inputMode="decimal"
              value={amount ? toFaDigits(amount) : ""}
              onChange={(e) =>
                setAmount(toAsciiDigits(e.target.value).replace(/[^\d.]/g, ""))
              }
              placeholder="۰"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">
              حساب نقدی مرتبط (اختیاری)
            </label>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={cashAccountId}
              onChange={(e) => setCashAccountId(e.target.value)}
            >
              <option value="">—</option>
              {(cashAccounts ?? []).map((c) => (
                <option key={c.cash_account_id} value={c.cash_account_id}>
                  {toFaDigits(c.code)} — {c.name}
                </option>
              ))}
            </select>
          </div>
          {direction === "IN" ? (
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground">
                صادرکننده / کشنده چک
              </label>
              <Input
                className="h-9"
                value={drawerName}
                onChange={(e) => setDrawerName(e.target.value)}
                placeholder="نام صادرکننده"
              />
            </div>
          ) : (
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground">ذینفع / در وجه</label>
              <Input
                className="h-9"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                placeholder="در وجه"
              />
            </div>
          )}
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">شرح</label>
            <Input
              className="h-9"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="شرح اختیاری"
            />
          </div>
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
            ثبت چک
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="چک"
        description="ثبت و چرخه وضعیت چک‌های دریافتی و پرداختی"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "چک" },
        ]}
        actions={
          canManage ? (
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 ml-1" />
              چک جدید
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
          <label className="text-xs text-muted-foreground">وضعیت</label>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">همه ({toFaDigits(statusCounts.all ?? 0)})</option>
            {Object.entries(statusFa).map(([k, label]) => (
              <option key={k} value={k}>
                {label} ({toFaDigits(statusCounts[k] ?? 0)})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">نوع</label>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={directionFilter}
            onChange={(e) => setDirectionFilter(e.target.value)}
          >
            <option value="">همه</option>
            <option value="IN">دریافتی</option>
            <option value="OUT">پرداختی</option>
          </select>
        </div>
        <div className="space-y-1 flex-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground">جستجو</label>
          <Input
            className="h-9"
            placeholder="شماره، بانک، طرف…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-destructive">
            خطا.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void refetch()}
            >
              تلاش مجدد
            </button>
          </div>
        ) : !filtered.length ? (
          <div className="p-6 text-center space-y-3">
            <FileCheck2 className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">چکی ثبت نشده است.</p>
            {canManage ? (
              <Button size="sm" onClick={openNew}>
                <Plus className="h-4 w-4 ml-1" />
                ثبت اولین چک
              </Button>
            ) : null}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">شماره</th>
                <th className="px-3 py-2 font-medium">نوع</th>
                <th className="px-3 py-2 font-medium">بانک</th>
                <th className="px-3 py-2 font-medium">سررسید</th>
                <th className="px-3 py-2 font-medium">مبلغ</th>
                <th className="px-3 py-2 font-medium">طرف</th>
                <th className="px-3 py-2 font-medium">وضعیت</th>
                <th className="px-3 py-2 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const next = TRANSITIONS[c.status] ?? [];
                const party =
                  c.direction === "IN"
                    ? (c as ChequeDto & { drawer_name?: string }).drawer_name ??
                      c.payer_name
                    : c.payee_name;
                return (
                  <tr
                    key={c.cheque_id}
                    className="border-b border-border/50 hover:bg-muted/40"
                  >
                    <td className="px-3 py-2 font-mono text-xs">
                      {toFaDigits(c.cheque_number)}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {c.direction === "IN" ? "دریافتی" : "پرداختی"}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[100px] truncate">
                      {c.bank_name ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {formatJalaliDate(c.due_date)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {formatMoney(Number(c.amount || 0))}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[120px] truncate">
                      {party ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                          statusChip[c.status] ?? "bg-muted"
                        )}
                      >
                        {statusFa[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {canManage && next.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {next.map((s) => (
                            <Button
                              key={s}
                              size="sm"
                              variant={actionVariant[s] ?? "secondary"}
                              className="h-7 text-[11px]"
                              disabled={transitionMut.isPending}
                              onClick={() => void doTransition(c, s)}
                            >
                              {actionLabel[s] ?? s}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
