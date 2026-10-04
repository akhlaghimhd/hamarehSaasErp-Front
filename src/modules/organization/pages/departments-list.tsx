/**
 * FE-ORG — واحدهای سازمانی (clean UTF-8)
 */
"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Network, Search } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { usePermission } from "@/auth";
import { tokenStorage } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import { useCompanies } from "../hooks/use-companies";
import { departmentService, type DepartmentListFilter } from "../services/department-service";
import { branchService } from "../services/branch-service";
import { OrganizationPermissions, type DepartmentDto } from "../types";

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

type DeptRow = DepartmentDto & { company_name: string; branch_name: string };

export function DepartmentsListPage() {
  const canView = usePermission(OrganizationPermissions.departmentView) || usePermission(OrganizationPermissions.companyView);
  const qc = useQueryClient();
  const { data: companies, isLoading: companiesLoading } = useCompanies();
  const companyList = companies ?? [];
  const [query, setQuery] = useState("");
  const [membershipFilter, setMembershipFilter] = useState<DepartmentListFilter>("active");
  const deptsQuery = useQuery({ queryKey: ["organization", "departments", membershipFilter] as const, queryFn: () => departmentService.listAll(membershipFilter), enabled: hasAuthContext(), staleTime: 30_000, retry: 1 });
  const branchesQuery = useQuery({ queryKey: ["organization", "branches", "active", "dept-form"] as const, queryFn: () => branchService.listAll("active"), enabled: hasAuthContext(), staleTime: 60_000, retry: 1 });
  const companyNameById = useMemo(() => { const map = new Map<string, string>(); for (const c of companyList) map.set(c.company_id, c.legal_name || c.name); return map; }, [companyList]);
  const branchNameById = useMemo(() => { const map = new Map<string, string>(); for (const b of branchesQuery.data ?? []) if (b?.branch_id) map.set(b.branch_id, b.name); return map; }, [branchesQuery.data]);
  const rows: DeptRow[] = useMemo(() => (deptsQuery.data ?? []).map((d) => ({ ...d, company_name: companyNameById.get(d.company_id) ?? "—", branch_name: branchNameById.get(d.branch_id) ?? "—" })), [deptsQuery.data, companyNameById, branchNameById]);
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return rows; return rows.filter((r) => [r.code, r.name, r.company_name, r.branch_name].filter(Boolean).join(" ").toLowerCase().includes(q)); }, [rows, query]);

  if (!canView) return <div className="space-y-6"><PageHeader title="واحدهای سازمانی" /><div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">برای مشاهده این بخش مجوز لازم را ندارید.</div></div>;

  const loading = companiesLoading || deptsQuery.isLoading;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <PageHeader title="واحدهای سازمانی" description="فهرست واحدهای همه شرکت‌ها" icon={<Network className="h-4 w-4" />} breadcrumbs={[{ label: "داشبورد", href: "/dashboard" }, { label: "سازمان", href: "/dashboard/organization" }, { label: "واحدها" }]} />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1"><Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input className="h-9 ps-8" placeholder="جستجو…" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <Button type="button" variant={membershipFilter === "active" ? "default" : "outline"} size="sm" onClick={() => setMembershipFilter("active")}>فعال</Button>
        <Button type="button" variant={membershipFilter === "deleted" ? "default" : "outline"} size="sm" onClick={() => setMembershipFilter("deleted")}>حذف‌شده</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => { void qc.invalidateQueries({ queryKey: ["organization", "departments"] }); void deptsQuery.refetch(); }}>تازه‌سازی</Button>
      </div>
      {deptsQuery.isError ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"><p className="font-medium">بارگذاری فهرست ممکن نشد</p><Button variant="outline" size="sm" className="mt-3 h-8" onClick={() => void deptsQuery.refetch()}>تلاش مجدد</Button></div> : null}
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        {loading ? <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> : filtered.length === 0 ? <EmptyState title={query ? "موردی پیدا نشد" : "واحدی ثبت نشده"} /> : (
          <Table><TableHeader><TableRow><TableHead>نام</TableHead><TableHead>کد</TableHead><TableHead>شرکت</TableHead><TableHead>شعبه</TableHead><TableHead>وضعیت</TableHead></TableRow></TableHeader>
            <TableBody>{filtered.map((r) => (<TableRow key={r.department_id}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="font-mono text-xs" dir="ltr">{r.code}</TableCell><TableCell>{r.company_name}</TableCell><TableCell>{r.branch_name}</TableCell><TableCell>{r.is_active !== false ? "فعال" : "غیرفعال"}</TableCell></TableRow>))}</TableBody>
          </Table>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{toFaDigits(filtered.length)} واحد{deptsQuery.isFetching && !deptsQuery.isLoading ? <Loader2 className="ms-2 inline h-3 w-3 animate-spin" /> : null}</p>
    </div>
  );
}
