"use client";

import { Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/auth";
import {
  useJournals,
  usePostJournal,
  useReverseJournal,
} from "../hooks/use-journals";
import { FinancePermissions } from "../types";

const statusLabel: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  POSTED: "ثبت‌شده",
  REVERSED: "برگشت‌خورده",
};

export function JournalsPage() {
  const canView = usePermission(FinancePermissions.journalView);
  const canPost = usePermission(FinancePermissions.journalPost);
  const canReverse = usePermission(FinancePermissions.journalReverse);

  const { data, isLoading, error, refetch } = useJournals();
  const postMut = usePostJournal();
  const reverseMut = useReverseJournal();

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده اسناد را ندارید.</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="اسناد حسابداری"
        description="لیست پیش‌نویس و اسناد ثبت‌شده؛ ثبت قطعی و برگشت"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "اسناد" },
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
        ) : !data || data.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            سندی نیست. از API یا تست سرویس پیش‌نویس بسازید.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-3 py-2 font-medium">شماره</th>
                <th className="px-3 py-2 font-medium">تاریخ</th>
                <th className="px-3 py-2 font-medium">وضعیت</th>
                <th className="px-3 py-2 font-medium">شرح</th>
                <th className="px-3 py-2 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {data.map((j) => (
                <tr key={j.journal_entry_id} className="border-b border-border/50">
                  <td className="px-3 py-2 font-mono text-xs">
                    {j.entry_number ?? "—"}
                  </td>
                  <td className="px-3 py-2">{j.document_date}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {statusLabel[j.status] ?? j.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 max-w-[200px] truncate">
                    {j.description ?? "—"}
                  </td>
                  <td className="px-3 py-2 space-x-1 space-x-reverse">
                    {j.status === "DRAFT" && canPost ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={postMut.isPending}
                        onClick={() => void postMut.mutateAsync(j.journal_entry_id)}
                      >
                        ثبت قطعی
                      </Button>
                    ) : null}
                    {j.status === "POSTED" && canReverse ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reverseMut.isPending}
                        onClick={() => void reverseMut.mutateAsync(j.journal_entry_id)}
                      >
                        برگشت
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
