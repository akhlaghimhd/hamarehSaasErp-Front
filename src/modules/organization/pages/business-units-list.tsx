"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Link2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { ApiClientError } from "@/api";
import { businessUnitService } from "../services/org-extended-service";
import { useCompanies } from "../hooks/use-companies";

export function BusinessUnitsListPage() {
  const qc = useQueryClient();
  const { data: companies } = useCompanies();
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [activeBu, setActiveBu] = useState<string | null>(null);
  const form = useForm({ defaultValues: { code: "", name: "", description: "" } });
  const assignForm = useForm({ defaultValues: { company_id: "", is_primary: false } });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["org", "business-units"],
    queryFn: () => businessUnitService.list(),
  });

  const create = useMutation({
    mutationFn: businessUnitService.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "business-units"] });
      toast.success("واحد کسب‌وکار ثبت شد");
      setOpen(false);
      form.reset();
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا"),
  });

  const assign = useMutation({
    mutationFn: (v: { company_id: string; is_primary: boolean }) =>
      businessUnitService.assignCompany(activeBu!, v.company_id, v.is_primary),
    onSuccess: () => {
      toast.success("شرکت به واحد کسب‌وکار متصل شد");
      setAssignOpen(false);
      assignForm.reset({ company_id: "", is_primary: false });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="واحدهای کسب‌وکار"
        description="Business Unit مستقل از ساختار حقوقی — انتساب شرکت"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "واحد کسب‌وکار" },
        ]}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> جدید
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
        </div>
      ) : null}
      {isError ? (
        <div className="text-sm text-destructive">
          {error instanceof ApiClientError ? error.message : "خطا"}
          <Button variant="outline" size="sm" className="ms-2" onClick={() => void refetch()}>
            تلاش مجدد
          </Button>
        </div>
      ) : null}

      <ul className="divide-y rounded-xl border">
        {(data ?? []).map((bu) => (
          <li
            key={bu.business_unit_id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
          >
            <div>
              <div className="font-medium">{bu.name}</div>
              <div className="font-mono text-xs text-muted-foreground" dir="ltr">
                {bu.code}
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setActiveBu(bu.business_unit_id);
                setAssignOpen(true);
              }}
            >
              <Link2 className="h-3.5 w-3.5" /> انتساب شرکت
            </Button>
          </li>
        ))}
        {!isLoading && (data ?? []).length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            هنوز واحد کسب‌وکاری ثبت نشده است.
          </li>
        ) : null}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>واحد کسب‌وکار جدید</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit((v) =>
              create.mutate({
                code: v.code.trim(),
                name: v.name.trim(),
                description: v.description.trim() || undefined,
              })
            )}
          >
            <div className="space-y-1.5">
              <Label>کد *</Label>
              <Input dir="ltr" className="h-9" {...form.register("code", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>نام *</Label>
              <Input className="h-9" {...form.register("name", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>توضیح</Label>
              <Input className="h-9" {...form.register("description")} />
            </div>
            <DialogFooter>
              <Button type="submit" size="sm" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>انتساب شرکت به BU</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={assignForm.handleSubmit((v) =>
              assign.mutate({
                company_id: v.company_id,
                is_primary: !!v.is_primary,
              })
            )}
          >
            <div className="space-y-1.5">
              <Label>شرکت *</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...assignForm.register("company_id", { required: true })}
              >
                <option value="">—</option>
                {(companies ?? []).map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.legal_name || c.name}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" size="sm" disabled={assign.isPending}>
                {assign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "اتصال"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
