/**
 * FE-ORG — فهرست شعب (با گیت multi_branch)
 * بدون پک: اولین/تنها شعبه قابل مشاهده؛ ایجاد شعبه دوم مسدود.
 */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GitBranch, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { usePermission } from "@/auth";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { FEATURE_PACK_CODES, useFeaturePackEnabled } from "../hooks/use-feature-packs";
import { useAllBranches } from "../hooks/use-branches";
import { companyDetailPath } from "../lib/company-ref";
import { OrganizationPermissions, BRANCH_KIND_LABELS, type BranchDto } from "../types";

export function BranchesListPage() {
  const canView = usePermission(OrganizationPermissions.branchView);
  const canCreate = usePermission(OrganizationPermissions.branchCreate);
  const { enabled: hasMultiBranch, isLoading: packLoading } = useFeaturePackEnabled(
    FEATURE_PACK_CODES.multiBranch
  );
  const { data, isLoading, isError, refetch, isFetching } = useAllBranches();
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const list = (data ?? []) as BranchDto[];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      [r.name, r.code, r.company_id].map((x) => String(x ?? "").toLowerCase()).join(" ").includes(q)
    );
  }, [data, query]);

  const createBlockedByPack = !packLoading && !hasMultiBranch && rows.length >= 1;

  function onCreateClick() {
    if (createBlockedByPack) {
      toast.message("بسته multi_branch فعال نیست؛ ایجاد شعبه دوم مجاز نیست.");
      return;
    }
    toast.message("فرم ایجاد شعبه را از جزئیات شرکت یا مسیر کامل لیست باز کنید.");
  }

  if (!canView) {
    return (
      <div className="p-6">
        <EmptyState title="مجوز مشاهده شعب را ندارید" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="شعب"
        description="فهرست سراسری شعب مستأجر"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "شعب" },
        ]}
        icon={<GitBranch className="h-4 w-4" />}
        actions={
          canCreate ? (
            <Button
              size="sm"
              onClick={onCreateClick}
              disabled={createBlockedByPack}
              title={createBlockedByPack ? "بسته multi_branch لازم است" : undefined}
            >
              <Plus className="h-4 w-4" /> شعبه جدید
            </Button>
          ) : null
        }
      />

      {createBlockedByPack ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          بسته <span className="font-mono">multi_branch</span> فعال نیست. مشاهده مجاز است؛ ایجاد شعبه
          دوم مسدود است.
        </div>
      ) : null}

      <div className="relative max-w-md">
        <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 ps-9"
          placeholder="جستجو…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title="بارگذاری ناموفق"
          actionLabel="تلاش مجدد"
          onAction={() => void refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState title="شعبه‌ای یافت نشد" />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>کد</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>شرکت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.branch_id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">
                    {row.code || "—"}
                  </TableCell>
                  <TableCell>
                    {BRANCH_KIND_LABELS?.[row.branch_kind as string] ?? row.branch_kind ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusChip
                      tone={row.is_active !== false ? "success" : "neutral"}
                      label={row.is_active !== false ? "فعال" : "غیرفعال"}
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={companyDetailPath(row.company_id)}
                      className="text-primary hover:underline text-sm"
                    >
                      {String(row.company_id).slice(0, 8)}…
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t px-3 py-2 text-sm text-muted-foreground">
            {toFaDigits(String(rows.length))} شعبه
            {isFetching ? <Loader2 className="ms-2 inline h-3.5 w-3.5 animate-spin" /> : null}
          </div>
        </div>
      )}
    </div>
  );
}
