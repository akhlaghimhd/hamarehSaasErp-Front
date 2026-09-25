/**
 * Nested panels on company detail: bank accounts, officers, cost centers.
 */

"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { ApiClientError } from "@/api";
import {
  bankAccountService,
  officerService,
  costCenterService,
} from "../services/org-extended-service";

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

  const createBank = useMutation({
    mutationFn: (v: {
      bank_name: string;
      account_number: string;
      iban?: string;
      is_primary?: boolean;
    }) => bankAccountService.create(companyId, v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "banks", companyId] });
      toast.success("حساب بانکی ثبت شد");
      setBankOpen(false);
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

  const createOfficer = useMutation({
    mutationFn: (v: { role_code: string; full_name: string; role_title?: string }) =>
      officerService.create(companyId, v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "officers", companyId] });
      toast.success("مقام ثبت شد");
      setOfficerOpen(false);
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

  const createCc = useMutation({
    mutationFn: (v: { code: string; name: string }) =>
      costCenterService.create(companyId, v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "cost-centers", companyId] });
      toast.success("مرکز هزینه ثبت شد");
      setCcOpen(false);
      ccForm.reset();
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  return (
    <div className="space-y-8">
      <section id="bank-accounts" className="scroll-mt-20 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold">حساب‌های بانکی</h2>
          {readOnly ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">ثبت غیرفعال (شرکت حذف‌شده/غیرفعال)</p>
          ) : (
            <Button size="sm" onClick={() => setBankOpen(true)}>
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
                <div className="font-mono text-xs text-muted-foreground" dir="ltr">
                  {b.account_number}
                  {b.iban ? ` · ${b.iban}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {b.is_primary ? <StatusChip label="اصلی" tone="warning" /> : null}
                {b.is_active === false ? (
                  <StatusChip label="غیرفعال" tone="neutral" />
                ) : null}
                {!readOnly ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive"
                    onClick={() => {
                      if (!window.confirm("حساب حذف شود؟")) return;
                      deleteBank.mutate(b.bank_account_id);
                    }}
                  >
                    حذف
                  </Button>
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
            <p className="text-xs text-amber-700 dark:text-amber-400">ثبت غیرفعال (شرکت حذف‌شده/غیرفعال)</p>
          ) : (
            <Button size="sm" onClick={() => setOfficerOpen(true)}>
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
                  <span className="font-mono" dir="ltr">
                    {o.role_code}
                  </span>
                  {o.role_title ? ` · ${o.role_title}` : ""}
                </div>
              </div>
              {!readOnly ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive"
                  onClick={() => {
                    if (!window.confirm("مقام حذف شود؟")) return;
                    deleteOfficer.mutate(o.officer_id);
                  }}
                >
                  حذف
                </Button>
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
            <p className="text-xs text-amber-700 dark:text-amber-400">ثبت غیرفعال (شرکت حذف‌شده/غیرفعال)</p>
          ) : (
            <Button size="sm" onClick={() => setCcOpen(true)}>
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
            <li key={c.cost_center_id} className="px-4 py-3 text-sm">
              <span className="font-medium">{c.name}</span>{" "}
              <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                {c.code}
              </span>
            </li>
          ))}
          {!costCenters.isLoading && (costCenters.data ?? []).length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              مرکز هزینه‌ای ثبت نشده است.
            </li>
          ) : null}
        </ul>
      </section>

      <Dialog open={bankOpen && !readOnly} onOpenChange={setBankOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>حساب بانکی جدید</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={bankForm.handleSubmit((v) =>
              createBank.mutate({
                bank_name: v.bank_name.trim(),
                account_number: v.account_number.trim(),
                iban: v.iban.trim() || undefined,
                is_primary: v.is_primary,
              })
            )}
          >
            <div className="space-y-1.5">
              <Label>نام بانک *</Label>
              <Input className="h-9" {...bankForm.register("bank_name", { required: true })} />
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
            <div className="flex items-center justify-between gap-2">
              <Label>حساب اصلی</Label>
              <Switch
                checked={bankForm.watch("is_primary")}
                onCheckedChange={(v) => bankForm.setValue("is_primary", v)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setBankOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" size="sm" disabled={createBank.isPending}>
                {createBank.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={officerOpen && !readOnly} onOpenChange={setOfficerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>مقام جدید</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={officerForm.handleSubmit((v) =>
              createOfficer.mutate({
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
              <Input className="h-9" {...officerForm.register("full_name", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>عنوان</Label>
              <Input className="h-9" {...officerForm.register("role_title")} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setOfficerOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" size="sm" disabled={createOfficer.isPending}>
                {createOfficer.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={ccOpen && !readOnly} onOpenChange={setCcOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>مرکز هزینه جدید</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={ccForm.handleSubmit((v) =>
              createCc.mutate({ code: v.code.trim(), name: v.name.trim() })
            )}
          >
            <div className="space-y-1.5">
              <Label>کد *</Label>
              <Input className="h-9" dir="ltr" {...ccForm.register("code", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>نام *</Label>
              <Input className="h-9" {...ccForm.register("name", { required: true })} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setCcOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" size="sm" disabled={createCc.isPending}>
                {createCc.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
