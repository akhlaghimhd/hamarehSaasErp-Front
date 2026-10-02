"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Users, X } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { usePermission } from "@/auth";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { useTenantUsers } from "../hooks/use-tenant-users";
import { MembersCompanyFilter } from "../components/members-company-filter";
import { IdentityPermissions } from "../types";
import { MSG_LOAD_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import type { MembershipListFilter } from "../services/tenant-user-service";
import { MemberCreateDrawer } from "../components/member-create-drawer";
import { memberDetailPath } from "../lib/member-ref";
import { highestRoleName, type StatusFilter, type SortKey, type SortDir } from "./members-list-helpers";

export function MembersListPage() {
  const canView = usePermission(IdentityPermissions.userView);
  const canCreate = usePermission(IdentityPermissions.userCreate);

  const [membershipFilter, setMembershipFilter] = useState<MembershipListFilter>("active");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const { data, isLoading, isError, refetch } = useTenantUsers(
    membershipFilter,
    companyFilter !== "all" ? { companyId: companyFilter } : undefined
  );

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortKey] = useState<SortKey>("name");
  const [sortDir] = useState<SortDir>("asc");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [membershipFilter, companyFilter]);

  const rows = data ?? [];
  const isDeletedView = membershipFilter === "deleted";

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((row) => {
      if (!isDeletedView) {
        const st = Number(row.status);
        if (statusFilter === "active" && st !== 1) return false;
        if (statusFilter === "inactive" && st === 1) return false;
      }
      if (!q) return true;
      const name = (
        row.user?.display_name ||
        [row.user?.first_name, row.user?.last_name].filter(Boolean).join(" ") ||
        ""
      ).toLowerCase();
      const email = (row.user?.email || "").toLowerCase();
      const mobile = (row.user?.mobile || "").toLowerCase();
      return name.includes(q) || email.includes(q) || mobile.includes(q);
    });
    list = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const an = (a.user?.display_name || "").toLowerCase();
      const bn = (b.user?.display_name || "").toLowerCase();
      if (sortKey === "name") return an < bn ? -dir : an > bn ? dir : 0;
      return 0;
    });
    return list;
  }, [rows, query, statusFilter, isDeletedView, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filteredSorted.length / pageSize));
  const pageRows = filteredSorted.slice((page - 1) * pageSize, page * pageSize);

  if (!canView) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{MSG_NO_ACCESS}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <PageHeader
        title="کاربران سازمان"
        description="فهرست اعضای مستأجر"
        icon={<Users className="h-4 w-4" />}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "کاربران" },
        ]}
        actions={
          canCreate ? (
            <Button type="button" size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5" />
              افزودن کاربر
            </Button>
          ) : null
        }
      />

      {isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p>{MSG_LOAD_ERROR}</p>
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void refetch()}>
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
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          {query ? (
            <button
              type="button"
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="پاک کردن جستجو"
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <Select
          value={membershipFilter}
          onValueChange={(v) => setMembershipFilter(v as MembershipListFilter)}
        >
          <SelectTrigger className="h-8 w-[9.5rem]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">کاربران جاری</SelectItem>
            <SelectItem value="deleted">کاربران حذف‌شده</SelectItem>
          </SelectContent>
        </Select>
        <MembersCompanyFilter
          value={companyFilter}
          onChange={(v) => {
            setCompanyFilter(v);
            setPage(1);
          }}
        />
        {!isDeletedView ? (
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as StatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[8.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              <SelectItem value="active">فعال</SelectItem>
              <SelectItem value="inactive">غیرفعال</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : pageRows.length === 0 ? (
        <EmptyState icon={Users} title="عضوی یافت نشد" description="با فیلترهای فعلی نتیجه‌ای نیست." />
      ) : (
        <div className="overflow-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>ایمیل</TableHead>
                <TableHead>موبایل</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>نقش</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => {
                const name =
                  row.user?.display_name ||
                  [row.user?.first_name, row.user?.last_name].filter(Boolean).join(" ") ||
                  "—";
                const active = Number(row.status) === 1;
                return (
                  <TableRow key={row.tenant_user_id}>
                    <TableCell>
                      <Link
                        href={memberDetailPath(row.tenant_user_id)}
                        className="text-primary hover:underline"
                      >
                        {name}
                      </Link>
                    </TableCell>
                    <TableCell>{row.user?.email || "—"}</TableCell>
                    <TableCell>{row.user?.mobile || "—"}</TableCell>
                    <TableCell>
                      <StatusChip
                        label={active ? "فعال" : "غیرفعال"}
                        tone={active ? "success" : "neutral"}
                      />
                    </TableCell>
                    <TableCell>{highestRoleName(row) || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>{toFaDigits(String(filteredSorted.length))} عضو</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            قبلی
          </Button>
          <span>
            {toFaDigits(String(page))} / {toFaDigits(String(pageCount))}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            بعدی
          </Button>
        </div>
      </div>

      <MemberCreateDrawer open={createOpen} onOpenChange={setCreateOpen} onCreated={() => void refetch()} />
    </div>
  );
}
