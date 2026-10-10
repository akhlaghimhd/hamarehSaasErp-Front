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
  DRAFT: "┘╛█î╪┤ظî┘┘ê█î╪│",
  POSTED: "╪س╪ذ╪زظî╪┤╪»┘ç",
  REVERSED: "╪ذ╪▒┌»╪┤╪زظî╪«┘ê╪▒╪»┘ç",
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
  if (!id) return "ظ¤";
  if (id === DEMO_PERIOD_ID) return "╪»┘ê╪▒┘ç ╪ش╪د╪▒█î (╪»┘à┘ê)";
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
      if (!a) return id ? id.slice(0, 8) : "ظ¤";
      return `${toFaDigits(a.account_code)} ظ¤ ${a.name}`;
    },
    [postableAccounts]
  );

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
      if (!window.confirm("╪ز╪║█î█î╪▒╪د╪ز ╪░╪«█î╪▒┘çظî┘╪┤╪»┘ç ╪»╪د╪▒█î╪». ╪«╪د╪▒╪ش ╪┤┘ê█î╪»╪ا")) return;
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
      setMsg(e instanceof Error ? e.message : "╪«╪╖╪د ╪»╪▒ ╪ذ╪د╪▒┌»╪░╪د╪▒█î ╪│┘╪»");
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
        setDescription(full.description ? `┌ر┘╛█î: ${full.description}` : "┌ر┘╛█î ╪│┘╪»");
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
        setMsg(e instanceof Error ? e.message : "┌ر┘╛█î ┘à┘à┌ر┘ ┘╪┤╪»");
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
      setFormError("╪┤╪▒┌ر╪ز ╪د╪╡┘█î █î╪د┘╪ز ┘╪┤╪».");
      return;
    }
    if (!documentDate) {
      setFormError("╪ز╪د╪▒█î╪« ╪│┘╪» ╪د┘╪▓╪د┘à█î ╪د╪│╪ز.");
      return;
    }
    if (!periodId) {
      setFormError("╪»┘ê╪▒┘ç ┘à╪د┘█î ╪د┘╪▓╪د┘à█î ╪د╪│╪ز.");
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
      setFormError("╪ص╪»╪د┘é┘ ╪»┘ê ╪ت╪▒╪ز█î┌ر┘ ╪ذ╪د ╪ص╪│╪د╪ذ ┘ê ┘à╪ذ┘╪║ ┘╪د╪▓┘à ╪د╪│╪ز.");
      return;
    }
    if (andPost) {
      const d = built.reduce((s, x) => s + (x.debit_amount || 0), 0);
      const c = built.reduce((s, x) => s + (x.credit_amount || 0), 0);
      if (Math.round((d - c) * 100) / 100 !== 0 || d <= 0) {
        setFormError("╪ذ╪▒╪د█î ╪س╪ذ╪ز ┘é╪╖╪╣█î╪î ╪│┘╪» ╪ذ╪د█î╪» ╪ز╪▒╪د╪▓ ┘ê ┘à╪ذ┘╪║ظî╪»╪د╪▒ ╪ذ╪د╪┤╪».");
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
          setMsg("╪│┘╪» ╪░╪«█î╪▒┘ç ┘ê ╪س╪ذ╪ز ┘é╪╖╪╣█î ╪┤╪».");
        } else {
          setMsg("┘╛█î╪┤ظî┘┘ê█î╪│ ╪░╪«█î╪▒┘ç ╪┤╪».");
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
          setMsg("╪│┘╪» ╪ذ┘çظî╪▒┘ê╪▓ ┘ê ╪س╪ذ╪ز ┘é╪╖╪╣█î ╪┤╪».");
        } else {
          setMsg("┘╛█î╪┤ظî┘┘ê█î╪│ ╪ذ┘çظî╪▒┘ê╪▓ ╪┤╪».");
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
            : "╪░╪«█î╪▒┘ç ┘╪د┘à┘ê┘┘é ╪ذ┘ê╪»"
      );
    } finally {
      setSaving(false);
    }
  }

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">┘à╪ش┘ê╪▓ ┘à╪┤╪د┘ç╪»┘ç ╪د╪│┘╪د╪» ╪▒╪د ┘╪»╪د╪▒█î╪».</div>
    );
  }

  if (formMode !== null) {
    const title =
      formMode === "new"
        ? "╪│┘╪» ╪ص╪│╪د╪ذ╪»╪د╪▒█î ╪ش╪»█î╪»"
        : viewOnly
          ? "┘à╪┤╪د┘ç╪»┘ç ╪│┘╪»"
          : "┘ê█î╪▒╪د█î╪┤ ┘╛█î╪┤ظî┘┘ê█î╪│";

    return (
      <div className="space-y-4 pb-24">
        <PageHeader
          title={title}
          description="╪ت╪▒╪ز█î┌ر┘ظî┘ç╪د ╪ذ╪د█î╪» ╪ز╪▒╪د╪▓ ╪ذ╪د╪┤┘╪»╪ؤ ╪┤┘à╪د╪▒┘ç ╪│┘╪» ┘ç┘┌»╪د┘à ╪س╪ذ╪ز ┘é╪╖╪╣█î ╪د╪«╪ز╪╡╪د╪╡ ┘à█îظî█î╪د╪ذ╪»"
          breadcrumbs={[
            { label: "╪»╪د╪┤╪ذ┘ê╪▒╪»", href: "/dashboard" },
            { label: "╪ص╪│╪د╪ذ╪»╪د╪▒█î", href: "/dashboard/finance" },
            { label: "╪د╪│┘╪د╪»", href: "/dashboard/finance/journals" },
            { label: formMode === "new" ? "╪ش╪»█î╪»" : "╪ش╪▓╪خ█î╪د╪ز" },
          ]}
        />

        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">╪ز╪د╪▒█î╪« ╪│┘╪»</label>
            <ShamsiDatePicker
              value={documentDate}
              onChange={(v) => {
                markDirty();
                setDocumentDate(v);
              }}
              disabled={viewOnly}
              className="h-9 w-44"
              placeholder="╪د┘╪ز╪«╪د╪ذ ╪ز╪د╪▒█î╪«"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">╪»┘ê╪▒┘ç ┘à╪د┘█î</label>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm min-w-[160px]"
              value={periodId}
              disabled={viewOnly}
              onChange={(e) => {
                markDirty();
                setPeriodId(e.target.value);
              }}
            >
              <option value={DEMO_PERIOD_ID}>╪»┘ê╪▒┘ç ╪ش╪د╪▒█î (╪»┘à┘ê)</option>
            </select>
          </div>
          <div className="space-y-1 flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">╪┤╪▒╪ص ╪│┘╪»</label>
            <Input
              className="h-9"
              placeholder="╪┤╪▒╪ص ┌ر┘█î ╪│┘╪»"
              value={description}
              disabled={viewOnly}
              onChange={(e) => { markDirty(); setDescription(e.target.value); }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">╪┤┘à╪د╪▒┘ç</label>
            <div className="h-9 px-3 flex items-center rounded-md border bg-muted/40 text-xs text-muted-foreground font-mono">
              {entryNumber ? toFaDigits(entryNumber) : "┘╛╪│ ╪د╪▓ ╪س╪ذ╪ز ┘é╪╖╪╣█î"}
            </div>
          </div>
        </div>

        {(meta.reverses_entry_id || meta.reversed_by_entry_id) && (
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground flex flex-wrap gap-3 items-center">
            <Link2 className="h-3.5 w-3.5" />
            {meta.reverses_entry_id ? <span>╪د█î┘ ╪│┘╪» ╪ذ╪▒┌»╪┤╪ز ╪د╪│╪ز (╪د╪▓ ╪│┘╪» ┘à╪ذ╪»╪ث)</span> : null}
            {meta.reversed_by_entry_id ? <span>╪د█î┘ ╪│┘╪» ╪ذ╪▒┌»╪┤╪ز ╪«┘ê╪▒╪»┘ç ╪د╪│╪ز</span> : null}
          </div>
        )}

        {!viewOnly ? (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-9 pr-8 text-xs"
                placeholder="╪ش╪│╪ز╪ش┘ê█î ╪ص╪│╪د╪ذ (┌ر╪» █î╪د ┘╪د┘à)ظخ"
                value={accountQuery}
                onChange={(e) => setAccountQuery(e.target.value)}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {toFaDigits(filteredAccounts.length)} ╪ص╪│╪د╪ذ ┘é╪د╪ذ┘ ╪س╪ذ╪ز
            </span>
          </div>
        ) : null}

        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground bg-muted/30">
                <th className="px-2 py-2 w-10">#</th>
                <th className="px-2 py-2 min-w-[200px]">╪ص╪│╪د╪ذ (╪ز┘╪╡█î┘█î)</th>
                <th className="px-2 py-2 min-w-[120px]">╪┤╪▒╪ص ╪│╪╖╪▒</th>
                <th className="px-2 py-2 w-28">╪ذ╪»┘ç┌ر╪د╪▒</th>
                <th className="px-2 py-2 w-28">╪ذ╪│╪ز╪د┘┌ر╪د╪▒</th>
                {costCenters.length > 0 ? (
                  <th className="px-2 py-2 min-w-[120px]">┘à╪▒┌ر╪▓ ┘ç╪▓█î┘┘ç</th>
                ) : null}
                {businessUnits.length > 0 ? (
                  <th className="px-2 py-2 min-w-[120px]">┘ê╪د╪ص╪» ┌ر╪│╪ذظî┘ê┌ر╪د╪▒</th>
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
                        <option value="">╪د┘╪ز╪«╪د╪ذ ╪ص╪│╪د╪ذظخ</option>
                        {filteredAccounts.map((a) => (
                          <option key={a.account_id} value={a.account_id}>
                            {toFaDigits(a.account_code)} ظ¤ {a.name}
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
                      placeholder={description || "╪┤╪▒╪ص"}
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
                          {costCenters.find((c) => c.cost_center_id === l.cost_center_id)?.name ?? "ظ¤"}
                        </span>
                      ) : (
                        <select
                          className="h-9 w-full rounded-md border bg-background px-2 text-xs"
                          value={l.cost_center_id}
                          onChange={(e) => updateLine(l.key, { cost_center_id: e.target.value })}
                        >
                          <option value="">ظ¤</option>
                          {costCenters.map((c) => (
                            <option key={c.cost_center_id} value={c.cost_center_id}>
                              {toFaDigits(c.code)} ظ¤ {c.name}
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
                          {businessUnits.find((b) => b.business_unit_id === l.business_unit_id)?.name ?? "ظ¤"}
                        </span>
                      ) : (
                        <select
                          className="h-9 w-full rounded-md border bg-background px-2 text-xs"
                          value={l.business_unit_id}
                          onChange={(e) => updateLine(l.key, { business_unit_id: e.target.value })}
                        >
                          <option value="">ظ¤</option>
                          {businessUnits.map((b) => (
                            <option key={b.business_unit_id} value={b.business_unit_id}>
                              {toFaDigits(b.code)} ظ¤ {b.name}
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
                ╪د┘╪▓┘ê╪»┘ ╪│╪╖╪▒
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={fillBalanceOnLast}>
                ╪ز╪▒╪د╪▓ ╪ت╪«╪▒█î┘ ╪│╪╖╪▒
              </Button>
            </div>
          ) : null}
        </div>

        {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                ╪ذ╪»┘ç┌ر╪د╪▒:{" "}
                <strong className="font-mono">{formatMoney(lineTotals.debit)}</strong>
              </span>
              <span>
                ╪ذ╪│╪ز╪د┘┌ر╪د╪▒:{" "}
                <strong className="font-mono">{formatMoney(lineTotals.credit)}</strong>
              </span>
              <span
                className={cn(
                  "font-medium",
                  isBalanced ? "text-emerald-700" : "text-amber-700"
                )}
              >
                {isBalanced
                  ? "╪ز╪▒╪د╪▓ ظ£ô"
                  : `┘à╪د┘╪»┘ç: ${formatMoney(Math.abs(lineTotals.diff))}`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={closeForm}>
                <X className="h-4 w-4 ml-1" />
                ╪ذ╪│╪ز┘
              </Button>
              {!viewOnly ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => void doSave(false)}
                  >
                    ╪░╪«█î╪▒┘ç ┘╛█î╪┤ظî┘┘ê█î╪│
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
                      ╪░╪«█î╪▒┘ç ┘ê ╪س╪ذ╪ز ┘é╪╖╪╣█î
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
        title="╪د╪│┘╪د╪» ╪ص╪│╪د╪ذ╪»╪د╪▒█î"
        description="┘╛█î╪┤ظî┘┘ê█î╪│╪î ╪س╪ذ╪ز ┘é╪╖╪╣█î ┘ê ╪ذ╪▒┌»╪┤╪ز ظ¤ ╪ذ╪د ┌ر┘╪ز╪▒┘ ╪ز╪▒╪د╪▓"
        breadcrumbs={[
          { label: "╪»╪د╪┤╪ذ┘ê╪▒╪»", href: "/dashboard" },
          { label: "╪ص╪│╪د╪ذ╪»╪د╪▒█î", href: "/dashboard/finance" },
          { label: "╪د╪│┘╪د╪»" },
        ]}
        actions={
          canCreate ? (
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 ml-1" />
              ╪│┘╪» ╪ش╪»█î╪»
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
          <label className="text-xs text-muted-foreground">┘ê╪╢╪╣█î╪ز</label>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">┘ç┘à┘ç ({toFaDigits(statusCounts.all)})</option>
            <option value="DRAFT">┘╛█î╪┤ظî┘┘ê█î╪│ ({toFaDigits(statusCounts.DRAFT)})</option>
            <option value="POSTED">╪س╪ذ╪زظî╪┤╪»┘ç ({toFaDigits(statusCounts.POSTED)})</option>
            <option value="REVERSED">
              ╪ذ╪▒┌»╪┤╪زظî╪«┘ê╪▒╪»┘ç ({toFaDigits(statusCounts.REVERSED)})
            </option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">╪»┘ê╪▒┘ç</label>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
          >
            <option value="">┘ç┘à┘ç ╪»┘ê╪▒┘çظî┘ç╪د</option>
            <option value={DEMO_PERIOD_ID}>╪»┘ê╪▒┘ç ╪ش╪د╪▒█î (╪»┘à┘ê)</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">╪د╪▓ ╪ز╪د╪▒█î╪«</label>
          <ShamsiDatePicker value={dateFrom} onChange={setDateFrom} className="h-9 w-40" placeholder="╪د╪▓" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">╪ز╪د ╪ز╪د╪▒█î╪«</label>
          <ShamsiDatePicker value={dateTo} onChange={setDateTo} className="h-9 w-40" placeholder="╪ز╪د" />
        </div>
        <div className="space-y-1 flex-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground">╪ش╪│╪ز╪ش┘ê</label>
          <Input
            className="h-9"
            placeholder="╪┤┘à╪د╪▒┘ç █î╪د ╪┤╪▒╪صظخ"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> ╪ذ╪د╪▒┌»╪░╪د╪▒█îظخ
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-destructive">
            ╪«╪╖╪د.{" "}
            <button type="button" className="underline" onClick={() => void refetch()}>
              ╪ز┘╪د╪┤ ┘à╪ش╪»╪»
            </button>
          </div>
        ) : !filtered.length ? (
          <div className="p-6 text-center space-y-3">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">╪│┘╪»█î ╪س╪ذ╪ز ┘╪┤╪»┘ç ╪د╪│╪ز.</p>
            {canCreate ? (
              <Button size="sm" onClick={openNew}>
                <Plus className="h-4 w-4 ml-1" />
                ╪س╪ذ╪ز ╪د┘ê┘█î┘ ╪│┘╪»
              </Button>
            ) : null}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">╪┤┘à╪د╪▒┘ç</th>
                <th className="px-3 py-2 font-medium">╪ز╪د╪▒█î╪«</th>
                <th className="px-3 py-2 font-medium">╪»┘ê╪▒┘ç</th>
                <th className="px-3 py-2 font-medium">┘ê╪╢╪╣█î╪ز</th>
                <th className="px-3 py-2 font-medium">╪┤╪▒╪ص</th>
                <th className="px-3 py-2 font-medium">╪ذ╪»┘ç┌ر╪د╪▒</th>
                <th className="px-3 py-2 font-medium">╪ذ╪│╪ز╪د┘┌ر╪د╪▒</th>
                <th className="px-3 py-2 font-medium">╪╣┘à┘█î╪د╪ز</th>
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
                      {j.entry_number ? toFaDigits(j.entry_number) : "ظ¤"}
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
                      {j.description ?? "ظ¤"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {t.debit ? formatMoney(t.debit) : "ظ¤"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {t.credit ? formatMoney(t.credit) : "ظ¤"}
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
                            "┘à╪┤╪د┘ç╪»┘ç"
                          )}
                        </Button>
                        {canCreate ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            title="┌ر┘╛█î"
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
                                .then(() => setMsg("╪│┘╪» ╪س╪ذ╪ز ┘é╪╖╪╣█î ╪┤╪»."))
                                .catch((e: Error) => setMsg(e.message))
                            }
                          >
                            ╪س╪ذ╪ز ┘é╪╖╪╣█î
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
                            ╪ذ╪▒┌»╪┤╪ز
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
            <DialogTitle>╪ذ╪▒┌»╪┤╪ز ╪│┘╪»</DialogTitle>
            <DialogDescription>
              ╪│┘╪» ┘à╪╣┌ر┘ê╪│ ╪╡╪د╪»╪▒ ┘à█îظî╪┤┘ê╪» ┘ê ╪│┘╪» ╪د╪╡┘█î ╪ذ╪▒┌»╪┤╪زظî╪«┘ê╪▒╪»┘ç ╪╣┘╪د┘à╪ز ┘à█îظî╪«┘ê╪▒╪».
              {reverseTarget?.entry_number
                ? ` ╪┤┘à╪د╪▒┘ç: ${toFaDigits(reverseTarget.entry_number)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReverseTarget(null)}>
              ╪د┘╪╡╪▒╪د┘
            </Button>
            <Button
              disabled={reverseMut.isPending}
              onClick={() => {
                if (!reverseTarget) return;
                void reverseMut
                  .mutateAsync(reverseTarget.journal_entry_id)
                  .then(() => {
                    setMsg("╪│┘╪» ╪ذ╪▒┌»╪┤╪ز ╪╡╪د╪»╪▒ ╪┤╪».");
                    setReverseTarget(null);
                  })
                  .catch((e: Error) => setMsg(e.message));
              }}
            >
              ╪ز╪ث█î█î╪» ╪ذ╪▒┌»╪┤╪ز
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>╪ص╪░┘ ┘╛█î╪┤ظî┘┘ê█î╪│</DialogTitle>
            <DialogDescription>┘┘é╪╖ ┘╛█î╪┤ظî┘┘ê█î╪│ ╪ذ╪»┘ê┘ ╪س╪ذ╪ز ┘é╪╖╪╣█î ╪ص╪░┘ ┘à█îظî╪┤┘ê╪».</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              ╪د┘╪╡╪▒╪د┘
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => {
                if (!deleteTarget) return;
                void deleteMut
                  .mutateAsync(deleteTarget.journal_entry_id)
                  .then(() => {
                    setMsg("┘╛█î╪┤ظî┘┘ê█î╪│ ╪ص╪░┘ ╪┤╪».");
                    setDeleteTarget(null);
                  })
                  .catch((e: Error) => setMsg(e.message));
              }}
            >
              ╪ص╪░┘
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
