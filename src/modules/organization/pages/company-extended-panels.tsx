/**
 * Nested panels on company detail: bank accounts, officers, cost centers.
 * Create/edit via right Sheet with dirty-guard; soft-delete from list.
 * Bank form follows Iranian banking identifiers (account + Sheba/IBAN).
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
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { ApiClientError, apiPut } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import { CollapsibleSection } from "./collapsible-section";
import {
  bankAccountService,
  officerService,
  costCenterService,
  type BankAccountDto,
  type OfficerDto,
  type CostCenterDto,
} from "../services/org-extended-service";
import { organizationPaths } from "../services/paths";

const MSG_ERR = "انجام این کار ممکن نشد.";

const IRAN_BANKS = [
  "بانک ملی ایران",
  "بانک سپه",
  "بانک صنعت و معدن",
  "بانک کشاورزی",
  "بانک مسکن",
  "بانک توسعه صادرات",
  "بانک توسعه تعاون",
  "بانک اقتصاد نوین",
  "بانک پارسیان",
  "بانک پاسارگاد",
  "بانک کارآفرین",
  "بانک سامان",
  "بانک سینا",
  "بانک خاورمیانه",
  "بانک شهر",
  "بانک دی",
  "بانک صادرات ایران",
  "بانک ملت",
  "بانک تجارت",
  "بانک رفاه کارگران",
  "بانک آینده",
  "بانک گردشگری",
  "پست بانک ایران",
  "موسسه اعتباری ملل",
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
  let s = (raw || "").toUpperCase().replace(/\s+/g, "");
  s = s.replace(/[^0-9IR]/g, "");
  const digitsOnly = toAsciiDigits(s.replace(/^IR/i, ""));
  if (!digitsOnly) return "";
  return `IR${digitsOnly.slice(0, 24)}`;
}

function formatIbanDisplay(iban: string | null | undefined): string {
  if (!iban) return "";
  const n = normalizeIban(iban);
  if (n.length < 4) return toFaDigits(n);
  const body = n.slice(2);
  const parts = [n.slice(0, 4)];
  for (let i = 0; i < body.length; i += 4) {
    parts.push(body.slice(i, i + 4));
  }
  return toFaDigits(parts.join(" "));
}

function validateIban(raw: string): string | null {
  const n = normalizeIban(raw);
  if (!n) return null;
  if (!/^IR[0-9]{24}$/.test(n)) {
    return "شبا باید با IR شروع شود و دقیقاً ۲۴ رقم بعد از آن داشته باشد.";
  }
  return null;
}

function validateAccountNumber(raw: string): string | null {
  const d = toAsciiDigits(raw);
  if (!d) return "شماره حساب الزامی است.";
  if (d.length < 6 || d.length > 20) {
    return "شماره حساب معمولاً بین ۶ تا ۲۰ رقم است.";
  }
  return null;
}

function resolveBankName(v: BankForm): string {
  if (v.bank_select === OTHER_BANK) return v.bank_name_other.trim();
  return (v.bank_select || "").trim();
}

function bankSelectFromName(name: string): { bank_select: string; bank_name_other: string } {
  const t = (name || "").trim();
  if (IRAN_BANKS.includes(t as (typeof IRAN_BANKS)[number])) {
    return { bank_select: t, bank_name_other: "" };
  }
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

  const bankForm = useForm<BankForm>({
    defaultValues: {
      bank_select: "",
      bank_name_other: "",
      account_type: "CURRENT",
      account_number: "",
      iban: "",
      currency_code: "IRR",
      is_primary: false,
    },
  });
  const officerForm = useForm({
    defaultValues: { role_code: "CEO", full_name: "", role_title: "" },
  });
  const ccForm = useForm({ defaultValues: { code: "", name: "" } });

  const { isDirty: bankDirty } = bankForm.formState;
  const { isDirty: officerDirty } = officerForm.formState;
  const { isDirty: ccDirty } = ccForm.formState;
  const watchedBankSelect = bankForm.watch("bank_select");
  const watchedIban = bankForm.watch("iban");

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
        account_type: editingBank.account_type || "CURRENT",
        account_number: toAsciiDigits(editingBank.account_number || ""),
        iban: normalizeIban(editingBank.iban ?? ""),
        currency_code: editingBank.currency_code || "IRR",
        is_primary: Boolean(editingBank.is_primary),
      });
    } else {
      bankForm.reset({
        bank_select: "",
        bank_name_other: "",
        account_type: "CURRENT",
        account_number: "",
        iban: "",
        currency_code: "IRR",
        is_primary: false,
      });
    }
  }, [bankOpen, editingBank, bankForm]);

  useEffect(() => {
    if (!officerOpen) return;
    if (editingOfficer) {
      officerForm.reset({
        role_code: (editingOfficer as { role_code?: string }).role_code ?? "CEO",
        full_name: editingOfficer.full_name,
        role_title:
          (editingOfficer as { role_title?: string }).role_title ??
          editingOfficer.title ??
          "",
      });
    } else {
      officerForm.reset({ role_code: "CEO", full_name: "", role_title: "" });
    }
  }, [officerOpen, editingOfficer, officerForm]);

  useEffect(() => {
    if (!ccOpen) return;
    if (editingCc) {
      ccForm.reset({ code: editingCc.code, name: editingCc.name });
    } else {
      ccForm.reset({ code: "", name: "" });
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
      await bankAccountService.create(companyId, payload);
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
      const msg =
        e instanceof ApiClientError && e.message
          ? e.message
          : e instanceof Error && e.message
            ? e.message
            : MSG_ERR;
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
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  const saveOfficer = useMutation({
    mutationFn: async (v: {
      role_code: string;
      full_name: string;
      role_title?: string;
    }) => {
      if (editingOfficer) {
        await apiPut(organizationPaths.officer(editingOfficer.officer_id), v);
        return;
      }
      await officerService.create(companyId, v as { full_name: string; title?: string });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "officers", companyId] });
      toast.success(editingOfficer ? "مقام به‌روز شد" : "مقام ثبت شد");
      setOfficerOpen(false);
      setEditingOfficer(null);
      officerForm.reset({ role_code: "CEO", full_name: "", role_title: "" });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  const deleteOfficer = useMutation({
    mutationFn: (id: string) => officerService.softDelete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "officers", companyId] });
      toast.success("مقام حذف شد");
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  const saveCc = useMutation({
    mutationFn: async (v: { code: string; name: string }) => {
      if (editingCc) {
        await apiPut(
          `${organizationPaths.companyCostCenters(companyId)}/${editingCc.cost_center_id}`,
          v
        );
        return;
      }
      await costCenterService.create(companyId, v);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "cost-centers", companyId] });
      toast.success(editingCc ? "مرکز هزینه به‌روز شد" : "مرکز هزینه ثبت شد");
      setCcOpen(false);
      setEditingCc(null);
      ccForm.reset();
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  const handleBankOpen = (next: boolean) => {
    if (!next) {
      bankForm.reset();
      setEditingBank(null);
      setBankFieldError(null);
    }
    setBankOpen(next);
  };
  const handleOfficerOpen = (next: boolean) => {
    if (!next) {
      officerForm.reset();
      setEditingOfficer(null);
    }
    setOfficerOpen(next);
  };
  const handleCcOpen = (next: boolean) => {
    if (!next) {
      ccForm.reset();
      setEditingCc(null);
    }
    setCcOpen(next);
  };

  const ibanHintLen = toAsciiDigits((watchedIban || "").replace(/^IR/i, "")).length;

  return (
    <div className="space-y-5">
      <CollapsibleSection
        id="bank-accounts"
        title="حساب‌های بانکی"
        subtitle="شماره حساب و شبا مطابق استاندارد بانکی ایران"
        count={sortedBanks.length}
        action={
          readOnly ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">ثبت غیرفعال</p>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setEditingBank(null);
                setBankOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> حساب
            </Button>
          )
        }
      >
        {banks.isLoading ? (
          <div className="flex gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : sortedBanks.length === 0 ? (
          <div className="py-5 text-center text-xs text-muted-foreground">
            حساب بانکی ثبت نشده است.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
                <th className="px-2 py-1.5 text-start font-medium">بانک</th>
                <th className="w-24 px-2 py-1.5 text-start font-medium">نوع</th>
                <th className="px-2 py-1.5 text-start font-medium">شماره حساب</th>
                <th className="hidden px-2 py-1.5 text-start font-medium md:table-cell">شبا</th>
                <th className="w-16 px-1 py-1.5 text-center font-medium">اصلی</th>
                {!readOnly ? <th className="w-16 px-1 py-1.5 text-end font-medium" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedBanks.map((b) => (
                <tr key={b.bank_account_id} className="hover:bg-muted/20">
                  <td className="px-2 py-1.5 text-start">
                    <div className="font-medium">{b.bank_name}</div>
                    {b.currency_code && b.currency_code !== "IRR" ? (
                      <div className="text-[10px] text-muted-foreground">{b.currency_code}</div>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5 text-start text-xs text-muted-foreground">
                    {ACCOUNT_TYPE_LABELS[b.account_type ?? "CURRENT"] ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-start">
                    <span className="inline-block font-mono text-xs tabular-nums" dir="ltr">
                      {toFaDigits(b.account_number)}
                    </span>
                  </td>
                  <td className="hidden px-2 py-1.5 text-start text-muted-foreground md:table-cell">
                    {b.iban ? (
                      <span className="inline-block font-mono text-[11px] tabular-nums" dir="ltr">
                        {formatIbanDisplay(b.iban)}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    {b.is_primary ? (
                      <StatusChip label="بله" tone="warning" />
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </td>
                  {!readOnly ? (
                    <td className="px-1 py-1.5 text-end">
                      <div className="inline-flex">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingBank(b);
                            setBankOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => {
                            if (!window.confirm("حساب حذف شود؟")) return;
                            deleteBank.mutate(b.bank_account_id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="officers"
        title="مقامات شرکت"
        subtitle="اعضای هیئت‌مدیره و مدیران ارشد"
        count={(officers.data ?? []).length}
        action={
          readOnly ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">ثبت غیرفعال</p>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setEditingOfficer(null);
                setOfficerOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> مقام
            </Button>
          )
        }
      >
        {officers.isLoading ? (
          <div className="flex gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : (officers.data ?? []).length === 0 ? (
          <div className="py-5 text-center text-xs text-muted-foreground">مقامی ثبت نشده است.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
                <th className="px-2 py-1.5 text-start font-medium">نام</th>
                <th className="px-2 py-1.5 text-start font-medium">نقش</th>
                {!readOnly ? <th className="w-16 px-1 py-1.5 text-end font-medium" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y">
              {(officers.data ?? []).map((o) => (
                <tr key={o.officer_id} className="hover:bg-muted/20">
                  <td className="px-2 py-1.5 font-medium">{o.full_name}</td>
                  <td className="px-2 py-1.5 text-xs text-muted-foreground">
                    <span className="font-mono">{(o as { role_code?: string }).role_code ?? ""}</span>
                    {(o as { role_title?: string }).role_title
                      ? ` · ${(o as { role_title?: string }).role_title}`
                      : o.title
                        ? ` · ${o.title}`
                        : ""}
                  </td>
                  {!readOnly ? (
                    <td className="px-1 py-1.5 text-end">
                      <div className="inline-flex">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setEditingOfficer(o);
                            setOfficerOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => {
                            if (!window.confirm("مقام حذف شود؟")) return;
                            deleteOfficer.mutate(o.officer_id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        id="cost-centers"
        title="مراکز هزینه"
        count={(costCenters.data ?? []).length}
        action={
          readOnly ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">ثبت غیرفعال</p>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setEditingCc(null);
                setCcOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> مرکز
            </Button>
          )
        }
      >
        {costCenters.isLoading ? (
          <div className="flex gap-2 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : (costCenters.data ?? []).length === 0 ? (
          <div className="py-5 text-center text-xs text-muted-foreground">مرکز هزینه‌ای ثبت نشده است.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
                <th className="px-2 py-1.5 text-start font-medium">نام</th>
                <th className="w-28 px-2 py-1.5 text-start font-medium">کد</th>
                {!readOnly ? <th className="w-12 px-1 py-1.5 text-end font-medium" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y">
              {(costCenters.data ?? []).map((c) => (
                <tr key={c.cost_center_id} className="hover:bg-muted/20">
                  <td className="px-2 py-1.5 font-medium">{c.name}</td>
                  <td className="px-2 py-1.5 text-start">
                    <span className="inline-block font-mono text-xs tabular-nums" dir="ltr">
                      {toFaDigits(c.code)}
                    </span>
                  </td>
                  {!readOnly ? (
                    <td className="px-1 py-1.5 text-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => {
                          setEditingCc(c);
                          setCcOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CollapsibleSection>

      <Sheet open={bankOpen && !readOnly} onOpenChange={handleBankOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
          onInteractOutside={(e) => {
            if (bankDirty) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (bankDirty) e.preventDefault();
          }}
        >
          <SheetHeader className="space-y-1.5 border-b px-5 py-4">
            <SheetTitle>{editingBank ? "ویرایش حساب بانکی" : "حساب بانکی جدید"}</SheetTitle>
            <SheetDescription>شماره حساب و شبا مطابق استاندارد بانکی ایران</SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-1 flex-col"
            onSubmit={bankForm.handleSubmit((v) => saveBank.mutate(v))}
          >
            <div className="flex flex-1 flex-col gap-4 px-5 py-4">
              {bankFieldError ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {bankFieldError}
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="bank_select">بانک *</Label>
                <select
                  id="bank_select"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  {...bankForm.register("bank_select", { required: true })}
                >
                  <option value="">انتخاب بانک…</option>
                  {IRAN_BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                  <option value={OTHER_BANK}>سایر (ورود دستی)</option>
                </select>
              </div>
              {watchedBankSelect === OTHER_BANK ? (
                <div className="space-y-1.5">
                  <Label htmlFor="bank_name_other">نام بانک *</Label>
                  <Input
                    id="bank_name_other"
                    className="h-9"
                    placeholder="نام کامل بانک یا موسسه اعتباری"
                    {...bankForm.register("bank_name_other", { required: true })}
                  />
                </div>
              ) : null}
              <div className="space-y-1.5">
                <Label htmlFor="account_type">نوع حساب *</Label>
                <select
                  id="account_type"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  {...bankForm.register("account_type", { required: true })}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="account_number">شماره حساب *</Label>
                <Input
                  id="account_number"
                  className="h-9 font-mono tabular-nums"
                  dir="rtl"
                  inputMode="numeric"
                  placeholder="مثال: ۱۲۳۴۵۶۷۸۹۰"
                  value={toFaDigits(bankForm.watch("account_number") || "")}
                  onChange={(e) => {
                    const d = toAsciiDigits(e.target.value).slice(0, 20);
                    bankForm.setValue("account_number", d, { shouldDirty: true });
                  }}
                />
                <p className="text-[11px] text-muted-foreground">شماره حساب نزد بانک (معمولاً ۶ تا ۲۰ رقم)</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="iban">شماره شبا (اختیاری)</Label>
                <Input
                  id="iban"
                  className="h-9 font-mono tabular-nums"
                  dir="rtl"
                  inputMode="text"
                  placeholder="IR۰۰ ۰۰۰۰ ۰۰۰۰ ۰۰۰۰ ۰۰۰۰ ۰۰۰۰ ۰۰"
                  value={formatIbanDisplay(watchedIban)}
                  onChange={(e) => {
                    const n = normalizeIban(e.target.value);
                    bankForm.setValue("iban", n, { shouldDirty: true });
                  }}
                />
                <p className="text-[11px] text-muted-foreground">
                  قالب: IR + ۲۴ رقم ({toFaDigits(ibanHintLen)}/۲۴)
                  {ibanHintLen > 0 && ibanHintLen < 24
                    ? " — هنوز کامل نیست"
                    : ibanHintLen === 24
                      ? " — کامل"
                      : ""}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="currency_code">ارز</Label>
                  <select
                    id="currency_code"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    {...bankForm.register("currency_code")}
                  >
                    <option value="IRR">ریال ایران (IRR)</option>
                    <option value="USD">دلار (USD)</option>
                    <option value="EUR">یورو (EUR)</option>
                    <option value="AED">درهم (AED)</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <div className="flex h-9 w-full items-center justify-between rounded-md border px-3">
                    <Label htmlFor="is_primary" className="text-sm">حساب اصلی</Label>
                    <Switch
                      id="is_primary"
                      checked={bankForm.watch("is_primary")}
                      onCheckedChange={(v) =>
                        bankForm.setValue("is_primary", v, { shouldDirty: true })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            <SheetFooter className="mt-auto gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => handleBankOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={saveBank.isPending}>
                {saveBank.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={officerOpen && !readOnly} onOpenChange={handleOfficerOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
          onInteractOutside={(e) => {
            if (officerDirty) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (officerDirty) e.preventDefault();
          }}
        >
          <SheetHeader className="space-y-1.5 border-b px-5 py-4">
            <SheetTitle>{editingOfficer ? "ویرایش مقام" : "مقام جدید"}</SheetTitle>
            <SheetDescription>نقش و نام مقام شرکت</SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-1 flex-col"
            onSubmit={officerForm.handleSubmit((v) =>
              saveOfficer.mutate({
                role_code: v.role_code.trim(),
                full_name: v.full_name.trim(),
                role_title: v.role_title.trim() || undefined,
              })
            )}
          >
            <div className="flex flex-1 flex-col gap-4 px-5 py-4">
              <div className="space-y-1.5">
                <Label>کد نقش *</Label>
                <Input className="h-9" dir="ltr" {...officerForm.register("role_code", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>نام کامل *</Label>
                <Input className="h-9" {...officerForm.register("full_name", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>عنوان</Label>
                <Input className="h-9" {...officerForm.register("role_title")} />
              </div>
            </div>
            <SheetFooter className="mt-auto gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => handleOfficerOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={saveOfficer.isPending}>
                {saveOfficer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={ccOpen && !readOnly} onOpenChange={handleCcOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
          onInteractOutside={(e) => {
            if (ccDirty) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (ccDirty) e.preventDefault();
          }}
        >
          <SheetHeader className="space-y-1.5 border-b px-5 py-4">
            <SheetTitle>{editingCc ? "ویرایش مرکز هزینه" : "مرکز هزینه جدید"}</SheetTitle>
            <SheetDescription>کد و نام مرکز هزینه</SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-1 flex-col"
            onSubmit={ccForm.handleSubmit((v) =>
              saveCc.mutate({ code: v.code.trim(), name: v.name.trim() })
            )}
          >
            <div className="flex flex-1 flex-col gap-4 px-5 py-4">
              <div className="space-y-1.5">
                <Label>کد *</Label>
                <Input className="h-9" dir="ltr" {...ccForm.register("code", { required: true })} />
              </div>
              <div className="space-y-1.5">
                <Label>نام *</Label>
                <Input className="h-9" {...ccForm.register("name", { required: true })} />
              </div>
            </div>
            <SheetFooter className="mt-auto gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => handleCcOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={saveCc.isPending}>
                {saveCc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
