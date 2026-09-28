"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, Power, AlertCircle } from "lucide-react";
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
import {
  intercompanyService,
  type IcPartnerDto,
  type IcRuleDto,
} from "../services/org-extended-service";
import { useCompanies } from "../hooks/use-companies";

export function IntercompanyPage() {
  const qc = useQueryClient();
  const { data: companies } = useCompanies();
  const [partnerOpen, setPartnerOpen] = useState(false);
  const [ruleOpen, setRuleOpen] = useState(false);

  const partnerForm = useForm({
    defaultValues: {
      from_company_id: "",
      to_company_id: "",
      notes: "",
      is_active: true,
    },
  });
  const ruleForm = useForm({
    defaultValues: {
      code: "",
      name: "",
      source_doc_type: "SO",
      target_doc_type: "PO",
      auto_create_mirror: true,
      is_active: true,
      notes: "",
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
  const docTypes = useQuery({
    queryKey: ["org", "ic-doc-types"],
    queryFn: () => intercompanyService.listDocumentTypes(),
  });

  const createPartner = useMutation({
    mutationFn: intercompanyService.createPartner,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "ic-partners"] });
      toast.success("شریک بین‌شرکتی ثبت شد");
      setPartnerOpen(false);
      partnerForm.reset({
        from_company_id: "",
        to_company_id: "",
        notes: "",
        is_active: true,
      });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا"),
  });

  const updatePartner = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof intercompanyService.updatePartner>[1];
    }) => intercompanyService.updatePartner(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "ic-partners"] });
      toast.success("شریک به‌روز شد");
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا"),
  });

  const deletePartner = useMutation({
    mutationFn: intercompanyService.deletePartner,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "ic-partners"] });
      toast.success("شریک حذف شد");
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
      ruleForm.reset({
        code: "",
        name: "",
        source_doc_type: "SO",
        target_doc_type: "PO",
        auto_create_mirror: true,
        is_active: true,
        notes: "",
      });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا"),
  });

  const updateRule = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof intercompanyService.updateRule>[1];
    }) => intercompanyService.updateRule(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "ic-rules"] });
      toast.success("قانون به‌روز شد");
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا"),
  });

  const deleteRule = useMutation({
    mutationFn: intercompanyService.deleteRule,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "ic-rules"] });
      toast.success("قانون حذف شد");
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا"),
  });

  const labelDoc = (code: string) => {
    const d = (docTypes.data ?? []).find((x) => x.code === code);
    return d ? `${d.label_fa} (${d.code})` : code;
  };

  const partnerLabel = (p: IcPartnerDto) => {
    const from =
      p.from_company_name ||
      (companies ?? []).find((c) => c.company_id === p.from_company_id)?.name ||
      p.from_company_id.slice(0, 8);
    const to =
      p.to_company_name ||
      (companies ?? []).find((c) => c.company_id === p.to_company_id)?.name ||
      p.to_company_id.slice(0, 8);
    return { from, to };
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="بین‌شرکتی"
        description="پیکربندی روابط و قوانین آینهٔ اسناد بین شرکت‌های گروه"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "بین‌شرکتی" },
        ]}
      />

      <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm leading-7 text-muted-foreground">
        <p className="font-medium text-foreground">این صفحه چیست؟</p>
        <p>
          وقتی چند شرکت حقوقی در یک مستأجر دارید و با هم معامله می‌کنند، سیستم باید بداند{" "}
          <strong className="text-foreground">کدام شرکت با کدام شریک است</strong> و{" "}
          <strong className="text-foreground">چه نوع سندی در شرکت مقابل آینه شود</strong>.
        </p>
        <p className="mt-2">
          فاز فعلی (<span dir="ltr" className="font-mono text-xs">Org-IC-P1</span>) فقط{" "}
          <strong className="text-foreground">پیکربندی</strong> است. صدور خودکار سند، حساب
          Due-to/Due-from، حذف درون‌گروهی و تسویه در فازهای بعدی ماژول‌های حسابداری و فروش/خرید
          تکمیل می‌شود.
        </p>
        <p className="mt-2 text-xs">
          نمونه جریان هدف: شرکت A به B می‌فروشد → شریک A→B + قانون SO→PO → موتور فروش (فاز بعد)
          سفارش خرید را در B می‌سازد.
        </p>
      </div>

      <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm leading-6">
        <div className="mb-2 flex items-start gap-2 font-medium text-amber-800 dark:text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>یادآوری تکمیل در فازهای بعدی (عمداً اینجا نیست)</span>
        </div>
        <ul className="list-inside list-disc space-y-1 text-muted-foreground">
          <li>
            <strong className="text-foreground">Acc-IC-P1 (حسابداری):</strong> حساب‌های طلب/بدهی
            درون‌گروه، سند journal بین‌شرکتی، حذف (Elimination) در تجمیع، گزارش تطبیق، چندارزی
          </li>
          <li>
            <strong className="text-foreground">Ops-IC-P1 (فروش/خرید):</strong> ساخت خودکار سند
            آینه بر اساس قوانین، اتصال مشتری/فروشندهٔ آینه (Business Partner)
          </li>
          <li>
            <strong className="text-foreground">Platform:</strong> اعمال فلگ فروش{" "}
            <span dir="ltr" className="font-mono text-xs">
              org.intercompany
            </span>{" "}
            روی API و کارت هاب
          </li>
          <li>
            <strong className="text-foreground">پیشرفته (بعد از baseline):</strong> Netting، Transfer
            Pricing، انتقال موجودی بین‌شرکتی، مانیتور زنجیره ارزش
          </li>
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          مرجع اسناد: ADR-ORG-002 و ORG_Intercompany_Status_and_Debt_v1.0 در مخزن hamareh-erp-docs.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">شرکای بین‌شرکتی</h2>
            <p className="text-xs text-muted-foreground">
              جفت شرکت‌هایی که اجازهٔ معامله درون‌گروهی دارند (جهت‌دار: مبدأ → مقصد)
            </p>
          </div>
          <Button size="sm" onClick={() => setPartnerOpen(true)}>
            <Plus className="h-4 w-4" /> شریک
          </Button>
        </div>
        <ul className="divide-y rounded-xl border">
          {(partners.data ?? []).map((p) => {
            const { from, to } = partnerLabel(p);
            return (
              <li
                key={p.ic_partner_id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
              >
                <div>
                  <span className="font-medium">{from}</span>
                  <span className="mx-2 text-muted-foreground">→</span>
                  <span className="font-medium">{to}</span>
                  {!p.is_active ? (
                    <span className="mr-2 text-xs text-amber-600">(غیرفعال)</span>
                  ) : null}
                  {p.notes ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.notes}</p>
                  ) : null}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    title={p.is_active ? "غیرفعال" : "فعال"}
                    onClick={() =>
                      updatePartner.mutate({
                        id: p.ic_partner_id,
                        payload: { is_active: !p.is_active },
                      })
                    }
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("حذف این شریک؟")) {
                        deletePartner.mutate(p.ic_partner_id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            );
          })}
          {!partners.isLoading && (partners.data ?? []).length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              هنوز شریکی تعریف نشده. حداقل یک جفت شرکت فعال ثبت کنید.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold">قوانین آینه اسناد</h2>
            <p className="text-xs text-muted-foreground">
              نوع سند مبدأ → نوع سند هدف. فلگ «ساخت خودکار» برای موتور فروش/خرید در فاز Ops-IC
              ذخیره می‌شود و الان اجرا نمی‌شود.
            </p>
          </div>
          <Button size="sm" onClick={() => setRuleOpen(true)}>
            <Plus className="h-4 w-4" /> قانون
          </Button>
        </div>
        <ul className="divide-y rounded-xl border">
          {(rules.data ?? []).map((r: IcRuleDto) => (
            <li
              key={r.ic_rule_id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <div>
                <span className="font-medium">{r.name}</span>{" "}
                <span className="text-xs text-muted-foreground" dir="ltr">
                  {r.code}
                </span>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {labelDoc(r.source_doc_type)} → {labelDoc(r.target_doc_type)}
                  {r.auto_create_mirror
                    ? " · ساخت خودکار (فاز بعد)"
                    : " · فقط نگاشت"}
                  {!r.is_active ? " · غیرفعال" : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    updateRule.mutate({
                      id: r.ic_rule_id,
                      payload: { is_active: !r.is_active },
                    })
                  }
                >
                  <Power className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm("حذف این قانون؟")) {
                      deleteRule.mutate(r.ic_rule_id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
          {!rules.isLoading && (rules.data ?? []).length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              قانونی نیست. برای فروش↔خرید معمولاً SO→PO و INV→BILL تعریف می‌شود.
            </li>
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
                is_active: v.is_active,
              })
            )}
          >
            <div className="space-y-1.5">
              <Label>از شرکت (فروشنده / مبدأ)</Label>
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
              <Label>به شرکت (خریدار / مقصد)</Label>
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
            <div className="space-y-1.5">
              <Label>یادداشت</Label>
              <Input className="h-9" {...partnerForm.register("notes")} />
            </div>
            <p className="text-xs text-muted-foreground">
              لینک مشتری/فروشندهٔ آینه (Business Partner) در فاز Ops-IC پس از آماده‌شدن Master Data
              اضافه می‌شود.
            </p>
            <DialogFooter>
              <Button type="submit" size="sm" disabled={createPartner.isPending}>
                {createPartner.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "ثبت"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>قانون آینه اسناد</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={ruleForm.handleSubmit((v) =>
              createRule.mutate({
                code: v.code.trim(),
                name: v.name.trim(),
                source_doc_type: v.source_doc_type,
                target_doc_type: v.target_doc_type,
                auto_create_mirror: v.auto_create_mirror,
                is_active: v.is_active,
                notes: v.notes.trim() || undefined,
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
                <Label>سند مبدأ</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...ruleForm.register("source_doc_type", { required: true })}
                >
                  {(docTypes.data ?? [
                    { code: "SO", label_fa: "سفارش فروش" },
                    { code: "PO", label_fa: "سفارش خرید" },
                  ]).map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.label_fa} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>سند هدف</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  {...ruleForm.register("target_doc_type", { required: true })}
                >
                  {(docTypes.data ?? [
                    { code: "PO", label_fa: "سفارش خرید" },
                    { code: "SO", label_fa: "سفارش فروش" },
                  ]).map((d) => (
                    <option key={d.code} value={d.code}>
                      {d.label_fa} ({d.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...ruleForm.register("auto_create_mirror")} />
              ساخت خودکار سند آینه (ذخیره برای فاز Ops — الان اجرا نمی‌شود)
            </label>
            <div className="space-y-1.5">
              <Label>یادداشت</Label>
              <Input className="h-9" {...ruleForm.register("notes")} />
            </div>
            <DialogFooter>
              <Button type="submit" size="sm" disabled={createRule.isPending}>
                {createRule.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "ثبت"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
