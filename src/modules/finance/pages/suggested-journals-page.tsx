"use client";

import { Fragment, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Inbox, ChevronDown, ChevronLeft, Check, X } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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
import { suggestedJournalService } from "../services/suggested-journal-service";
import {
  FinancePermissions,
  type SuggestedJournalDto,
  type SuggestedJournalLineDto,
} from "../types";
import { ApiClientError } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";

const statusFa: Record<string, string> = {
  PENDING: "در انتظار بررسی",
  ACCEPTED: "پذیرفته‌شده",
  REJECTED: "ردشده",
};

const statusChip: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  ACCEPTED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-800 border-rose-200",
};

function formatMoney(n: number): string {
  return toFaDigits(
    n.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

function lineDebit(l: SuggestedJournalLineDto): number {
  return Number(l.debit_amount || 0);
}
function lineCredit(l: SuggestedJournalLineDto): number {
  return Number(l.credit_amount || 0);
}

export function SuggestedJournalsPage() {
  const canView = usePermission(FinancePermissions.suggestView);
  const canDecide = usePermission(FinancePermissions.suggestDecide);
  const qc = useQueryClient();
  const { data: companies } = useCompanies();
  const { data: accountsFlat } = useAccountFlat();

  const accountLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of accountsFlat ?? []) {
      m.set(a.account_id, `${toFaDigits(a.account_code)} — ${a.name}`);
    }
    return m;
  }, [accountsFlat]);

  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    const p = list.find((c) => c.is_primary) ?? list[0];
    return p?.company_id ?? null;
  }, [companies]);

  const [companyId, setCompanyId] = useState("");
  const [status, setStatus] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const effectiveCompany = companyId || primaryCompanyId;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["finance", "suggested", effectiveCompany, status],
    queryFn: () =>
      suggestedJournalService.list({
        company_id: effectiveCompany ?? undefined,
        status: status === "ALL" ? "ALL" : status,
      }),
    enabled: canView,
  });

  const filtered = useMemo(() => {
    let list = data ?? [];
    const q = search.trim();
    if (q) {
      list = list.filter(
        (s) =>
          (s.description ?? "").includes(q) ||
          (s.source_event_type ?? "").includes(q) ||
          (s.source_document_id ?? "").includes(q)
      );
    }
    return list;
  }, [data, search]);

  const [acceptTarget, setAcceptTarget] = useState<SuggestedJournalDto | null>(
    null
  );
  const [rejectTarget, setRejectTarget] = useState<SuggestedJournalDto | null>(
    null
  );
  const [note, setNote] = useState("");
  const [decideError, setDecideError] = useState<string | null>(null);

  const acceptMut = useMutation({
    mutationFn: ({ id, note: n }: { id: string; note?: string }) =>
      suggestedJournalService.accept(id, n),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance", "suggested"] });
    },
  });

  const rejectMut = useMutation({
    mutationFn: ({ id, note: n }: { id: string; note?: string }) =>
      suggestedJournalService.reject(id, n),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["finance", "suggested"] });
    },
  });

  async function doAccept() {
    if (!acceptTarget) return;
    setDecideError(null);
    try {
      await acceptMut.mutateAsync({
        id: acceptTarget.suggested_journal_id,
        note: note.trim() || undefined,
      });
      setMsg(
        "پیشنهاد پذیرفته شد و پیش‌نویس سند ساخته شد (هنوز ثبت قطعی نشده)."
      );
      setAcceptTarget(null);
      setNote("");
    } catch (e) {
      setDecideError(
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "قبول ناموفق بود"
      );
    }
  }

  async function doReject() {
    if (!rejectTarget) return;
    setDecideError(null);
    if (!note.trim()) {
      setDecideError("برای رد پیشنهاد، دلیل را بنویسید.");
      return;
    }
    try {
      await rejectMut.mutateAsync({
        id: rejectTarget.suggested_journal_id,
        note: note.trim(),
      });
      setMsg("پیشنهاد رد شد.");
      setRejectTarget(null);
      setNote("");
    } catch (e) {
      setDecideError(
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "رد ناموفق بود"
      );
    }
  }

  function totals(s: SuggestedJournalDto) {
    const lines = s.lines ?? [];
    let d = 0;
    let c = 0;
    for (const l of lines) {
      d += lineDebit(l);
      c += lineCredit(l);
    }
    return { d, c };
  }

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">
        مجوز مشاهده پیشنهادهای سند را ندارید.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="صندوق پیشنهادها"
        description="رویداد عملیاتی → پیش‌نویس پیشنهادی؛ قبول فقط سند پیش‌نویس می‌سازد (بدون ثبت قطعی)"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "پیشنهادها" },
        ]}
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
          <label className="text-xs text-muted-foreground">وضعیت</label>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="PENDING">در انتظار</option>
            <option value="ACCEPTED">پذیرفته‌شده</option>
            <option value="REJECTED">ردشده</option>
            <option value="ALL">همه</option>
          </select>
        </div>
        <div className="space-y-1 flex-1 min-w-[140px]">
          <label className="text-xs text-muted-foreground">جستجو</label>
          <Input
            className="h-9"
            placeholder="شرح یا نوع رویداد…"
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
          <div className="p-8 text-center space-y-2">
            <Inbox className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              پیشنهادی در این فیلتر نیست.
            </p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              وقتی رویداد عملیاتی (فروش، خرید، خزانه و …) پیشنهاد سند بسازد، اینجا
              برای بررسی حسابدار ظاهر می‌شود. قبول = ساخت پیش‌نویس در اسناد؛ ثبت
              قطعی جداگانه از صفحه اسناد انجام می‌شود.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-2 py-2 w-8" />
                <th className="px-3 py-2 font-medium">منبع</th>
                <th className="px-3 py-2 font-medium">شرح</th>
                <th className="px-3 py-2 font-medium">سطرها</th>
                <th className="px-3 py-2 font-medium">بدهکار</th>
                <th className="px-3 py-2 font-medium">بستانکار</th>
                <th className="px-3 py-2 font-medium">وضعیت</th>
                <th className="px-3 py-2 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const id = s.suggested_journal_id;
                const open = !!expanded[id];
                const { d, c } = totals(s);
                const lineCount = s.lines?.length ?? 0;
                return (
                  <Fragment key={id}>
                    <tr className="border-b border-border/50 hover:bg-muted/40">
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-muted"
                          onClick={() =>
                            setExpanded((prev) => ({
                              ...prev,
                              [id]: !prev[id],
                            }))
                          }
                          aria-label="جزئیات سطرها"
                        >
                          {open ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronLeft className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-xs max-w-[120px] truncate font-mono">
                        {s.source_event_type || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs max-w-[180px] truncate">
                        {s.description || "—"}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {toFaDigits(lineCount)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {formatMoney(d)}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">
                        {formatMoney(c)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                            statusChip[s.status] ?? "bg-muted"
                          )}
                        >
                          {statusFa[s.status] ?? s.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {s.status === "PENDING" && canDecide ? (
                          <div className="flex flex-wrap gap-1">
                            <Button
                              size="sm"
                              className="h-7 text-[11px]"
                              disabled={acceptMut.isPending}
                              onClick={() => {
                                setAcceptTarget(s);
                                setNote("");
                                setDecideError(null);
                              }}
                            >
                              <Check className="h-3.5 w-3.5 ml-0.5" />
                              قبول
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px]"
                              disabled={rejectMut.isPending}
                              onClick={() => {
                                setRejectTarget(s);
                                setNote("");
                                setDecideError(null);
                              }}
                            >
                              <X className="h-3.5 w-3.5 ml-0.5" />
                              رد
                            </Button>
                          </div>
                        ) : s.journal_entry_id ? (
                          <span className="text-[10px] text-muted-foreground font-mono">
                            پیش‌نویس ساخته شد
                          </span>
                        ) : s.decision_note ? (
                          <span
                            className="text-[10px] text-muted-foreground max-w-[120px] truncate block"
                            title={s.decision_note}
                          >
                            {s.decision_note}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                    {open ? (
                      <tr className="bg-muted/20">
                        <td colSpan={8} className="px-4 py-2">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-muted-foreground">
                                <th className="py-1 text-right font-medium">
                                  حساب
                                </th>
                                <th className="py-1 text-right font-medium">
                                  نقش / دلیل
                                </th>
                                <th className="py-1 text-right font-medium">
                                  بدهکار
                                </th>
                                <th className="py-1 text-right font-medium">
                                  بستانکار
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(s.lines ?? []).map((l, i) => (
                                <tr
                                  key={l.suggested_line_id ?? i}
                                  className="border-t border-border/40"
                                >
                                  <td className="py-1.5">
                                    {accountLabel.get(l.account_id) ??
                                      l.account_id.slice(0, 8)}
                                  </td>
                                  <td className="py-1.5 text-muted-foreground">
                                    {l.line_role || l.suggestion_reason || "—"}
                                  </td>
                                  <td className="py-1.5 font-mono">
                                    {lineDebit(l) > 0
                                      ? formatMoney(lineDebit(l))
                                      : "—"}
                                  </td>
                                  <td className="py-1.5 font-mono">
                                    {lineCredit(l) > 0
                                      ? formatMoney(lineCredit(l))
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog
        open={!!acceptTarget}
        onOpenChange={(o) => !o && setAcceptTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>قبول پیشنهاد</DialogTitle>
            <DialogDescription>
              یک پیش‌نویس در اسناد حسابداری ساخته می‌شود. ثبت قطعی را بعداً از
              صفحه اسناد انجام دهید.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-2">
            <label className="text-xs text-muted-foreground">یادداشت (اختیاری)</label>
            <Input
              className="h-9"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="توضیح برای تاریخچه تصمیم"
            />
            {decideError ? (
              <p className="text-sm text-destructive">{decideError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptTarget(null)}>
              انصراف
            </Button>
            <Button disabled={acceptMut.isPending} onClick={() => void doAccept()}>
              {acceptMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              ) : null}
              تأیید قبول
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رد پیشنهاد</DialogTitle>
            <DialogDescription>
              پیشنهاد از صف خارج می‌شود و پیش‌نویس ساخته نمی‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 py-2">
            <label className="text-xs text-muted-foreground">دلیل رد</label>
            <Input
              className="h-9"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="الزامی"
            />
            {decideError ? (
              <p className="text-sm text-destructive">{decideError}</p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              انصراف
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMut.isPending}
              onClick={() => void doReject()}
            >
              {rejectMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              ) : null}
              تأیید رد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
