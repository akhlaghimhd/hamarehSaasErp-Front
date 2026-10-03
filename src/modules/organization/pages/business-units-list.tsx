/**
 * FE-ORG — واحدهای کسب‌وکار (clean UTF-8)
 */
"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layers, Loader2, Search } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { usePermission } from "@/auth";
import { tokenStorage } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import { businessUnitService } from "../services/org-extended-service";
import { OrganizationPermissions } from "../types";

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

export function BusinessUnitsListPage() {
  const canView =
    usePermission(OrganizationPermissions.businessUnitView) ||
    usePermission(OrganizationPermissions.companyView);
  const [query, setQuery] = useState("");

  const listQuery = useQuery({
    queryKey: ["org", "business-units", "active"],
    queryFn: () => businessUnitService.list({ membership: "active" }),
    enabled: canView && hasAuthContext(),
  });

  const rows = useMemo(() => {
    const list = listQuery.data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      [r.name, r.code, r.description]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ")
        .includes(q)
    );
  }, [listQuery.data, query]);

  if (!canView) {
    return <div className="p-6"><EmptyState title="مجوز مشاهده واحدهای کسب‌وکار را ندارید" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="واحدهای کسب‌وکار"
        description="فهرست واحدهای کسب‌وکار مستأجر"
        breadcrumbs={[{ label: "سازمان", href: "/dashboard/organization" }, { label: "واحدهای کسب‌وکار" }]}
        icon={<Layers className="h-4 w-4" />}
      />
      <div className="relative max-w-md">
        <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-9 ps-9" placeholder="جستجو…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {listQuery.isLoading ? (
        <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
      ) : listQuery.isError ? (
        <EmptyState title="بارگذاری ناموفق" actionLabel="تلاش مجدد" onAction={() => void listQuery.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="واحدی یافت نشد" />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>کد</TableHead>
                <TableHead>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.business_unit_id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">{row.code || "—"}</TableCell>
                  <TableCell>
                    <StatusChip tone={row.is_active !== false ? "success" : "neutral"} label={row.is_active !== false ? "فعال" : "غیرفعال"} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t px-3 py-2 text-sm text-muted-foreground">
            {toFaDigits(String(rows.length))} واحد
            {listQuery.isFetching ? <Loader2 className="ms-2 inline h-3.5 w-3.5 animate-spin" /> : null}
          </div>
        </div>
      )}
    </div>
  );
}
