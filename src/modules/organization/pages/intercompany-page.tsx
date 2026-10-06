/**
 * FE-ORG — بین‌شرکتی (Org-IC-P1 config)
 * Partners + Rules with DataTable-style UX matching companies/BU lists.
 * Deferred: Acc-IC / Ops-IC / Platform flag (see banner).
 */
"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeftRight,
  Loader2,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Scale,
  Trash2,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";
import {
  intercompanyService,
  type IcPartnerDto,
  type IcRuleDto,
} from "../services/org-extended-service";
import { useCompanies } from "../hooks/use-companies";
import { OrganizationPermissions } from "../types";
import { IconAction } from "./companies-list-helpers";

const MSG_NO_ACCESS = "برای مشاهده این بخش مجوز لازم را ندارید.";
const MSG_ERR = "انجام این کار ممکن نشد. کمی بعد دوباره تلاش کنید.";

/** Preferred IC codes; company.* used as soft fallback until PermissionSeeder ships IC codes. */
const IC_VIEW = "organization.intercompany.view";
const IC_MANAGE = "organization.intercompany.manage";

type PartnerForm = {
  from_company_id: string;
  to_company_id: string;
  notes: string;
  is_active: boolean;
};

type RuleForm = {
  code: string;
  name: string;
  source_doc_type: string;
  target_doc_type: string;
  auto_create_mirror: boolean;
  is_active: boolean;
  notes: string;
};

type ConfirmState =
  | null
  | { kind: "partner" | "rule"; id: string; label: string };

function companyLabel(
  id: string,
  name: string | null | undefined,
  companies: { company_id: string; name?: string; legal_name?: string | null }[] | undefined
): string {
  if (name && name.trim()) return name.trim();
  const c = (companies ?? []).find((x) => x.company_id === id);
  if (c) return (c.legal_name || c.name || "").trim() || id.slice(0, 8);
  return id.slice(0, 8);
}

