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
import { intercompanyService } from "../services/org-extended-service";
import { useCompanies } from "../hooks/use-companies";

export function IntercompanyPage() {
  const qc = useQueryClient();
  const { data: companies } = useCompanies();
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);

  const partnerForm = useForm({
    defaultValues: { from_company_id: "", to_company_id: "", notes: "" },
  });
  const ruleForm = useForm({
    defaultValues: {
      code: "",
      name: "",
      source_doc_type: "SO",
      target_doc_type: "PO",
    },
  });

  const partners = useQuery({
    queryKey: ["org", "ic-partners"],
    queryFn: () => intercompanyService.listPartners(),
  });
  const rules = useQuery({
    queryKey: ["org", "ic-rules"],
    queryFn: () => intercompanyService.listRules(),
  });

  const createPartner = useMutation({
    mutationFn: intercompanyService.createPartner,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "ic-partners"] });
      toast.success("شریک بین‌شرکتی ثبت شد");
      setPartnerOpen(false);
      partnerForm.reset();
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا"),
  });

  const createRule = useMutation({
    mutationFn: intercompanyService.createRule,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "ic-rules"] });
      toast.success("قانون IC ثبت شد");
      setRuleOpen(false);
      ruleForm.reset({ code: "", name: "", source_doc_type: "SO", target_doc_type: "PO" });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا"),
  });

  const companyName = (id: string) =>
    (companies ?? []).find((c) => c.company_id === id)?.name ?? id.slice(0, 8);

  return (
    <div className="space-y-8">
      <PageHeader
        title="بین‌شرکتی"
        description="نقشه شرکا و قوانین آینه اسناد (بدون موتور پستینگ)"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "بین‌شرکتی" },
        ]}
      />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">شرکا</h2>
          <Button size="sm" onClick={() => setPartnerOpen(true)}>
            <Plus className="h-4 w-4" /> شریک
          </Button>
        </div>
        <ul className="divide-y rounded-xl border">
          {(partners.data ?? []).map((p) => (
            <li key={p.ic_partner_id} className="px-4 py-3 text-sm">
              {companyName(p.from_company_id)} → {companyName(p.to_company_id)}
            </li>
          ))}
          {!partners.isLoading && (partners.data ?? []).length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">شریکی نیست</li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">قوانین</h2>
          <Button size="sm" onClick={() => setRuleOpen(true)}>
            <Plus className="h-4 w-4" /> قانون
          </Button>
        </div>
        <ul className="divide-y rounded-xl border">
          {(rules.data ?? []).map((r) => (
            <li key={r.ic_rule_id} className="px-4 py-3 text-sm">
              <span className="font-medium">{r.name}</span>{" "}
              <span className="text-xs text-muted-foreground" dir="ltr">
                {r.code} · {r.source_doc_type}→{r.target_doc_type}
              </span>
            </li>
          ))}
          {!rules.isLoading && (rules.data ?? []).length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">قانونی نیست</li>
          ) : null}
        </ul>
      </section>

      <Dialog open={partnerOpen} onOpenChange={setPartnerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>شریک بین‌شرکتی</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={partnerForm.handleSubmit((v) =>
              createPartner.mutate({
                from_company_id: v.from_company_id,
                to_company_id: v.to_company_id,
                notes: v.notes.trim() || undefined,
              })
            )}
          >
            <div className="space-y-1.5">
              <Label>از شرکت</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...partnerForm.register("from_company_id", { required: true })}
              >
                <option value="">—</option>
                {(companies ?? []).map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>به شرکت</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...partnerForm.register("to_company_id", { required: true })}
              >
                <option value="">—</option>
                {(companies ?? []).map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" size="sm" disabled={createPartner.isPending}>
                {createPartner.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>قانون IC</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={ruleForm.handleSubmit((v) =>
              createRule.mutate({
                code: v.code.trim(),
                name: v.name.trim(),
                source_doc_type: v.source_doc_type.trim(),
                target_doc_type: v.target_doc_type.trim(),
              })
            )}
          >
            <div className="space-y-1.5">
              <Label>کد *</Label>
              <Input dir="ltr" className="h-9" {...ruleForm.register("code", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>نام *</Label>
              <Input className="h-9" {...ruleForm.register("name", { required: true })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>منبع</Label>
                <Input dir="ltr" className="h-9" {...ruleForm.register("source_doc_type")} />
              </div>
              <div className="space-y-1.5">
                <Label>هدف</Label>
                <Input dir="ltr" className="h-9" {...ruleForm.register("target_doc_type")} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" size="sm" disabled={createRule.isPending}>
                {createRule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
