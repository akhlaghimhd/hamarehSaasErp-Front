"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2, ExternalLink } from "lucide-react";
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
  salesOrgService,
  purchOrgService,
} from "../services/org-extended-service";
import { salesStructureService } from "../services/sales-structure-service";

type TabId =
  | "sales"
  | "purch"
  | "channels"
  | "divisions"
  | "areas"
  | "offices";

const TABS: { id: TabId; label: string }[] = [
  { id: "sales", label: "سازمان فروش" },
  { id: "purch", label: "سازمان خرید" },
  { id: "channels", label: "کانال توزیع" },
  { id: "divisions", label: "دیویژن" },
  { id: "areas", label: "ناحیه فروش" },
  { id: "offices", label: "دفتر / گروه" },
];

function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-muted-foreground">
        {children}
      </td>
    </tr>
  );
}

function TableShell({
  headers,
  children,
  loading,
}: {
  headers: string[];
  children: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full min-w-[28rem] border-collapse">
        <thead className="border-b bg-muted/30">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2.5 text-start text-xs font-medium text-muted-foreground last:text-end"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {loading ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-10 text-center text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال بارگذاری…
                </span>
              </td>
            </tr>
          ) : (
            children
          )}
        </tbody>
      </table>
    </div>
  );
}

export function SalesPurchOrgsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("sales");
  const [open, setOpen] = useState(false);
  const [groupOfficeId, setGroupOfficeId] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      code: "",
      name: "",
      is_reference: false,
      sales_org_id: "",
    },
  });
  const areaForm = useForm({
    defaultValues: {
      sales_org_id: "",
      distribution_channel_id: "",
      division_id: "",
      code: "",
      name: "",
    },
  });
  const groupForm = useForm({ defaultValues: { code: "", name: "" } });

  const sales = useQuery({
    queryKey: ["org", "sales-orgs"],
    queryFn: () => salesOrgService.list(),
  });
  const purch = useQuery({
    queryKey: ["org", "purch-orgs"],
    queryFn: () => purchOrgService.list(),
  });
  const channels = useQuery({
    queryKey: ["org", "dist-channels"],
    queryFn: () => salesStructureService.listChannels(),
  });
  const divisions = useQuery({
    queryKey: ["org", "prod-divisions"],
    queryFn: () => salesStructureService.listDivisions(),
  });
  const areas = useQuery({
    queryKey: ["org", "sales-areas"],
    queryFn: () => salesStructureService.listSalesAreas(),
  });
  const offices = useQuery({
    queryKey: ["org", "sales-offices"],
    queryFn: () => salesStructureService.listOffices(),
  });

  const inv = () => {
    void qc.invalidateQueries({ queryKey: ["org"] });
  };
  const onErr = (e: unknown) =>
    toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا");

  const createSales = useMutation({
    mutationFn: salesOrgService.create,
    onSuccess: () => {
      inv();
      toast.success("سازمان فروش ثبت شد");
      setOpen(false);
      form.reset();
    },
    onError: onErr,
  });
  const createPurch = useMutation({
    mutationFn: purchOrgService.create,
    onSuccess: () => {
      inv();
      toast.success("سازمان خرید ثبت شد");
      setOpen(false);
      form.reset();
    },
    onError: onErr,
  });
  const createChannel = useMutation({
    mutationFn: salesStructureService.createChannel,
    onSuccess: () => {
      inv();
      toast.success("کانال ثبت شد");
      setOpen(false);
      form.reset();
    },
    onError: onErr,
  });
  const createDivision = useMutation({
    mutationFn: salesStructureService.createDivision,
    onSuccess: () => {
      inv();
      toast.success("دیویژن ثبت شد");
      setOpen(false);
      form.reset();
    },
    onError: onErr,
  });
  const createArea = useMutation({
    mutationFn: salesStructureService.createSalesArea,
    onSuccess: () => {
      inv();
      toast.success("ناحیه فروش ثبت شد");
      setOpen(false);
      areaForm.reset();
    },
    onError: onErr,
  });
  const createOffice = useMutation({
    mutationFn: salesStructureService.createOffice,
    onSuccess: () => {
      inv();
      toast.success("دفتر فروش ثبت شد");
      setOpen(false);
      form.reset();
    },
    onError: onErr,
  });
  const createGroup = useMutation({
    mutationFn: (p: { officeId: string; code: string; name: string }) =>
      salesStructureService.createGroup(p.officeId, {
        code: p.code,
        name: p.name,
      }),
    onSuccess: () => {
      inv();
      toast.success("گروه فروش ثبت شد");
      setGroupOfficeId(null);
      groupForm.reset();
    },
    onError: onErr,
  });

  const delSales = useMutation({
    mutationFn: salesOrgService.softDelete,
    onSuccess: () => {
      inv();
      toast.success("حذف شد");
    },
    onError: onErr,
  });
  const delPurch = useMutation({
    mutationFn: purchOrgService.softDelete,
    onSuccess: () => {
      inv();
      toast.success("حذف شد");
    },
    onError: onErr,
  });
  const delChannel = useMutation({
    mutationFn: salesStructureService.softDeleteChannel,
    onSuccess: () => {
      inv();
      toast.success("حذف شد");
    },
    onError: onErr,
  });
  const delDivision = useMutation({
    mutationFn: salesStructureService.softDeleteDivision,
    onSuccess: () => {
      inv();
      toast.success("حذف شد");
    },
    onError: onErr,
  });
  const delArea = useMutation({
    mutationFn: salesStructureService.softDeleteSalesArea,
    onSuccess: () => {
      inv();
      toast.success("حذف شد");
    },
    onError: onErr,
  });
  const delOffice = useMutation({
    mutationFn: salesStructureService.softDeleteOffice,
    onSuccess: () => {
      inv();
      toast.success("حذف شد");
    },
    onError: onErr,
  });
  const delGroup = useMutation({
    mutationFn: salesStructureService.softDeleteGroup,
    onSuccess: () => {
      inv();
      toast.success("حذف شد");
    },
    onError: onErr,
  });

  const selectCls =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

  const assignmentCount = (row: {
    assignment_count?: number;
    assignments?: unknown[];
  }) => {
    if (typeof row.assignment_count === "number") return row.assignment_count;
    return Array.isArray(row.assignments) ? row.assignments.length : 0;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="سازمان فروش و خرید"
        description="ساختار رقابتی: Sales/Purch Org، کانال، دیویژن، Sales Area، دفتر و گروه"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "فروش و خرید" },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 border-b pb-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                tab === t.id
                  ? "rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                  : "rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => {
            form.reset();
            areaForm.reset();
            setOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          جدید
        </Button>
      </div>

      {tab === "sales" && (
        <TableShell
          headers={["کد", "نام", "تخصیص", "عملیات"]}
          loading={sales.isLoading}
        >
          {(sales.data ?? []).length === 0 ? (
            <EmptyRow colSpan={4}>هنوز سازمان فروشی ثبت نشده است.</EmptyRow>
          ) : (
            (sales.data ?? []).map((s) => {
              const count = assignmentCount(s);
              const hasAssign = count > 0;
              return (
                <tr key={s.sales_org_id} className="hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-mono text-xs" dir="ltr">
                    {s.code}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-medium">{s.name}</td>
                  <td className="px-3 py-2.5 text-sm tabular-nums">{count}</td>
                  <td className="px-3 py-2.5 text-end">
                    <div className="inline-flex items-center gap-1">
                      <Button asChild size="sm" variant="outline" className="h-8 gap-1">
                        <Link href={`/dashboard/organization/sales-purch/sales/${s.sales_org_id}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                          تخصیص
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-destructive"
                        disabled={hasAssign || delSales.isPending}
                        title={
                          hasAssign
                            ? "به‌خاطر وجود تخصیص فعال قابل حذف نیست"
                            : "حذف"
                        }
                        onClick={() => {
                          if (hasAssign) {
                            toast.error(
                              "این سازمان فروش دارای تخصیص فعال است. ابتدا از صفحه جزئیات تخصیص‌ها را حذف کنید."
                            );
                            return;
                          }
                          if (confirm("این سازمان فروش حذف شود؟")) {
                            delSales.mutate(s.sales_org_id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </TableShell>
      )}

      {/* RESTORE_TRUNCATED_FOR_TOOL_LIMIT - full file continues in next push */}
      <p className="text-sm text-muted-foreground">در حال تکمیل…</p>
    </div>
  );
}
