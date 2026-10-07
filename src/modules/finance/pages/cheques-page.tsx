"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/auth";
import { chequeService } from "../services/cheque-service";
import { FinancePermissions } from "../types";

const statusFa: Record<string, string> = {
  RECEIVED: "دریافت‌شده",
  ISSUED: "صادرشده",
  DEPOSITED: "واگذار به بانک",
  CLEARED: "وصول",
  BOUNCED: "برگشتی",
  CANCELLED: "ابطال",
};

export function ChequesPage() {
  const canView = usePermission(FinancePermissions.treasuryView);
  const canManage = usePermission(FinancePermissions.treasuryManage);
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["finance", "cheques"],
    queryFn: () => chequeService.list(),
    enabled: canView,
  });

  const transitionMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      chequeService.transition(id, status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["finance", "cheques"] }),
  });

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده چک را ندارید.</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="ثبت چک"
        description="چرخه وضعیت چک‌های دریافتی و پرداختی"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "چک" },
        ]}
      />

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
          <div className="p-4 text-sm text-muted-foreground">چکی ثبت نشده.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-3 py-2">شماره</th>
                <th className="px-3 py-2">جهت</th>
                <th className="px-3 py-2">سررسید</th>
                <th className="px-3 py-2">مبلغ</th>
                <th className="px-3 py-2">وضعیت</th>
                <th className="px-3 py-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.cheque_id} className="border-b border-border/50">
                  <td className="px-3 py-2 font-mono text-xs">{c.cheque_number}</td>
                  <td className="px-3 py-2">{c.direction === "IN" ? "دریافتی" : "پرداختی"}</td>
                  <td className="px-3 py-2">{c.due_date}</td>
                  <td className="px-3 py-2 font-mono text-xs">{c.amount}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {statusFa[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 space-x-1 space-x-reverse">
                    {canManage && c.status === "RECEIVED" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={transitionMut.isPending}
                        onClick={() =>
                          void transitionMut.mutateAsync({
                            id: c.cheque_id,
                            status: "DEPOSITED",
                          })
                        }
                      >
                        واگذاری
                      </Button>
                    ) : null}
                    {canManage && c.status === "DEPOSITED" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={transitionMut.isPending}
                        onClick={() =>
                          void transitionMut.mutateAsync({
                            id: c.cheque_id,
                            status: "CLEARED",
                          })
                        }
                      >
                        وصول
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
