"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X, CheckCircle2, Wallet, Landmark } from "lucide-react";
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
import { useAccountFlat } from "../hooks/use-accounts";
import {
  treasuryService,
  type CreateTreasuryDocumentPayload,
} from "../services/treasury-service";
import {
  FinancePermissions,
  DEMO_PERIOD_ID,
  type TreasuryDocumentDto,
} from "../types";
import { ApiClientError } from "@/api";
import {
  cn,
  toFaDigits,
  toAsciiDigits,
  formatJalaliDate,
  jalaliToIso,
  toJalaliParts,
} from "@/shared/lib/utils";

const typeLabel: Record<string, string> = {
  RECEIPT: "دریافت",
  PAYMENT: "پرداخت",
};
const statusLabel: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  POSTED: "ثبت‌شده",
  VOID: "باطل",
};
const statusChip: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-800 border-amber-200",
  POSTED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  VOID: "bg-slate-100 text-slate-600 border-slate-200",
};
const kindLabel: Record<string, string> = {
  BANK: "بانک",
  PETTY_CASH: "تنخواه",
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

export function TreasuryPage() {
  const canView = usePermission(FinancePermissions.treasuryView);
  const canManage = usePermission(FinancePermissions.treasuryManage);
  const canPost = usePermission(FinancePermissions.treasuryPost);
  const qc = useQueryClient();
  const { data: companies } = useCompanies();
  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    const p = list.find((c) => c.is_primary) ?? list[0];
    return p?.company_id ?? "";
  }, [companies]);

  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [cashFilter, setCashFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["finance", "treasury-docs", primaryCompanyId, statusFilter],
    queryFn: () =>
      treasuryService.listDocuments({
        company_id: primaryCompanyId || undefined,
        status: statusFilter || undefined,
      }),
    enabled: canView && !!primaryCompanyId,
  });

  const {
    data: cashAccounts,
    refetch: refetchCash,
  } = useQuery({
    queryKey: ["finance", "cash-accounts", primaryCompanyId],
    queryFn: () => treasuryService.listCashAccounts(primaryCompanyId),
    enabled: canView && !!primaryCompanyId,
  });

  const { data: accountsFlat } = useAccountFlat();
  const postableAccounts = useMemo(
    () => (accountsFlat ?? []).filter((a) => a.is_postable !== false),
    [accountsFlat]
  );

  const cashLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cashAccounts ?? []) {
      map.set(c.cash_account_id, `${toFaDigits(c.code)} — ${c.name}`);
    }
    return map;
  }, [cashAccounts]);

  const filtered = useMemo(() => {
    let list = data ?? [];
    if (typeFilter) list = list.filter((d) => d.document_type === typeFilter);
    if (cashFilter) list = list.filter((d) => d.cash_account_id === cashFilter);
    if (dateFrom) list = list.filter((d) => (d.document_date ?? "") >= dateFrom);
    if (dateTo) list = list.filter((d) => (d.document_date ?? "") <= dateTo);
    const q = search.trim();
    if (q) {
      list = list.filter(
        (d) =>
          (d.document_number ?? "").includes(q) ||
          (d.counterparty_name ?? "").includes(q) ||
          (d.description ?? "").includes(q)
      );
    }
    return list;
  }, [data, typeFilter, search, cashFilter, dateFrom, dateTo]);

  const filteredTotals = useMemo(() => {
    let receipt = 0;
    let payment = 0;
    for (const d of filtered) {
      const amt = Number(d.amount || 0);
      if (d.document_type === "RECEIPT") receipt += amt;
      else if (d.document_type === "PAYMENT") payment += amt;
    }
    return { receipt, payment, net: receipt - payment, count: filtered.length };
  }, [filtered]);

  const statusCounts = useMemo(() => {
    const all = data ?? [];
    return {
      all: all.length,
      DRAFT: all.filter((d) => d.status === "DRAFT").length,
      POSTED: all.filter((d) => d.status === "POSTED").length,
    };
  }, [data]);

  const [formOpen, setFormOpen] = useState(false);
  const [docType, setDocType] = useState<"RECEIPT" | "PAYMENT">("RECEIPT");
  const [documentDate, setDocumentDate] = useState(todayIso());
  const [amount, setAmount] = useState("");
  const [cashAccountId, setCashAccountId] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [description, setDescription] = useState("");
  const [offsetAccountId, setOffsetAccountId] = useState("");
  const [autoPost, setAutoPost] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [postTarget, setPostTarget] = useState<TreasuryDocumentDto | null>(null);
  const [postOffset, setPostOffset] = useState("");

  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [cashCode, setCashCode] = useState("");
  const [cashName, setCashName] = useState("");
  const [cashKind, setCashKind] = useState<"BANK" | "PETTY_CASH">("BANK");
  const [cashGlId, setCashGlId] = useState("");
  const [cashError, setCashError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (payload: CreateTreasuryDocumentPayload) =>
      treasuryService.createDocument(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance", "treasury-docs"] });
    },
  });

  const postMut = useMutation({
    mutationFn: ({
      id,
      offset_account_id,
    }: {
      id: string;
      offset_account_id: string;
    }) => treasuryService.postDocument(id, { offset_account_id }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance", "treasury-docs"] });
    },
  });

  const createCashMut = useMutation({
    mutationFn: () =>
      treasuryService.createCashAccount({
        company_id: primaryCompanyId,
        gl_account_id: cashGlId,
        code: cashCode.trim(),
        name: cashName.trim(),
        cash_kind: cashKind,
      }),
    onSuccess: async (row) => {
      await qc.invalidateQueries({ queryKey: ["finance", "cash-accounts"] });
      await refetchCash();
      setCashAccountId(row.cash_account_id);
      setCashDialogOpen(false);
      setMsg("حساب نقدی/بانکی ثبت شد.");
    },
  });

  function openCashDialog() {
    setCashCode("");
    setCashName("");
    setCashKind("BANK");
    setCashGlId("");
    setCashError(null);
    setCashDialogOpen(true);
  }

  async function saveCashAccount() {
    setCashError(null);
    if (!primaryCompanyId) {
      setCashError("شرکت اصلی یافت نشد.");
      return;
    }
    if (!cashCode.trim() || !cashName.trim()) {
      setCashError("کد و نام الزامی است.");
      return;
    }
    if (!cashGlId) {
      setCashError("حساب دفتر کل (تفصیلی) را انتخاب کنید.");
      return;
    }
    try {
      await createCashMut.mutateAsync();
    } catch (e) {
      setCashError(
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "ثبت ناموفق بود"
      );
    }
  }

  function openNew() {
    setFormOpen(true);
    setDocType("RECEIPT");
    setDocumentDate(todayIso());
    setAmount("");
    setCashAccountId(cashAccounts?.[0]?.cash_account_id ?? "");
    setCounterparty("");
    setDescription("");
    setOffsetAccountId("");
    setAutoPost(false);
    setFormError(null);
    setMsg(null);
  }

  async function saveForm() {
    setFormError(null);
    if (!primaryCompanyId) {
      setFormError("شرکت اصلی یافت نشد.");
      return;
    }
    if (!cashAccountId) {
      setFormError("حساب نقدی/بانکی الزامی است. ابتدا یکی تعریف کنید.");
      return;
    }
    if (!documentDate) {
      setFormError("تاریخ سند الزامی است.");
      return;
    }
    const amt = parseAmount(amount);
    if (amt <= 0) {
      setFormError("مبلغ باید بزرگ‌تر از صفر باشد.");
      return;
    }
    if (autoPost && !offsetAccountId) {
      setFormError("برای ثبت مستقیم، حساب مقابل الزامی است.");
      return;
    }
    try {
      await createMut.mutateAsync({
        company_id: primaryCompanyId,
        period_id: DEMO_PERIOD_ID,
        cash_account_id: cashAccountId,
        document_type: docType,
        document_date: documentDate,
        amount: amt,
        counterparty_name: counterparty.trim() || undefined,
        description: description.trim() || undefined,
        offset_account_id: autoPost ? offsetAccountId : undefined,
        auto_post: autoPost || undefined,
      });
      setMsg(
        autoPost
          ? "سند خزانه ایجاد و در دفتر ثبت شد."
          : "پیش‌نویس خزانه ذخیره شد."
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

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">
        مجوز مشاهده خزانه را ندارید.
      </div>
    );
  }

  if (formOpen) {
    return (
      <div className="space-y-4 pb-20">
        <PageHeader
          title={docType === "RECEIPT" ? "سند دریافت" : "سند پرداخت"}
          description="ثبت دریافت یا پرداخت نقدی/بانکی"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "حسابداری", href: "/dashboard/finance" },
            { label: "خزانه", href: "/dashboard/finance/treasury" },
            { label: "جدید" },
          ]}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={docType === "RECEIPT" ? "default" : "outline"}
            onClick={() => setDocType("RECEIPT")}
          >
            دریافت
          </Button>
          <Button
            type="button"
            size="sm"
            variant={docType === "PAYMENT" ? "default" : "outline"}
            onClick={() => setDocType("PAYMENT")}
          >
            پرداخت
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 rounded-xl border bg-card p-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">تاریخ</label>
            <ShamsiDatePicker
              value={documentDate}
              onChange={setDocumentDate}
              className="h-9 w-full"
              placeholder="انتخاب تاریخ"
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
          <div className="space-y-1 sm:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-muted-foreground">
                حساب نقدی / بانکی
              </label>
              {canManage ? (
                <button
                  type="button"
                  className="text-[11px] text-primary hover:underline"
                  onClick={openCashDialog}
                >
                  + تعریف حساب جدید
                </button>
              ) : null}
            </div>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={cashAccountId}
              onChange={(e) => setCashAccountId(e.target.value)}
            >
              <option value="">انتخاب…</option>
              {(cashAccounts ?? []).map((c) => (
                <option key={c.cash_account_id} value={c.cash_account_id}>
                  {toFaDigits(c.code)} — {c.name}
                  {c.cash_kind === "PETTY_CASH" ? " (تنخواه)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">طرف حساب</label>
            <Input
              className="h-9"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              placeholder="نام شخص یا شرکت"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">شرح</label>
            <Input
              className="h-9"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="شرح سند"
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              id="autoPost"
              type="checkbox"
              checked={autoPost}
              onChange={(e) => setAutoPost(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="autoPost" className="text-sm">
              همزمان در دفتر کل ثبت شود
            </label>
          </div>
          {autoPost ? (
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground">
                حساب مقابل
              </label>
              <select
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                value={offsetAccountId}
                onChange={(e) => setOffsetAccountId(e.target.value)}
              >
                <option value="">انتخاب حساب…</option>
                {postableAccounts.map((a) => (
                  <option key={a.account_id} value={a.account_id}>
                    {toFaDigits(a.account_code)} — {a.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
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
            {autoPost ? "ذخیره و ثبت در دفتر" : "ذخیره پیش‌نویس"}
          </Button>
        </div>
        <CashAccountDialog
          open={cashDialogOpen}
          onOpenChange={setCashDialogOpen}
          cashCode={cashCode}
          setCashCode={setCashCode}
          cashName={cashName}
          setCashName={setCashName}
          cashKind={cashKind}
          setCashKind={setCashKind}
          cashGlId={cashGlId}
          setCashGlId={setCashGlId}
          cashError={cashError}
          postableAccounts={postableAccounts}
          pending={createCashMut.isPending}
          onSave={() => void saveCashAccount()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="اسناد خزانه"
        description="دریافت و پرداخت نقدی / بانکی"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "خزانه" },
        ]}
        actions={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={openCashDialog}>
                <Landmark className="h-4 w-4 ml-1" />
                حساب نقدی
              </Button>
              <Button size="sm" onClick={openNew}>
                <Plus className="h-4 w-4 ml-1" />
                سند جدید
              </Button>
            </div>
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
            <option value="">همه ({toFaDigits(statusCounts.all)})</option>
            <option value="DRAFT">
              پیش‌نویس ({toFaDigits(statusCounts.DRAFT)})
            </option>
            <option value="POSTED">
              ثبت‌شده ({toFaDigits(statusCounts.POSTED)})
            </option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">نوع</label>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">همه</option>
            <option value="RECEIPT">دریافت</option>
            <option value="PAYMENT">پرداخت</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">حساب نقدی</label>
          <select
            className="h-9 min-w-[140px] rounded-md border bg-background px-2 text-sm"
            value={cashFilter}
            onChange={(e) => setCashFilter(e.target.value)}
          >
            <option value="">همه</option>
            {(cashAccounts ?? []).map((c) => (
              <option key={c.cash_account_id} value={c.cash_account_id}>
                {toFaDigits(c.code)} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">از تاریخ</label>
          <ShamsiDatePicker
            value={dateFrom}
            onChange={setDateFrom}
            className="h-9 w-[140px]"
            placeholder="از"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">تا تاریخ</label>
          <ShamsiDatePicker
            value={dateTo}
            onChange={setDateTo}
            className="h-9 w-[140px]"
            placeholder="تا"
          />
        </div>
        <div className="space-y-1 flex-1 min-w-[140px]">
          <label className="text-xs text-muted-foreground">جستجو</label>
          <Input
            className="h-9"
            placeholder="شماره، طرف حساب یا شرح…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-xl border bg-card px-3 py-2 space-y-0.5">
          <div className="text-[11px] text-muted-foreground">تعداد</div>
          <div className="font-mono text-sm font-medium">
            {toFaDigits(filteredTotals.count)}
          </div>
        </div>
        <div className="rounded-xl border bg-card px-3 py-2 space-y-0.5">
          <div className="text-[11px] text-muted-foreground">جمع دریافت</div>
          <div className="font-mono text-sm font-medium text-emerald-700">
            {formatMoney(filteredTotals.receipt)}
          </div>
        </div>
        <div className="rounded-xl border bg-card px-3 py-2 space-y-0.5">
          <div className="text-[11px] text-muted-foreground">جمع پرداخت</div>
          <div className="font-mono text-sm font-medium text-rose-700">
            {formatMoney(filteredTotals.payment)}
          </div>
        </div>
        <div className="rounded-xl border bg-card px-3 py-2 space-y-0.5">
          <div className="text-[11px] text-muted-foreground">خالص</div>
          <div className="font-mono text-sm font-medium">
            {formatMoney(filteredTotals.net)}
          </div>
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
            <Wallet className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              سند خزانه‌ای ثبت نشده است.
            </p>
            {canManage ? (
              <Button size="sm" onClick={openNew}>
                <Plus className="h-4 w-4 ml-1" />
                ثبت اولین سند
              </Button>
            ) : null}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">شماره</th>
                <th className="px-3 py-2 font-medium">تاریخ</th>
                <th className="px-3 py-2 font-medium">نوع</th>
                <th className="px-3 py-2 font-medium">وضعیت</th>
                <th className="px-3 py-2 font-medium">حساب نقدی</th>
                <th className="px-3 py-2 font-medium">طرف حساب</th>
                <th className="px-3 py-2 font-medium">مبلغ</th>
                <th className="px-3 py-2 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={d.treasury_document_id}
                  className="border-b border-border/50 hover:bg-muted/40"
                >
                  <td className="px-3 py-2 font-mono text-xs">
                    {d.document_number ? toFaDigits(d.document_number) : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {formatJalaliDate(d.document_date)}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {typeLabel[d.document_type] ?? d.document_type}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                        statusChip[d.status] ?? "bg-muted"
                      )}
                    >
                      {statusLabel[d.status] ?? d.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs max-w-[140px] truncate">
                    {cashLabel.get(d.cash_account_id) ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs max-w-[120px] truncate">
                    {d.counterparty_name ?? "—"}
                  </td>
                  <td
                    className={
                      d.document_type === "RECEIPT"
                        ? "px-3 py-2 font-mono text-xs text-emerald-700"
                        : "px-3 py-2 font-mono text-xs text-rose-700"
                    }
                  >
                    {formatMoney(Number(d.amount || 0))}
                  </td>
                  <td className="px-3 py-2">
                    {d.status === "DRAFT" && canPost ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-8"
                        onClick={() => {
                          setPostTarget(d);
                          setPostOffset("");
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 ml-1" />
                        ثبت در دفتر
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog
        open={!!postTarget}
        onOpenChange={(o) => !o && setPostTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ثبت در دفتر کل</DialogTitle>
            <DialogDescription>
              حساب مقابل را انتخاب کنید تا سند خزانه به دفتر منتقل شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-2">
            <label className="text-xs text-muted-foreground">حساب مقابل</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={postOffset}
              onChange={(e) => setPostOffset(e.target.value)}
            >
              <option value="">انتخاب…</option>
              {postableAccounts.map((a) => (
                <option key={a.account_id} value={a.account_id}>
                  {toFaDigits(a.account_code)} — {a.name}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPostTarget(null)}>
              انصراف
            </Button>
            <Button
              disabled={postMut.isPending || !postOffset}
              onClick={() => {
                if (!postTarget || !postOffset) return;
                void postMut
                  .mutateAsync({
                    id: postTarget.treasury_document_id,
                    offset_account_id: postOffset,
                  })
                  .then(() => {
                    setMsg("سند در دفتر کل ثبت شد.");
                    setPostTarget(null);
                  })
                  .catch((e) => {
                    setMsg(
                      e instanceof ApiClientError
                        ? e.message
                        : e instanceof Error
                          ? e.message
                          : "ثبت ناموفق بود"
                    );
                  });
              }}
            >
              {postMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              ) : null}
              تأیید ثبت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CashAccountDialog
        open={cashDialogOpen}
        onOpenChange={setCashDialogOpen}
        cashCode={cashCode}
        setCashCode={setCashCode}
        cashName={cashName}
        setCashName={setCashName}
        cashKind={cashKind}
        setCashKind={setCashKind}
        cashGlId={cashGlId}
        setCashGlId={setCashGlId}
        cashError={cashError}
        postableAccounts={postableAccounts}
        pending={createCashMut.isPending}
        onSave={() => void saveCashAccount()}
      />
    </div>
  );
}

function CashAccountDialog({
  open,
  onOpenChange,
  cashCode,
  setCashCode,
  cashName,
  setCashName,
  cashKind,
  setCashKind,
  cashGlId,
  setCashGlId,
  cashError,
  postableAccounts,
  pending,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cashCode: string;
  setCashCode: (v: string) => void;
  cashName: string;
  setCashName: (v: string) => void;
  cashKind: "BANK" | "PETTY_CASH";
  setCashKind: (v: "BANK" | "PETTY_CASH") => void;
  cashGlId: string;
  setCashGlId: (v: string) => void;
  cashError: string | null;
  postableAccounts: Array<{
    account_id: string;
    account_code: string;
    name: string;
  }>;
  pending: boolean;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعریف حساب نقدی / بانکی</DialogTitle>
          <DialogDescription>
            به یک حساب تفصیلی قابل‌ثبت در دفتر کل وصل می‌شود.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">کد</label>
            <Input
              className="h-9 font-mono"
              value={cashCode}
              onChange={(e) => setCashCode(e.target.value)}
              placeholder="مثلاً ۱۰۰۱"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">نام</label>
            <Input
              className="h-9"
              value={cashName}
              onChange={(e) => setCashName(e.target.value)}
              placeholder="صندوق اصلی / بانک ملی"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">نوع</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={cashKind}
              onChange={(e) =>
                setCashKind(e.target.value as "BANK" | "PETTY_CASH")
              }
            >
              <option value="BANK">{kindLabel.BANK}</option>
              <option value="PETTY_CASH">{kindLabel.PETTY_CASH}</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">حساب دفتر کل</label>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={cashGlId}
              onChange={(e) => setCashGlId(e.target.value)}
            >
              <option value="">انتخاب…</option>
              {postableAccounts.map((a) => (
                <option key={a.account_id} value={a.account_id}>
                  {toFaDigits(a.account_code)} — {a.name}
                </option>
              ))}
            </select>
          </div>
          {cashError ? (
            <p className="text-sm text-destructive">{cashError}</p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button disabled={pending} onClick={onSave}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
            ثبت حساب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
