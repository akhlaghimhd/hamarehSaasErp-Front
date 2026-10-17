"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  FileSpreadsheet,
  FileDown,
  ArrowRight,
  ChevronDown,
  Columns3,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
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
import { usePermission, useAuthStore } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import { useBranches, useAllBranches } from "@/modules/organization/hooks/use-branches";
import { useFinanceCompanyScope } from "../hooks/use-finance-company-scope";
import {
  costCenterService,
  businessUnitService,
  type CostCenterDto,
  type BusinessUnitDto,
} from "@/modules/organization/services/org-extended-service";
import {
  useJournals,
  useJournalSummary,
  usePostJournal,
  useReverseJournal,
  useDeleteJournal,
  useRestoreJournal,
} from "../hooks/use-journals";
import { useAccountFlat } from "../hooks/use-accounts";
import { journalService } from "../services/journal-service";
import { AccountTypeahead, OptionTypeahead } from "./journals-account-typeahead";
import { buildJournalReportHtml } from "./journals-report-html";
import {
  FinancePermissions,
  DEMO_PERIOD_ID,
  type JournalEntryDto,
  type JournalItemDto,
} from "../types";
import { displayJournalNumber } from "../lib/display-journal-number";
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
  /** سطر تراز ساخته‌شده توسط سیستم */
  is_system_balance?: boolean;
};

const JOURNAL_DRAFT_KEY = "finance.journal.form-draft.v1";
/** نشانگر پایدار سطر تراز سیستم در شرح (بدون ستون BE) */
const SYSTEM_BALANCE_MARK = "تراز سیستم";

function isSystemBalanceDescription(desc: string): boolean {
  return (desc || "").includes(SYSTEM_BALANCE_MARK);
}

function emptyLine(desc = "", system = false): LineForm {
  return {
    key: Math.random().toString(36).slice(2),
    account_id: "",
    debit: "",
    credit: "",
    description: desc,
    cost_center_id: "",
    business_unit_id: "",
    is_system_balance: system || undefined,
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

/** نمایش مبلغ در ورودی با جداکننده هزارگان (ارقام فارسی) */
function formatAmountDisplay(raw: string): string {
  const ascii = toAsciiDigits(raw).replace(/,/g, "").trim();
  if (!ascii) return "";
  const neg = ascii.startsWith("-");
  const body = neg ? ascii.slice(1) : ascii;
  if (!/^\d*\.?\d*$/.test(body) || body === "" || body === ".") {
    return toFaDigits(ascii);
  }
  const [intPart, decPart] = body.split(".");
  const grouped = (intPart || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const out = decPart !== undefined ? `${grouped}.${decPart}` : grouped;
  return toFaDigits(neg ? `-${out}` : out);
}

const AMOUNT_INPUT_CLASS =
  "h-8 w-full min-w-[7.5rem] text-[11px] tabular-nums text-left tracking-tight px-1.5";

const FORM_FONT =
  { fontFamily: "var(--font-vazirmatn), Tahoma, Arial, sans-serif" } as const;

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

function journalTotals(j: JournalEntryDto): { debit: number; credit: number } {
  const any = j as JournalEntryDto & {
    items_debit_sum?: number | string | null;
    items_credit_sum?: number | string | null;
  };
  if (any.items_debit_sum != null || any.items_credit_sum != null) {
    return { debit: Number(any.items_debit_sum || 0), credit: Number(any.items_credit_sum || 0) };
  }
  return sumLines(j.items as JournalItemDto[] | undefined);
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

  const {
    canOperateCompany,
    isTechnicalOwnerReadOnly,
    isGroupObserver,
  } = useFinanceCompanyScope();
  const canOperateOn = (companyId?: string | null) =>
    Boolean(companyId && canOperateCompany(companyId));

  const { data: companies } = useCompanies();
  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    const p = list.find((c) => c.is_primary) ?? list[0];
    return p?.company_id ?? "";
  }, [companies]);

  /** FIN-CSN-F1: list company filter — "" = all allowed (parent multi); single company forced when only one */
  const companyOptions = companies ?? [];
  const multiCompany = companyOptions.length > 1;
  /** Create form: only companies actor can OPERATE (FIN-HOLD). List filter stays all readable. */
  const operableCompanyOptions = useMemo(
    () => companyOptions.filter((c) => canOperateCompany(c.company_id)),
    [companyOptions, canOperateCompany]
  );
  const defaultOperateCompanyId = operableCompanyOptions[0]?.company_id ?? "";
  const canCreateOnAny = operableCompanyOptions.length > 0;
  const [listCompanyId, setListCompanyId] = useState<string>("");
  const [formCompanyId, setFormCompanyId] = useState<string>("");
  /** FIN-HOLD-W3: optional branch for branch-series numbering; empty = company series */
  const [formBranchId, setFormBranchId] = useState<string>("");

  useEffect(() => {
    if (!companyOptions.length) return;
    if (!multiCompany) {
      const only = companyOptions[0]?.company_id ?? primaryCompanyId;
      setListCompanyId(only);
      if (canOperateCompany(only)) {
        setFormCompanyId((prev) => prev || only);
      } else {
        setFormCompanyId(defaultOperateCompanyId);
      }
      return;
    }
    setFormCompanyId((prev) => {
      if (prev && canOperateCompany(prev)) return prev;
      return defaultOperateCompanyId;
    });
  }, [companies, multiCompany, primaryCompanyId, defaultOperateCompanyId, canOperateCompany]);

  const effectiveListCompanyId = multiCompany
    ? listCompanyId || undefined
    : listCompanyId || primaryCompanyId || undefined;

  const [statusFilter, setStatusFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [listPage, setListPage] = useState(1);
  type JournalSortKey = "number" | "date" | "period" | "status" | "branch" | "desc" | "debit" | "credit";
  const [sortKey, setSortKey] = useState<JournalSortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  function toggleSort(key: JournalSortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "date" || key === "number" || key === "debit" || key === "credit" ? "desc" : "asc");
    }
  }
  const [pageSize, setPageSize] = useState(15);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem("finance.journals.list-cols.v1");
      if (raw) return { ...{ number: true, date: true, period: true, status: true, branch: true, desc: true, debit: true, credit: true, actions: true }, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { number: true, date: true, period: true, status: true, branch: true, desc: true, debit: true, credit: true, actions: true };
  });


  const showDeleted = statusFilter === "__DELETED__";

  const filters = useMemo(
    () => ({
      status: showDeleted ? undefined : statusFilter || undefined,
      company_id: effectiveListCompanyId,
      period_id: periodFilter || undefined,
      deleted: showDeleted || undefined,
    }),
    [statusFilter, effectiveListCompanyId, periodFilter, showDeleted]
  );

  /** one base list for counts; filtered list only when status/deleted needed */
  const baseListFilters = useMemo(
    () => ({
      company_id: effectiveListCompanyId,
      period_id: periodFilter || undefined,
    }),
    [effectiveListCompanyId, periodFilter]
  );
  const needsSeparateList = Boolean(statusFilter) || showDeleted;
  const { data: activeForCounts, isLoading: loadingActive, error: errorActive, refetch: refetchActive } =
    useJournals(baseListFilters);
  const { data: filteredList, isLoading: loadingFiltered, error: errorFiltered, refetch: refetchFiltered } =
    useJournals(filters, { enabled: needsSeparateList });
  const { data: statusSummary } = useJournalSummary({
    company_id: effectiveListCompanyId,
    period_id: periodFilter || undefined,
  });
  const data = needsSeparateList ? filteredList : activeForCounts;
  const isLoading = needsSeparateList ? loadingFiltered : loadingActive;
  const error = needsSeparateList ? errorFiltered : errorActive;
  const refetch = needsSeparateList ? refetchFiltered : refetchActive;

  const [costCenters, setCostCenters] = useState<CostCenterDto[]>([]);
  const [businessUnits, setBusinessUnits] = useState<BusinessUnitDto[]>([]);
  const activeFormCompanyId = formCompanyId || primaryCompanyId;
  const { data: formBranches } = useBranches(activeFormCompanyId || null, "active");
  const branchOptions = formBranches ?? [];
  const { data: allBranches } = useAllBranches("active");
  const branchNameById = useMemo(() => {
  const m = new Map<string, string>();
  for (const b of allBranches ?? []) {
    const label = b.name || b.ref_code || b.code || b.branch_id.slice(0, 8);
    m.set(b.branch_id, label);
  }
  return m;
}, [allBranches]);

