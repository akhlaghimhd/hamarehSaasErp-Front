"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import { complianceService } from "../services/compliance-service";
import { FinancePermissions } from "../types";

export function ComplianceAlertsPage() {
  const canView = usePermission(FinancePermissions.complianceView);
  const canManage = usePermission(FinancePermissions.complianceManage);
  const qc = useQueryClient();
  const { data: companies } = useCompanies();

  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    const p = list.find((c) => c.is_primary) ?? list[0];
    return p?.company_id ?? null;
  }, [companies]);

  const [companyId, setCompanyId] = useState("");
  const effectiveCompany = companyId || primaryCompanyId;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["finance", "alerts", effectiveCompany],
    queryFn: () => complianceService.listOpen(effectiveCompany ?? undefined),
    enabled: canView,
  });

  const scanMut = useMutation({
    mutationFn: () => complianceService.scan(effectiveCompany!),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["finance", "alerts"] }),
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => complianceService.resolve(id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["finance", "alerts"] }),
  });

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده هشدار را ندارید.</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="هشدارهای انطباق (K3)"
        description="شکاف مودیان، نرخ، و هشدارهای کیفیت حسابداری"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "هشدارها" },
        ]}
      />

      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">شرکت</label>
          <select
            className="h-9 min-w-[180px] rounded-md border bg-background px-2 text-sm"
            value={effectiveCompany ?? ""}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="">—</option>
            {(companies ?? []).map((c) => (
              <option key={c.company_id} value={c.company_id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {canManage && effectiveCompany ? (
          <Button
            size="sm"
            disabled={scanMut.isPending}
            onClick={() => void scanMut.mutateAsync()}
          >
            {scanMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            <span className="ms-1">اسکن مودیان گم‌شده</span>
          </Button>
        ) : null}
      </div>

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
          <div className="p-4 text-sm text-muted-foreground">هشدار بازی نیست.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-3 py-2">شدت</th>
                <th className="px-3 py-2">کد</th>
                <th className="px-3 py-2">عنوان</th>
                <th className="px-3 py-2">پیام</th>
                <th className="px-3 py-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {data.map((a) => (
                <tr key={a.compliance_alert_id} className="border-b border-border/50">
                  <td className="px-3 py-2">
                    <span
                      className={
                        a.severity === "BLOCK"
                          ? "text-destructive text-[10px] font-medium"
                          : a.severity === "WARN"
                            ? "text-amber-700 text-[10px] font-medium"
                            : "text-muted-foreground text-[10px]"
                      }
                    >
                      {a.severity}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{a.alert_code}</td>
                  <td className="px-3 py-2">{a.title}</td>
                  <td className="px-3 py-2 max-w-[240px] truncate text-xs text-muted-foreground">
                    {a.message}
                  </td>
                  <td className="px-3 py-2">
                    {canManage ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resolveMut.isPending}
                        onClick={() => void resolveMut.mutateAsync(a.compliance_alert_id)}
                      >
                        بستن
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
