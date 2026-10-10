"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Undo2,
  Pencil,
  X,
  FileText,
  Search,
  Link2,
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
  costCenterService,
  businessUnitService,
  type CostCenterDto,
  type BusinessUnitDto,
} from "@/modules/organization/services/org-extended-service";
import {
  useJournals,
  usePostJournal,
  useReverseJournal,
  useDeleteJournal,
} from "../hooks/use-journals";
import { useAccountFlat } from "../hooks/use-accounts";
import { journalService } from "../services/journal-service";
import {
  FinancePermissions,
  DEMO_PERIOD_ID,
  type JournalEntryDto,
  type JournalItemDto,
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

const statusLabel: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  POSTED: "ثبت‌شده",
  REVERSED: "برگشت‌خورده",
};

const statusChip: Record<string, string> = {
  DRAFT: "bg-amber-50 text-amber-800 border-amber-200",
  POSTED: "bg-emerald-50 text-emerald-800 border-emerald-200",
  REVERSED: "bg-slate-100 text-slate-600 border-slate-200",
};

type LineForm = {
  key: string;
  account_id: string;
  debit: string;
  credit: string;
  description: string;
  cost_center_id: string;
  business_unit_id: string;
};

function emptyLine(desc = ""): LineForm {
  return {
    key: Math.random().toString(36).slice(2),
    account_id: "",
    debit: "",
    credit: "",
    description: desc,
    cost_center_id: "",
    business_unit_id: "",
  };
}

function periodLabel(id?: string | null): string {
  if (!id) return "—";
  if (id === DEMO_PERIOD_ID) return "دوره جاری (دمو)";
  return toFaDigits(id.slice(0, 8));
}

