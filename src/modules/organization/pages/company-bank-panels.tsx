/**
 * Bank accounts panel (company detail).
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
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { ApiClientError, apiPut } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import { CollapsibleSection } from "./collapsible-section";
import { bankAccountService, type BankAccountDto } from "../services/org-extended-service";
import { organizationPaths } from "../services/paths";

const MSG = "انجام این کار ممکن نشد.";
const BANKS = ["بانک ملی ایران","بانک ملت","بانک صادرات ایران","بانک تجارت","بانک سپه","بانک پاسارگاد","بانک سامان","بانک اقتصاد نوین"] as const;
const ACC_TYPES = [
  { value: "CURRENT", label: "جاری" }, { value: "SAVINGS", label: "پس‌انداز" },
  { value: "SHORT_TERM", label: "کوتاه‌مدت" }, { value: "LONG_TERM", label: "بلندمدت" },
  { value: "QARD_HASAN", label: "قرض‌الحسنه" }, { value: "INVESTMENT", label: "سرمایه‌گذاری" },
] as const;

function asciiDigits(raw: string): string {
  const m: Record<string, string> = {"۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9","٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9"};
  return Array.from(raw).map((c) => m[c] ?? c).filter((c) => c >= "0" && c <= "9").join("");
}
function normIban(raw: string): string {
  let s = (raw || "").toUpperCase().replace(/[\s\-_.]/g, "");
  const m: Record<string, string> = {"۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9"};
  s = Array.from(s).map((c) => m[c] ?? c).join("").replace(/[^0-9A-Z]/g, "");
  const d = (s.startsWith("IR") ? s.slice(2) : s).replace(/\D/g, "").slice(0, 24);
  return d ? `IR${d}` : "";
}
function ibanDigits(iban: string | null | undefined): string {
  const n = normIban(iban ?? "");
  return n.startsWith("IR") ? n.slice(2) : "";
}
function ibanFa(iban: string | null | undefined): string {
  const n = normIban(iban ?? "");
  if (!n) return "";
  const d = n.slice(2);
  const parts = [`IR${d.slice(0, 2)}`];
  for (let i = 2; i < d.length; i += 4) parts.push(d.slice(i, i + 4));
  return toFaDigits(parts.join(" "));
}

export function CompanyBankPanels({ companyId, readOnly = false }: { companyId: string; readOnly?: boolean }) {
  const qc = useQueryClient();
  const [bankOpen, setBankOpen] = useState(false);
  const [editBank, setEditBank] = useState<BankAccountDto | null>(null);
  const [delBank, setDelBank] = useState<BankAccountDto | null>(null);
  const [busy, setBusy] = useState(false);

  const banksQ = useQuery({ queryKey: ["org", "bank-accounts", companyId], queryFn: () => bankAccountService.list(companyId), enabled: !!companyId });
  const bankForm = useForm({ defaultValues: { bank_name: "", label: "", account_type: "CURRENT", account_number: "", iban: "", is_primary: false } });
  const sortedBanks = useMemo(() => [...(banksQ.data ?? [])].sort((a, b) => (a.is_primary === b.is_primary ? 0 : a.is_primary ? -1 : 1)), [banksQ.data]);

  useEffect(() => {
    if (!bankOpen) return;
    if (editBank) {
      bankForm.reset({
        bank_name: editBank.bank_name || "",
        label: (editBank as { label?: string }).label ?? (editBank as { account_holder_name?: string }).account_holder_name ?? "",
        account_type: editBank.account_type || "CURRENT",
        account_number: asciiDigits(editBank.account_number || ""),
        iban: normIban(editBank.iban ?? ""),
        is_primary: !!editBank.is_primary,
      });
    } else bankForm.reset({ bank_name: "", label: "", account_type: "CURRENT", account_number: "", iban: "", is_primary: false });
  }, [bankOpen, editBank, bankForm]);

  const saveBank = useMutation({
    mutationFn: async (v: { bank_name: string; label: string; account_type: string; account_number: string; iban: string; is_primary: boolean }) => {
      if (!v.bank_name.trim()) throw new Error("نام بانک الزامی است.");
      const account_number = asciiDigits(v.account_number);
      if (account_number.length < 6) throw new Error("شماره حساب معتبر نیست.");
      const iban = normIban(v.iban);
      if (iban && iban.length !== 26) throw new Error("شبا باید IR + ۲۴ رقم باشد.");
      const payload = { bank_name: v.bank_name.trim(), account_type: v.account_type, account_number, iban: iban || undefined, currency_code: "IRR", is_primary: v.is_primary, account_holder_name: v.label.trim() || undefined, label: v.label.trim() || undefined };
      if (editBank) return apiPut(organizationPaths.bankAccount(editBank.bank_account_id), payload);
      return bankAccountService.create(companyId, payload);
    },
    onSuccess: () => { toast.success(editBank ? "حساب به‌روز شد" : "حساب ثبت شد"); setBankOpen(false); setEditBank(null); qc.invalidateQueries({ queryKey: ["org", "bank-accounts", companyId] }); },
    onError: (e: unknown) => toast.error(e instanceof ApiClientError ? e.message : e instanceof Error ? e.message : MSG),
  });
  const delBankM = useMutation({ mutationFn: (id: string) => bankAccountService.softDelete(id), onSuccess: () => { toast.success("حساب حذف شد"); qc.invalidateQueries({ queryKey: ["org", "bank-accounts", companyId] }); }, onError: () => toast.error(MSG) });

  return (
    <>
      <CollapsibleSection id="bank-accounts" title="حساب‌های بانکی" subtitle="شماره حساب و شبا — استاندارد ایران" count={sortedBanks.length}
        actions={!readOnly ? <Button type="button" size="sm" className="h-8 gap-1" onClick={() => { setEditBank(null); setBankOpen(true); }}><Plus className="h-4 w-4" /> حساب</Button> : null}>
        {banksQ.isLoading ? <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          : sortedBanks.length === 0 ? <div className="py-5 text-center text-xs text-muted-foreground">حساب بانکی ثبت نشده است.</div>
          : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-sm">
                <thead><tr className="border-b bg-muted/30 text-xs text-muted-foreground">
                  <th className="px-2 py-1.5 text-start font-medium">بانک / عنوان</th>
                  <th className="px-2 py-1.5 text-start font-medium">شماره حساب</th>
                  <th className="hidden px-2 py-1.5 text-start font-medium md:table-cell">شبا</th>
                  <th className="px-2 py-1.5 text-start font-medium">اصلی</th>
                  {!readOnly ? <th className="border-s px-2 py-1.5 text-start font-medium w-[88px]">عملیات</th> : null}
                </tr></thead>
                <tbody>
                  {sortedBanks.map((b) => {
                    const label = (b as { label?: string }).label ?? (b as { account_holder_name?: string }).account_holder_name;
                    return (
                      <tr key={b.bank_account_id} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-2 py-1.5 text-start"><div className="font-medium">{label || b.bank_name}</div>{label ? <div className="text-[11px] text-muted-foreground">{b.bank_name}</div> : null}</td>
                        <td className="px-2 py-1.5 text-start"><span className="font-mono text-xs tabular-nums" dir="ltr">{toFaDigits(b.account_number)}</span></td>
                        <td className="hidden px-2 py-1.5 text-start md:table-cell">{b.iban ? <span className="font-mono text-[11px] tabular-nums" dir="ltr">{ibanFa(b.iban)}</span> : "—"}</td>
                        <td className="px-2 py-1.5 text-start">{b.is_primary ? <StatusChip status="active" label="اصلی" /> : "—"}</td>
                        {!readOnly ? <td className="border-s px-2 py-1.5"><div className="flex gap-0.5">
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditBank(b); setBankOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDelBank(b)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div></td> : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </CollapsibleSection>

      <Sheet open={bankOpen} onOpenChange={(o) => { setBankOpen(o); if (!o) setEditBank(null); }}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>{editBank ? "ویرایش حساب بانکی" : "حساب بانکی جدید"}</SheetTitle>
            <SheetDescription>شماره حساب اجباری؛ شبا اختیاری (IR + ۲۴ رقم).</SheetDescription>
          </SheetHeader>
          <form className="flex flex-1 flex-col" onSubmit={bankForm.handleSubmit((v) => saveBank.mutate(v))}>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              <div className="space-y-1"><Label>بانک *</Label>
                <select className="h-9 w-full rounded-md border px-3 text-sm" {...bankForm.register("bank_name", { required: true })}>
                  <option value="">انتخاب</option>
                  {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label>عنوان حساب</Label><Input className="h-9" {...bankForm.register("label")} /></div>
              <div className="space-y-1"><Label>نوع حساب</Label>
                <select className="h-9 w-full rounded-md border px-3 text-sm" {...bankForm.register("account_type")}>
                  {ACC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label>شماره حساب *</Label>
                <Input className="h-9 font-mono" dir="rtl" inputMode="numeric" value={toFaDigits(bankForm.watch("account_number") || "")}
                  onChange={(e) => bankForm.setValue("account_number", asciiDigits(e.target.value).slice(0, 20), { shouldDirty: true })} />
              </div>
              <div className="space-y-1"><Label>شبا</Label>
                <div className="flex items-center gap-2" dir="ltr">
                  <span className="text-sm text-muted-foreground">IR</span>
                  <Input className="h-9 flex-1 font-mono" dir="ltr" inputMode="numeric" value={toFaDigits(ibanDigits(bankForm.watch("iban")))}
                    onChange={(e) => { const d = asciiDigits(e.target.value).slice(0, 24); bankForm.setValue("iban", d ? `IR${d}` : "", { shouldDirty: true }); }} />
                </div>
                <p className="text-[11px] text-muted-foreground">{toFaDigits(ibanDigits(bankForm.watch("iban")).length)} از ۲۴</p>
              </div>
              <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <Label>حساب اصلی</Label>
                <Switch checked={bankForm.watch("is_primary")} onCheckedChange={(checked) => bankForm.setValue("is_primary", checked, { shouldDirty: true })} />
              </div>
            </div>
            <SheetFooter className="border-t px-5 py-3">
              <Button type="button" variant="outline" onClick={() => setBankOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={saveBank.isPending}>{saveBank.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}</Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={!!delBank} onOpenChange={(o) => { if (!o) setDelBank(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>حذف حساب</DialogTitle><DialogDescription>{delBank ? `«${delBank.bank_name}» حذف شود؟` : ""}</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDelBank(null)}>انصراف</Button>
            <Button type="button" variant="destructive" disabled={busy} onClick={async () => { if (!delBank) return; setBusy(true); try { await delBankM.mutateAsync(delBank.bank_account_id); setDelBank(null); } finally { setBusy(false); } }}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حذف"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
