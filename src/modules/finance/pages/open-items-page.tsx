"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, X } from "lucide-react";
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
  openItemService,
  type CreateOpenItemPayload,
} from "../services/open-item-service";
import {
  AGING_BUCKET_LABELS,
  FinancePermissions,
  type OpenItemDto,
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

const statusFa: Record<string, string> = {
  OPEN: "باز",
  PARTIAL: "نیمه‌تسویه",
  CLOSED: "تسویه",
  CANCELLED: "ابطال",
};

const statusChip: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-800 border-amber-200",
  PARTIAL: "bg-sky-50 text-sky-800 border-sky-200",
  CLOSED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-200",
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

/** فیلدهای واقعی API (بک‌اند counterparty_name / side / due_date) */
type OpenRow = OpenItemDto & {
  side?: string;
  counterparty_name?: string | null;
  document_number?: string | null;
  due_date?: string | null;
  description?: string | null;
};

function partyName(r: OpenRow): string {
  return r.counterparty_name || r.party_name || "—";
}

export function OpenItemsPage() {
  const canViewAr = usePermission(FinancePermissions.arView);
  const canViewAp = usePermission(FinancePermissions.apView);
  const canManageAr = usePermission(FinancePermissions.arManage);
  const canManageAp = usePermission(FinancePermissions.apManage);
  const canView = canViewAr || canViewAp;

  const qc = useQueryClient();
  const { data: companies } = useCompanies();

  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    const p = list.find((c) => c.is_primary) ?? list[0];
    return p?.company_id ?? null;
  }, [companies]);

  const [companyId, setCompanyId] = useState("");
  const [side, setSide] = useState<"AR" | "AP">("AR");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const effectiveCompany = companyId || primaryCompanyId;

  const canManage = side === "AR" ? canManageAr : canManageAp;

  const listQ = useQuery({
    queryKey: ["finance", "open-items", effectiveCompany, side],
    queryFn: () => openItemService.list(effectiveCompany!, side),
    enabled: canView && Boolean(effectiveCompany),
  });

  const agingQ = useQuery({
    queryKey: ["finance", "aging", effectiveCompany, side],
    queryFn: () => openItemService.aging(effectiveCompany!, side),
    enabled: canView && Boolean(effectiveCompany),
  });

  const rows = useMemo(() => {
    let list = (listQ.data ?? []) as OpenRow[];
    const q = search.trim();
    if (q) {
      list = list.filter(
        (r) =>
          partyName(r).includes(q) ||
          (r.document_number ?? "").includes(q) ||
          (r.description ?? "").includes(q)
      );
    }
    return list;
  }, [listQ.data, search]);

  const totalOpen = useMemo(
    () => rows.reduce((s, r) => s + Number(r.open_amount || 0), 0),
    [rows]
  );

  const [formOpen, setFormOpen] = useState(false);
  const [documentDate, setDocumentDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState(todayIso());
  const [counterparty, setCounterparty] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [allocTarget, setAllocTarget] = useState<OpenRow | null>(null);
  const [allocAmount, setAllocAmount] = useState("");
  const [allocDate, setAllocDate] = useState(todayIso());
  const [allocError, setAllocError] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (payload: CreateOpenItemPayload) =>
      openItemService.create(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance", "open-items"] });
      void qc.invalidateQueries({ queryKey: ["finance", "aging"] });
    },
  });

  const allocateMut = useMutation({
    mutationFn: ({
      id,
      amount: amt,
      allocation_date,
    }: {
      id: string;
      amount: number;
      allocation_date?: string;
    }) =>
      openItemService.allocate(id, {
        amount: amt,
        allocation_date,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance", "open-items"] });
      void qc.invalidateQueries({ queryKey: ["finance", "aging"] });
    },
  });

  function openNew() {
    setFormOpen(true);
    setDocumentDate(todayIso());
    setDueDate(todayIso());
    setCounterparty("");
    setDocNumber("");
    setAmount("");
    setDescription("");
    setFormError(null);
    setMsg(null);
  }

  async function saveForm() {
    setFormError(null);
    if (!effectiveCompany) {
      setFormError("شرکت را انتخاب کنید.");
      return;
    }
    if (!counterparty.trim()) {
      setFormError("نام طرف حساب الزامی است.");
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
    try {
      await createMut.mutateAsync({
        company_id: effectiveCompany,
        side,
        document_date: documentDate,
        due_date: dueDate || undefined,
        counterparty_name: counterparty.trim(),
        original_amount: amt,
        document_number: docNumber.trim() || undefined,
        document_type: "MANUAL_INVOICE",
        description: description.trim() || undefined,
      });
      setMsg(
        side === "AR"
          ? "فاکتور فروش (بدهکار) ثبت شد."
          : "فاکتور خرید (بستانکار) ثبت شد."
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

  async function saveAllocate() {
    setAllocError(null);
    if (!allocTarget) return;
    const amt = parseAmount(allocAmount);
    const open = Number(allocTarget.open_amount || 0);
    if (amt <= 0) {
      setAllocError("مبلغ تخصیص باید بزرگ‌تر از صفر باشد.");
      return;
    }
    if (amt > open + 0.0001) {
      setAllocError("مبلغ نمی‌تواند از مانده باز بیشتر باشد.");
      return;
    }
    try {
      await allocateMut.mutateAsync({
        id: allocTarget.open_item_id,
        amount: amt,
        allocation_date: allocDate || undefined,
      });
      setMsg("تخصیص انجام شد.");
      setAllocTarget(null);
    } catch (e) {
      setAllocError(
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "تخصیص ناموفق بود"
      );
    }
  }

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">
        مجوز مشاهده حساب‌های باز (AR/AP) را ندارید.
      </div>
    );
  }

  if (formOpen) {
    return (
      <div className="space-y-4 pb-20">
        <PageHeader
          title={side === "AR" ? "فاکتور فروش (بدهکار)" : "فاکتور خرید (بستانکار)"}
          description="ثبت دستی بدهی باز برای پیگیری وصول/پرداخت"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "حسابداری", href: "/dashboard/finance" },
            { label: "حساب‌های باز", href: "/dashboard/finance/open-items" },
            { label: "جدید" },
          ]}
        />

        <div className="grid gap-3 sm:grid-cols-2 rounded-xl border bg-card p-4">
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">طرف حساب</label>
            <Input
              className="h-9"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              placeholder={
                side === "AR" ? "نام مشتری" : "نام تأمین‌کننده"
              }
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">شماره سند</label>
            <Input
              className="h-9 font-mono"
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="اختیاری"
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
            <label className="text-xs text-muted-foreground">تاریخ سند</label>
            <ShamsiDatePicker
              value={documentDate}
              onChange={setDocumentDate}
              className="h-9 w-full"
              placeholder="تاریخ سند"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">سررسید</label>
            <ShamsiDatePicker
              value={dueDate}
              onChange={setDueDate}
              className="h-9 w-full"
              placeholder="سررسید"
            />
          </div>
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
            ثبت
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="حساب‌های باز"
        description="بدهکاران و بستانکاران — فاکتور دستی و گزارش عمر بدهی"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "حساب‌های باز" },
        ]}
        actions={
          canManage ? (
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 ml-1" />
              فاکتور دستی
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
            value={effectiveCompany ?? ""}
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
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">نوع</label>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={side === "AR" ? "default" : "outline"}
              disabled={!canViewAr}
              onClick={() => setSide("AR")}
            >
              بدهکاران (AR)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={side === "AP" ? "default" : "outline"}
              disabled={!canViewAp}
              onClick={() => setSide("AP")}
            >
              بستانکاران (AP)
            </Button>
          </div>
        </div>
        <div className="space-y-1 flex-1 min-w-[140px]">
          <label className="text-xs text-muted-foreground">جستجو</label>
          <Input
            className="h-9"
            placeholder="طرف حساب یا شماره…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground pb-1">
          مانده باز کل:{" "}
          <span className="font-mono font-medium text-foreground">
            {formatMoney(totalOpen)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(agingQ.data ?? []).map((b) => (
          <div
            key={b.bucket}
            className="rounded-xl border bg-card px-3 py-2 space-y-0.5"
          >
            <div className="text-[11px] text-muted-foreground">
              {AGING_BUCKET_LABELS[b.bucket] ?? b.bucket}
            </div>
            <div className="font-mono text-sm font-medium">
              {formatMoney(Number(b.amount || 0))}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {toFaDigits(b.count)} مورد
            </div>
          </div>
        ))}
        {agingQ.isLoading ? (
          <div className="col-span-full flex items-center gap-2 text-xs text-muted-foreground p-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> بارگذاری عمر بدهی…
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        {listQ.isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : listQ.error ? (
          <div className="p-4 text-sm text-destructive">
            خطا.{" "}
            <button
              type="button"
              className="underline"
              onClick={() => void listQ.refetch()}
            >
              تلاش مجدد
            </button>
          </div>
        ) : !rows.length ? (
          <div className="p-6 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              مورد بازی برای این فیلتر ثبت نشده است.
            </p>
            {canManage ? (
              <Button size="sm" onClick={openNew}>
                <Plus className="h-4 w-4 ml-1" />
                ثبت فاکتور دستی
              </Button>
            ) : null}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">طرف حساب</th>
                <th className="px-3 py-2 font-medium">شماره</th>
                <th className="px-3 py-2 font-medium">تاریخ</th>
                <th className="px-3 py-2 font-medium">سررسید</th>
                <th className="px-3 py-2 font-medium">مبلغ اصلی</th>
                <th className="px-3 py-2 font-medium">مانده باز</th>
                <th className="px-3 py-2 font-medium">وضعیت</th>
                <th className="px-3 py-2 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const open = Number(r.open_amount || 0);
                const canAlloc =
                  canManage &&
                  open > 0 &&
                  (r.status === "OPEN" || r.status === "PARTIAL");
                return (
                  <tr
                    key={r.open_item_id}
                    className="border-b border-border/50 hover:bg-muted/40"
                  >
                    <td className="px-3 py-2 text-xs max-w-[140px] truncate">
                      {partyName(r)}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {r.document_number
                        ? toFaDigits(r.document_number)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {formatJalaliDate(r.document_date)}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.due_date ? formatJalaliDate(r.due_date) : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {formatMoney(Number(r.original_amount || 0))}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs font-medium">
                      {formatMoney(open)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                          statusChip[r.status] ?? "bg-muted"
                        )}
                      >
                        {statusFa[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {canAlloc ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-[11px]"
                          onClick={() => {
                            setAllocTarget(r);
                            setAllocAmount(String(open));
                            setAllocDate(todayIso());
                            setAllocError(null);
                          }}
                        >
                          تخصیص
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog
        open={!!allocTarget}
        onOpenChange={(o) => !o && setAllocTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تخصیص / تسویه جزئی</DialogTitle>
            <DialogDescription>
              {allocTarget
                ? `${partyName(allocTarget)} — مانده: ${formatMoney(Number(allocTarget.open_amount || 0))}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">مبلغ تخصیص</label>
              <Input
                className="h-9 font-mono text-left"
                dir="ltr"
                inputMode="decimal"
                value={allocAmount ? toFaDigits(allocAmount) : ""}
                onChange={(e) =>
                  setAllocAmount(
                    toAsciiDigits(e.target.value).replace(/[^\d.]/g, "")
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">تاریخ</label>
              <ShamsiDatePicker
                value={allocDate}
                onChange={setAllocDate}
                className="h-9 w-full"
                placeholder="تاریخ تخصیص"
              />
            </div>
            {allocError ? (
              <p className="text-sm text-destructive">{allocError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocTarget(null)}>
              انصراف
            </Button>
            <Button
              disabled={allocateMut.isPending}
              onClick={() => void saveAllocate()}
            >
              {allocateMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              ) : null}
              تأیید تخصیص
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