function parseAmount(raw: string): number {
  const n = Number(toAsciiDigits(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(n: number): string {
  return toFaDigits(
    n.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

function sumLines(
  items: Array<{ debit_amount?: number | string; credit_amount?: number | string }> | undefined
) {
  let d = 0;
  let c = 0;
  for (const i of items ?? []) {
    d += Number(i.debit_amount || 0);
    c += Number(i.credit_amount || 0);
  }
  return { debit: d, credit: c };
}

function todayIso(): string {
  const n = new Date();
  const { jy, jm, jd } = toJalaliParts(n.getFullYear(), n.getMonth() + 1, n.getDate());
  return jalaliToIso(jy, jm, jd);
}

export function JournalsPage() {
  const canView = usePermission(FinancePermissions.journalView);
  const canCreate = usePermission(FinancePermissions.journalCreate);
  const canUpdate = usePermission(FinancePermissions.journalUpdate);
  const canDelete = usePermission(FinancePermissions.journalDelete);
  const canPost = usePermission(FinancePermissions.journalPost);
  const canReverse = usePermission(FinancePermissions.journalReverse);

  const { data: companies } = useCompanies();
  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    const p = list.find((c) => c.is_primary) ?? list[0];
    return p?.company_id ?? "";
  }, [companies]);

  const [statusFilter, setStatusFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      status: statusFilter || undefined,
      company_id: primaryCompanyId || undefined,
      period_id: periodFilter || undefined,
    }),
    [statusFilter, primaryCompanyId, periodFilter]
  );

  const { data, isLoading, error, refetch } = useJournals(filters);
  const { data: accountsFlat } = useAccountFlat();

  const [costCenters, setCostCenters] = useState<CostCenterDto[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitDto[]>([]);
  useEffect(() => {
    if (!primaryCompanyId) return;
    void costCenterService.list(primaryCompanyId).then(setCostCenters).catch(() => setCostCenters([]));
    void businessUnitService.list().then(setBusinessUnits).catch(() => setBusinessUnits([]));
  }, [primaryCompanyId]);

  const postableAccounts = useMemo(
    () => (accountsFlat ?? []).filter((a) => a.is_postable !== false),
    [accountsFlat]
  );

  const accountLabel = useCallback(
    (id: string) => {
      const a = postableAccounts.find((x) => x.account_id === id);
      if (!a) return id ? id.slice(0, 8) : "—";
      return `${toFaDigits(a.account_code)} — ${a.name}`;
    },
    [postableAccounts]
  );

  const filteredAccounts = useMemo(() => {
    const q = accountQuery.trim();
    if (!q) return postableAccounts;
    const ascii = toAsciiDigits(q);
    return postableAccounts.filter(
      (a) =>
        a.name.includes(q) ||
        String(a.account_code).includes(ascii) ||
        toFaDigits(a.account_code).includes(q)
    );
  }, [postableAccounts, accountQuery]);

  const postMut = usePostJournal();
  const reverseMut = useReverseJournal();
  const deleteMut = useDeleteJournal();

  const [formMode, setFormMode] = useState<"new" | string | null>(null);
  const [viewOnly, setViewOnly] = useState(false);
  const [documentDate, setDocumentDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<LineForm[]>([emptyLine(), emptyLine()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [entryNumber, setEntryNumber] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState(DEMO_PERIOD_ID);
  const [accountQuery, setAccountQuery] = useState("");
  const [dirty, setDirty] = useState(false);
  const [meta, setMeta] = useState<{
    reverses_entry_id?: string | null;
    reversed_by_entry_id?: string | null;
  }>({});

  const [reverseTarget, setReverseTarget] = useState<JournalEntryDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<JournalEntryDto | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim();
    let list = data ?? [];
    if (q) {
      list = list.filter(
        (j) =>
          (j.entry_number ?? "").includes(q) ||
          (j.description ?? "").includes(q) ||
          j.journal_entry_id.includes(q)
      );
    }
    if (dateFrom) list = list.filter((j) => (j.document_date ?? "").slice(0, 10) >= dateFrom);
    if (dateTo) list = list.filter((j) => (j.document_date ?? "").slice(0, 10) <= dateTo);
    return list;
  }, [data, search, dateFrom, dateTo]);

  const statusCounts = useMemo(() => {
    const all = data ?? [];
    return {
      all: all.length,
      DRAFT: all.filter((j) => j.status === "DRAFT").length,
      POSTED: all.filter((j) => j.status === "POSTED").length,
      REVERSED: all.filter((j) => j.status === "REVERSED").length,
    };
  }, [data]);

  const lineTotals = useMemo(() => {
    let d = 0;
    let c = 0;
    for (const l of lines) {
      d += parseAmount(l.debit);
      c += parseAmount(l.credit);
    }
    return { debit: d, credit: c, diff: Math.round((d - c) * 100) / 100 };
  }, [lines]);

  const isBalanced = lineTotals.debit > 0 && lineTotals.diff === 0;

  function openNew() {
    setFormMode("new");
    setViewOnly(false);
    setDocumentDate(todayIso());
    setPeriodId(DEMO_PERIOD_ID);
    setDescription("");
    setLines([emptyLine(), emptyLine()]);
    setFormError(null);
    setMsg(null);
    setEntryNumber(null);
    setAccountQuery("");
    setDirty(false);
    setMeta({});
  }

  function markDirty() {
    setDirty(true);
  }

  function closeForm() {
    if (dirty && !viewOnly) {
      if (!window.confirm("تغییرات ذخیره‌نشده دارید. خارج شوید؟")) return;
    }
    setFormMode(null);
    setDirty(false);
  }

  async function openEdit(j: JournalEntryDto, readonly: boolean) {
    setMsg(null);
    setFormError(null);
    setViewOnly(readonly || j.status !== "DRAFT");
    setFormMode(j.journal_entry_id);
    setEntryNumber(j.entry_number ?? null);
    try {
      const full = await journalService.getById(j.journal_entry_id);
      setDocumentDate(full.document_date?.slice(0, 10) || todayIso());
      setPeriodId(full.period_id || DEMO_PERIOD_ID);
      setDescription(full.description ?? "");
      setEntryNumber(full.entry_number ?? null);
      setDirty(false);
      setMeta({
        reverses_entry_id: full.reverses_entry_id,
        reversed_by_entry_id: full.reversed_by_entry_id,
      });
      const items = full.items ?? [];
      if (items.length === 0) {
        setLines([emptyLine(), emptyLine()]);
      } else {
        setLines(
          items.map((it) => ({
            key: it.journal_item_id ?? Math.random().toString(36).slice(2),
            account_id: it.account_id,
            debit: Number(it.debit_amount || 0) > 0 ? String(Number(it.debit_amount)) : "",
            credit:
              Number(it.credit_amount || 0) > 0 ? String(Number(it.credit_amount)) : "",
            description: it.description ?? "",
            cost_center_id: it.cost_center_id ?? "",
            business_unit_id: it.business_unit_id ?? "",
          }))
        );
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "خطا در بارگذاری سند");
      setFormMode(null);
    }
  }

  function openCopy(j: JournalEntryDto) {
    void (async () => {
      try {
        const full = await journalService.getById(j.journal_entry_id);
        setFormMode("new");
        setViewOnly(false);
        setDocumentDate(todayIso());
        setDescription(full.description ? `کپی: ${full.description}` : "کپی سند");
        setEntryNumber(null);
        const items = full.items ?? [];
        setPeriodId(full.period_id || DEMO_PERIOD_ID);
        setDirty(true);
        setMeta({});
        setLines(
          items.length
            ? items.map((it) => ({
                key: Math.random().toString(36).slice(2),
                account_id: it.account_id,
                debit:
                  Number(it.debit_amount || 0) > 0 ? String(Number(it.debit_amount)) : "",
                credit:
                  Number(it.credit_amount || 0) > 0
                    ? String(Number(it.credit_amount))
                    : "",
                description: it.description ?? "",
                cost_center_id: it.cost_center_id ?? "",
                business_unit_id: it.business_unit_id ?? "",
              }))
            : [emptyLine(), emptyLine()]
        );
        setFormError(null);
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "کپی ممکن نشد");
      }
    })();
  }

  function updateLine(key: string, patch: Partial<LineForm>) {
    markDirty();
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        const next = { ...l, ...patch };
        if (patch.debit !== undefined && parseAmount(patch.debit) > 0) next.credit = "";
        if (patch.credit !== undefined && parseAmount(patch.credit) > 0) next.debit = "";
        return next;
      })
    );
  }

  function addLine() {
    markDirty();
    setLines((prev) => [...prev, emptyLine(description)]);
  }

  function removeLine(key: string) {
    markDirty();
    setLines((prev) => (prev.length <= 2 ? prev : prev.filter((l) => l.key !== key)));
  }

  function fillBalanceOnLast() {
    if (lines.length === 0) return;
    const others = lines.slice(0, -1);
    let d = 0;
    let c = 0;
    for (const l of others) {
      d += parseAmount(l.debit);
      c += parseAmount(l.credit);
    }
    const diff = Math.round((d - c) * 100) / 100;
    if (diff === 0) return;
    markDirty();
    setLines((prev) => {
      const copy = [...prev];
      const i = copy.length - 1;
      if (diff > 0) {
        copy[i] = { ...copy[i], credit: String(Math.abs(diff)), debit: "" };
      } else {
        copy[i] = { ...copy[i], debit: String(Math.abs(diff)), credit: "" };
      }
      return copy;
    });
  }

  async function doSave(andPost: boolean) {
    setFormError(null);
    if (!primaryCompanyId) {
      setFormError("شرکت اصلی یافت نشد.");
      return;
    }
    if (!documentDate) {
      setFormError("تاریخ سند الزامی است.");
      return;
    }
    if (!periodId) {
      setFormError("دوره مالی الزامی است.");
      return;
    }
    const built = lines
      .map((l) => ({
        account_id: l.account_id,
        debit_amount: parseAmount(l.debit) || undefined,
        credit_amount: parseAmount(l.credit) || undefined,
        description: l.description.trim() || description.trim() || undefined,
        cost_center_id: l.cost_center_id || undefined,
        business_unit_id: l.business_unit_id || undefined,
      }))
      .filter((l) => l.account_id && (l.debit_amount || l.credit_amount));

    if (built.length < 2) {
      setFormError("حداقل دو آرتیکل با حساب و مبلغ لازم است.");
      return;
    }
    if (andPost) {
      const d = built.reduce((s, x) => s + (x.debit_amount || 0), 0);
      const c = built.reduce((s, x) => s + (x.credit_amount || 0), 0);
      if (Math.round((d - c) * 100) / 100 !== 0 || d <= 0) {
        setFormError("برای ثبت قطعی، سند باید تراز و مبلغ‌دار باشد.");
        return;
      }
    }
    setSaving(true);
    try {
      if (formMode === "new") {
        const created = await journalService.createDraft({
          company_id: primaryCompanyId,
          period_id: periodId,
          document_date: documentDate,
          description: description.trim() || undefined,
          lines: built,
        } as Parameters<typeof journalService.createDraft>[0]);
        if (andPost) {
          await journalService.post(created.journal_entry_id);
          setMsg("سند ذخیره و ثبت قطعی شد.");
        } else {
          setMsg("پیش‌نویس ذخیره شد.");
        }
      } else if (typeof formMode === "string") {
        await journalService.updateDraft(formMode, {
          document_date: documentDate,
          period_id: periodId,
          description: description.trim() || undefined,
          lines: built,
        });
        if (andPost) {
          await journalService.post(formMode);
          setMsg("سند به‌روز و ثبت قطعی شد.");
        } else {
          setMsg("پیش‌نویس به‌روز شد.");
        }
      }
      setDirty(false);
      setFormMode(null);
      await refetch();
    } catch (e) {
      setFormError(
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "ذخیره ناموفق بود"
      );
    } finally {
      setSaving(false);
    }
  }

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده اسناد را ندارید.</div>
    );
  }

  if (formMode !== null) {
    const title =
      formMode === "new"
        ? "سند حسابداری جدید"
        : viewOnly
          ? "مشاهده سند"
          : "ویرایش پیش‌نویس";

    return (
      <div className="space-y-4 pb-24">
        <PageHeader
          title={title}
          description="آرتیکل‌ها باید تراز باشند؛ شماره سند هنگام ثبت قطعی اختصاص می‌یابد"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "حسابداری", href: "/dashboard/finance" },
            { label: "اسناد", href: "/dashboard/finance/journals" },
            { label: formMode === "new" ? "جدید" : "جزئیات" },
          ]}
        />

        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">تاریخ سند</label>
            <ShamsiDatePicker
              value={documentDate}
              onChange={(v) => {
                markDirty();
                setDocumentDate(v);
              }}
              disabled={viewOnly}
              className="h-9 w-44"
              placeholder="انتخاب تاریخ"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">دوره مالی</label>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm min-w-[160px]"
              value={periodId}
              disabled={viewOnly}
              onChange={(e) => {
                markDirty();
                setPeriodId(e.target.value);
              }}
            >
              <option value={DEMO_PERIOD_ID}>دوره جاری (دمو)</option>
            </select>
          </div>
          <div className="space-y-1 flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">شرح سند</label>
            <Input
              className="h-9"
              placeholder="شرح کلی سند"
              value={description}
              disabled={viewOnly}
              onChange={(e) => { markDirty(); setDescription(e.target.value); }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">شماره</label>
            <div className="h-9 px-3 flex items-center rounded-md border bg-muted/40 text-xs text-muted-foreground font-mono">
              {entryNumber ? toFaDigits(entryNumber) : "پس از ثبت قطعی"}
            </div>
          </div>
        </div>

        {(meta.reverses_entry_id || meta.reversed_by_entry_id) && (
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex flex-wrap gap-3 items-center">
            <Link2 className="h-3.5 w-3.5" />
            {meta.reverses_entry_id ? <span>این سند برگشت است (از سند مبدأ)</span> : null}
            {meta.reversed_by_entry_id ? <span>این سند برگشت خورده است</span> : null}
          </div>
        )}

        {!viewOnly ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-9 pr-8 text-xs"
                placeholder="جستجوی حساب (کد یا نام)…"
                value={accountQuery}
                onChange={(e) => setAccountQuery(e.target.value)}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {toFaDigits(filteredAccounts.length)} حساب قابل ثبت
            </span>
          </div>
        ) : null}

        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground bg-muted/30">
                <th className="px-2 py-2 w-10">#</th>
                <th className="px-2 py-2 min-w-[200px]">حساب (تفصیلی)</th>
                <th className="px-2 py-2 min-w-[120px]">شرح سطر</th>
                <th className="px-2 py-2 w-28">بدهکار</th>
                <th className="px-2 py-2 w-28">بستانکار</th>
                {costCenters.length > 0 ? (
                  <th className="px-2 py-2 min-w-[120px]">مرکز هزینه</th>
                ) : null}
                {businessUnits.length > 0 ? (
                  <th className="px-2 py-2 min-w-[120px]">واحد کسب‌وکار</th>
                ) : null}
                {!viewOnly ? <th className="px-2 py-2 w-10" /> : null}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => (
                <tr key={l.key} className="border-b border-border/50 align-middle">
                  <td className="px-2 py-1.5 text-xs text-muted-foreground font-mono">
                    {toFaDigits(idx + 1)}
                  </td>
                  <td className="px-2 py-1.5">
                    {viewOnly ? (
                      <span className="text-xs">{accountLabel(l.account_id)}</span>
                    ) : (
                      <select
                        className="h-9 w-full rounded-md border bg-background px-2 text-xs"
                        value={l.account_id}
                        onChange={(e) => updateLine(l.key, { account_id: e.target.value })}
                      >
                        <option value="">انتخاب حساب…</option>
                        {filteredAccounts.map((a) => (
                          <option key={a.account_id} value={a.account_id}>
                            {toFaDigits(a.account_code)} — {a.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      className="h-9 text-xs"
                      value={l.description}
                      disabled={viewOnly}
                      placeholder={description || "شرح"}
                      onChange={(e) => updateLine(l.key, { description: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      className="h-9 text-xs font-mono text-left"
                      dir="ltr"
                      inputMode="decimal"
                      value={l.debit ? toFaDigits(l.debit) : ""}
                      disabled={viewOnly}
                      onChange={(e) =>
                        updateLine(l.key, {
                          debit: toAsciiDigits(e.target.value).replace(/[^\d.]/g, ""),
                        })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      className="h-9 text-xs font-mono text-left"
                      dir="ltr"
                      inputMode="decimal"
                      value={l.credit ? toFaDigits(l.credit) : ""}
                      disabled={viewOnly}
                      onChange={(e) =>
                        updateLine(l.key, {
                          credit: toAsciiDigits(e.target.value).replace(/[^\d.]/g, ""),
                        })
                      }
                    />
                  </td>
                  {costCenters.length > 0 ? (
                    <td className="px-2 py-1.5">
                      {viewOnly ? (
                        <span className="text-xs">
                          {costCenters.find((c) => c.cost_center_id === l.cost_center_id)?.name ?? "—"}
                        </span>
                      ) : (
                        <select
                          className="h-9 w-full rounded-md border bg-background px-2 text-xs"
                          value={l.cost_center_id}
                          onChange={(e) => updateLine(l.key, { cost_center_id: e.target.value })}
                        >
                          <option value="">—</option>
                          {costCenters.map((c) => (
                            <option key={c.cost_center_id} value={c.cost_center_id}>
                              {toFaDigits(c.code)} — {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  ) : null}
                  {businessUnits.length > 0 ? (
                    <td className="px-2 py-1.5">
                      {viewOnly ? (
                        <span className="text-xs">
                          {businessUnits.find((b) => b.business_unit_id === l.business_unit_id)?.name ?? "—"}
                        </span>
                      ) : (
                        <select
                          className="h-9 w-full rounded-md border bg-background px-2 text-xs"
                          value={l.business_unit_id}
                          onChange={(e) => updateLine(l.key, { business_unit_id: e.target.value })}
                        >
                          <option value="">—</option>
                          {businessUnits.map((b) => (
                            <option key={b.business_unit_id} value={b.business_unit_id}>
                              {toFaDigits(b.code)} — {b.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                  ) : null}
                  {!viewOnly ? (
                    <td className="px-1 py-1.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground"
                        disabled={lines.length <= 2}
                        onClick={() => removeLine(l.key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {!viewOnly ? (
            <div className="flex flex-wrap gap-2 p-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={addLine}>
                <Plus className="h-3.5 w-3.5 ml-1" />
                افزودن سطر
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={fillBalanceOnLast}>
                تراز آخرین سطر
              </Button>
            </div>
          ) : null}
        </div>

        {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                بدهکار:{" "}
                <strong className="font-mono">{formatMoney(lineTotals.debit)}</strong>
              </span>
              <span>
                بستانکار:{" "}
                <strong className="font-mono">{formatMoney(lineTotals.credit)}</strong>
              </span>
              <span
                className={cn(
                  "font-medium",
                  isBalanced ? "text-emerald-700" : "text-amber-700"
                )}
              >
                {isBalanced
                  ? "تراز ✓"
                  : `مانده: ${formatMoney(Math.abs(lineTotals.diff))}`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={closeForm}>
                <X className="h-4 w-4 ml-1" />
                بستن
              </Button>
              {!viewOnly ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void doSave(false)}
                  >
                    ذخیره پیش‌نویس
                  </Button>
                  {canPost ? (
                    <Button
                      type="button"
                      disabled={saving || !isBalanced}
                      onClick={() => void doSave(true)}
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-1" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 ml-1" />
                      )}
                      ذخیره و ثبت قطعی
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="اسناد حسابداری"
        description="پیش‌نویس، ثبت قطعی و برگشت — با کنترل تراز"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "اسناد" },
        ]}
        actions={
          canCreate ? (
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 ml-1" />
              سند جدید
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
            <option value="">همه ({toFaDigits(statusCounts.all)})</option>
            <option value="DRAFT">پیش‌نویس ({toFaDigits(statusCounts.DRAFT)})</option>
            <option value="POSTED">ثبت‌شده ({toFaDigits(statusCounts.POSTED)})</option>
            <option value="REVERSED">
              برگشت‌خورده ({toFaDigits(statusCounts.REVERSED)})
            </option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">دوره</label>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
          >
            <option value="">همه دوره‌ها</option>
            <option value={DEMO_PERIOD_ID}>دوره جاری (دمو)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">از تاریخ</label>
          <ShamsiDatePicker value={dateFrom} onChange={setDateFrom} className="h-9 w-40" placeholder="از" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">تا تاریخ</label>
          <ShamsiDatePicker value={dateTo} onChange={setDateTo} className="h-9 w-40" placeholder="تا" />
        </div>
        <div className="space-y-1 flex-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground">جستجو</label>
          <Input
            className="h-9"
            placeholder="شماره یا شرح…"
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
            <button type="button" className="underline" onClick={() => void refetch()}>
              تلاش مجدد
            </button>
          </div>
        ) : !filtered.length ? (
          <div className="p-6 text-center space-y-3">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">سندی ثبت نشده است.</p>
            {canCreate ? (
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
                <th className="px-3 py-2 font-medium">دوره</th>
                <th className="px-3 py-2 font-medium">وضعیت</th>
                <th className="px-3 py-2 font-medium">شرح</th>
                <th className="px-3 py-2 font-medium">بدهکار</th>
                <th className="px-3 py-2 font-medium">بستانکار</th>
                <th className="px-3 py-2 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => {
                const t = sumLines(j.items as JournalItemDto[] | undefined);
                return (
                  <tr
                    key={j.journal_entry_id}
                    className="border-b border-border/50 hover:bg-muted/40"
                  >
                    <td className="px-3 py-2 font-mono text-xs font-medium">
                      {j.entry_number ? toFaDigits(j.entry_number) : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {formatJalaliDate(j.document_date)}
                    </td>
                    <td className="px-3 py-2 text-xs">{periodLabel(j.period_id)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                          statusChip[j.status] ?? "bg-muted"
                        )}
                      >
                        {statusLabel[j.status] ?? j.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 max-w-[180px] truncate text-xs">
                      {j.description ?? "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {t.debit ? formatMoney(t.debit) : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {t.credit ? formatMoney(t.credit) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => void openEdit(j, j.status !== "DRAFT")}
                        >
                          {j.status === "DRAFT" && canUpdate ? (
                            <Pencil className="h-3.5 w-3.5" />
                          ) : (
                            "مشاهده"
                          )}
                        </Button>
                        {canCreate ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            title="کپی"
                            onClick={() => openCopy(j)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                        {j.status === "DRAFT" && canPost ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8"
                            disabled={postMut.isPending}
                            onClick={() =>
                              void postMut
                                .mutateAsync(j.journal_entry_id)
                                .then(() => setMsg("سند ثبت قطعی شد."))
                                .catch((e: Error) => setMsg(e.message))
                            }
                          >
                            ثبت قطعی
                          </Button>
                        ) : null}
                        {j.status === "POSTED" && canReverse ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8"
                            onClick={() => setReverseTarget(j)}
                          >
                            <Undo2 className="h-3.5 w-3.5 ml-1" />
                            برگشت
                          </Button>
                        ) : null}
                        {j.status === "DRAFT" && canDelete ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-destructive"
                            onClick={() => setDeleteTarget(j)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={!!reverseTarget} onOpenChange={(o) => !o && setReverseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>برگشت سند</DialogTitle>
            <DialogDescription>
              سند معکوس صادر می‌شود و سند اصلی برگشت‌خورده علامت می‌خورد.
              {reverseTarget?.entry_number
                ? ` شماره: ${toFaDigits(reverseTarget.entry_number)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseTarget(null)}>
              انصراف
            </Button>
            <Button
              disabled={reverseMut.isPending}
              onClick={() => {
                if (!reverseTarget) return;
                void reverseMut
                  .mutateAsync(reverseTarget.journal_entry_id)
                  .then(() => {
                    setMsg("سند برگشت صادر شد.");
                    setReverseTarget(null);
                  })
                  .catch((e: Error) => setMsg(e.message));
              }}
            >
              تأیید برگشت
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف پیش‌نویس</DialogTitle>
            <DialogDescription>فقط پیش‌نویس بدون ثبت قطعی حذف می‌شود.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              انصراف
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                void deleteMut
                  .mutateAsync(deleteTarget.journal_entry_id)
                  .then(() => {
                    setMsg("پیش‌نویس حذف شد.");
                    setDeleteTarget(null);
                  })
                  .catch((e: Error) => setMsg(e.message));
              }}
            >
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
