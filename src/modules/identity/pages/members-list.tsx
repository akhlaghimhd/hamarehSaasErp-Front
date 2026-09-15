/** FE-P1-T06 — فهرست کاربران سازمان */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  DataTable,
  type DataTableColumn,
} from "@/shared/components/data-display/data-table";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Can, usePermission } from "@/auth";
import { toFaDigits } from "@/shared/lib/utils";
import { useTenantUsers } from "../hooks/use-tenant-users";
import { IdentityPermissions, type TenantUserDto } from "../types";
import { MSG_LOAD_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";

type StatusFilter = "all" | "active" | "inactive";

function memberDisplayName(row: TenantUserDto): string {
  const u = row.user;
  if (!u) return "—";
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return name || u.email || "—";
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  try {
    const s = new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
    return toFaDigits(s);
  } catch {
    return toFaDigits(value);
  }
}

export function MembersListPage() {
  const canView = usePermission(IdentityPermissions.userView);
  const { data, isLoading, isError, error, refetch, isFetching } =
    useTenantUsers();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const rows = data ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const status = Number(row.status);
      if (statusFilter === "active" && status !== 1) return false;
      if (statusFilter === "inactive" && status !== 0) return false;

      if (!q) return true;
      const u = row.user;
      const hay = [u?.first_name, u?.last_name, u?.email, u?.mobile]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query, statusFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const isFiltered = query.trim().length > 0 || statusFilter !== "all";

  const columns: DataTableColumn<TenantUserDto>[] = [
    {
      id: "name",
      header: "نام",
      cell: (row) => (
        <div className="min-w-0">
          <div className="truncate font-medium">{memberDisplayName(row)}</div>
          {row.is_owner ? (
            <span className="text-[11px] text-muted-foreground">مدیر اصلی سازمان</span>
          ) : null}
        </div>
      ),
    },
    {
      id: "email",
      header: "ایمیل",
      cell: (row) => (
        <span className="truncate text-sm">{row.user?.email ?? "—"}</span>
      ),
    },
    {
      id: "mobile",
      header: "موبایل",
      cell: (row) => (
        <span className="tabular-nums text-sm">
          {row.user?.mobile ? toFaDigits(row.user.mobile) : "—"}
        </span>
      ),
      className: "hidden md:table-cell",
      headerClassName: "hidden md:table-cell",
    },
    {
      id: "status",
      header: "وضعیت",
      cell: (row) =>
        Number(row.status) === 1 ? (
          <StatusChip label="فعال" tone="success" />
        ) : (
          <StatusChip label="غیرفعال" tone="neutral" />
        ),
    },
    {
      id: "joined",
      header: "تاریخ عضویت",
      cell: (row) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {formatDate(row.created_at)}
        </span>
      ),
      className: "hidden lg:table-cell",
      headerClassName: "hidden lg:table-cell",
    },
    {
      id: "actions",
      header: "",
      headerClassName: "w-24",
      className: "w-24",
      cell: (row) => (
        <Button variant="ghost" size="sm" className="h-8" asChild>
          <Link href={`/dashboard/identity/members/${row.tenant_user_id}`}>
            جزئیات
          </Link>
        </Button>
      ),
    },
  ];

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="کاربران سازمان"
          description="مدیریت اعضای سازمان"
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "کاربران" },
          ]}
        />
        <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center text-sm text-muted-foreground">
          {MSG_NO_ACCESS}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="کاربران سازمان"
        description="فهرست و مدیریت اعضای فعال سازمان"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "کاربران" },
        ]}
        actions={
          <Can permission={IdentityPermissions.userCreate}>
            <Button size="sm" asChild>
              <Link href="/dashboard/identity/members/new">
                <Plus className="h-4 w-4" />
                افزودن کاربر
              </Link>
            </Button>
          </Can>
        }
      />

      {isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">دریافت فهرست کاربران ممکن نشد</p>
          <p className="mt-1 text-xs opacity-90">
            {error instanceof Error ? error.message : MSG_LOAD_ERROR}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 h-8"
            onClick={() => void refetch()}
          >
            تلاش مجدد
          </Button>
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={pageRows}
        getRowKey={(row) => row.tenant_user_id}
        loading={isLoading || (isFetching && !data)}
        isFiltered={isFiltered}
        emptyTitle="هنوز کاربری ثبت نشده"
        emptyDescription="اولین کاربر سازمان را اضافه کنید تا در این فهرست دیده شود."
        emptySearchTitle="نتیجه‌ای پیدا نشد"
        emptySearchDescription="عبارت جستجو یا فیلتر وضعیت را تغییر دهید."
        page={safePage}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 ps-8"
                placeholder="جستجو نام، ایمیل، موبایل…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                aria-label="جستجوی کاربران"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as StatusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[8.5rem]" aria-label="فیلتر وضعیت">
                <SelectValue placeholder="وضعیت" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                <SelectItem value="active">فعال</SelectItem>
                <SelectItem value="inactive">غیرفعال</SelectItem>
              </SelectContent>
            </Select>
            <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
              <Users className="h-3.5 w-3.5" />
              <span>{toFaDigits(total)} نفر</span>
            </div>
          </div>
        }
      />
    </div>
  );
}
