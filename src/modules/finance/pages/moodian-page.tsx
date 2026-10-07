"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/auth";
import { moodianService } from "../services/moodian-service";
import { FinancePermissions, MOODIAN_STATUS_LABELS } from "../types";

export function MoodianPage() {
  const canView = usePermission(FinancePermissions.moodianView);
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["finance", "moodian"],
    queryFn: () => moodianService.list(),
    enabled: canView,
  });

  const pollMut = useMutation({
    mutationFn: (id: string) => moodianService.poll(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["finance", "moodian"] }),
  });

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده مودیان را ندارید.</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="سامانه مودیان"
        description="پیگیری ارسال صورتحساب الکترونیکی (gateway قابل تعویض)"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "مودیان" },
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
          <div className="p-4 text-sm text-muted-foreground">ارسالی ثبت نشده.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-right text-xs text-muted-foreground">
                <th className="px-3 py-2">نوع سند</th>
                <th className="px-3 py-2">مرجع خارجی</th>
                <th className="px-3 py-2">وضعیت</th>
                <th className="px-3 py-2">ارسال</th>
                <th className="px-3 py-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.moodian_submission_id} className="border-b border-border/50">
                  <td className="px-3 py-2">{s.source_document_type}</td>
                  <td className="px-3 py-2 font-mono text-xs">{s.external_ref ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
                      {MOODIAN_STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{s.submitted_at ?? "—"}</td>
                  <td className="px-3 py-2">
                    {s.external_ref && s.status !== "ACCEPTED" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={pollMut.isPending}
                        onClick={() => void pollMut.mutateAsync(s.moodian_submission_id)}
                      >
                        استعلام
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
