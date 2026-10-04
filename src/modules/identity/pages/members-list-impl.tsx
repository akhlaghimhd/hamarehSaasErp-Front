"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, RotateCcw, Search, Users, X } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { usePermission } from "@/auth";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { useTenantUsers } from "../hooks/use-tenant-users";
import { MembersCompanyFilter } from "../components/members-company-filter";
import { IdentityPermissions } from "../types";
import { MSG_LOAD_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import type { MembershipListFilter } from "../services/tenant-user-service";
import { MemberCreateDrawer } from "../components/member-create-drawer";
import { memberDetailPath } from "../lib/member-ref";
import { dn, highestRoleName, scopeNames } from "./members-list-helpers";

export function MembersListPage() {
  const canView = usePermission(IdentityPermissions.userView);
  const canCreate = usePermission(IdentityPermissions.userCreate);

  const [membershipFilter, setMembershipFilter] = useState<MembershipListFilter>("active");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const { data, isLoading, isError, error, refetch, isFetching } = useTenantUsers(
    membershipFilter,
    companyFilter !== "all" ? { companyId: companyFilter } : undefined
  );

  const [query, setQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const rows = useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) => {
      const u = row.user;
      return [u?.first_name, u?.last_name, u?.email, u?.mobile]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [data, query]);

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="کاربران سازمان"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "کاربران" },
          ]}
        />
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <PageHeader
        title="کاربران سازمان"
        description="اعضای سازمان را جستجو کنید، وضعیتشان را تغییر دهید یا عضو جدید اضافه کنید"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "کاربران" },
        ]}
        icon={<Users className="h-4 w-4" />}
        actions={
          canCreate ? (
            <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              افزودن کاربر
            </Button>
          ) : null
        }
      />

      {isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">بارگذاری فهرست ممکن نشد</p>
          <p className="mt-1 text-xs">{error instanceof Error ? error.message : MSG_LOAD_ERROR}</p>
          <Button variant="outline" size="sm" className="mt-3 h-8" onClick={() => void refetch()}>
            تلاش مجدد
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className={cn("h-8 ps-8 text-sm", query && "pe-8")}
            placeholder="نام، ایمیل یا موبایل…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query ? (
            <button
              type="button"
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted"
              onClick={() => setQuery("")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <Select value={membershipFilter} onValueChange={(v) => setMembershipFilter(v as MembershipListFilter)}>
          <SelectTrigger className="h-8 w-[9.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">کاربران جاری</SelectItem>
            <SelectItem value="deleted">کاربران حذف‌شده</SelectItem>
          </SelectContent>
        </Select>
        <MembersCompanyFilter value={companyFilter} onChange={setCompanyFilter} />
        <Button type="button" variant="ghost" size="sm" className="h-8 gap-1.5" disabled={isFetching} onClick={() => void refetch()}>
          {isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          تازه‌سازی
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title={query ? "موردی پیدا نشد" : "کاربری ثبت نشده"} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>ایمیل</TableHead>
                <TableHead>نقش</TableHead>
                <TableHead>محدوده</TableHead>
                <TableHead>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.tenant_user_id}>
                  <TableCell className="font-medium">
                    <Link href={memberDetailPath(row.tenant_user_id)} className="text-primary hover:underline">
                      {dn(row)}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">
                    {row.user?.email || "—"}
                  </TableCell>
                  <TableCell>{highestRoleName(row)}</TableCell>
                  <TableCell className="max-w-[12rem] truncate text-xs">{scopeNames(row)}</TableCell>
                  <TableCell>
                    <StatusChip
                      tone={Number(row.status) === 1 ? "success" : "neutral"}
                      label={Number(row.status) === 1 ? "فعال" : "غیرفعال"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {toFaDigits(rows.length)} کاربر
        {isFetching && !isLoading ? <Loader2 className="ms-2 inline h-3 w-3 animate-spin" /> : null}
      </p>

      <MemberCreateDrawer open={createOpen} onOpenChange={setCreateOpen} onCreated={() => void refetch()} />
    </div>
  );
}
