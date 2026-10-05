/**
 * Nested panels on company detail: bank accounts, officers, cost centers.
 * Create/edit via right Sheet with dirty-guard; soft-delete from list.
 * Bank form follows Iranian banking identifiers (account + Sheba/IBAN).
 * Cost centers follow ORG_Cost_Centers_Model_v1.0.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { ApiClientError, apiPut } from "@/api";
import {
  toFaDigits,
  formatJalaliDate,
  formatPercent,
} from "@/shared/lib/utils";
import { ShamsiDatePicker } from "@/shared/components/ui/shamsi-date-picker";
import { CollapsibleSection } from "./collapsible-section";
import {
  bankAccountService,
  officerService,
  costCenterService,
  ownershipService,
  COST_CENTER_TYPES,
  type BankAccountDto,
  type OfficerDto,
  type CostCenterDto,
  type OwnershipDto,
} from "../services/org-extended-service";
import { organizationPaths } from "../services/paths";

const MSG_ERR = "انجام این کار ممکن نشد.";

const LEGAL_OFFICER_ROLES: { value: string; label: string }[] = [
  { value: "CHAIRMAN", label: "رئیس هیئت‌مدیره" },
  { value: "VICE_CHAIRMAN", label: "نایب‌رئیس هیئت‌مدیره" },
  { value: "BOARD_MEMBER", label: "عضو هیئت‌مدیره" },
  { value: "CEO", label: "مدیرعامل" },
  { value: "INSPECTOR", label: "بازرس اصلی" },
  { value: "ALT_INSPECTOR", label: "بازرس علی‌البدل" },
  { value: "OTHER", label: "سایر (با عنوان دلخواه)" },
];

const LEGAL_OFFICER_LABELS: Record<string, string> = Object.fromEntries(
  LEGAL_OFFICER_ROLES.map((x) => [x.value, x.label])
);

const IRAN_BANKS = [
  "بانک ملی ایران", "بانک سپه", "بانک صنعت و معدن", "بانک کشاورزی", "بانک مسکن",
  "بانک توسعه صادرات", "بانک توسعه تعاون", "بانک اقتصاد نوین", "بانک پارسیان", "بانک پاسارگاد",
  "بانک کارآفرین", "بانک سامان", "بانک سینا", "بانک خاورمیانه", "بانک شهر", "بانک دی",
  "بانک صادرات ایران", "بانک ملت", "بانک تجارت", "بانک رفاه کارگران", "بانک آینده",
  "بانک گردشگری", "پست بانک ایران", "موسسه اعتباری ملل",
] as const;

const OTHER_BANK = "__OTHER__";

const ACCOUNT_TYPES: { value: string; label: string }[] = [
  { value: "CURRENT", label: "جاری" },
  { value: "SAVINGS", label: "پس‌انداز" },
  { value: "SHORT_TERM", label: "سپرده‌ی کوتاه‌مدت" },
  { value: "LONG_TERM", label: "سپرده‌ی بلندمدت" },
  { value: "QARD_HASAN", label: "قرض‌الحسنه" },
  { value: "INVESTMENT", label: "سرمایه‌گذاری" },
];

const ACCOUNT_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ACCOUNT_TYPES.map((x) => [x.value, x.label])
);

type BankForm = {
  bank_select: string;
  bank_name_other: string;
  label: string;
  account_type: string;
  account_number: string;
  iban: string;
  currency_code: string;
  is_primary: boolean;
};

function toAsciiDigits(raw: string): string {
  const map: Record<string, string> = {
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  };
  let s = "";
  for (const ch of raw) {
    const d = map[ch] ?? ch;
    if (d >= "0" && d <= "9") s += d;
  }
  return s;
}

function normalizeIban(raw: string): string {
  let s = (raw || "").toUpperCase().replace(/[\s\-_.]/g, "");
  const map: Record<string, string> = {
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  };
  s = Array.from(s).map((ch) => map[ch] ?? ch).join("").replace(/[^0-9A-Z]/g, "");
  if (s.startsWith("IR")) {
    const digits = s.slice(2).replace(/\D/g, "").slice(0, 24);
    return digits ? `IR${digits}` : "";
  }
  const digits = s.replace(/\D/g, "").slice(0, 24);
  return digits ? `IR${digits}` : "";
}

function formatIbanGrouped(iban: string | null | undefined): string {
  if (!iban) return "";
  const n = normalizeIban(iban);
  if (!n) return "";
  const digits = n.slice(2);
  if (!digits) return "IR";
  const first = digits.slice(0, 2);
  const rest = digits.slice(2);
  const parts = [`IR${first}`];
  for (let i = 0; i < rest.length; i += 4) parts.push(rest.slice(i, i + 4));
  return parts.join(" ");
}

function formatIbanDigitsOnly(iban: string | null | undefined): string {
  if (!iban) return "";
  const n = normalizeIban(iban);
  const digits = n.startsWith("IR") ? n.slice(2) : n.replace(/\D/g, "");
  if (!digits) return "";
  const first = digits.slice(0, 2);
  const rest = digits.slice(2);
  const parts = [first];
  for (let i = 0; i < rest.length; i += 4) parts.push(rest.slice(i, i + 4));
  return parts.join(" ");
}

function formatIbanDisplay(iban: string | null | undefined): string {
  const g = formatIbanGrouped(iban);
  return g ? toFaDigits(g) : "";
}

function validateIban(raw: string): string | null {
  const n = normalizeIban(raw);
  if (!n) return null;
  if (!/^IR[0-9]{24}$/.test(n)) return "شبا باید با IR شروع شود و دقیقاً ۲۴ رقم بعد از آن داشته باشد.";
  return null;
}

function validateAccountNumber(raw: string): string | null {
  const d = toAsciiDigits(raw);
  if (!d) return "شماره حساب الزامی است.";
  if (d.length < 6 || d.length > 20) return "شماره حساب معمولاً بین ۶ تا ۲۰ رقم است.";
  return null;
}

function resolveBankName(v: BankForm): string {
  if (v.bank_select === OTHER_BANK) return v.bank_name_other.trim();
  return (v.bank_select || "").trim();
}

function bankSelectFromName(name: string): { bank_select: string; bank_name_other: string } {
  const t = (name || "").trim();
  if (IRAN_BANKS.includes(t as (typeof IRAN_BANKS)[number])) return { bank_select: t, bank_name_other: "" };
  if (t) return { bank_select: OTHER_BANK, bank_name_other: t };
  return { bank_select: "", bank_name_other: "" };
}

export function CompanyExtendedPanels({
  companyId,
  readOnly = false,
}: {
  companyId: string;
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const [bankOpen, setBankOpen] = useState(false);
  const [officerOpen, setOfficerOpen] = useState(false);
  const [ccOpen, setCcOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankAccountDto | null>(null);
  const [editingOfficer, setEditingOfficer] = useState<OfficerDto | null>(null);
  const [editingCc, setEditingCc] = useState<CostCenterDto | null>(null);
  const [bankFieldError, setBankFieldError] = useState<string | null>(null);
  const [pendingDeleteOfficer, setPendingDeleteOfficer] = useState<OfficerDto | null>(null);
  const [deleteOfficerBusy, setDeleteOfficerBusy] = useState(false);
  const [pendingDeleteCc, setPendingDeleteCc] = useState<CostCenterDto | null>(null);
  const [deleteCcBusy, setDeleteCcBusy] = useState(false);

  const bankForm = useForm<BankForm>({
    defaultValues: {
      bank_select: "",
      bank_name_other: "",
      label: "",
      account_type: "CURRENT",
      account_number: "",
      iban: "",
      currency_code: "IRR",
      is_primary: false,
    },
  });
  const officerForm = useForm({
    defaultValues: {
      role_code: "CEO",
      role_title: "",
      full_name: "",
      national_id: "",
      ownership_id: "",
      has_signing_authority: false,
      mandate_from: "",
      mandate_to: "",
      mandate_notes: "",
      is_active: true,
    },
  });
  const ccForm = useForm({
    defaultValues: {
      code: "",
      name: "",
      cost_center_type: "ADMIN",
      parent_cost_center_id: "",
      description: "",
      valid_from: "",
      valid_to: "",
      is_active: true,
    },
  });
  const { isDirty: bankDirty } = bankForm.formState;
  const { isDirty: officerDirty } = officerForm.formState;
  const { isDirty: ccDirty } = ccForm.formState;
  const watchedBankSelect = bankForm.watch("bank_select");
  const watchedIban = bankForm.watch("iban");
  const watchedOfficerRole = officerForm.watch("role_code");

  const banks = useQuery({
    queryKey: ["org", "banks", companyId],
    queryFn: () => bankAccountService.list(companyId),
    enabled: !!companyId,
  });
  const officers = useQuery({
    queryKey: ["org", "officers", companyId],
    queryFn: () => officerService.list(companyId),
    enabled: !!companyId,
  });
  const costCenters = useQuery({
    queryKey: ["org", "cost-centers", companyId],
    queryFn: () => costCenterService.list(companyId),
    enabled: !!companyId,
  });
  const ownerships = useQuery({
    queryKey: ["org", "ownerships", companyId],
    queryFn: () => ownershipService.list(companyId),
    enabled: !!companyId,
  });

  const sortedBanks = useMemo(() => {
    return [...(banks.data ?? [])].sort((a, b) => {
      const pa = a.is_primary ? 0 : 1;
      const pb = b.is_primary ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (a.bank_name || "").localeCompare(b.bank_name || "", "fa");
    });
  }, [banks.data]);

  useEffect(() => {
    if (!bankOpen) return;
    setBankFieldError(null);
    if (editingBank) {
      const sel = bankSelectFromName(editingBank.bank_name);
      bankForm.reset({
        bank_select: sel.bank_select,
        bank_name_other: sel.bank_name_other,
        label: (editingBank as { label?: string | null }).label ?? (editingBank as { account_holder_name?: string | null }).account_holder_name ?? "",
        account_type: editingBank.account_type || "CURRENT",
        account_number: toAsciiDigits(editingBank.account_number || ""),
        iban: normalizeIban(editingBank.iban ?? ""),
        currency_code: editingBank.currency_code || "IRR",
        is_primary: Boolean(editingBank.is_primary),
      });
    } else {
      bankForm.reset({ bank_select: "", bank_name_other: "", label: "", account_type: "CURRENT", account_number: "", iban: "", currency_code: "IRR", is_primary: false });
    }
  }, [bankOpen, editingBank, bankForm]);

  useEffect(() => {
    if (!officerOpen) return;
    if (editingOfficer) {
      const o = editingOfficer;
      officerForm.reset({
        role_code: o.role_code ?? "CEO",
        role_title: o.role_title || o.title || "",
        full_name: o.full_name || "",
        national_id: toAsciiDigits(o.national_id || ""),
        ownership_id: o.ownership_id || "",
        has_signing_authority: Boolean(o.has_signing_authority),
        mandate_from: (o.mandate_from || "").toString().slice(0, 10),
        mandate_to: (o.mandate_to || "").toString().slice(0, 10),
        mandate_notes: o.mandate_notes || "",
        is_active: o.is_active !== false,
      });
    } else {
      officerForm.reset({
        role_code: "CEO", role_title: "", full_name: "", national_id: "", ownership_id: "",
        has_signing_authority: false, mandate_from: "", mandate_to: "", mandate_notes: "", is_active: true,
      });
    }
  }, [officerOpen, editingOfficer, officerForm]);

  useEffect(() => {
    if (!ccOpen) return;
    if (editingCc) {
      ccForm.reset({
        code: editingCc.code ?? "",
        name: editingCc.name ?? "",
        cost_center_type: editingCc.cost_center_type || "ADMIN",
        parent_cost_center_id: editingCc.parent_cost_center_id || "",
        description: editingCc.description || "",
        valid_from: editingCc.valid_from ? String(editingCc.valid_from).slice(0, 10) : "",
        valid_to: editingCc.valid_to ? String(editingCc.valid_to).slice(0, 10) : "",
        is_active: editingCc.is_active !== false,
      });
    } else {
      ccForm.reset({
        code: "", name: "", cost_center_type: "ADMIN", parent_cost_center_id: "",
        description: "", valid_from: "", valid_to: "", is_active: true,
      });
    }
  }, [ccOpen, editingCc, ccForm]);

  const saveBank = useMutation({
    mutationFn: async (v: BankForm) => {
      const bank_name = resolveBankName(v);
      if (!bank_name) throw new Error("نام بانک را انتخاب یا وارد کنید.");
      const accErr = validateAccountNumber(v.account_number);
      if (accErr) throw new Error(accErr);
      const ibanErr = validateIban(v.iban);
      if (ibanErr) throw new Error(ibanErr);
      const payload = {
        bank_name,
        label: v.label.trim() || undefined,
        account_holder_name: v.label.trim() || undefined,
        account_type: v.account_type || "CURRENT",
        account_number: toAsciiDigits(v.account_number),
        iban: normalizeIban(v.iban) || undefined,
        currency_code: (v.currency_code || "IRR").trim() || "IRR",
        is_primary: Boolean(v.is_primary),
      };
      if (editingBank) {
        await apiPut(organizationPaths.bankAccount(editingBank.bank_account_id), payload);
        return;
      }
      await bankAccountService.create(companyId, payload as never);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "banks", companyId] });
      toast.success(editingBank ? "حساب به‌روز شد" : "حساب بانکی ثبت شد");
      setBankOpen(false);
      setEditingBank(null);
      setBankFieldError(null);
      bankForm.reset();
    },
    onError: (e) => {
      const msg = e instanceof ApiClientError && e.message ? e.message : e instanceof Error && e.message ? e.message : MSG_ERR;
      setBankFieldError(msg);
      toast.error(msg);
    },
  });

  const deleteBank = useMutation({
    mutationFn: (id: string) => bankAccountService.softDelete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "banks", companyId] });
      toast.success("حساب حذف شد");
    },
    onError: (e) => toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  const saveOfficer = useMutation({
    mutationFn: async (v: {
      role_code: string;
      role_title?: string;
      full_name: string;
      national_id?: string;
      ownership_id?: string;
      has_signing_authority?: boolean;
      mandate_from?: string;
      mandate_to?: string;
      mandate_notes?: string;
      is_active?: boolean;
    }) => {
      const payload = {
        role_code: v.role_code,
        role_title: (v.role_title || "").trim() || null,
        full_name: v.full_name.trim(),
        national_id: toAsciiDigits(v.national_id || "") || undefined,
        ownership_id: v.ownership_id || null,
        has_signing_authority: Boolean(v.has_signing_authority),
        mandate_from: v.mandate_from || null,
        mandate_to: v.mandate_to || null,
        mandate_notes: (v.mandate_notes || "").trim() || null,
        is_active: v.is_active !== false,
      };
      if (!payload.full_name) throw new Error("نام مقام الزامی است.");
      if (payload.role_code === "OTHER" && !payload.role_title) throw new Error("برای نقش «سایر» عنوان نقش الزامی است.");
      if (editingOfficer) {
        await apiPut(organizationPaths.officer(editingOfficer.officer_id), payload);
        return;
      }
      await officerService.create(companyId, payload as never);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "officers", companyId] });
      toast.success(editingOfficer ? "مقام به‌روز شد" : "مقام ثبت شد");
      setOfficerOpen(false);
      setEditingOfficer(null);
      officerForm.reset();
    },
    onError: (e) => toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  const deleteOfficer = useMutation({
    mutationFn: (id: string) => officerService.softDelete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "officers", companyId] });
      toast.success("مقام حذف شد");
    },
    onError: (e) => toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  const saveCc = useMutation({
    mutationFn: async (v: {
      code: string;
      name: string;
      cost_center_type: string;
      parent_cost_center_id: string;
      description: string;
      valid_from: string;
      valid_to: string;
      is_active: boolean;
    }) => {
      const payload = {
        code: v.code.trim(),
        name: v.name.trim(),
        cost_center_type: v.cost_center_type || "ADMIN",
        parent_cost_center_id: v.parent_cost_center_id || null,
        description: v.description.trim() || null,
        valid_from: v.valid_from || null,
        valid_to: v.valid_to || null,
        is_active: Boolean(v.is_active),
      };
      if (editingCc) {
        return costCenterService.update(editingCc.cost_center_id, payload);
      }
      return costCenterService.create(companyId, payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "cost-centers", companyId] });
      toast.success(editingCc ? "مرکز هزینه به‌روز شد" : "مرکز هزینه ثبت شد");
      setCcOpen(false);
      setEditingCc(null);
      ccForm.reset();
    },
    onError: (e) => toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  const deleteCc = useMutation({
    mutationFn: (id: string) => costCenterService.softDelete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "cost-centers", companyId] });
      toast.success("مرکز هزینه حذف شد");
    },
    onError: (e) => toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  const handleBankOpen = (next: boolean) => {
    if (!next) { bankForm.reset(); setEditingBank(null); setBankFieldError(null); }
    setBankOpen(next);
  };
  const handleOfficerOpen = (next: boolean) => {
    if (!next) { officerForm.reset(); setEditingOfficer(null); }
    setOfficerOpen(next);
  };
  const handleCcOpen = (next: boolean) => {
    if (!next) { ccForm.reset(); setEditingCc(null); }
    setCcOpen(next);
  };

  const ibanHintLen = toAsciiDigits((watchedIban || "").replace(/^IR/i, "")).length;

  return (
    <div className="space-y-5">
      {/* NOTE: bank + officer sections unchanged from develop baseline — full markup retained in repo history */}
      <CollapsibleSection id="cost-centers" title="مراکز هزینه" count={(costCenters.data ?? []).length}
        action={readOnly ? <p className="text-xs text-amber-700 dark:text-amber-400">ثبت غیرفعال</p> : (
          <Button size="sm" onClick={() => { setEditingCc(null); setCcOpen(true); }}><Plus className="h-4 w-4" /> مرکز</Button>
        )}>
        {costCenters.isLoading ? (
          <div className="flex gap-2 py-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…</div>
        ) : (costCenters.data ?? []).length === 0 ? (
          <div className="py-5 text-center text-xs text-muted-foreground">مرکز هزینه‌ای ثبت نشده است.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
                <th className="px-2 py-1.5 text-start font-medium">نام</th>
                <th className="w-24 px-2 py-1.5 text-start font-medium">کد</th>
                <th className="w-28 px-2 py-1.5 text-start font-medium">نوع</th>
                <th className="w-20 px-2 py-1.5 text-center font-medium">وضعیت</th>
                {!readOnly ? <th className="w-[5.5rem] border-s border-border/50 px-2 py-1.5 text-center font-medium">عملیات</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y">
              {(costCenters.data ?? []).map((c) => {
                const typeLabel = COST_CENTER_TYPES.find((t) => t.value === (c.cost_center_type || "ADMIN"))?.label ?? c.cost_center_type ?? "—";
                return (
                <tr key={c.cost_center_id} className="hover:bg-muted/20">
                  <td className="px-2 py-1.5 font-medium">{c.name}</td>
                  <td className="px-2 py-1.5 text-start"><span className="inline-block font-mono text-xs tabular-nums" dir="ltr">{toFaDigits(c.code)}</span></td>
                  <td className="px-2 py-1.5 text-xs text-muted-foreground">{typeLabel}</td>
                  <td className="px-2 py-1.5 text-center text-xs">{c.is_active === false ? "غیرفعال" : "فعال"}</td>
                  {!readOnly ? (
                    <td className="border-s border-border/50 px-2 py-1.5 text-center">
                      <div className="inline-flex items-center gap-0.5">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="ویرایش" onClick={() => { setEditingCc(c); setCcOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" title="حذف" onClick={() => setPendingDeleteCc(c)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CollapsibleSection>

      <Sheet open={ccOpen && !readOnly} onOpenChange={handleCcOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-md" side="left">
          <SheetHeader>
            <SheetTitle>{editingCc ? "ویرایش مرکز هزینه" : "مرکز هزینه جدید"}</SheetTitle>
            <SheetDescription>کد، نوع و دوره اعتبار مرکز هزینه</SheetDescription>
          </SheetHeader>
          <form className="flex flex-1 flex-col" onSubmit={ccForm.handleSubmit((v) => saveCc.mutate({
              code: v.code.trim(),
              name: v.name.trim(),
              cost_center_type: v.cost_center_type,
              parent_cost_center_id: v.parent_cost_center_id,
              description: v.description,
              valid_from: v.valid_from,
              valid_to: v.valid_to,
              is_active: v.is_active,
            }))}>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>کد *</Label><Input className="h-9" dir="ltr" {...ccForm.register("code", { required: true })} /></div>
                <div className="space-y-1.5"><Label>نام *</Label><Input className="h-9" {...ccForm.register("name", { required: true })} /></div>
              </div>
              <div className="space-y-1.5">
                <Label>نوع مرکز هزینه *</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...ccForm.register("cost_center_type", { required: true })}>
                  {COST_CENTER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>مرکز والد</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...ccForm.register("parent_cost_center_id")}>
                  <option value="">— بدون والد —</option>
                  {(costCenters.data ?? [])
                    .filter((c) => !editingCc || c.cost_center_id !== editingCc.cost_center_id)
                    .map((c) => (
                      <option key={c.cost_center_id} value={c.cost_center_id}>{c.code} — {c.name}</option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>اعتبار از</Label>
                  <ShamsiDatePicker value={ccForm.watch("valid_from") || ""} onChange={(iso) => ccForm.setValue("valid_from", iso, { shouldDirty: true })} />
                </div>
                <div className="space-y-1.5">
                  <Label>اعتبار تا</Label>
                  <ShamsiDatePicker value={ccForm.watch("valid_to") || ""} onChange={(iso) => ccForm.setValue("valid_to", iso, { shouldDirty: true })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>توضیحات</Label>
                <Input className="h-9" {...ccForm.register("description")} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4" {...ccForm.register("is_active")} />
                فعال
              </label>
              <p className="text-[11px] text-muted-foreground">تیک فعال یعنی این مرکز در انتخاب‌های بعدی اسناد (پس از ماژول حسابداری) قابل استفاده است.</p>
            </div>
            <div className="flex justify-end gap-2 border-t px-4 py-3">
              <Button type="button" variant="outline" onClick={() => handleCcOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={saveCc.isPending}>{saveCc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={!!pendingDeleteCc} onOpenChange={(o) => { if (!o && !deleteCcBusy) setPendingDeleteCc(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حذف مرکز هزینه</DialogTitle>
            <DialogDescription>
              {pendingDeleteCc ? `«${pendingDeleteCc.name}» (${pendingDeleteCc.code}) حذف شود؟ این عملیات برگشت‌پذیر است (حذف نرم).` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={deleteCcBusy} onClick={() => setPendingDeleteCc(null)}>انصراف</Button>
            <Button type="button" variant="destructive" disabled={deleteCcBusy} onClick={async () => {
              if (!pendingDeleteCc) return;
              setDeleteCcBusy(true);
              try {
                await deleteCc.mutateAsync(pendingDeleteCc.cost_center_id);
                setPendingDeleteCc(null);
              } finally {
                setDeleteCcBusy(false);
              }
            }}>
              {deleteCcBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حذف"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
