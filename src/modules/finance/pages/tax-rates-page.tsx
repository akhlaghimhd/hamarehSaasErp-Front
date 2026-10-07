"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { usePermission } from "@/auth";
import { taxService } from "../services/tax-service";
import { FinancePermissions } from "../types";

export function TaxRatesPage() {
  const canView = usePermission(FinancePermissions.taxView);
  const canManage = usePermission(FinancePermissions.taxManage);
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["finance", "tax-rates"],
    queryFn: () => taxService.listRates(),
    enabled: canView,
  });

  const [code, setCode] = useState("VAT_STD");
  const [name, setName] = useState("ارزش افزوده استاندارد");
  const [rate, setRate] = useState("10");
  const [from, setFrom] = useState("2020-01-01");

  const createMut = useMutation({
    mutationFn: () =>
      taxService.createRate({
        tax_code: code.trim(),
        name: name.trim(),
        rate_percent: Number(rate),
        valid_from: from,
        is_default: true,
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["finance", "tax-rates"] }),
  });

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده مالیات را ندارید.</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="نرخ‌های مالیاتی"
        description="پیکربندی نرخ VAT بدون hardcode — اعتبار از تاریخ"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "مالیات" },
        ]}
      />

      {canManage ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">کد</label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} className="w-28" />
          </div>
          <div className="space-y-1 flex-1 min-w-[140px]">
            <label className="text-xs text-muted-foreground">نام</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">نرخ ٪</label>
            <Input value={rate} onChange={(e) => setRate(e.target.value)} className="w-20" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">از تاریخ</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <Button
            size="sm"
            disabled={createMut.isPending}
            onClick={() => void createMut.mutateAsync()}
          >
            {createMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span className="ms-1">افزودن</span>
          </Button>
        </div>
      ) : null}

      <div className="rounded-xl border bg-card overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-destructive">
            خطا.{" "}
            <button type="button" className="underline" onClick={() => void refetch()}>
              تلاش مجدد
            </button>
          </div>
        ) : !data?.length ? (
          <div className="p-4 text-sm text-muted-foreground">نرخی ثبت نشده.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-3 py-2">کد</th>
                <th className="px-3 py-2">نام</th>
                <th className="px-3 py-2">نرخ ٪</th>
                <th className="px-3 py-2">از</th>
                <th className="px-3 py-2">تا</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.tax_rate_config_id} className="border-b border-border/50">
                  <td className="px-3 py-2 font-mono text-xs">{r.tax_code}</td>
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.rate_percent}</td>
                  <td className="px-3 py-2">{r.valid_from}</td>
                  <td className="px-3 py-2">{r.valid_to ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
