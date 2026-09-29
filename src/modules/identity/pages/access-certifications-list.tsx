/** Access Certification campaigns list — ID-W2-01 FE */

"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  DataTable,
  type DataTableColumn,
} from "@/shared/components/data-display/data-table";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { ApiClientError } from "@/api";
import { usePermission } from "@/auth";
import { IdentityPermissions } from "../types";
import {
  accessCertificationService,
  type AccessCertCampaignDto,
} from "../services/access-certification-service";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  OPEN: "باز",
  COMPLETED: "تکمیل",
  CANCELLED: "لغو",
};

export function AccessCertificationsListPage() {
  const canView = usePermission(IdentityPermissions.accessCertView);
  const canManage = usePermission(IdentityPermissions.accessCertManage);
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["identity", "access-certifications"],
    queryFn: () => accessCertificationService.list(),
    enabled: canView,
  });

  const openMut = useMutation({
    mutationFn: (id: string) => accessCertificationService.open(id),
    onSuccess: () => {
      toast.success("کمپین باز شد");
      void qc.invalidateQueries({ queryKey: ["identity", "access-certifications"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "باز کردن کمپین ناموفق بود"),
  });

  const completeMut = useMutation({
    mutationFn: (id: string) => accessCertificationService.complete(id),
    onSuccess: () => {
      toast.success("کمپین تکمیل شد");
      void qc.invalidateQueries({ queryKey: ["identity", "access-certifications"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "تکمیل کمپین ناموفق بود"),
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((r) =>
      [r.code, r.name, r.status].some((v) => String(v ?? "").toLowerCase().includes(term))
    );
  }, [data, q]);

  const columns: DataTableColumn<AccessCertCampaignDto>[] = [
    {
      id: "code",
      header: "کد",
      cell: (r) => <span className="font-mono text-xs">{r.code ?? "—"}</span>,
    },
    {
      id: "name",
      header: "نام",
      cell: (r) => r.name ?? "—",
    },
    {
      id: "status",
      header: "وضعیت",
      cell: (r) => (
        <StatusChip
          label={STATUS_LABEL[String(r.status ?? "")] ?? String(r.status ?? "—")}
          tone={r.status === "OPEN" ? "success" : r.status === "COMPLETED" ? "neutral" : "warning"}
        />
      ),
    },
    {
      id: "due",
      header: "مهلت",
      cell: (r) =>
        r.due_at ? (
          <span dir="ltr" className="text-xs tabular-nums">
            {String(r.due_at).slice(0, 10)}
          </span>
        ) : (
          "—"
        ),
    },
    {
      id: "actions",
      header: "عملیات",
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          {canManage && r.status === "DRAFT" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={openMut.isPending}
              onClick={() => void openMut.mutateAsync(r.campaign_id)}
            >
              باز کردن
            </Button>
          ) : null}
          {canManage && r.status === "OPEN" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={completeMut.isPending}
              onClick={() => void completeMut.mutateAsync(r.campaign_id)}
            >
              تکمیل
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  if (!canView) {
    return (
      <div className="space-y-4">
        <PageHeader title="بازبینی دسترسی" description="مجوز مشاهده ندارید." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="بازبینی دسترسی (Access Certification)"
        description="کمپین‌های بررسی دوره‌ای نقش‌ها و دسترسی‌ها"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "بازبینی دسترسی" },
        ]}
        icon={<ClipboardCheck className="h-5 w-5" />}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو…"
            className="ps-8 h-9"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          بروزرسانی
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال بارگذاری…
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {error instanceof ApiClientError ? error.message : "خطا در بارگذاری"}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          getRowKey={(r) => r.campaign_id}
          isFiltered={q.trim().length > 0}
          emptyTitle="کمپینی ثبت نشده است."
          emptySearchTitle="نتیجه‌ای پیدا نشد."
        />
      )}
    </div>
  );
}
