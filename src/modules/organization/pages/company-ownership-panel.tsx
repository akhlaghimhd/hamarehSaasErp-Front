"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { ApiClientError, apiPut } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import { ownershipService, type OwnershipDto } from "../services/org-extended-service";
import { organizationPaths } from "../services/paths";
import { useCompanies } from "../hooks/use-companies";

type FormV = {
  owner_company_id: string;
  ownership_percent: string;
  relation_type: string;
};

const REL_LABELS: Record<string, string> = {
  EQUITY: "سهامی",
  CONTROL: "کنترلی",
  JOINT: "مشترک",
};

export function CompanyOwnershipPanel({
  companyId,
  readOnly = false,
}: {
  companyId: string;
  readOnly?: boolean;
}) {
  const qc = useQueryClient();
  const { data: companies } = useCompanies();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<OwnershipDto | null>(null);
  const form = useForm<FormV>({
    defaultValues: {
      owner_company_id: "",
      ownership_percent: "100",
      relation_type: "EQUITY",
    },
  });
  const { isDirty } = form.formState;

  const list = useQuery({
    queryKey: ["org", "ownerships", companyId],
    queryFn: () => ownershipService.list(companyId),
    enabled: !!companyId,
  });

  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        owner_company_id: editing.owner_company_id,
        ownership_percent: String(editing.ownership_percent),
        relation_type: editing.relation_type ?? "EQUITY",
      });
    } else {
      form.reset({
        owner_company_id: "",
        ownership_percent: "100",
        relation_type: "EQUITY",
      });
    }
  }, [open, editing, form]);

  const save = useMutation({
    mutationFn: async (v: FormV) => {
      const payload = {
        owner_company_id: v.owner_company_id,
        ownership_percent: Number(v.ownership_percent),
        relation_type: v.relation_type || "EQUITY",
      };
      if (editing) {
        await apiPut(organizationPaths.ownership(editing.ownership_id), payload);
        return;
      }
      await ownershipService.create(companyId, payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "ownerships", companyId] });
      toast.success(editing ? "مالکیت به‌روز شد" : "مالکیت ثبت شد");
      setOpen(false);
      setEditing(null);
      form.reset();
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

  const handleOpen = (next: boolean) => {
    if (!next) {
      form.reset();
      setEditing(null);
    }
    setOpen(next);
  };

  return (
    <section id="ownerships" className="scroll-mt-20 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">مالکیت سهام / روابط گروهی</h2>
        {readOnly ? (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            ثبت غیرفعال (شرکت حذف‌شده/غیرفعال)
          </p>
        ) : (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
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
                {toFaDigits(o.ownership_percent)}٪ ·{" "}
                {REL_LABELS[o.relation_type ?? "EQUITY"] ?? o.relation_type}
              </span>
            </div>
            {!readOnly ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setEditing(o);
                    setOpen(true);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive"
                  onClick={() => {
                    if (!window.confirm("حذف شود؟")) return;
                    remove.mutate(o.ownership_id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : null}
          </li>
        ))}
        {!list.isLoading && (list.data ?? []).length === 0 ? (
          <li className="px-4 py-6 text-center text-sm text-muted-foreground">
            رابطه‌ی مالکیتی ثبت نشده است.
          </li>
        ) : null}
      </ul>

      <Sheet open={open && !readOnly} onOpenChange={handleOpen}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-md"
          onInteractOutside={(e) => {
            if (isDirty) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (isDirty) e.preventDefault();
          }}
        >
          <SheetHeader className="space-y-1.5 pb-4">
            <SheetTitle>{editing ? "ویرایش مالکیت" : "ثبت مالکیت"}</SheetTitle>
            <SheetDescription>رابطه سهامی یا کنترلی در گروه</SheetDescription>
          </SheetHeader>
          <form
            className="flex flex-1 flex-col gap-4"
            onSubmit={form.handleSubmit((v) => save.mutate(v))}
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
                <option value="EQUITY">سهامی (EQUITY)</option>
                <option value="CONTROL">کنترلی (CONTROL)</option>
                <option value="JOINT">مشترک (JOINT)</option>
              </select>
            </div>
            <SheetFooter className="mt-auto gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => handleOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ذخیره"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </section>
  );
}
