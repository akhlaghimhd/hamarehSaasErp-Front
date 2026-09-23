"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
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
import { hierarchyService } from "../services/org-extended-service";

export function HierarchiesListPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const form = useForm({
    defaultValues: { code: "", name: "", purpose: "LEGAL" },
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["org", "hierarchies"],
    queryFn: () => hierarchyService.list(),
  });

  const create = useMutation({
    mutationFn: hierarchyService.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
      toast.success("سلسله‌مراتب ثبت شد");
      setOpen(false);
      form.reset({ code: "", name: "", purpose: "LEGAL" });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="سلسله‌مراتب سازمانی"
        description="درخت‌های LEGAL / MANAGEMENT / TAX و …"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "سلسله‌مراتب" },
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
        {(data ?? []).map((h) => (
          <li key={h.hierarchy_id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium">{h.name}</div>
              <div className="text-xs text-muted-foreground">
                <span className="font-mono" dir="ltr">
                  {h.code}
                </span>{" "}
                · {h.purpose}
              </div>
            </div>
          </li>
        ))}
        {!isLoading && (data ?? []).length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            سلسله‌مراتبی ثبت نشده است.
          </li>
        ) : null}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>سلسله‌مراتب جدید</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit((v) =>
              create.mutate({
                code: v.code.trim(),
                name: v.name.trim(),
                purpose: v.purpose,
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
              <Label>هدف</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register("purpose")}
              >
                <option value="LEGAL">LEGAL</option>
                <option value="MANAGEMENT">MANAGEMENT</option>
                <option value="TAX">TAX</option>
                <option value="ESTABLISHMENT">ESTABLISHMENT</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" size="sm" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