const companyNameById = useMemo(() => {
  const m = new Map<string, string>();
  for (const c of companyOptions) {
    m.set(c.company_id, c.name || c.code || c.company_id.slice(0, 8));
  }
  return m;
}, [companyOptions]);

 

  const postMut = usePostJournal();
  const reverseMut = useReverseJournal();
  const deleteMut = useDeleteJournal();
  const restoreMut = useRestoreJournal();

  const [formMode, setFormMode] = useState<"new" | string | null>(null);
  useEffect(() => {
    if (formMode === null || !activeFormCompanyId) return;
    void costCenterService.list(activeFormCompanyId).then(setCostCenters).catch(() => setCostCenters([]));
    void businessUnitService.list().then(setBusinessUnits).catch(() => setBusinessUnits([]));
  }, [formMode, activeFormCompanyId]);
  const { data: accountsFlat } = useAccountFlat({
    enabled: formMode !== null && Boolean(formCompanyId || primaryCompanyId),
    companyId: formCompanyId || primaryCompanyId || undefined,
  });

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


  const [viewOnly, setViewOnly] = useState(false);
  const [documentDate, setDocumentDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<LineForm[]>([emptyLine(), emptyLine()]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [entryNumber, setEntryNumber] = useState<string | null>(null);
  const [periodId, setPeriodId] = useState(DEMO_PERIOD_ID);
  const [accountQuery, setAccountQuery] = useState("");
  const [recentAccountIds, setRecentAccountIds] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [pendingNavHref, setPendingNavHref] = useState<string | null>(null);
  const [draftRestoredAt, setDraftRestoredAt] = useState<string | null>(null);
  const router = useRouter();
  /** typeahead حساب روی هر سطر */
  const [accountFocusKey, setAccountFocusKey] = useState<string | null>(null);
  const [accountTypeQuery, setAccountTypeQuery] = useState("");
  const [accountHighlightIdx, setAccountHighlightIdx] = useState(0);

  const filteredAccounts = useMemo(() => {
    const q = accountQuery.trim();
    const ascii = toAsciiDigits(q);
    const base = !q
      ? postableAccounts
      : postableAccounts.filter(
          (a) =>
            a.name.includes(q) ||
            String(a.account_code).includes(ascii) ||
            toFaDigits(a.account_code).includes(q)
        );
    if (!recentAccountIds.length) return base;
    const recentSet = new Set(recentAccountIds);
    const recent = recentAccountIds
      .map((id) => base.find((a) => a.account_id === id))
      .filter(Boolean) as typeof postableAccounts;
    const rest = base.filter((a) => !recentSet.has(a.account_id));
    return [...recent, ...rest];
  }, [postableAccounts, accountQuery, recentAccountIds]);

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
          ((j as JournalEntryDto).draft_number ?? "").includes(q) ||
          (j.description ?? "").includes(q) ||
          j.journal_entry_id.includes(q)
      );
    }
    if (dateFrom) list = list.filter((j) => (j.document_date ?? "").slice(0, 10) >= dateFrom);
    if (dateTo) list = list.filter((j) => (j.document_date ?? "").slice(0, 10) <= dateTo);
    const mul = sortDir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => {
      const num = (v: unknown) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      let va: string | number = "";
      let vb: string | number = "";
      switch (sortKey) {
        case "number":
          va = a.entry_number ?? "";
          vb = b.entry_number ?? "";
          break;
        case "date":
          va = (a.document_date ?? "").slice(0, 10);
          vb = (b.document_date ?? "").slice(0, 10);
          break;
        case "period":
          va = a.period_id ?? "";
          vb = b.period_id ?? "";
          break;
        case "status":
          va = a.status ?? "";
          vb = b.status ?? "";
          break;
        case "branch":
          va = (a as { branch_id?: string | null }).branch_id ?? a.company_id ?? "";
          vb = (b as { branch_id?: string | null }).branch_id ?? b.company_id ?? "";
          break;
        case "desc":
          va = a.description ?? "";
          vb = b.description ?? "";
          break;
        case "debit":
          va = num((a as { total_debit?: number | string }).total_debit);
          vb = num((b as { total_debit?: number | string }).total_debit);
          break;
        case "credit":
          va = num((a as { total_credit?: number | string }).total_credit);
          vb = num((b as { total_credit?: number | string }).total_credit);
          break;
      }
      if (typeof va === "number" && typeof vb === "number") return (va - vb) * mul;
      return String(va).localeCompare(String(vb), "fa") * mul;
    });
    return list;
  }, [data, search, dateFrom, dateTo, sortKey, sortDir]);

  useEffect(() => {
    setListPage(1);
    setSelectedIds([]);
  }, [statusFilter, periodFilter, dateFrom, dateTo, search, pageSize, listCompanyId, sortKey, sortDir]);

  useEffect(() => {
    if (!colMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.("[data-col-menu]")) return;
      setColMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [colMenuOpen]);

  useEffect(() => {
    try {
      localStorage.setItem("finance.journals.list-cols.v1", JSON.stringify(visibleCols));
    } catch { /* ignore */ }
  }, [visibleCols]);

  const paged = useMemo(() => {
    const start = (listPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, listPage, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleSelectAllPage() {
    const ids = paged.map((j) => j.journal_entry_id);
    const allOn = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    if (allOn) setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    else setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
  }


  const statusCounts = useMemo(() => {
    if (statusSummary) {
      return {
        all: statusSummary.all,
        DRAFT: statusSummary.DRAFT,
        POSTED: statusSummary.POSTED,
        REVERSED: statusSummary.REVERSED,
        DELETED: statusSummary.DELETED,
      };
    }
    const all = activeForCounts ?? [];
    return {
      all: all.length,
      DRAFT: all.filter((j) => j.status === "DRAFT").length,
      POSTED: all.filter((j) => j.status === "POSTED").length,
      REVERSED: all.filter((j) => j.status === "REVERSED").length,
      DELETED: 0,
    };
  }, [statusSummary, activeForCounts]);

  /** نگاشت id → شماره نمایشی برای نشانگر ارتباط برگشت */
  const numberById = useMemo(() => {
    const m = new Map<string, string>();
    for (const j of [...(activeForCounts ?? []), ...(data ?? [])]) {
      m.set(j.journal_entry_id, displayJournalNumber(j));
    }
    return m;
  }, [activeForCounts, data]);

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
    if (!canCreateOnAny) {
      setFormError("شما برای هیچ شرکتی مجوز ثبت سند ندارید. فقط مشاهده مجاز است.");
      return;
    }
    setViewOnly(false);
    setFormError(null);
    setAccountQuery("");
    setMeta({});
    setAccountFocusKey(null);
    setAccountTypeQuery("");
    try {
      const raw = localStorage.getItem(JOURNAL_DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as {
          formMode?: "new" | string;
          documentDate?: string;
          periodId?: string;
          description?: string;
          lines?: LineForm[];
          entryNumber?: string | null;
          primaryCompanyId?: string;
          formCompanyId?: string;
          formBranchId?: string;
          savedAt?: string;
        };
        if (d.lines && Array.isArray(d.lines) && d.lines.length > 0) {
          setFormMode(d.formMode === "new" || !d.formMode ? "new" : String(d.formMode));
          setDocumentDate(d.documentDate || todayIso());
          setPeriodId(d.periodId || DEMO_PERIOD_ID);
          setDescription(d.description || "");
          if (d.formCompanyId) setFormCompanyId(d.formCompanyId);
          if (d.formBranchId !== undefined) setFormBranchId(d.formBranchId || "");
          setLines(
            d.lines.map((l) => ({
              ...emptyLine(),
              ...l,
              key: l.key || Math.random().toString(36).slice(2),
              is_system_balance:
                l.is_system_balance || isSystemBalanceDescription(l.description || ""),
            }))
          );
          setEntryNumber(d.entryNumber ?? null);
          setDirty(true);
          setDraftRestoredAt(d.savedAt || new Date().toISOString());
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setFormMode("new");
    setDocumentDate(todayIso());
    setPeriodId(DEMO_PERIOD_ID);
    setDescription("");
    setFormBranchId("");
    setLines([emptyLine(), emptyLine()]);
    setEntryNumber(null);
    setDirty(false);
    setDraftRestoredAt(null);
  }

  function markDirty() {
    setDirty(true);
  }

  function rememberAccount(id: string) {
    if (!id) return;
    setRecentAccountIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 8));
  }

  useEffect(() => {
    if (formMode === null || viewOnly || !dirty) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          JOURNAL_DRAFT_KEY,
          JSON.stringify({
            formMode,
            documentDate,
            periodId,
            description,
            lines,
            entryNumber,
            primaryCompanyId,
            formCompanyId: formCompanyId || primaryCompanyId,
            formBranchId: formBranchId || "",
            savedAt: new Date().toISOString(),
          })
        );
      } catch {
        /* ignore */
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [
    formMode,
    viewOnly,
    dirty,
    documentDate,
    periodId,
    description,
    lines,
    entryNumber,
    primaryCompanyId,
    formCompanyId,
    formBranchId,
  ]);

  useEffect(() => {
    if (!dirty || viewOnly || formMode === null) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, viewOnly, formMode]);

  useEffect(() => {
    if (!dirty || viewOnly || formMode === null) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      // لینک دانلود / blob نباید به‌عنوان ناوبری گرفته شود
      if (a.hasAttribute("download") || a.dataset.download === "1") return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("blob:") || href.startsWith("data:")) return;
      if (href.startsWith("http") && !href.includes(window.location.host)) return;
      e.preventDefault();
      e.stopPropagation();
      if (href.replace(/\/$/, "") === "/dashboard/finance/journals") {
        setPendingNavHref(null);
      } else {
        setPendingNavHref(href);
      }
      setLeaveConfirmOpen(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [dirty, viewOnly, formMode]);

  function clearLocalDraft() {
    try {
      localStorage.removeItem(JOURNAL_DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setDraftRestoredAt(null);
  }

  function closeForm() {
    if (dirty && !viewOnly) {
      setPendingNavHref(null);
      setLeaveConfirmOpen(true);
      return;
    }
    setFormMode(null);
    setDirty(false);
  }

  function confirmLeaveForm() {
    setLeaveConfirmOpen(false);
    setDirty(false);
    clearLocalDraft();
    const href = pendingNavHref;
    setPendingNavHref(null);
    setFormMode(null);
    if (href) {
      router.push(href);
    }
  }

  async function openEdit(j: JournalEntryDto, readonly: boolean) {
    setFormError(null);
    setViewOnly(readonly || j.status !== "DRAFT");
    setFormMode(j.journal_entry_id);
    setEntryNumber(j.entry_number ?? j.draft_number ?? null);
    if (j.company_id) setFormCompanyId(j.company_id);
    setFormBranchId((j as { branch_id?: string | null }).branch_id || "");
    try {
      const full = await journalService.getById(j.journal_entry_id);
      setDocumentDate(full.document_date?.slice(0, 10) || todayIso());
      setPeriodId(full.period_id || DEMO_PERIOD_ID);
      setDescription(full.description ?? "");
      setEntryNumber(full.entry_number ?? null);
      setFormBranchId((full as { branch_id?: string | null }).branch_id || "");
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
          items.map((it) => {
            const desc = it.description ?? "";
            return {
              key: it.journal_item_id ?? Math.random().toString(36).slice(2),
              account_id: it.account_id,
              debit: Number(it.debit_amount || 0) > 0 ? String(Number(it.debit_amount)) : "",
              credit:
                Number(it.credit_amount || 0) > 0 ? String(Number(it.credit_amount)) : "",
              description: desc,
              cost_center_id: it.cost_center_id ?? "",
              business_unit_id: it.business_unit_id ?? "",
              is_system_balance: isSystemBalanceDescription(desc),
            };
          })
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در بارگذاری سند");
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
        toast.error(e instanceof Error ? e.message : "کپی ممکن نشد");
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
    const key = Math.random().toString(36).slice(2);
    const row: LineForm = {
      key,
      account_id: "",
      debit: "",
      credit: "",
      description: description,
      cost_center_id: "",
      business_unit_id: "",
    };
    setLines((prev) => {
      // سطرهای جدید همیشه قبل از سطر تراز سیستم قرار می‌گیرند
      const balIdx = prev.findIndex((l) => l.is_system_balance);
      if (balIdx >= 0) {
        const next = [...prev];
        next.splice(balIdx, 0, row);
        return next;
      }
      return [...prev, row];
    });
    setAccountFocusKey(key);
    setAccountTypeQuery("");
    setAccountHighlightIdx(0);
    requestAnimationFrame(() => {
      const el = document.querySelector(
        `input[data-line-key="${key}"]`
      ) as HTMLInputElement | null;
      el?.focus();
    });
  }

  function copyDescriptionToEmptyLines() {
    const d = description.trim();
    if (!d) return;
    markDirty();
    setLines((prev) =>
      prev.map((l) => (l.description.trim() ? l : { ...l, description: d }))
    );
  }
  function removeLine(key: string) {
    markDirty();
    setLines((prev) => (prev.length <= 2 ? prev : prev.filter((l) => l.key !== key)));
  }

  function fillBalanceOnLast() {
    // فقط سطرهای عادی (غیرسیستمی) در جمع لحاظ می‌شوند
    const normal = lines.filter((l) => !l.is_system_balance);
    let d = 0;
    let c = 0;
    for (const l of normal) {
      d += parseAmount(l.debit);
      c += parseAmount(l.credit);
    }
    const diff = Math.round((d - c) * 100) / 100;
    if (diff === 0) {
      // اگر تراز است، سطر تراز سیستم را حذف کن
      markDirty();
      setLines((prev) => prev.filter((l) => !l.is_system_balance));
      toast.message("سند تراز است؛ سطر تراز سیستم حذف شد.");
      return;
    }
    markDirty();
    const abs = Math.abs(diff);
    const amountPatch =
      diff > 0
        ? { credit: String(abs), debit: "" as string }
        : { debit: String(abs), credit: "" as string };
    const balDesc =
      description.trim() ||
      (diff > 0
        ? `بستانکار ${SYSTEM_BALANCE_MARK}`
        : `بدهکار ${SYSTEM_BALANCE_MARK}`);

    setLines((prev) => {
      // همه سطرهای تراز قبلی حذف؛ یکی در انتها ساخته/به‌روز می‌شود
      const normals = prev.filter((l) => !l.is_system_balance);
      const balanceRow: LineForm = {
        key: prev.find((l) => l.is_system_balance)?.key ?? Math.random().toString(36).slice(2),
        account_id: prev.find((l) => l.is_system_balance)?.account_id ?? "",
        cost_center_id: prev.find((l) => l.is_system_balance)?.cost_center_id ?? "",
        business_unit_id: prev.find((l) => l.is_system_balance)?.business_unit_id ?? "",
        description: balDesc,
        is_system_balance: true,
        ...amountPatch,
      };
      return [...normals, balanceRow];
    });
  }

  const authUser = useAuthStore((s) => s.user);
  const authOrg = useAuthStore((s) => s.organization);

  function journalMetaRows(): string[][] {
    const companyName =
      (companies ?? []).find((c) => c.company_id === primaryCompanyId)?.name ??
      authOrg?.tenant_name ??
      "—";
    const userLabel = authUser
      ? `${authUser.first_name ?? ""} ${authUser.last_name ?? ""}`.trim() ||
        authUser.email ||
        authUser.mobile ||
        "—"
      : "—";
    const now = new Date().toLocaleString("fa-IR");
    return [
      ["گزارش سند حسابداری"],
      ["شرکت", companyName],
      ["سازمان", authOrg?.tenant_name ?? "—"],
      ["کاربر", String(userLabel)],
      ["زمان خروجی", now],
      ["شماره سند", entryNumber ? toFaDigits(entryNumber) : "پیش‌نویس"],
      ["تاریخ سند", documentDate ? formatJalaliDate(documentDate) : "—"],
      ["دوره", periodLabel(periodId)],
      ["شرح", description || "—"],
      [],
    ];
  }

  function exportJournalExcel() {
    const html = buildJournalReportHtml(buildReportMeta(), buildReportLines());
    const blob = new Blob(["\ufeff" + html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `journal-${entryNumber || "draft"}-${Date.now()}.xls`);
    a.setAttribute("data-download", "1");
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    // جلوگیری از navigation و تداخل با گارد خروج
    a.addEventListener(
      "click",
      (ev) => {
        ev.stopPropagation();
      },
      true
    );
    a.click();
    // revoke را کمی دیرتر تا دانلود در کروم/اج شروع شود
    window.setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 1500);
  }

  function exportJournalPdf() {
    const html = buildJournalReportHtml(buildReportMeta(), buildReportLines()).replace(
      "</body>",
      "<script>window.onload=function(){window.print();}</script></body>"
    );
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("مرورگر پنجره چاپ را مسدود کرد.");
      return;
    }
    w.document.write(html);
    w.document.close();
  }

  function buildReportMeta() {
    const meta = journalMetaRows();
    return {
      companyName: meta.find((r) => r[0] === "شرکت")?.[1] ?? "—",
      orgName: meta.find((r) => r[0] === "سازمان")?.[1] ?? "—",
      entryNumber,
      documentDate: documentDate ? formatJalaliDate(documentDate) : "—",
      periodLabel: periodLabel(periodId),
      userLabel: meta.find((r) => r[0] === "کاربر")?.[1] ?? "—",
      exportedAt: meta.find((r) => r[0] === "زمان خروجی")?.[1] ?? "—",
      description,
      isBalanced,
      totalDebit: lineTotals.debit,
      totalCredit: lineTotals.credit,
      totalDiff: lineTotals.diff,
    };
  }

  function buildReportLines() {
    return lines.map((l) => {
      const cc = costCenters.find((c) => c.cost_center_id === l.cost_center_id);
      const bu = businessUnits.find((b) => b.business_unit_id === l.business_unit_id);
      return {
        accountLabel: accountLabel(l.account_id),
        description: l.description || "",
        debit: parseAmount(l.debit),
        credit: parseAmount(l.credit),
        costCenterLabel: cc ? `${toFaDigits(cc.code)} — ${cc.name}` : "",
        businessUnitLabel: bu ? `${toFaDigits(bu.code)} — ${bu.name}` : "",
        isSystemBalance: !!l.is_system_balance || isSystemBalanceDescription(l.description || ""),
      };
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
      .map((l) => {
        let desc = (l.description || "").trim() || description.trim() || "";
        if (l.is_system_balance && desc && !isSystemBalanceDescription(desc)) {
          desc = `${desc} — ${SYSTEM_BALANCE_MARK}`;
        } else if (l.is_system_balance && !desc) {
          desc = SYSTEM_BALANCE_MARK;
        }
        return {
          account_id: l.account_id,
          debit_amount: parseAmount(l.debit) || undefined,
          credit_amount: parseAmount(l.credit) || undefined,
          description: desc || undefined,
          cost_center_id: l.cost_center_id || undefined,
          business_unit_id: l.business_unit_id || undefined,
        };
      })
      .filter((l) => l.account_id && (l.debit_amount || l.credit_amount));

    if (built.length < 2) {
      setFormError("حداقل دو سطر با حساب و مبلغ لازم است.");
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
          company_id: formCompanyId || primaryCompanyId,
          branch_id: formBranchId || undefined,
          period_id: periodId,
          document_date: documentDate,
          description: description.trim() || undefined,
          lines: built,
        } as Parameters<typeof journalService.createDraft>[0]);
        if (andPost) {
          await journalService.post(created.journal_entry_id);
          toast.success("سند ذخیره و ثبت قطعی شد.");
        } else {
          toast.success("پیش‌نویس ذخیره شد.");
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
          toast.success("سند به‌روز و ثبت قطعی شد.");
        } else {
          toast.success("پیش‌نویس به‌روز شد.");
        }
      }
      setDirty(false);
      clearLocalDraft();
      setFormMode(null);
      await refetch();
      clearLocalDraft();
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

  useEffect(() => {
    if (formMode === null || viewOnly) return;
    function onKey(e: KeyboardEvent) {
      // F-keys در وب پایدارتر از Alt/Ctrl هستند (Alt اغلب منوی مرورگر را می‌گیرد)
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const code = e.code;
      if (code === "F2") {
        e.preventDefault();
        if (!saving) void doSave(false);
      } else if (code === "F9") {
        e.preventDefault();
        if (!saving && isBalanced && canPost && canOperateOn(formCompanyId || primaryCompanyId)) void doSave(true);
      } else if (code === "F4") {
        e.preventDefault();
        fillBalanceOnLast();
      } else if (code === "F7") {
        e.preventDefault();
        addLine();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده اسناد را ندارید.</div>
    );
  }


  function buildListFilterSummary(): string {
    const parts: string[] = [];
    if (statusFilter) parts.push(`وضعیت: ${statusLabel[statusFilter] ?? statusFilter}`);
    else parts.push("وضعیت: همه");
    if (periodFilter) parts.push(`دوره: ${periodLabel(periodFilter)}`);
    else parts.push("دوره: همه");
    if (dateFrom) parts.push(`از تاریخ: ${formatJalaliDate(dateFrom)}`);
    if (dateTo) parts.push(`تا تاریخ: ${formatJalaliDate(dateTo)}`);
    if (search.trim()) parts.push(`جستجو: ${search.trim()}`);
    parts.push(`تعداد ردیف: ${toFaDigits(filtered.length)}`);
    return parts.join(" | ");
  }

  function exportListExcel() {
    const rows = selectedIds.length
      ? filtered.filter((j) => selectedIds.includes(j.journal_entry_id))
      : filtered;
    const filterLine = buildListFilterSummary();
    const head = ["شماره", "تاریخ", "دوره", "وضعیت", "شرح", "بدهکار", "بستانکار"];
    const body = rows.map((j) => {
      const t = journalTotals(j);
      return [
        displayJournalNumber(j),
        formatJalaliDate(j.document_date),
        periodLabel(j.period_id),
        statusLabel[j.status] ?? j.status,
        j.description ?? "",
        t.debit ? String(t.debit) : "",
        t.credit ? String(t.credit) : "",
      ];
    });
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const meta = [
      ["گزارش فهرست اسناد حسابداری"],
      ["فیلترها", filterLine],
      ["زمان خروجی", new Date().toLocaleString("fa-IR")],
      [],
    ];
    const csv =
      "\ufeff" +
      [
        ...meta.map((r) => r.map(esc).join(",")),
        head.map(esc).join(","),
        ...body.map((r) => r.map(esc).join(",")),
      ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function exportListPdf() {
    const rows = selectedIds.length
      ? filtered.filter((j) => selectedIds.includes(j.journal_entry_id))
      : filtered;
    const filterLine = buildListFilterSummary();
    const trs = rows
      .map((j) => {
        const t = journalTotals(j);
        return `<tr>
          <td>${displayJournalNumber(j)}</td>
          <td>${formatJalaliDate(j.document_date)}</td>
          <td>${periodLabel(j.period_id)}</td>
          <td>${statusLabel[j.status] ?? j.status}</td>
          <td>${(j.description ?? "—").replace(/</g, "<")}</td>
          <td>${t.debit ? formatMoney(t.debit) : "—"}</td>
          <td>${t.credit ? formatMoney(t.credit) : "—"}</td>
        </tr>`;
      })
      .join("");
    const html = `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/>
      <title>اسناد حسابداری</title>
      <style>
        body{font-family:Tahoma,Arial,sans-serif;font-size:11px;padding:16px}
        h1{font-size:16px;margin:0 0 8px}
        table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #cbd5e1;padding:4px 6px;text-align:right}
        th{background:#f1f5f9}
        .meta{color:#64748b;margin-bottom:8px;line-height:1.6}
      </style></head><body>
      <h1>فهرست اسناد حسابداری</h1>
      <div class="meta">فیلترها: ${filterLine.replace(/</g, "<")}</div>
      <div class="meta">زمان خروجی: ${toFaDigits(new Date().toLocaleString("fa-IR"))}</div>
      <table><thead><tr>
        <th>شماره</th><th>تاریخ</th><th>دوره</th><th>وضعیت</th><th>شرح</th><th>بدهکار</th><th>بستانکار</th>
      </tr></thead><tbody>${trs}</tbody></table>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("مرورگر پنجره چاپ را مسدود کرد. اجازه پاپ‌آپ را فعال کنید.");
      return;
    }
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  async function bulkPostSelected() {
    const drafts = (data ?? []).filter((j) => selectedIds.includes(j.journal_entry_id) && j.status === "DRAFT");
    if (!drafts.length) {
      toast.error("پیش‌نویسی در انتخاب‌ها نیست.");
      return;
    }
    let ok = 0;
    for (const j of drafts) {
      try {
        await postMut.mutateAsync(j.journal_entry_id);
        ok += 1;
      } catch {
        /* continue */
      }
    }
    setSelectedIds([]);
    toast.success(`${toFaDigits(ok)} سند ثبت قطعی شد.`);
    void refetch();
  }

  function requestBulkDelete() {
    const drafts = (data ?? []).filter((j) => selectedIds.includes(j.journal_entry_id) && j.status === "DRAFT");
    if (!drafts.length) {
      toast.error("فقط پیش‌نویس قابل حذف گروهی است.");
      return;
    }
    setBulkDeleteConfirmOpen(true);
  }

  async function confirmBulkDelete() {
    const drafts = (data ?? []).filter((j) => selectedIds.includes(j.journal_entry_id) && j.status === "DRAFT");
    setBulkDeleteConfirmOpen(false);
    if (!drafts.length) return;
    let ok = 0;
    for (const j of drafts) {
      try {
        await deleteMut.mutateAsync(j.journal_entry_id);
        ok += 1;
      } catch {
        /* continue */
      }
    }
    setSelectedIds([]);
    toast.success(`${toFaDigits(ok)} پیش‌نویس حذف شد.`);
    void refetch();
  }

  async function bulkRestoreSelected() {
    const rows = (data ?? []).filter((j) => selectedIds.includes(j.journal_entry_id));
    if (!rows.length) {
      toast.error("موردی انتخاب نشده است.");
      return;
    }
    let ok = 0;
    for (const j of rows) {
      try {
        await restoreMut.mutateAsync(j.journal_entry_id);
        ok += 1;
      } catch {
        /* continue */
      }
    }
    setSelectedIds([]);
    toast.success(`${toFaDigits(ok)} سند از سطل حذف بازیابی شد.`);
    void refetch();
  }

  if (formMode !== null) {
    const title =
      formMode === "new"
        ? "سند حسابداری جدید"
        : viewOnly
          ? "مشاهده سند"
          : "ویرایش پیش‌نویس";

    return (
      <div className="flex flex-col gap-2" style={{ ...FORM_FONT, minHeight: "calc(100dvh - 5.75rem)" }}>
        <div className="space-y-1 pb-0">
          <nav className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <a href="/dashboard/finance" className="hover:text-foreground transition">حسابداری</a>
            <span>/</span>
            <span>اسناد</span>
            <span>/</span>
            <span className="text-foreground">{formMode === "new" ? "جدید" : "جزئیات"}</span>
          </nav>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={closeForm}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="بازگشت"
                title="بازگشت به لیست"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
              <h1 className="text-xl font-semibold tracking-tight truncate">{title}</h1>
            </div>
            <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
              <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={() => exportJournalExcel()} title="خروجی اکسل">
                <FileSpreadsheet className="h-3.5 w-3.5 ml-1" />
                اکسل
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-8 shrink-0" onClick={() => exportJournalPdf()} title="خروجی PDF">
                <FileDown className="h-3.5 w-3.5 ml-1" />
                PDF
              </Button>
              <div className="w-px h-5 bg-border mx-0.5 shrink-0" aria-hidden />
              <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0" onClick={closeForm}>
                <X className="h-3.5 w-3.5 ml-1" />
                بستن
              </Button>
            </div>
          </div>
        </div>

        {draftRestoredAt ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
            <span>
              پیش‌نویس ذخیره‌نشده از جلسه قبل بازیابی شد
              {draftRestoredAt ? ` (${toFaDigits(draftRestoredAt.replace("T", " ").slice(0, 19))})` : ""}.
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-amber-900"
              onClick={() => {
                clearLocalDraft();
                setDescription("");
                setLines([emptyLine(), emptyLine()]);
                setDirty(false);
                setDraftRestoredAt(null);
              }}
            >
              شروع از صفر
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-2.5">

          {multiCompany && formMode === "new" && !viewOnly ? (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">شرکت</label>
              <select
                className="h-9 w-48 rounded-md border bg-background px-2 text-xs"
                value={formCompanyId || defaultOperateCompanyId}
                disabled={viewOnly || operableCompanyOptions.length <= 1}
                onChange={(e) => {
                  markDirty();
                  setFormCompanyId(e.target.value);
                  setFormBranchId("");
                }}
              >
                {operableCompanyOptions.length === 0 ? (
                  <option value="">--</option>
                ) : (
                  operableCompanyOptions.map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {(c as { name?: string; legal_name?: string }).name || (c as { legal_name?: string }).legal_name || c.company_id.slice(0, 8)}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : multiCompany && formMode && formMode !== "new" ? (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">شرکت</label>
              <div className="flex h-9 items-center text-xs text-muted-foreground px-1">
                {(() => {
                  const id = formCompanyId || primaryCompanyId;
                  const c = companyOptions.find((x) => x.company_id === id) as { name?: string; legal_name?: string } | undefined;
                  return c?.name || c?.legal_name || "—";
                })()}
              </div>
            </div>
          ) : null}
          <div className="space-y-1 min-w-[160px]">
            <label className="text-xs text-muted-foreground">شعبه (اختیاری)</label>
            {formMode === "new" && !viewOnly ? (
              <select
                className="h-9 w-full min-w-[160px] rounded-md border bg-background px-2 text-sm"
                value={formBranchId}
                onChange={(e) => {
                  markDirty();
                  setFormBranchId(e.target.value);
                }}
              >
                <option value="">بدون شعبه - سری شرکت</option>
                {branchOptions.map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {b.name || b.branch_id.slice(0, 8)}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex h-9 items-center px-1 text-xs text-muted-foreground">
                {formBranchId
                  ? branchOptions.find((b) => b.branch_id === formBranchId)?.name ||
                    formBranchId.slice(0, 8)
                  : "-"}
              </div>
            )}
          </div>
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
          <div className="space-y-1 min-w-[180px]">
            <label className="text-xs text-muted-foreground">دوره مالی</label>
            <OptionTypeahead
              valueId={periodId}
              displayLabel={periodId === DEMO_PERIOD_ID ? "دوره جاری (دمو)" : periodLabel(periodId)}
              options={[
                { id: DEMO_PERIOD_ID, label: "دوره جاری (دمو)", searchText: "دوره جاری دمو" },
              ]}
              placeholder="جستجوی دوره…"
              disabled={viewOnly}
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              onSelect={(id) => {
                markDirty();
                setPeriodId(id);
              }}
            />
          </div>
          <div className="space-y-1 flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">شرح سند</label>
            <div className="relative">
              <Input
                className="h-9 pe-8"
                placeholder="شرح کلی سند (خودکار روی سطرهای خالی)"
                value={description}
                disabled={viewOnly}
                onChange={(e) => {
                  const v = e.target.value;
                  markDirty();
                  setDescription((prevDesc) => {
                    setLines((linesPrev) =>
                      linesPrev.map((l) =>
                        !l.description.trim() || l.description === prevDesc
                          ? { ...l, description: v }
                          : l
                      )
                    );
                    return v;
                  });
                }}
              />
              {!viewOnly && description ? (
                <button
                  type="button"
                  className="absolute left-1.5 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground"
                  title="پاک کردن شرح"
                  onClick={() => {
                    markDirty();
                    setDescription((prevDesc) => {
                      setLines((linesPrev) =>
                        linesPrev.map((l) =>
                          !l.description.trim() || l.description === prevDesc
                            ? { ...l, description: "" }
                            : l
                        )
                      );
                      return "";
                    });
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">شماره</label>
            <div className="h-9 px-3 flex items-center rounded-md border bg-muted/40 text-xs text-muted-foreground tabular-nums">
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


        <div className="rounded-xl border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground bg-muted/30">
                <th className="px-2 py-1 w-10">#</th>
                <th className="px-2 py-1 min-w-[200px]">حساب</th>
                <th className="px-2 py-1 min-w-[120px]">شرح سطر</th>
                <th className="px-2 py-1 min-w-[8rem] w-32 text-sky-800 bg-sky-50/70">بدهکار</th>
                <th className="px-2 py-1 min-w-[8rem] w-32 text-emerald-800 bg-emerald-50/70">بستانکار</th>
                {costCenters.length > 0 ? (
                  <th className="px-2 py-1 min-w-[120px]">مرکز هزینه</th>
                ) : null}
                {businessUnits.length > 0 ? (
                  <th className="px-2 py-1 min-w-[120px]">واحد کسب‌وکار</th>
                ) : null}
                {!viewOnly ? <th className="px-2 py-1 w-10" /> : null}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, idx) => {
                const lineComplete =
                  !!l.account_id && (parseAmount(l.debit) > 0 || parseAmount(l.credit) > 0);
                return (
                <tr
                  key={l.key}
                  className={cn(
                    "border-b border-border/50 align-middle",
                    l.is_system_balance
                      ? "bg-amber-50/90 ring-1 ring-inset ring-amber-200/70"
                      : idx % 2 === 1
                        ? "bg-slate-100/90 dark:bg-muted/50"
                        : "bg-white dark:bg-background",
                    lineComplete && !l.is_system_balance && "border-s-[3px] border-s-emerald-500"
                  )}
                  title={l.is_system_balance ? "سطر تراز ساخته‌شده توسط سیستم" : undefined}
                >
                  <td className="px-2 py-1.5 text-xs text-muted-foreground tabular-nums">
                    <span className="inline-flex flex-col items-center gap-0.5">
                      {toFaDigits(idx + 1)}
                      {l.is_system_balance ? (
                        <span className="text-[9px] text-amber-700 font-medium">تراز</span>
                      ) : null}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 relative">
                    {viewOnly ? (
                      <span className="text-xs tabular-nums">{accountLabel(l.account_id)}</span>
                    ) : (
                      <AccountTypeahead
                        lineKey={l.key}
                        valueId={l.account_id}
                        label={l.account_id ? accountLabel(l.account_id) : ""}
                        options={postableAccounts}
                        recentIds={recentAccountIds}
                        focused={accountFocusKey === l.key}
                        query={accountFocusKey === l.key ? accountTypeQuery : ""}
                        highlightIdx={accountHighlightIdx}
                        onFocus={() => {
                          setAccountFocusKey(l.key);
                          setAccountTypeQuery("");
                          setAccountHighlightIdx(0);
                        }}
                        onQueryChange={(q) => {
                          setAccountFocusKey(l.key);
                          setAccountTypeQuery(q);
                          setAccountHighlightIdx(0);
                        }}
                        onHighlightChange={setAccountHighlightIdx}
                        onSelect={(id) => {
                          updateLine(l.key, { account_id: id });
                          rememberAccount(id);
                          setAccountFocusKey(null);
                          setAccountTypeQuery("");
                        }}
                        onBlurClose={() => {
                          setAccountFocusKey(null);
                          setAccountTypeQuery("");
                        }}
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      className="h-8 text-xs"
                      value={l.description}
                      disabled={viewOnly}
                      placeholder={description || "شرح"}
                      onChange={(e) => updateLine(l.key, { description: e.target.value })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      className={AMOUNT_INPUT_CLASS}
                      style={FORM_FONT}
                      dir="ltr"
                      inputMode="decimal"
                      value={l.debit ? formatAmountDisplay(l.debit) : ""}
                      disabled={viewOnly}
                      onChange={(e) => {
                        const raw = toAsciiDigits(e.target.value).replace(/,/g, "").replace(/[^0-9.]/g, "");
                        updateLine(l.key, { debit: raw });
                      }}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input
                      className={AMOUNT_INPUT_CLASS}
                      style={FORM_FONT}
                      dir="ltr"
                      inputMode="decimal"
                      value={l.credit ? formatAmountDisplay(l.credit) : ""}
                      disabled={viewOnly}
                      onChange={(e) => {
                        const raw = toAsciiDigits(e.target.value).replace(/,/g, "").replace(/[^0-9.]/g, "");
                        updateLine(l.key, { credit: raw });
                      }}
                    />
                  </td>
                  {costCenters.length > 0 ? (
                    <td className="px-2 py-1.5">
                      {viewOnly ? (
                        <span className="text-xs">
                          {costCenters.find((c) => c.cost_center_id === l.cost_center_id)?.name ?? "—"}
                        </span>
                      ) : (
                        <OptionTypeahead
                          valueId={l.cost_center_id}
                          displayLabel={
                            l.cost_center_id
                              ? (() => {
                                  const c = costCenters.find((x) => x.cost_center_id === l.cost_center_id);
                                  return c ? `${toFaDigits(c.code)} — ${c.name}` : "";
                                })()
                              : ""
                          }
                          options={[
                            { id: "", label: "—", searchText: "" },
                            ...costCenters.map((c) => ({
                              id: c.cost_center_id,
                              label: `${toFaDigits(c.code)} — ${c.name}`,
                              searchText: `${c.code} ${c.name}`,
                            })),
                          ]}
                          placeholder="مرکز هزینه…"
                          onSelect={(id) => updateLine(l.key, { cost_center_id: id })}
                        />
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
                        <OptionTypeahead
                          valueId={l.business_unit_id}
                          displayLabel={
                            l.business_unit_id
                              ? (() => {
                                  const b = businessUnits.find((x) => x.business_unit_id === l.business_unit_id);
                                  return b ? `${toFaDigits(b.code)} — ${b.name}` : "";
                                })()
                              : ""
                          }
                          options={[
                            { id: "", label: "—", searchText: "" },
                            ...businessUnits.map((b) => ({
                              id: b.business_unit_id,
                              label: `${toFaDigits(b.code)} — ${b.name}`,
                              searchText: `${b.code} ${b.name}`,
                            })),
                          ]}
                          placeholder="واحد کسب‌وکار…"
                          onSelect={(id) => updateLine(l.key, { business_unit_id: id })}
                        />
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
                );
              })}
            </tbody>
          </table>
          {!viewOnly ? (
            <div className="flex flex-wrap gap-2 p-2 border-t">
              <Button type="button" size="sm" variant="outline" onClick={addLine}>
                <Plus className="h-3.5 w-3.5 ml-1" />
                افزودن سطر
                <span className="mr-1 text-[10px] text-muted-foreground">F7</span>
              </Button>
              <Button type="button" size="sm" variant="secondary" onClick={fillBalanceOnLast}>
                تراز سند
                <span className="mr-1 text-[10px] text-muted-foreground">F4</span>
              </Button>
            </div>
          ) : null}
        </div>

        {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

        <div className="mt-auto shrink-0 border-t bg-background px-1 py-1.5">
          <div className="flex items-center gap-3 flex-nowrap min-h-8">
            <div className="flex items-center gap-x-2 gap-y-0 min-w-0 flex-1 overflow-hidden text-[11px] leading-tight whitespace-nowrap">
              <span className="text-sky-800 tabular-nums shrink min-w-0 truncate" title={formatMoney(lineTotals.debit)}>
                بدهکار: <strong>{formatMoney(lineTotals.debit)}</strong>
              </span>
              <span className="text-muted-foreground/40 shrink-0">│</span>
              <span className="text-emerald-800 tabular-nums shrink min-w-0 truncate" title={formatMoney(lineTotals.credit)}>
                بستانکار: <strong>{formatMoney(lineTotals.credit)}</strong>
              </span>
              <span className="text-muted-foreground/40 shrink-0">│</span>
              <span
                className={cn(
                  "tabular-nums font-medium shrink min-w-0 truncate",
                  isBalanced ? "text-emerald-700" : "text-amber-800",
                )}
                title={
                  isBalanced
                    ? "تراز"
                    : lineTotals.diff > 0
                      ? `بدهکار بیشتر: ${formatMoney(lineTotals.diff)}`
                      : `بستانکار بیشتر: ${formatMoney(Math.abs(lineTotals.diff))}`
                }
              >
                {isBalanced
                  ? "تراز ✓"
                  : lineTotals.diff > 0
                    ? `بدهکار+: ${formatMoney(lineTotals.diff)}`
                    : `بستانکار+: ${formatMoney(Math.abs(lineTotals.diff))}`}
              </span>
            </div>
            {!viewOnly ? (
              <div className="flex items-center gap-1.5 shrink-0">
                <Button type="button" variant="outline" size="sm" className="h-8" disabled={saving} onClick={() => void doSave(false)} title="F2">
                  پیش‌نویس
                  <span className="mr-1 text-[10px] text-muted-foreground">F2</span>
                </Button>
                {canPost ? (
                  <Button type="button" size="sm" className="h-8" disabled={saving || !isBalanced} onClick={() => void doSave(true)} title="F9">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : <CheckCircle2 className="h-3.5 w-3.5 ml-1" />}
                    ثبت قطعی
                    <span className="mr-1 text-[10px] opacity-80">F9</span>
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <Dialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>خروج از فرم</DialogTitle>
              <DialogDescription>
                تغییرات ذخیره‌نشده دارید. با خروج از این صفحه این تغییرات از بین می‌رود
                (پیش‌نویس محلی تا وقتی مرورگر را نبندید یا «شروع از صفر» نزنید نگه داشته می‌شود).
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLeaveConfirmOpen(false)}>
                ماندن
              </Button>
              <Button variant="destructive" onClick={confirmLeaveForm}>
                خروج بدون ذخیره
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="اسناد حسابداری"
        description="پیش‌نویس، ثبت قطعی و برگشت — با کنترل تراز"
        icon={<FileText className="h-4 w-4" />}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "اسناد" },
        ]}
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            {canCreate && canCreateOnAny ? (
              <Button type="button" size="sm" className="h-8" onClick={openNew}>
                <Plus className="h-4 w-4 ml-1" />
                سند جدید
              </Button>
            ) : null}
          </div>
        }
      />



      {(isTechnicalOwnerReadOnly || isGroupObserver || !canCreateOnAny) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
          دسترسی شما در این سطح فقط مشاهده و گزارش است؛ ثبت یا ویرایش سند روی شرکت‌های زیرمجموعه مجاز نیست.
        </div>
      )}
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-200 bg-sky-50/60 px-2 py-1.5 text-xs">
          <span className="text-sky-900">{toFaDigits(selectedIds.length)} مورد انتخاب شده</span>
          {showDeleted ? (
            canDelete ? (
              <Button
                type="button"
                size="sm"
                className="h-7"
                variant="secondary"
                disabled={restoreMut.isPending}
                onClick={() => void bulkRestoreSelected()}
              >
                بازیابی گروهی
              </Button>
            ) : null
          ) : (
            <>
              {canPost ? (
                <Button type="button" size="sm" className="h-7" variant="secondary" onClick={() => void bulkPostSelected()}>
                  ثبت قطعی گروهی
                </Button>
              ) : null}
              {canDelete ? (
                <Button type="button" size="sm" className="h-7" variant="destructive" onClick={requestBulkDelete}>
                  حذف پیش‌نویس‌ها
                </Button>
              ) : null}
            </>
          )}
          <Button type="button" size="sm" className="h-7" variant="ghost" onClick={() => setSelectedIds([])}>
            لغو انتخاب
          </Button>
        </div>
      ) : null}


      <div className="flex flex-wrap items-end gap-1.5 rounded-lg border bg-card px-2 py-1.5">
        {multiCompany ? (
          <div className="space-y-1 min-w-[180px]">
            <label className="text-xs text-muted-foreground">شرکت</label>
            <select
              className="h-8 w-full rounded-md border bg-background px-2 text-xs"
              value={listCompanyId}
              onChange={(e) => {
                setListCompanyId(e.target.value);
                setSelectedIds([]);
                setListPage(1);
              }}
            >
              <option value="">همه شرکت‌های مجاز</option>
              {companyOptions.map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {(c as { name?: string; legal_name?: string }).name || (c as { legal_name?: string }).legal_name || c.company_id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="space-y-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground">وضعیت</label>
          <OptionTypeahead
            valueId={statusFilter}
            displayLabel={
              !statusFilter
                ? `همه (${toFaDigits(statusCounts.all)})`
                : statusFilter === "DRAFT"
                  ? `پیش‌نویس (${toFaDigits(statusCounts.DRAFT)})`
                  : statusFilter === "POSTED"
                    ? `ثبت‌شده (${toFaDigits(statusCounts.POSTED)})`
                    : statusFilter === "REVERSED"
                      ? `برگشت‌خورده (${toFaDigits(statusCounts.REVERSED)})`
                      : statusFilter === "__DELETED__"
                        ? `حذف‌شده‌ها (${toFaDigits(statusCounts.DELETED)})`
                        : statusFilter
            }
            options={[
              { id: "", label: `همه (${toFaDigits(statusCounts.all)})`, searchText: "همه" },
              { id: "DRAFT", label: `پیش‌نویس (${toFaDigits(statusCounts.DRAFT)})`, searchText: "پیش‌نویس" },
              { id: "POSTED", label: `ثبت‌شده (${toFaDigits(statusCounts.POSTED)})`, searchText: "ثبت‌شده" },
              { id: "REVERSED", label: `برگشت‌خورده (${toFaDigits(statusCounts.REVERSED)})`, searchText: "برگشت" },
              {
                id: "__DELETED__",
                label: `حذف‌شده‌ها (${toFaDigits(statusCounts.DELETED)})`,
                searchText: "حذف شده سطل بازیافت",
              },
            ]}
            placeholder="وضعیت…"
            className="h-8 w-full rounded-md border bg-background px-2 text-xs"
            onSelect={setStatusFilter}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">دوره</label>
          <OptionTypeahead
            valueId={periodFilter}
            displayLabel={
              !periodFilter
                ? "همه دوره‌ها"
                : periodFilter === DEMO_PERIOD_ID
                  ? "دوره جاری (دمو)"
                  : periodLabel(periodFilter)
            }
            options={[
              { id: "", label: "همه دوره‌ها", searchText: "همه" },
              { id: DEMO_PERIOD_ID, label: "دوره جاری (دمو)", searchText: "دوره جاری دمو" },
            ]}
            placeholder="دوره…"
            className="h-8 w-full rounded-md border bg-background px-2 text-xs min-w-[120px]"
            onSelect={setPeriodFilter}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">از تاریخ</label>
          <ShamsiDatePicker value={dateFrom} onChange={setDateFrom} className="h-8 w-36" placeholder="از" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">تا تاریخ</label>
          <ShamsiDatePicker value={dateTo} onChange={setDateTo} className="h-8 w-36" placeholder="تا" />
        </div>
        <div className="space-y-1 flex-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground">جستجو</label>
          <div className="relative">
            <Input
              className="h-8 pe-7 text-xs"
              placeholder="شماره یا شرح…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search ? (
              <button
                type="button"
                className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center text-muted-foreground"
                onClick={() => setSearch("")}
                title="پاک کردن"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* نوار ابزار جدول: ستون‌ها + خروجی */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-xs text-muted-foreground">
          {filtered.length ? (
            <span>
              {toFaDigits(filtered.length)} سند
      {selectedIds.length > 0 ? (
                <span className="ms-2 text-foreground font-medium">
                  ({toFaDigits(selectedIds.length)} انتخاب‌شده)
                </span>
              ) : null}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="outline" className="h-8 text-xs">
                <Columns3 className="h-3.5 w-3.5 ml-1" />
                ستون‌ها
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-xs">نمایش ستون‌ها</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(
                [
                  ["number", "شماره"],
                  ["date", "تاریخ"],
                  ["period", "دوره"],
                  ["status", "وضعیت"],
                  ["branch", "شعبه"],
                  ["desc", "شرح"],
                  ["debit", "بدهکار"],
                  ["credit", "بستانکار"],
                ] as const
              ).map(([k, lab]) => (
                <DropdownMenuItem
                  key={k}
                  className="gap-2 text-xs"
                  onSelect={(e) => {
                    e.preventDefault();
                    setVisibleCols((prev) => ({ ...prev, [k]: prev[k] === false }));
                  }}
                >
                  <input
                    type="checkbox"
                    className="pointer-events-none"
                    readOnly
                    checked={visibleCols[k] !== false}
                  />
                  {lab}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="sm" variant="outline" className="h-8 text-xs">
                <FileDown className="h-3.5 w-3.5 ml-1" />
                خروجی
      {selectedIds.length > 0 ? (
                  <span className="ms-1 tabular-nums">({toFaDigits(selectedIds.length)})</span>
                ) : filtered.length > 0 ? (
                  <span className="ms-1 tabular-nums text-muted-foreground">({toFaDigits(filtered.length)})</span>
                ) : null}
                <ChevronDown className="h-3 w-3 mr-0.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel className="text-xs">
                {selectedIds.length > 0
                  ? `خروجی ${toFaDigits(selectedIds.length)} مورد انتخاب‌شده`
                  : `خروجی همه (${toFaDigits(filtered.length)})`}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="gap-2 text-xs" onSelect={() => exportListExcel()}>
                <FileSpreadsheet className="h-3.5 w-3.5" />
                اکسل (Excel)
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-2 text-xs" onSelect={() => exportListPdf()}>
                <FileDown className="h-3.5 w-3.5" />
                PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            {!showDeleted && canCreate && canOperateOn(formCompanyId || primaryCompanyId) ? (
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
                <th className="px-2 py-1 w-8">
                  <input
                    type="checkbox"
                    checked={paged.length > 0 && paged.every((j) => selectedIds.includes(j.journal_entry_id))}
                    onChange={toggleSelectAllPage}
                    aria-label="انتخاب همه صفحه"
                  />
                </th>
                {visibleCols.number !== false ? (
                  <th className="px-2 py-1 font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("number")}>
                      شماره{sortKey === "number" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}
                {visibleCols.date !== false ? (
                  <th className="px-2 py-1 font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("date")}>
                      تاریخ{sortKey === "date" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}
                {visibleCols.period !== false ? (
                  <th className="px-2 py-1 font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("period")}>
                      دوره{sortKey === "period" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}
                {visibleCols.status !== false ? (
                  <th className="px-2 py-1 font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("status")}>
                      وضعیت{sortKey === "status" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}
                {visibleCols.branch !== false ? (
                  <th className="px-2 py-1 font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("branch")}>
                      شعبه{sortKey === "branch" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}
                {visibleCols.desc !== false ? (
                  <th className="px-2 py-1 font-medium">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("desc")}>
                      شرح{sortKey === "desc" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}
                {visibleCols.debit !== false ? (
                  <th className="px-2 py-1 font-medium min-w-[7rem] text-sky-800">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-sky-900" onClick={() => toggleSort("debit")}>
                      بدهکار{sortKey === "debit" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}
                {visibleCols.credit !== false ? (
                  <th className="px-2 py-1 font-medium text-emerald-800">
                    <button type="button" className="inline-flex items-center gap-1 hover:text-emerald-900" onClick={() => toggleSort("credit")}>
                      بستانکار{sortKey === "credit" ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  </th>
                ) : null}
                {visibleCols.actions !== false ? <th className="px-2 py-1 font-medium">عملیات</th> : null}
              </tr>
            </thead>
            <tbody>
              {paged.map((j) => {
                const t = journalTotals(j);
                return (
                  <tr
                    key={j.journal_entry_id}
                    className="border-b border-border/50 hover:bg-muted/40"
                  >
                    <td className="px-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(j.journal_entry_id)}
                        onChange={() => toggleSelect(j.journal_entry_id)}
                        aria-label="انتخاب"
                      />
                    </td>
                    {visibleCols.number !== false ? (
                      <td className="px-2 py-1 text-xs font-medium tabular-nums">
                        <div className="flex flex-col gap-0.5">
                          <span>{displayJournalNumber(j)}</span>
                          {(j as JournalEntryDto).reverses_entry_id ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-normal text-muted-foreground">
                              <Undo2 className="h-2.5 w-2.5 shrink-0" />
                              برگشت از{" "}
                              {numberById.get((j as JournalEntryDto).reverses_entry_id!) || "—"}
                            </span>
                          ) : null}
                          {(j as JournalEntryDto).reversed_by_entry_id ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-normal text-muted-foreground">
                              <Link2 className="h-2.5 w-2.5 shrink-0" />
                              برگشت‌خورده با{" "}
                              {numberById.get((j as JournalEntryDto).reversed_by_entry_id!) || "—"}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                    {visibleCols.date !== false ? (
                      <td className="px-2 py-1 text-xs">{formatJalaliDate(j.document_date)}</td>
                    ) : null}
                    {visibleCols.period !== false ? (
                      <td className="px-2 py-1 text-xs">{periodLabel(j.period_id)}</td>
                    ) : null}
                    {visibleCols.status !== false ? (
                      <td className="px-2 py-1">
                        <span
                          className={cn(
                            "rounded border px-1.5 py-0.5 text-[10px] font-medium",
                            statusChip[j.status] ?? "bg-muted"
                          )}
                        >
                          {statusLabel[j.status] ?? j.status}
                        </span>
                      </td>
                    ) : null}
                    {visibleCols.branch !== false ? (
                      <td className="px-2 py-1 text-xs max-w-[120px] truncate">
                        {(j as { branch_id?: string | null }).branch_id
  ? (branchNameById.get((j as { branch_id: string }).branch_id) ?? "—")
  : (companyNameById.get(j.company_id) ?? "—")}
                      </td>
                    ) : null}
                    {visibleCols.desc !== false ? (
                      <td className="px-2 py-1 max-w-[180px] truncate text-xs">{j.description ?? "—"}</td>
                    ) : null}
                    {visibleCols.debit !== false ? (
                      <td className="px-2 py-1 tabular-nums text-xs">{t.debit ? formatMoney(t.debit) : "—"}</td>
                    ) : null}
                    {visibleCols.credit !== false ? (
                      <td className="px-2 py-1 tabular-nums text-xs">{t.credit ? formatMoney(t.credit) : "—"}</td>
                    ) : null}
                    {visibleCols.actions !== false ? (
                    <td className="px-2 py-1">
                      <div className="flex flex-wrap gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => void openEdit(j, j.status !== "DRAFT")}
                        >
                          {j.status === "DRAFT" && canUpdate && canOperateOn(j.company_id) ? (
                            <Pencil className="h-3.5 w-3.5" />
                          ) : (
                            "مشاهده"
                          )}
                        </Button>
                        {!showDeleted && canCreate && canOperateOn(formCompanyId || primaryCompanyId) ? (
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
                        {!showDeleted && j.status === "DRAFT" && canPost && canOperateOn(j.company_id) ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8"
                            disabled={postMut.isPending}
                            onClick={() =>
                              void postMut
                                .mutateAsync(j.journal_entry_id)
                                .then(() => toast.success("سند ثبت قطعی شد."))
                                .catch((e: Error) => toast.error(e.message))
                            }
                          >
                            ثبت قطعی
                          </Button>
                        ) : null}
                        {!showDeleted && j.status === "POSTED" && !j.reverses_entry_id && canReverse && canOperateOn(j.company_id) ? (
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
                        {showDeleted ? (
                          canDelete ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={restoreMut.isPending}
                              onClick={() => {
                                void restoreMut
                                  .mutateAsync(j.journal_entry_id)
                                  .then(() => toast.success("از سطل حذف بازیابی شد."))
                                  .catch((e: Error) => toast.error(e.message));
                              }}
                            >
                              بازیابی
                            </Button>
                          ) : null
                        ) : j.status === "DRAFT" && canDelete ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-destructive"
                            onClick={() => setDeleteTarget(j)}
                            title="حذف (فقط ایجادکننده یا مدیر)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-2">
            <span>
              {toFaDigits((listPage - 1) * pageSize + 1)}–
              {toFaDigits(Math.min(listPage * pageSize, filtered.length))} از {toFaDigits(filtered.length)}
            </span>
            <label className="flex items-center gap-1">
              <span className="text-muted-foreground">در صفحه</span>
              <select
                className="h-7 rounded-md border bg-background px-1.5 text-xs"
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setListPage(1);
                }}
              >
                {[10, 15, 25, 50].map((n) => (
                  <option key={n} value={n}>
                    {toFaDigits(n)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7"
              disabled={listPage <= 1}
              onClick={() => setListPage((pg) => Math.max(1, pg - 1))}
            >
              قبلی
            </Button>
            <span className="px-2 tabular-nums">
              {toFaDigits(listPage)} / {toFaDigits(totalPages)}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7"
              disabled={listPage >= totalPages}
              onClick={() => setListPage((pg) => Math.min(totalPages, pg + 1))}
            >
              بعدی
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف گروهی پیش‌نویس</DialogTitle>
            <DialogDescription>
              {toFaDigits(
                (data ?? []).filter((j) => selectedIds.includes(j.journal_entry_id) && j.status === "DRAFT").length
              )}{" "}
              پیش‌نویس انتخاب‌شده حذف نرم می‌شود. ادامه می‌دهید؟
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkDeleteConfirmOpen(false)}>
              انصراف
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmBulkDelete()}>
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reverseTarget} onOpenChange={(o) => !o && setReverseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>برگشت سند</DialogTitle>
            <DialogDescription>
              سند معکوس صادر و ثبت قطعی می‌شود؛ سند اصلی برگشت‌خورده می‌شود. سند برگشت دیگر قابل برگشت نیست.
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
                    toast.success("سند برگشت صادر شد.");
                    setReverseTarget(null);
                  })
                  .catch((e: Error) => toast.error(e.message));
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
                    toast.success("پیش‌نویس حذف شد.");
                    setDeleteTarget(null);
                  })
                  .catch((e: Error) => toast.error(e.message));
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
