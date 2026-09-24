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
import { salesOrgService, purchOrgService } from "../services/org-extended-service";

export function SalesPurchOrgsPage() {
  const qc = useQueryClient();
  const [salesOpen, setSalesOpen] = useState(false);
  const [purchOpen, setPurchOpen] = useState(false);
  const salesForm = useForm({ defaultValues: { code: "", name: "" } });
  const purchForm = useForm({ defaultValues: { code: "", name: "" } });

  const sales = useQuery({
    queryKey: ["org", "sales-orgs"],
    queryFn: () => salesOrgService.list(),
  });
  const purch = useQuery({
    queryKey: ["org", "purch-orgs"],
    queryFn: () => purchOrgService.list(),
  });

  const createSales = useMutation({
    mutationFn: salesOrgService.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "sales-orgs"] });
      toast.success("سازمان فروش ثبت شد");
      setSalesOpen(false);
      salesForm.reset();
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا"),
  });

  const createPurch = useMutation({
    mutationFn: purchOrgService.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "purch-orgs"] });
      toast.success("سازمان خرید ثبت شد");
      setPurchOpen(false);
      purchForm.reset();
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا"),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="سازمان فروش و خرید"
        description="تعریف Sales/Purchasing Organization (مرز سازمانی، بدون موتور سفارش)"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "فروش و خرید" },
        ]}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">سازمان فروش</h2>
          <Button size="sm" onClick={() => setSalesOpen(true)}>
            <Plus className="h-4 w-4" /> جدید
          </Button>
        </div>
        <ul className="divide-y rounded-xl border">
          {(sales.data ?? []).map((s) => (
            <li key={s.sales_org_id} className="px-4 py-3 text-sm">
              <span className="font-medium">{s.name}</span>{" "}
              <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                {s.code}
              </span>
            </li>
          ))}
          {!sales.isLoading && (sales.data ?? []).length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">خالی</li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">سازمان خرید</h2>
          <Button size="sm" onClick={() => setPurchOpen(true)}>
            <Plus className="h-4 w-4" /> جدید
          </Button>
        </div>
        <ul className="divide-y rounded-xl border">
          {(purch.data ?? []).map((s) => (
            <li key={s.purch_org_id} className="px-4 py-3 text-sm">
              <span className="font-medium">{s.name}</span>{" "}
              <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                {s.code}
              </span>
            </li>
          ))}
          {!purch.isLoading && (purch.data ?? []).length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">خالی</li>
          ) : null}
        </ul>
      </section>

      <Dialog open={salesOpen} onOpenChange={setSalesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>سازمان فروش</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={salesForm.handleSubmit((v) =>
              createSales.mutate({ code: v.code.trim(), name: v.name.trim() })
            )}
          >
            <div className="space-y-1.5">
              <Label>کد *</Label>
              <Input dir="ltr" className="h-9" {...salesForm.register("code", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>نام *</Label>
              <Input className="h-9" {...salesForm.register("name", { required: true })} />
            </div>
            <DialogFooter>
              <Button type="submit" size="sm" disabled={createSales.isPending}>
                {createSales.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={purchOpen} onOpenChange={setPurchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>سازمان خرید</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={purchForm.handleSubmit((v) =>
              createPurch.mutate({ code: v.code.trim(), name: v.name.trim() })
            )}
          >
            <div className="space-y-1.5">
              <Label>کد *</Label>
              <Input dir="ltr" className="h-9" {...purchForm.register("code", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>نام *</Label>
              <Input className="h-9" {...purchForm.register("name", { required: true })} />
            </div>
            <DialogFooter>
              <Button type="submit" size="sm" disabled={createPurch.isPending}>
                {createPurch.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
