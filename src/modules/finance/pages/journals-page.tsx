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
  FileSpreadsheet,
  FileDown,
} from "lucide-react";
import * as XLSX from "xlsx";
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
import { AccountTypeahead, OptionTypeahead } from "./journals-account-typeahead";
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
  /** سطر تراز ساخته‌شده توسط سیستم */
  is_system_balance?: boolean;
};

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
  const [recentAccountIds, setRecentAccountIds] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
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
    setAccountFocusKey(null);
    setAccountTypeQuery("");
  }

  function markDirty() {
    setDirty(true);
  }

  function rememberAccount(id: string) {
    if (!id) return;
    setRecentAccountIds((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, 8));
  }

  function closeForm() {
    if (dirty && !viewOnly) {
      setLeaveConfirmOpen(true);
      return;
    }
    setFormMode(null);
    setDirty(false);
  }

  function confirmLeaveForm() {
    setLeaveConfirmOpen(false);
    setDirty(false);
    setFormMode(null);
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
      setMsg("سند تراز است؛ سطر تراز سیستم حذف شد.");
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
      (diff > 0 ? "بستانکار تراز (سیستم)" : "بدهکار تراز (سیستم)");

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
      ["تاریخ سند", documentDate ? toFaDigits(documentDate) : "—"],
      ["دوره", periodLabel(periodId)],
      ["شرح", description || "—"],
      [],
    ];
  }

  function exportJournalExcel() {
    const meta = journalMetaRows();
    const wb = XLSX.utils.book_new();

    // شیت ۱: مشخصات
    const metaAoa: (string | number)[][] = [
      ["مشخصات سند حسابداری"],
      [],
      ...meta.filter((r) => r.length > 0),
      [],
      ["جمع بدهکار", lineTotals.debit],
      ["جمع بستانکار", lineTotals.credit],
      ["اختلاف", lineTotals.diff],
      ["وضعیت", isBalanced ? "تراز" : "نامتراز"],
    ];
    const wsMeta = XLSX.utils.aoa_to_sheet(metaAoa);
    wsMeta["!cols"] = [{ wch: 18 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsMeta, "مشخصات");

    // شیت ۲: سطرها
    const header = [
      "ردیف",
      "حساب",
      "شرح سطر",
      "بدهکار",
      "بستانکار",
      "مرکز هزینه",
      "واحد کسب‌وکار",
      "نوع سطر",
    ];
    const body = lines.map((l, idx) => [
      idx + 1,
      accountLabel(l.account_id),
      l.description || "",
      parseAmount(l.debit) || "",
      parseAmount(l.credit) || "",
      costCenters.find((c) => c.cost_center_id === l.cost_center_id)
        ? `${costCenters.find((c) => c.cost_center_id === l.cost_center_id)!.code} — ${costCenters.find((c) => c.cost_center_id === l.cost_center_id)!.name}`
        : "",
      businessUnits.find((b) => b.business_unit_id === l.business_unit_id)
        ? `${businessUnits.find((b) => b.business_unit_id === l.business_unit_id)!.code} — ${businessUnits.find((b) => b.business_unit_id === l.business_unit_id)!.name}`
        : "",
      l.is_system_balance ? "تراز سیستم" : "عادی",
    ]);
    const totalRow = [
      "",
      "",
      "جمع",
      lineTotals.debit,
      lineTotals.credit,
      "",
      "",
      "",
    ];
    const wsLines = XLSX.utils.aoa_to_sheet([header, ...body, [], totalRow]);
    wsLines["!cols"] = [
      { wch: 6 },
      { wch: 36 },
      { wch: 28 },
      { wch: 14 },
      { wch: 14 },
      { wch: 22 },
      { wch: 22 },
      { wch: 12 },
    ];
    // محدوده جدول برای خوانایی در اکسل
    if (wsLines["!ref"]) {
      wsLines["!autofilter"] = { ref: `A1:H${body.length + 1}` };
    }
    XLSX.utils.book_append_sheet(wb, wsLines, "سطرهای سند");
    XLSX.writeFile(wb, `journal-${entryNumber || "draft"}-${Date.now()}.xlsx`);
  }

  function exportJournalPdf() {
    const meta = journalMetaRows();
    const companyName = meta.find((r) => r[0] === "شرکت")?.[1] ?? "—";
    const userLabel = meta.find((r) => r[0] === "کاربر")?.[1] ?? "—";
    const now = meta.find((r) => r[0] === "زمان خروجی")?.[1] ?? "—";
    const orgName = meta.find((r) => r[0] === "سازمان")?.[1] ?? "—";

    const rowsHtml = lines
      .map((l, idx) => {
        const bg = l.is_system_balance ? "#fffbeb" : idx % 2 === 1 ? "#f8fafc" : "#fff";
        const cc = costCenters.find((c) => c.cost_center_id === l.cost_center_id);
        const bu = businessUnits.find((b) => b.business_unit_id === l.business_unit_id);
        return `<tr style="background:${bg}">
          <td class="c">${toFaDigits(idx + 1)}</td>
          <td>${accountLabel(l.account_id)}</td>
          <td>${l.description || "—"}</td>
          <td class="n">${parseAmount(l.debit) ? formatMoney(parseAmount(l.debit)) : "—"}</td>
          <td class="n">${parseAmount(l.credit) ? formatMoney(parseAmount(l.credit)) : "—"}</td>
          <td>${cc ? `${toFaDigits(cc.code)} — ${cc.name}` : "—"}</td>
          <td>${bu ? `${toFaDigits(bu.code)} — ${bu.name}` : "—"}</td>
          <td class="c">${l.is_system_balance ? "تراز" : "—"}</td>
        </tr>`;
      })
      .join("");

    const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/>
      <title>سند حسابداری ${entryNumber ? toFaDigits(entryNumber) : "پیش‌نویس"}</title>
      <style>
        *{box-sizing:border-box}
        body{font-family:Tahoma,Arial,sans-serif;padding:16px 20px;color:#111;font-size:11px}
        h1{font-size:15px;margin:0 0 10px;text-align:center}
        .meta{width:100%;border-collapse:collapse;margin-bottom:12px}
        .meta td{border:1px solid #cbd5e1;padding:4px 8px;vertical-align:top}
        .meta td.k{width:18%;background:#f1f5f9;font-weight:600;white-space:nowrap}
        .meta td.v{width:32%}
        table.lines{width:100%;border-collapse:collapse;font-size:10.5px;margin-top:4px}
        table.lines th,table.lines td{border:1px solid #94a3b8;padding:4px 6px;text-align:right}
        table.lines th{background:#e2e8f0;font-weight:600}
        td.n,th.n{text-align:left;font-variant-numeric:tabular-nums;direction:ltr}
        td.c,th.c{text-align:center}
        .totals{margin-top:10px;width:100%;border-collapse:collapse}
        .totals td{border:1px solid #94a3b8;padding:5px 8px}
        .totals td.k{background:#f1f5f9;font-weight:600;width:30%}
        @media print{body{padding:8px} a{display:none}}
      </style></head><body>
      <h1>سند حسابداری</h1>
      <table class="meta">
        <tr>
          <td class="k">شرکت</td><td class="v">${companyName}</td>
          <td class="k">سازمان</td><td class="v">${orgName}</td>
        </tr>
        <tr>
          <td class="k">شماره سند</td><td class="v">${entryNumber ? toFaDigits(entryNumber) : "پیش‌نویس"}</td>
          <td class="k">تاریخ سند</td><td class="v">${documentDate ? toFaDigits(documentDate) : "—"}</td>
        </tr>
        <tr>
          <td class="k">دوره مالی</td><td class="v">${periodLabel(periodId)}</td>
          <td class="k">کاربر</td><td class="v">${userLabel}</td>
        </tr>
        <tr>
          <td class="k">زمان خروجی</td><td class="v">${now}</td>
          <td class="k">وضعیت تراز</td><td class="v">${isBalanced ? "تراز ✓" : "نامتراز"}</td>
        </tr>
        <tr>
          <td class="k">شرح سند</td><td class="v" colspan="3">${description || "—"}</td>
        </tr>
      </table>
      <table class="lines">
        <thead>
          <tr>
            <th class="c">#</th>
            <th>حساب</th>
            <th>شرح سطر</th>
            <th class="n">بدهکار</th>
            <th class="n">بستانکار</th>
            <th>مرکز هزینه</th>
            <th>واحد کسب‌وکار</th>
            <th class="c">نوع</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <table class="totals">
        <tr><td class="k">جمع بدهکار</td><td class="n">${formatMoney(lineTotals.debit)}</td></tr>
        <tr><td class="k">جمع بستانکار</td><td class="n">${formatMoney(lineTotals.credit)}</td></tr>
        <tr><td class="k">اختلاف</td><td class="n">${formatMoney(lineTotals.diff)}</td></tr>
      </table>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) {
      setMsg("مرورگر پنجره چاپ را مسدود کرد.");
      return;
    }
    w.document.write(html);
    w.document.close();
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
        if (!saving && isBalanced && canPost) void doSave(true);
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

  if (formMode !== null) {
    const title =
      formMode === "new"
        ? "سند حسابداری جدید"
        : viewOnly
          ? "مشاهده سند"
          : "ویرایش پیش‌نویس";

    return (
      <div className="space-y-4" style={FORM_FONT}>
        <PageHeader
          title={title}
          className="pb-0"
          breadcrumbs={[
            { label: "حسابداری", href: "/dashboard/finance" },
            { label: "اسناد", href: "/dashboard/finance/journals" },
            { label: formMode === "new" ? "جدید" : "جزئیات" },
          ]}
        />

        <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-2.5">
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
            <Input
              className="h-9"
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
                <th className="px-2 py-1 min-w-[8rem] w-32">بدهکار</th>
                <th className="px-2 py-1 min-w-[8rem] w-32">بستانکار</th>
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
                        ? "bg-muted/35"
                        : "bg-background",
                    lineComplete && !l.is_system_balance && "bg-emerald-50/50"
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

        <div className="sticky bottom-0 z-10 mt-2 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex flex-col gap-2 px-1 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>
                بدهکار:{" "}
                <strong className="tabular-nums">{formatMoney(lineTotals.debit)}</strong>
              </span>
              <span>
                بستانکار:{" "}
                <strong className="tabular-nums">{formatMoney(lineTotals.credit)}</strong>
              </span>
              <span
                className={cn(
                  "font-medium",
                  isBalanced ? "text-emerald-700" : "text-amber-800"
                )}
              >
                {isBalanced
                  ? "تراز ✓"
                  : lineTotals.diff > 0
                    ? `بدهکار بیشتر: ${formatMoney(lineTotals.diff)}`
                    : `بستانکار بیشتر: ${formatMoney(Math.abs(lineTotals.diff))}`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => exportJournalExcel()}
                title="خروجی اکسل"
              >
                <FileSpreadsheet className="h-4 w-4 ml-1" />
                اکسل
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => exportJournalPdf()}
                title="خروجی PDF"
              >
                <FileDown className="h-4 w-4 ml-1" />
                PDF
              </Button>
              <Button type="button" variant="ghost" size="sm" className="h-9" onClick={closeForm}>
                <X className="h-4 w-4 ml-1" />
                بستن
              </Button>
              {!viewOnly ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9"
                    disabled={saving}
                    onClick={() => void doSave(false)}
                    title="F2"
                  >
                    ذخیره پیش‌نویس
                    <span className="mr-1 text-[10px] text-muted-foreground">F2</span>
                  </Button>
                  {canPost ? (
                    <Button
                      type="button"
                      size="sm"
                      className="h-9"
                      disabled={saving || !isBalanced}
                      onClick={() => void doSave(true)}
                      title="F9"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-1" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 ml-1" />
                      )}
                      ذخیره و ثبت قطعی
                      <span className="mr-1 text-[10px] opacity-80">F9</span>
                    </Button>
                  ) : null}
                </>
              ) : null}
            </div>
          </div>
        </div>

        <Dialog open={leaveConfirmOpen} onOpenChange={setLeaveConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>خروج از فرم</DialogTitle>
              <DialogDescription>
                تغییرات ذخیره‌نشده دارید. اگر خارج شوید این تغییرات از بین می‌رود.
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
                      : statusFilter
            }
            options={[
              { id: "", label: `همه (${toFaDigits(statusCounts.all)})`, searchText: "همه" },
              { id: "DRAFT", label: `پیش‌نویس (${toFaDigits(statusCounts.DRAFT)})`, searchText: "پیش‌نویس DRAFT" },
              { id: "POSTED", label: `ثبت‌شده (${toFaDigits(statusCounts.POSTED)})`, searchText: "ثبت‌شده POSTED" },
              { id: "REVERSED", label: `برگشت‌خورده (${toFaDigits(statusCounts.REVERSED)})`, searchText: "برگشت REVERSED" },
            ]}
            placeholder="وضعیت…"
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
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
            className="h-9 w-full rounded-md border bg-background px-2 text-sm min-w-[140px]"
            onSelect={setPeriodFilter}
          />
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
                <th className="px-3 py-2 font-medium min-w-[8rem]">بدهکار</th>
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
                    <td className="px-3 py-2 text-xs font-medium tabular-nums">
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
                    <td className="px-3 py-2 tabular-nums text-xs">
                      {t.debit ? formatMoney(t.debit) : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-xs">
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
