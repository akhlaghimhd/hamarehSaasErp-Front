/** صف تأیید تخصیص نقش — فقط صف (بدون ایجاد درخواست از این صفحه) */

"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  GitPullRequestArrow,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
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
import { toFaDigits } from "@/shared/lib/utils";
import { IdentityPermissions } from "../types";
import { useTenantUsers } from "../hooks/use-tenant-users";
import { useRoles } from "../hooks/use-roles";
import {
  roleAssignmentRequestService,
  type RoleAssignmentRequestDto,
} from "../services/role-assignment-request-service";

type SortKey = "user" | "role" | "action" | "date";
type SortDir = "asc" | "desc";

function shortId(id?: string | null): string {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return toFaDigits(
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    );
  } catch {
    return toFaDigits(value);
  }
}

function actionOf(r: RoleAssignmentRequestDto): "GRANT" | "REVOKE" {
  const a = String(
    (r as { request_action?: string }).request_action ?? "GRANT"
  ).toUpperCase();
  return a === "REVOKE" ? "REVOKE" : "GRANT";
}

export function RoleAssignmentRequestsListPage() {
  const canView = usePermission(IdentityPermissions.roleView);
  const canApprove = usePermission(IdentityPermissions.roleApprove);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: members = [] } = useTenantUsers("active");
  const { data: roles = [] } = useRoles();

  const userLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      const uid = String(m.user_id ?? "");
      if (!uid) continue;
      const name =
        m.user?.display_name ||
        [m.user?.first_name, m.user?.last_name].filter(Boolean).join(" ") ||
        m.user?.email ||
        m.user?.mobile ||
        shortId(uid);
      map.set(uid, name);
    }
    return map;
  }, [members]);

  const roleLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roles) {
      map.set(r.tenant_role_id, r.name || r.code || shortId(r.tenant_role_id));
    }
    return map;
  }, [roles]);

  const {
    data = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["identity", "role-assignment-requests"],
    queryFn: () => roleAssignmentRequestService.listPending(),
    enabled: canView,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => roleAssignmentRequestService.approve(id),
    onSuccess: () => {
      toast.success("درخواست تأیید شد و نقش اعمال شد.");
      void qc.invalidateQueries({
        queryKey: ["identity", "role-assignment-requests"],
      });
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiClientError ? e.message : "تأیید ناموفق بود"
      ),
  });

  const rejectMut = useMutation({
    mutationFn: (id: string) => roleAssignmentRequestService.reject(id),
    onSuccess: () => {
      toast.success(
        "درخواست رد شد. برای اعمال دوباره باید از صفحهٔ کاربر درخواست جدید ثبت شود."
      );
      void qc.invalidateQueries({
        queryKey: ["identity", "role-assignment-requests"],
      });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "رد درخواست ناموفق بود"),
  });

  const filteredSorted = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = data;
    if (term) {
      list = data.filter((r) => {
        const u = userLabel.get(String(r.user_id ?? "")) ?? "";
        const role =
          (r as { role_name?: string | null }).role_name ||
          roleLabel.get(String(r.tenant_role_id ?? "")) ||
          "";
        const requester =
          userLabel.get(String(r.requested_by ?? "")) ??
          String(r.requested_by ?? "");
        return [
          u,
          role,
          requester,
          r.reason,
          r.status,
          actionOf(r),
          r.user_id,
          r.tenant_role_id,
        ].some((v) => String(v ?? "").toLowerCase().includes(term));
      });
    }

    const sv = (r: RoleAssignmentRequestDto, key: SortKey): string => {
      if (key === "user")
        return (userLabel.get(String(r.user_id ?? "")) ?? "").toLowerCase();
      if (key === "role") {
        return (
          (r as { role_name?: string | null }).role_name ||
          roleLabel.get(String(r.tenant_role_id ?? "")) ||
          ""
        ).toLowerCase();
      }
      if (key === "action") return actionOf(r);
      return String(r.created_at ?? "");
    };

    return [...list].sort((a, b) => {
      const va = sv(a, sortKey);
      const vb = sv(b, sortKey);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, q, userLabel, roleLabel, sortKey, sortDir]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "date" ? "desc" : "asc");
    }
    setPage(1);
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
      onClick={() => toggleSort(k)}
    >
      {label}
      <SortIcon k={k} />
    </button>
  );

  const columns: DataTableColumn<RoleAssignmentRequestDto>[] = [
    {
      id: "row",
      header: "#",
      className: "w-10 text-center",
      headerClassName: "w-10 text-center",
      cell: (_r, index) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          {toFaDigits(String((safePage - 1) * pageSize + index + 1))}
        </span>
      ),
    },
    {
      id: "status",
      header: "وضعیت",
      cell: (r) => (
        <StatusChip
          label={String(r.status ?? "PENDING") === "PENDING" ? "در انتظار" : String(r.status)}
          tone="warning"
        />
      ),
    },
    {
      id: "action",
      header: <SortHeader k="action" label="نوع" />,
      cell: (r) => {
        const isRevoke = actionOf(r) === "REVOKE";
        return (
          <StatusChip
            label={isRevoke ? "برداشتن نقش" : "اعطای نقش"}
            tone={isRevoke ? "neutral" : "success"}
          />
        );
      },
    },
    {
      id: "user",
      header: <SortHeader k="user" label="کاربر" />,
      cell: (r) => {
        const id = String(r.user_id ?? "");
        return (
          <div className="min-w-0 max-w-[160px] truncate text-sm font-medium">
            {userLabel.get(id) ?? shortId(id)}
          </div>
        );
      },
    },
    {
      id: "role",
      header: <SortHeader k="role" label="نقش" />,
      cell: (r) => {
        const id = String(r.tenant_role_id ?? "");
        const name =
          (r as { role_name?: string | null }).role_name ||
          roleLabel.get(id) ||
          shortId(id);
        return (
          <div className="min-w-0 max-w-[160px] truncate text-sm font-medium">
            {name}
          </div>
        );
      },
    },
    {
      id: "requester",
      header: "درخواست‌دهنده",
      cell: (r) => {
        const id = String(r.requested_by ?? "");
        return (
          <div className="min-w-0 max-w-[140px] truncate text-sm">
            {id ? userLabel.get(id) ?? shortId(id) : "—"}
          </div>
        );
      },
    },
    {
      id: "date",
      header: <SortHeader k="date" label="زمان ثبت" />,
      cell: (r) => (
        <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
          {formatDate(r.created_at)}
        </span>
      ),
    },
    {
      id: "reason",
      header: "دلیل",
      cell: (r) => (
        <span className="line-clamp-2 max-w-[200px] text-xs text-muted-foreground">
          {r.reason ?? "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "عملیات",
      className: "text-end",
      headerClassName: "text-end",
      cell: (r) =>
        canApprove ? (
          <div className="flex flex-wrap justify-end gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={approveMut.isPending || rejectMut.isPending}
              onClick={() => void approveMut.mutateAsync(r.request_id)}
            >
              تأیید
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-destructive"
              disabled={approveMut.isPending || rejectMut.isPending}
              onClick={() => void rejectMut.mutateAsync(r.request_id)}
            >
              رد
            </Button>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  if (!canView) {
    return (
      <div className="space-y-4">
        <PageHeader
          title="تأیید تخصیص نقش"
          description="مجوز مشاهده ندارید."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="تأیید تخصیص نقش"
        description="صف تأیید دوگانه: درخواست‌ها فقط از صفحهٔ کاربر ساخته می‌شوند. پس از تأیید یا رد، همان درخواست قابل ویرایش نیست."
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "تأیید تخصیص نقش" },
        ]}
        icon={<GitPullRequestArrow className="h-5 w-5" />}
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-1.5"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            بروزرسانی
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          placeholder="جستجو کاربر، نقش، درخواست‌دهنده…"
          className="h-9 ps-8"
        />
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          {error instanceof ApiClientError ? error.message : "خطا در بارگذاری"}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={pageRows}
          getRowKey={(r) => r.request_id}
          loading={isLoading}
          isFiltered={q.trim().length > 0}
          emptyTitle="درخواست در انتظاری وجود ندارد."
          emptyDescription="وقتی تأیید دوگانه فعال باشد و نقش کاربر از صفحهٔ جزئیات تغییر کند، اینجا ظاهر می‌شود."
          emptySearchTitle="نتیجه‌ای پیدا نشد."
          density="compact"
          page={safePage}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
