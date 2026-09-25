"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { ownershipService } from "../services/org-extended-service";
import { useCompanies } from "../hooks/use-companies";

export function CompanyOwnershipPanel({ companyId, readOnly = false }: { companyId: string; readOnly?: boolean }) {
  const qc = useQueryClient();
  const { data: companies } = useCompanies();
  const [open, setOpen] = useState(false);
  const form = useForm({
    defaultValues: {
      owner_company_id: "",
      ownership_percent: "100",
      relation_type: "EQUITY",
    },
  });

  const list = useQuery({
    queryKey: ["org", "ownerships", companyId],
    queryFn: () => ownershipService.list(companyId),
    enabled: !!companyId,
  });

  const create = useMutation({
    mutationFn: (v: {
      owner_company_id: string;
      ownership_percent: number;
      relation_type?: string;
    }) => ownershipService.create(companyId, v),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "ownerships", companyId] });
      toast.success("مالکیت ثبت شد");
      setOpen(false);
      form.reset({ owner_company_id: "", ownership_percent: "100", relation_type: "EQUITY" });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => ownershipService.softDelete(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "ownerships", companyId] });
      toast.success("مالکیت حذف شد");
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا"),
  });

  const nameOf = (id: string) =>
    (companies ?? []).find((c) => c.company_id === id)?.name ?? id.slice(0, 8);

  return (
    <section id="ownerships" className="scroll-mt-20 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">مالکیت سهام / روابط گروهی</h2>
        {readOnly ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">ثبت غیرفعال (شرکت حذف‌شده/غیرفعال)</p>
        ) : (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> مالکیت
          </Button>
        )}
      </div>
      {list.isLoading ? (
        <div className="flex gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
        </div>
      ) : null}
      <ul className="divide-y rounded-xl border">
        {(list.data ?? []).map((o) => (
          <li
            key={o.ownership_id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
          >
            <div>
              مالک: <span className="font-medium">{nameOf(o.owner_company_id)}</span>
              <span className="ms-2 text-xs text-muted-foreground">
                {o.ownership_percent}% · {o.relation_type ?? "EQUITY"}
              </span>
            </div>
            {!readOnly ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-destructive"
                onClick={() => {
                  if (!window.confirm("حذف شود؟")) return;
                  remove.mutate(o.ownership_id);
                }}
              >
                حذف
              </Button>
            ) : null}
          </li>
        ))}
        {!list.isLoading && (list.data ?? []).length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            رابطه‌ی مالکیتی ثبت نشده است.
          </li>
        ) : null}
      </ul>

      <Dialog open={open && !readOnly} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ثبت مالکیت</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit((v) =>
              create.mutate({
                owner_company_id: v.owner_company_id,
                ownership_percent: Number(v.ownership_percent),
                relation_type: v.relation_type || "EQUITY",
              })
            )}
          >
            <div className="space-y-1.5">
              <Label>شرکت مالک *</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register("owner_company_id", { required: true })}
              >
                <option value="">—</option>
                {(companies ?? [])
                  .filter((c) => c.company_id !== companyId)
                  .map((c) => (
                    <option key={c.company_id} value={c.company_id}>
                      {c.legal_name || c.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>درصد *</Label>
              <Input
                type="number"
                step="0.01"
                min={0.01}
                max={100}
                className="h-9"
                dir="ltr"
                {...form.register("ownership_percent", { required: true })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>نوع رابطه</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register("relation_type")}
              >
                <option value="EQUITY">EQUITY</option>
                <option value="CONTROL">CONTROL</option>
                <option value="JOINT">JOINT</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" size="sm" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
