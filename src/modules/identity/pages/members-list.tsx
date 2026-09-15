/** FE-P1-T06 — فهرست کاربران سازمان (جدول عملیاتی پرترافیک — UI-05) */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Search, Users } from "lucide-react";
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
  const router = useRouter();
  const canView = usePermission(IdentityPermissions.userView);
  const { data, isLoading, isError, error, refetch, isFetching } =
    useTenantUsers();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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

  /** ستون‌های کم‌تعداد و فشرده — جزئیات در صفحه جدا */
  const columns: DataTableColumn<TenantUserDto>[] = [
    {
      id: "identity",
      header: "کاربر",
      headerClassName: "min-w-[14rem]",
      className: "min-w-[14rem]",
      cell: (row) => {
        const u = row.user;
        const email = u?.email?.trim();
        const mobile = u?.mobile ? toFaDigits(u.mobile) : null;
        const contact = [email, mobile].filter(Boolean).join(" · ");
        return (
          <div className="min-w-0 py-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate font-medium leading-tight">
                {memberDisplayName(row)}
              </span>
              {row.is_owner ? (
                <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  مدیر اصلی
                </span>
              ) : null}
            </div>
            {contact ? (
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {contact}
              </div>
            ) : null}
          </div>
        );
      },
    },
    {
      id: "status",
      header: "وضعیت",
      headerClassName: "w-[6.5rem]",
      className: "w-[6.5rem]",
      cell: (row) =>
        Number(row.status) === 1 ? (
          <StatusChip label="فعال" tone="success" />
        ) : (
          <StatusChip label="غیرفعال" tone="neutral" />
        ),
    },
    {
      id: "joined",
      header: "عضویت",
      headerClassName: "hidden w-[7.5rem] sm:table-cell",
      className: "hidden w-[7.5rem] tabular-nums sm:table-cell",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.created_at)}
        </span>
      ),
    },
    {
      id: "go",
      header: "",
      headerClassName: "w-10",
      className: "w-10",
      cell: () => (
        <ChevronLeft
          className="h-4 w-4 text-muted-foreground/70"
          aria-hidden
        />
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
    <div className="space-y-5">
      <PageHeader
        title="کاربران سازمان"
        description="فهرست فشرده اعضا — برای جزئیات روی هر ردیف کلیک کنید"
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
        density="compact"
        onRowClick={(row) => {
          router.push(`/dashboard/identity/members/${row.tenant_user_id}`);
        }}
        emptyTitle="هنوز کاربری ثبت نشده"
        emptyDescription="اولین کاربر سازمان را اضافه کنید تا در این فهرست دیده شود."
        emptySearchTitle="نتیجه‌ای پیدا نشد"
        emptySearchDescription="عبارت جستجو یا فیلتر وضعیت را تغییر دهید."
        page={safePage}
        pageSize={pageSize}
        total={total}
        pageSizeOptions={[10, 20, 50, 100]}
        onPageChange={(p) => setPage(p)}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-8 ps-8 text-sm"
                placeholder="جستجو نام، ایمیل یا موبایل…"
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
              <SelectTrigger className="h-8 w-[8.25rem]" aria-label="فیلتر وضعیت">
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
              <span className="tabular-nums">{toFaDigits(total)} نفر</span>
            </div>
          </div>
        }
      />
    </div>
  );
}
