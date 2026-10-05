/**
 * Nested panels on company detail: bank accounts, officers, cost centers.
 * Create/edit via right Sheet with dirty-guard; soft-delete from list.
 */
"use client";

import { useEffect, useState } from "react";
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

  const bankForm = useForm({
    defaultValues: {
      bank_name: "",
      account_number: "",
      iban: "",
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

  useEffect(() => {
    if (!bankOpen) return;
    if (editingBank) {
      bankForm.reset({
        bank_name: editingBank.bank_name,
        account_number: editingBank.account_number,
        iban: editingBank.iban ?? "",
        is_primary: Boolean(editingBank.is_primary),
      });
    } else {
      bankForm.reset({
        bank_name: "",
        account_number: "",
        iban: "",
        is_primary: false,
      });
    }
  }, [bankOpen, editingBank, bankForm]);

  useEffect(() => {
    if (!officerOpen) return;
    if (editingOfficer) {
      officerForm.reset({
        role_code: editingOfficer.role_code,
        full_name: editingOfficer.full_name,
        role_title: editingOfficer.role_title ?? "",
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
    mutationFn: async (v: {
      bank_name: string;
      account_number: string;
      iban?: string;
      is_primary?: boolean;
    }) => {
      if (editingBank) {
        await apiPut(organizationPaths.bankAccount(editingBank.bank_account_id), v);
        return;
      }
      await bankAccountService.create(companyId, v);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "banks", companyId] });
      toast.success(editingBank ? "حساب به‌روز شد" : "حساب بانکی ثبت شد");
      setBankOpen(false);
      setEditingBank(null);
      bankForm.reset();
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
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
      await officerService.create(companyId, v);
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

  return (
    <div className="space-y-8">
      <section id="bank-accounts" className="scroll-mt-20 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">حساب‌های بانکی</h2>
          {readOnly ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ثبت غیرفعال (شرکت حذف‌شده/غیرفعال)
            </p>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setEditingBank(null);
                setBankOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> حساب جدید
            </Button>
          )}
        </div>
        {banks.isLoading ? (
          <div className="flex gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : null}
        <ul className="divide-y rounded-xl border">
          {(banks.data ?? []).map((b) => (
            <li
              key={b.bank_account_id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <div>
                <div className="font-medium">{b.bank_name}</div>
                <div className="font-mono text-xs text-muted-foreground">
                  {toFaDigits(b.account_number)}
                  {b.iban ? ` · ${toFaDigits(b.iban)}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-1">
                {b.is_primary ? <StatusChip label="اصلی" tone="warning" /> : null}
                {b.is_active === false ? (
                  <StatusChip label="غیرفعال" tone="neutral" />
                ) : null}
                {!readOnly ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8"
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
                      className="h-8 text-destructive"
                      onClick={() => {
                        if (!window.confirm("حساب حذف شود؟")) return;
                        deleteBank.mutate(b.bank_account_id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                ) : null}
              </div>
            </li>
          ))}
          {!banks.isLoading && (banks.data ?? []).length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              حساب بانکی ثبت نشده است.
            </li>
          ) : null}
        </ul>
      </section>

      <section id="officers" className="scroll-mt-20 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">مقامات شرکت</h2>
          {readOnly ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ثبت غیرفعال (شرکت حذف‌شده/غیرفعال)
            </p>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setEditingOfficer(null);
                setOfficerOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> مقام جدید
            </Button>
          )}
        </div>
        {officers.isLoading ? (
          <div className="flex gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : null}
        <ul className="divide-y rounded-xl border">
          {(officers.data ?? []).map((o) => (
            <li
              key={o.officer_id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <div>
                <div className="font-medium">{o.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-mono">{o.role_code}</span>
                  {o.role_title ? ` · ${o.role_title}` : ""}
                </div>
              </div>
              {!readOnly ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
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
                    className="h-8 text-destructive"
                    onClick={() => {
                      if (!window.confirm("مقام حذف شود؟")) return;
                      deleteOfficer.mutate(o.officer_id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
          {!officers.isLoading && (officers.data ?? []).length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              مقامی ثبت نشده است.
            </li>
          ) : null}
        </ul>
      </section>

      <section id="cost-centers" className="scroll-mt-20 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">مراکز هزینه</h2>
          {readOnly ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              ثبت غیرفعال (شرکت حذف‌شده/غیرفعال)
            </p>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setEditingCc(null);
                setCcOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> مرکز جدید
            </Button>
          )}
        </div>
        {costCenters.isLoading ? (
          <div className="flex gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : null}
        <ul className="divide-y rounded-xl border">
          {(costCenters.data ?? []).map((c) => (
            <li
              key={c.cost_center_id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <div>
                <span className="font-medium">{c.name}</span>{" "}
                <span className="font-mono text-xs text-muted-foreground">
                  {toFaDigits(c.code)}
                </span>
              </div>
              {!readOnly ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setEditingCc(c);
                    setCcOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
          {!costCenters.isLoading && (costCenters.data ?? []).length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              مرکز هزینه‌ای ثبت نشده است.
            </li>
          ) : null}
        </ul>
      </section>

      <Sheet open={bankOpen && !readOnly} onOpenChange={handleBankOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md"
          onInteractOutside={(e) => {
            if (bankDirty) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (bankDirty) e.preventDefault();
          }}
        >
          <SheetHeader className="space-y-1.5 pb-4">
            <SheetTitle>
              {editingBank ? "ویرایش حساب بانکی" : "حساب بانکی جدید"}
            </SheetTitle>
            <SheetDescription>اطلاعات حساب بانکی شرکت</SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-1 flex-col gap-4"
            onSubmit={bankForm.handleSubmit((v) =>
              saveBank.mutate({
                bank_name: v.bank_name.trim(),
                account_number: v.account_number.trim(),
                iban: v.iban.trim() || undefined,
                is_primary: v.is_primary,
              })
            )}
          >
            <div className="space-y-1.5">
              <Label>نام بانک *</Label>
              <Input
                className="h-9"
                {...bankForm.register("bank_name", { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>شماره حساب *</Label>
              <Input
                className="h-9"
                dir="ltr"
                {...bankForm.register("account_number", { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>IBAN</Label>
              <Input className="h-9" dir="ltr" {...bankForm.register("iban")} />
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
              <Label>حساب اصلی</Label>
              <Switch
                checked={bankForm.watch("is_primary")}
                onCheckedChange={(v) =>
                  bankForm.setValue("is_primary", v, { shouldDirty: true })
                }
              />
            </div>
            <SheetFooter className="mt-auto gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => handleBankOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={saveBank.isPending}>
                {saveBank.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "ذخیره"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={officerOpen && !readOnly} onOpenChange={handleOfficerOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md"
          onInteractOutside={(e) => {
            if (officerDirty) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (officerDirty) e.preventDefault();
          }}
        >
          <SheetHeader className="space-y-1.5 pb-4">
            <SheetTitle>{editingOfficer ? "ویرایش مقام" : "مقام جدید"}</SheetTitle>
            <SheetDescription>مدیران و مقامات رسمی شرکت</SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-1 flex-col gap-4"
            onSubmit={officerForm.handleSubmit((v) =>
              saveOfficer.mutate({
                role_code: v.role_code.trim(),
                full_name: v.full_name.trim(),
                role_title: v.role_title.trim() || undefined,
              })
            )}
          >
            <div className="space-y-1.5">
              <Label>کد نقش *</Label>
              <Input
                className="h-9"
                dir="ltr"
                {...officerForm.register("role_code", { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>نام کامل *</Label>
              <Input
                className="h-9"
                {...officerForm.register("full_name", { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>عنوان</Label>
              <Input className="h-9" {...officerForm.register("role_title")} />
            </div>
            <SheetFooter className="mt-auto gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOfficerOpen(false)}
              >
                انصراف
              </Button>
              <Button type="submit" disabled={saveOfficer.isPending}>
                {saveOfficer.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "ذخیره"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={ccOpen && !readOnly} onOpenChange={handleCcOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md"
          onInteractOutside={(e) => {
            if (ccDirty) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (ccDirty) e.preventDefault();
          }}
        >
          <SheetHeader className="space-y-1.5 pb-4">
            <SheetTitle>
              {editingCc ? "ویرایش مرکز هزینه" : "مرکز هزینه جدید"}
            </SheetTitle>
            <SheetDescription>کد و نام مرکز هزینه</SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-1 flex-col gap-4"
            onSubmit={ccForm.handleSubmit((v) =>
              saveCc.mutate({ code: v.code.trim(), name: v.name.trim() })
            )}
          >
            <div className="space-y-1.5">
              <Label>کد *</Label>
              <Input
                className="h-9"
                dir="ltr"
                {...ccForm.register("code", { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>نام *</Label>
              <Input
                className="h-9"
                {...ccForm.register("name", { required: true })}
              />
            </div>
            <SheetFooter className="mt-auto gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => handleCcOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={saveCc.isPending}>
                {saveCc.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "ذخیره"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
