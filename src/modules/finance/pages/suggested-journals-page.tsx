"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/auth";
import { useCompanies } from "@/modules/organization/hooks/use-companies";
import { suggestedJournalService } from "../services/suggested-journal-service";
import { FinancePermissions } from "../types";

export function SuggestedJournalsPage() {
  const canView = usePermission(FinancePermissions.suggestView);
  const canDecide = usePermission(FinancePermissions.suggestDecide);
  const qc = useQueryClient();
  const { data: companies } = useCompanies();

  const primaryCompanyId = useMemo(() => {
    const list = companies ?? [];
    const p = list.find((c) => c.is_primary) ?? list[0];
    return p?.company_id ?? null;
  }, [companies]);

  const [companyId, setCompanyId] = useState("");
  const [status, setStatus] = useState("PENDING");
  const effectiveCompany = companyId || primaryCompanyId;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["finance", "suggested", effectiveCompany, status],
    queryFn: () =>
      suggestedJournalService.list({
        company_id: effectiveCompany ?? undefined,
        status,
      }),
    enabled: canView,
  });

  const acceptMut = useMutation({
    mutationFn: (id: string) => suggestedJournalService.accept(id),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["finance", "suggested"] }),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => suggestedJournalService.reject(id, "رد از صندوق"),
    onSuccess: () =>
      void qc.invalidateQueries({ queryKey: ["finance", "suggested"] }),
  });

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">
        مجوز مشاهده پیشنهادهای سند را ندارید.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="صندوق پیشنهادهای سند (K1)"
        description="رویداد عملیاتی → پیش‌نویس قابل بررسی؛ قبول فقط DRAFT می‌سازد (بدون ثبت قطعی)"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "پیشنهادها" },
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
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">وضعیت</label>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="PENDING">در انتظار</option>
            <option value="ACCEPTED">پذیرفته</option>
            <option value="REJECTED">ردشده</option>
            <option value="ALL">همه</option>
          </select>
        </div>
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
          <div className="p-4 text-sm text-muted-foreground">پیشنهادی نیست.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-3 py-2">وضعیت</th>
                <th className="px-3 py-2">رویداد</th>
                <th className="px-3 py-2">توضیح</th>
                <th className="px-3 py-2">سطرها / دلیل</th>
                <th className="px-3 py-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.suggested_journal_id} className="border-b border-border/50 align-top">
                  <td className="px-3 py-2">
                    <span className="text-[10px] font-medium">{s.status}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{s.source_event_type}</td>
                  <td className="px-3 py-2 max-w-[160px] truncate text-xs">
                    {s.description ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    <ul className="space-y-1">
                      {(s.lines ?? []).map((l) => (
                        <li key={l.suggested_line_id}>
                          {l.line_role}: {String(l.debit_amount || l.credit_amount)} —{" "}
                          <span className="text-[10px]">{l.suggestion_reason}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-3 py-2">
                    {canDecide && s.status === "PENDING" ? (
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          disabled={acceptMut.isPending}
                          onClick={() => void acceptMut.mutateAsync(s.suggested_journal_id)}
                        >
                          قبول → پیش‌نویس
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={rejectMut.isPending}
                          onClick={() => void rejectMut.mutateAsync(s.suggested_journal_id)}
                        >
                          رد
                        </Button>
                      </div>
                    ) : s.journal_entry_id ? (
                      <span className="text-[10px] text-muted-foreground">
                        JE: {s.journal_entry_id.slice(0, 8)}…
                      </span>
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
