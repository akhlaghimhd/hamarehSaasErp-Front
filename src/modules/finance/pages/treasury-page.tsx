"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { usePermission } from "@/auth";
import { treasuryService } from "../services/treasury-service";
import { FinancePermissions } from "../types";

const typeLabel: Record<string, string> = {
  RECEIPT: "دریافت",
  PAYMENT: "پرداخت",
};

const statusLabel: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  POSTED: "ثبت‌شده",
  VOID: "باطل",
};

export function TreasuryPage() {
  const canView = usePermission(FinancePermissions.treasuryView);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["finance", "treasury-docs"],
    queryFn: () => treasuryService.listDocuments(),
    enabled: canView,
  });

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده خزانه را ندارید.</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="اسناد خزانه"
        description="دریافت و پرداخت نقدی / بانکی"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "خزانه" },
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
          <div className="p-4 text-sm text-muted-foreground">
            سند خزانه‌ای ثبت نشده است.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-3 py-2">نوع</th>
                <th className="px-3 py-2">تاریخ</th>
                <th className="px-3 py-2">مبلغ</th>
                <th className="px-3 py-2">وضعیت</th>
                <th className="px-3 py-2">طرف حساب</th>
                <th className="px-3 py-2">شرح</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.treasury_document_id} className="border-b border-border/50">
                  <td className="px-3 py-2">
                    {typeLabel[d.document_type] ?? d.document_type}
                  </td>
                  <td className="px-3 py-2">{d.document_date}</td>
                  <td className="px-3 py-2 font-mono text-xs">{d.amount}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {statusLabel[d.status] ?? d.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{d.counterparty_name ?? "—"}</td>
                  <td className="px-3 py-2 max-w-[180px] truncate">
                    {d.description ?? "—"}
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