export function IntercompanyPage() {
  const qc = useQueryClient();
  const hasIcView = usePermission(IC_VIEW);
  const hasIcManage = usePermission(IC_MANAGE);
  const hasCompanyView = usePermission(OrganizationPermissions.companyView);
  const hasCompanyUpdate = usePermission(OrganizationPermissions.companyUpdate);
  const canView = hasIcView || hasIcManage || hasCompanyView;
  const canManage = hasIcManage || hasCompanyUpdate;
  const { data: companies } = useCompanies();

  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerStatus, setPartnerStatus] = useState<"all" | "active" | "inactive">("all");
  const [ruleSearch, setRuleSearch] = useState("");
  const [ruleStatus, setRuleStatus] = useState<"all" | "active" | "inactive">("all");

  const [partnerSheet, setPartnerSheet] = useState(false);
  const [editingPartner, setEditingPartner] = useState<IcPartnerDto | null>(null);
  const [ruleSheet, setRuleSheet] = useState(false);
  const [editingRule, setEditingRule] = useState<IcRuleDto | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const partnerForm = useForm<PartnerForm>({
    defaultValues: {
      from_company_id: "",
      to_company_id: "",
      notes: "",
      is_active: true,
    },
  });
  const ruleForm = useForm<RuleForm>({
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

  const filteredPartners = useMemo(() => {
    let rows = partners.data ?? [];
    if (partnerStatus === "active") rows = rows.filter((p) => p.is_active !== false);
    if (partnerStatus === "inactive") rows = rows.filter((p) => p.is_active === false);
    const q = partnerSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((p) => {
        const from = companyLabel(p.from_company_id, p.from_company_name, companies).toLowerCase();
        const to = companyLabel(p.to_company_id, p.to_company_name, companies).toLowerCase();
        const notes = (p.notes ?? "").toLowerCase();
        return from.includes(q) || to.includes(q) || notes.includes(q);
      });
    }
    return rows;
  }, [partners.data, partnerStatus, partnerSearch, companies]);

  const filteredRules = useMemo(() => {
    let rows = rules.data ?? [];
    if (ruleStatus === "active") rows = rows.filter((r) => r.is_active !== false);
    if (ruleStatus === "inactive") rows = rows.filter((r) => r.is_active === false);
    const q = ruleSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        return (
          r.code.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          r.source_doc_type.toLowerCase().includes(q) ||
          r.target_doc_type.toLowerCase().includes(q) ||
          (r.notes ?? "").toLowerCase().includes(q)
        );
      });
    }
    return rows;
  }, [rules.data, ruleStatus, ruleSearch]);

  const createPartner = useMutation({
    mutationFn: intercompanyService.createPartner,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "ic-partners"] });
      toast.success("شریک بین‌شرکتی ثبت شد");
      closePartnerSheet();
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
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
      closePartnerSheet();
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  const deletePartner = useMutation({
    mutationFn: intercompanyService.deletePartner,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "ic-partners"] });
      toast.success("شریک حذف شد");
      setConfirm(null);
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  const createRule = useMutation({
    mutationFn: intercompanyService.createRule,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "ic-rules"] });
      toast.success("قانون IC ثبت شد");
      closeRuleSheet();
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
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
      closeRuleSheet();
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  const deleteRule = useMutation({
    mutationFn: intercompanyService.deleteRule,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "ic-rules"] });
      toast.success("قانون حذف شد");
      setConfirm(null);
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : MSG_ERR),
  });

  function closePartnerSheet() {
    setPartnerSheet(false);
    setEditingPartner(null);
    partnerForm.reset({
      from_company_id: "",
      to_company_id: "",
      notes: "",
      is_active: true,
    });
  }

  function closeRuleSheet() {
    setRuleSheet(false);
    setEditingRule(null);
    ruleForm.reset({
      code: "",
      name: "",
      source_doc_type: "SO",
      target_doc_type: "PO",
      auto_create_mirror: true,
      is_active: true,
      notes: "",
    });
  }

  function openCreatePartner() {
    setEditingPartner(null);
    partnerForm.reset({
      from_company_id: "",
      to_company_id: "",
      notes: "",
      is_active: true,
    });
    setPartnerSheet(true);
  }

  function openEditPartner(p: IcPartnerDto) {
    setEditingPartner(p);
    partnerForm.reset({
      from_company_id: p.from_company_id,
      to_company_id: p.to_company_id,
      notes: p.notes ?? "",
      is_active: p.is_active !== false,
    });
    setPartnerSheet(true);
  }

  function openCreateRule() {
    setEditingRule(null);
    ruleForm.reset({
      code: "",
      name: "",
      source_doc_type: "SO",
      target_doc_type: "PO",
      auto_create_mirror: true,
      is_active: true,
      notes: "",
    });
    setRuleSheet(true);
  }

  function openEditRule(r: IcRuleDto) {
    setEditingRule(r);
    ruleForm.reset({
      code: r.code,
      name: r.name,
      source_doc_type: r.source_doc_type,
      target_doc_type: r.target_doc_type,
      auto_create_mirror: r.auto_create_mirror !== false,
      is_active: r.is_active !== false,
      notes: r.notes ?? "",
    });
    setRuleSheet(true);
  }

  function submitPartner(v: PartnerForm) {
    if (v.from_company_id === v.to_company_id) {
      toast.error("شرکت مبدأ و مقصد نمی‌توانند یکسان باشند.");
      return;
    }
    const payload = {
      from_company_id: v.from_company_id,
      to_company_id: v.to_company_id,
      notes: v.notes.trim() || undefined,
      is_active: v.is_active,
    };
    if (editingPartner) {
      updatePartner.mutate({ id: editingPartner.ic_partner_id, payload });
    } else {
      createPartner.mutate(payload);
    }
  }

  function submitRule(v: RuleForm) {
    const payload = {
      code: v.code.trim(),
      name: v.name.trim(),
      source_doc_type: v.source_doc_type,
      target_doc_type: v.target_doc_type,
      auto_create_mirror: v.auto_create_mirror,
      is_active: v.is_active,
      notes: v.notes.trim() || undefined,
    };
    if (editingRule) {
      updateRule.mutate({ id: editingRule.ic_rule_id, payload });
    } else {
      createRule.mutate(payload);
    }
  }

  const labelDoc = (code: string) => {
    const d = (docTypes.data ?? []).find((x) => x.code === code);
    return d ? `${d.label_fa} (${d.code})` : code;
  };

  const partnerBusy = createPartner.isPending || updatePartner.isPending;
  const ruleBusy = createRule.isPending || updateRule.isPending;
  const deleteBusy = deletePartner.isPending || deleteRule.isPending;

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="بین‌شرکتی"
          icon={<ArrowLeftRight className="h-4 w-4" />}
          breadcrumbs={[
            { label: "سازمان", href: "/dashboard/organization" },
            { label: "بین‌شرکتی" },
          ]}
        />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-0 flex-col gap-6">
        <PageHeader
          title="بین‌شرکتی"
          icon={<ArrowLeftRight className="h-4 w-4" />}
          description="پیکربندی روابط و قوانین آینهٔ اسناد بین شرکت‌های گروه"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold">
                <Scale className="h-4 w-4 text-muted-foreground" />
                شرکای بین‌شرکتی
              </h2>
              <p className="text-xs text-muted-foreground">
                جفت شرکت‌هایی که اجازهٔ معامله درون‌گروهی دارند (جهت‌دار: مبدأ → مقصد)
              </p>
            </div>
            {canManage ? (
              <Button size="sm" className="h-8 gap-1.5" onClick={openCreatePartner}>
                <Plus className="h-4 w-4" />
                شریک جدید
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className={cn("h-8 ps-8 text-sm", partnerSearch && "pe-8")}
                placeholder="نام شرکت، یادداشت…"
                value={partnerSearch}
                onChange={(e) => setPartnerSearch(e.target.value)}
              />
              {partnerSearch ? (
                <button
                  type="button"
                  className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
                  onClick={() => setPartnerSearch("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <Select
              value={partnerStatus}
              onValueChange={(v) => setPartnerStatus(v as typeof partnerStatus)}
            >
              <SelectTrigger className="h-8 w-[8.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="inactive">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
            {partners.isFetching && !partners.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          <div className="overflow-auto rounded-xl border">
            {partners.isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredPartners.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title={
                    partnerSearch || partnerStatus !== "all"
                      ? "نتیجه‌ای پیدا نشد"
                      : "هنوز شریکی تعریف نشده"
                  }
                  description={
                    !partnerSearch && partnerStatus === "all"
                      ? "حداقل یک جفت شرکت فعال ثبت کنید."
                      : undefined
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 text-start">از شرکت (مبدأ)</TableHead>
                    <TableHead className="w-10 px-1 text-center">→</TableHead>
                    <TableHead className="px-3 text-start">به شرکت (مقصد)</TableHead>
                    <TableHead className="px-2">وضعیت</TableHead>
                    <TableHead className="px-3 text-start">یادداشت</TableHead>
                    <TableHead className="px-2">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPartners.map((p) => {
                    const from = companyLabel(
                      p.from_company_id,
                      p.from_company_name,
                      companies
                    );
                    const to = companyLabel(p.to_company_id, p.to_company_name, companies);
                    const active = p.is_active !== false;
                    return (
                      <TableRow key={p.ic_partner_id}>
                        <TableCell className="px-3 text-start font-medium">{from}</TableCell>
                        <TableCell className="px-1 text-center text-muted-foreground">→</TableCell>
                        <TableCell className="px-3 text-start font-medium">{to}</TableCell>
                        <TableCell className="px-2">
                          <StatusChip
                            tone={active ? "success" : "neutral"}
                            label={active ? "فعال" : "غیرفعال"}
                          />
                        </TableCell>
                        <TableCell className="max-w-[14rem] truncate px-3 text-start text-xs text-muted-foreground">
                          {p.notes || "—"}
                        </TableCell>
                        <TableCell className="px-2">
                          {canManage ? (
                            <div className="flex items-center gap-0.5">
                              <IconAction label="ویرایش" onClick={() => openEditPartner(p)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </IconAction>
                              {active ? (
                                <IconAction
                                  label="غیرفعال"
                                  onClick={() =>
                                    updatePartner.mutate({
                                      id: p.ic_partner_id,
                                      payload: { is_active: false },
                                    })
                                  }
                                >
                                  <PowerOff className="h-3.5 w-3.5" />
                                </IconAction>
                              ) : (
                                <IconAction
                                  label="فعال"
                                  onClick={() =>
                                    updatePartner.mutate({
                                      id: p.ic_partner_id,
                                      payload: { is_active: true },
                                    })
                                  }
                                >
                                  <Power className="h-3.5 w-3.5" />
                                </IconAction>
                              )}
                              <IconAction
                                label="حذف"
                                variant="destructive"
                                onClick={() =>
                                  setConfirm({
                                    kind: "partner",
                                    id: p.ic_partner_id,
                                    label: `${from} → ${to}`,
                                  })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </IconAction>
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          {filteredPartners.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {toFaDigits(filteredPartners.length)} شریک
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold">قوانین آینه اسناد</h2>
              <p className="text-xs text-muted-foreground">
                نوع سند مبدأ → نوع سند هدف. فلگ «ساخت خودکار» برای موتور فروش/خرید در فاز Ops-IC
                ذخیره می‌شود و الان اجرا نمی‌شود.
              </p>
            </div>
            {canManage ? (
              <Button size="sm" className="h-8 gap-1.5" onClick={openCreateRule}>
                <Plus className="h-4 w-4" />
                قانون جدید
              </Button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className={cn("h-8 ps-8 text-sm", ruleSearch && "pe-8")}
                placeholder="کد، نام، نوع سند…"
                value={ruleSearch}
                onChange={(e) => setRuleSearch(e.target.value)}
              />
              {ruleSearch ? (
                <button
                  type="button"
                  className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
                  onClick={() => setRuleSearch("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <Select value={ruleStatus} onValueChange={(v) => setRuleStatus(v as typeof ruleStatus)}>
              <SelectTrigger className="h-8 w-[8.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="inactive">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
            {rules.isFetching && !rules.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>

          <div className="overflow-auto rounded-xl border">
            {rules.isLoading ? (
              <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredRules.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title={
                    ruleSearch || ruleStatus !== "all" ? "نتیجه‌ای پیدا نشد" : "قانونی ثبت نشده"
                  }
                  description={
                    !ruleSearch && ruleStatus === "all"
                      ? "برای فروش↔خرید معمولاً SO→PO و INV→BILL تعریف می‌شود."
                      : undefined
                  }
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-3 text-start">نام</TableHead>
                    <TableHead className="px-3 text-start">کد</TableHead>
                    <TableHead className="px-3 text-start">مبدأ → هدف</TableHead>
                    <TableHead className="px-2">آینه خودکار</TableHead>
                    <TableHead className="px-2">وضعیت</TableHead>
                    <TableHead className="px-2">عملیات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRules.map((r) => {
                    const active = r.is_active !== false;
                    return (
                      <TableRow key={r.ic_rule_id}>
                        <TableCell className="px-3 text-start font-medium">{r.name}</TableCell>
                        <TableCell className="px-3 text-start font-mono text-xs" dir="ltr">
                          {r.code}
                        </TableCell>
                        <TableCell className="px-3 text-start text-sm">
                          {labelDoc(r.source_doc_type)}
                          <span className="mx-1.5 text-muted-foreground">→</span>
                          {labelDoc(r.target_doc_type)}
                        </TableCell>
                        <TableCell className="px-2">
                          <StatusChip
                            tone={r.auto_create_mirror ? "info" : "neutral"}
                            label={r.auto_create_mirror ? "بله (فاز بعد)" : "فقط نگاشت"}
                          />
                        </TableCell>
                        <TableCell className="px-2">
                          <StatusChip
                            tone={active ? "success" : "neutral"}
                            label={active ? "فعال" : "غیرفعال"}
                          />
                        </TableCell>
                        <TableCell className="px-2">
                          {canManage ? (
                            <div className="flex items-center gap-0.5">
                              <IconAction label="ویرایش" onClick={() => openEditRule(r)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </IconAction>
                              {active ? (
                                <IconAction
                                  label="غیرفعال"
                                  onClick={() =>
                                    updateRule.mutate({
                                      id: r.ic_rule_id,
                                      payload: { is_active: false },
                                    })
                                  }
                                >
                                  <PowerOff className="h-3.5 w-3.5" />
                                </IconAction>
                              ) : (
                                <IconAction
                                  label="فعال"
                                  onClick={() =>
                                    updateRule.mutate({
                                      id: r.ic_rule_id,
                                      payload: { is_active: true },
                                    })
                                  }
                                >
                                  <Power className="h-3.5 w-3.5" />
                                </IconAction>
                              )}
                              <IconAction
                                label="حذف"
                                variant="destructive"
                                onClick={() =>
                                  setConfirm({
                                    kind: "rule",
                                    id: r.ic_rule_id,
                                    label: r.name,
                                  })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </IconAction>
                            </div>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
          {filteredRules.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {toFaDigits(filteredRules.length)} قانون
            </p>
          ) : null}
        </section>

        <Sheet
          open={partnerSheet}
          onOpenChange={(o) => {
            if (!o) closePartnerSheet();
            else setPartnerSheet(true);
          }}
        >
          <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>
                {editingPartner ? "ویرایش شریک بین‌شرکتی" : "شریک بین‌شرکتی جدید"}
              </SheetTitle>
            </SheetHeader>
            <form
              className="flex flex-1 flex-col"
              onSubmit={partnerForm.handleSubmit(submitPartner)}
            >
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="space-y-1.5">
                  <Label>از شرکت (فروشنده / مبدأ) *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    {...partnerForm.register("from_company_id", { required: true })}
                  >
                    <option value="">— انتخاب کنید —</option>
                    {(companies ?? []).map((c) => (
                      <option key={c.company_id} value={c.company_id}>
                        {c.legal_name || c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>به شرکت (خریدار / مقصد) *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    {...partnerForm.register("to_company_id", { required: true })}
                  >
                    <option value="">— انتخاب کنید —</option>
                    {(companies ?? []).map((c) => (
                      <option key={c.company_id} value={c.company_id}>
                        {c.legal_name || c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>یادداشت</Label>
                  <Input className="h-9" {...partnerForm.register("notes")} />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <Label>فعال</Label>
                  <Switch
                    checked={partnerForm.watch("is_active")}
                    onCheckedChange={(v) => partnerForm.setValue("is_active", !!v)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  لینک مشتری/فروشندهٔ آینه (Business Partner) در فاز Ops-IC پس از آماده‌شدن Master
                  Data اضافه می‌شود.
                </p>
              </div>
              <SheetFooter className="gap-2 border-t px-5 py-3">
                <Button type="button" variant="outline" onClick={closePartnerSheet}>
                  انصراف
                </Button>
                <Button type="submit" disabled={partnerBusy || !canManage}>
                  {partnerBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingPartner ? (
                    "ذخیره"
                  ) : (
                    "ثبت"
                  )}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        <Sheet
          open={ruleSheet}
          onOpenChange={(o) => {
            if (!o) closeRuleSheet();
            else setRuleSheet(true);
          }}
        >
          <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>{editingRule ? "ویرایش قانون آینه" : "قانون آینه جدید"}</SheetTitle>
            </SheetHeader>
            <form className="flex flex-1 flex-col" onSubmit={ruleForm.handleSubmit(submitRule)}>
              <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>کد *</Label>
                    <Input
                      dir="ltr"
                      className="h-9"
                      {...ruleForm.register("code", { required: true })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>نام *</Label>
                    <Input className="h-9" {...ruleForm.register("name", { required: true })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>سند مبدأ *</Label>
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
                    <Label>سند هدف *</Label>
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
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <Label>ساخت خودکار سند آینه</Label>
                    <p className="text-[11px] text-muted-foreground">
                      ذخیره برای فاز Ops — الان اجرا نمی‌شود
                    </p>
                  </div>
                  <Switch
                    checked={ruleForm.watch("auto_create_mirror")}
                    onCheckedChange={(v) => ruleForm.setValue("auto_create_mirror", !!v)}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <Label>فعال</Label>
                  <Switch
                    checked={ruleForm.watch("is_active")}
                    onCheckedChange={(v) => ruleForm.setValue("is_active", !!v)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>یادداشت</Label>
                  <Input className="h-9" {...ruleForm.register("notes")} />
                </div>
              </div>
              <SheetFooter className="gap-2 border-t px-5 py-3">
                <Button type="button" variant="outline" onClick={closeRuleSheet}>
                  انصراف
                </Button>
                <Button type="submit" disabled={ruleBusy || !canManage}>
                  {ruleBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingRule ? (
                    "ذخیره"
                  ) : (
                    "ثبت"
                  )}
                </Button>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>

        <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {confirm?.kind === "partner" ? "تأیید حذف شریک" : "تأیید حذف قانون"}
              </DialogTitle>
              <DialogDescription>
                {confirm
                  ? `«${confirm.label}» حذف نرم می‌شود. سوابق حفظ می‌شود.`
                  : ""}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={deleteBusy}
                onClick={() => setConfirm(null)}
              >
                انصراف
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteBusy}
                onClick={() => {
                  if (!confirm) return;
                  if (confirm.kind === "partner") deletePartner.mutate(confirm.id);
                  else deleteRule.mutate(confirm.id);
                }}
              >
                {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حذف"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
