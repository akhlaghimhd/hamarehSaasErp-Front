"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import { openItemService } from "../services/open-item-service";
import { AGING_BUCKET_LABELS, FinancePermissions } from "../types";

export function OpenItemsPage() {
  const canView = usePermission(FinancePermissions.arView);
  const { data: companies } = useCompanies();

  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    const p = list.find((c) => c.is_primary) ?? list[0];
    return p?.company_id ?? null;
  }, [companies]);

  const [companyId, setCompanyId] = useState("");
  const [side, setSide] = useState<"AR" | "AP">("AR");
  const effectiveCompany = companyId || primaryCompanyId;

  const listQ = useQuery({
    queryKey: ["finance", "open-items", effectiveCompany, side],
    queryFn: () => openItemService.list(effectiveCompany!, side),
    enabled: canView && Boolean(effectiveCompany),
  });

  const agingQ = useQuery({
    queryKey: ["finance", "aging", effectiveCompany, side],
    queryFn: () => openItemService.aging(effectiveCompany!, side),
    enabled: canView && Boolean(effectiveCompany),
  });

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده AR/AP را ندارید.</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="حساب‌های باز (AR/AP)"
        description="فاکتورهای دستی باز و گزارش عمر بدهی"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "حساب‌های باز" },
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
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={side === "AR" ? "default" : "outline"}
            onClick={() => setSide("AR")}
          >
            دریافتنی (AR)
          </Button>
          <Button
            size="sm"
            variant={side === "AP" ? "default" : "outline"}
            onClick={() => setSide("AP")}
          >
            پرداختنی (AP)
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(agingQ.data ?? []).map((b) => (
          <div
            key={b.bucket}
            className="rounded-xl border bg-card p-3 text-sm shadow-[var(--shadow-xs)]"
          >
            <div className="text-xs text-muted-foreground">
              {AGING_BUCKET_LABELS[b.bucket] ?? b.bucket}
            </div>
            <div className="mt-1 font-mono text-base font-semibold">{b.amount}</div>
            <div className="text-[10px] text-muted-foreground">{b.count} قلم</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        {listQ.isLoading ? (
          <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
          </div>
        ) : !listQ.data?.length ? (
          <div className="p-4 text-sm text-muted-foreground">آیتم بازی نیست.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-3 py-2">طرف حساب</th>
                <th className="px-3 py-2">شماره</th>
                <th className="px-3 py-2">سررسید</th>
                <th className="px-3 py-2">مانده</th>
                <th className="px-3 py-2">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {listQ.data.map((r) => (
                <tr key={r.open_item_id} className="border-b border-border/50">
                  <td className="px-3 py-2">{r.counterparty_name}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {r.document_number ?? "—"}
                  </td>
                  <td className="px-3 py-2">{r.due_date ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{r.open_amount}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {r.status}
                    </span>
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
