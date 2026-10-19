"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowUp, ArrowUpDown, Columns3, Download, Eye, FileSpreadsheet, FileText,
  Loader2, Plus, RotateCcw, Search, Shield, Trash2, Upload, UserCheck, UserMinus, Users, X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { useAuthStore, usePermission } from "@/auth";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { useCreateTenantUser, useRestoreTenantUser, useSoftDeleteTenantUser, useTenantUsers, useUpdateTenantUser } from "../hooks/use-tenant-users";
import { MembersCompanyFilter } from "../components/members-company-filter";
import { useIdentityHoldingAccess } from "../hooks/use-identity-holding-access";
import { IdentityPermissions, type TenantUserDto } from "../types";
import { MSG_LOAD_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import { downloadMembersImportTemplate, exportMembersExcel, exportMembersPdf, readSpreadsheetTable } from "../lib/members-export";
import type { MembershipListFilter } from "../services/tenant-user-service";
import { MemberCreateDrawer } from "../components/member-create-drawer";
import { memberDetailPath } from "../lib/member-ref";
import {
  COLS, SKY, dn, fd, fdt, lastChangeAt, activityOf, sv, BULK_SUCCESS, RESTORE_ONE_MSG,
  mapImportRows, IconAction, ActivityBadge, highestRoleName, scopeNames,
  type StatusFilter, type SortKey, type SortDir, type ColumnId, type BulkKind, type ConfirmState,
} from "./members-list-helpers";

export function MembersListPage() {
  const canView = usePermission(IdentityPermissions.userView);
  const canCreate = usePermission(IdentityPermissions.userCreate);
  const canUpdate = usePermission(IdentityPermissions.userUpdate);
  const canDelete = usePermission(IdentityPermissions.userDelete);
  const canRestore = usePermission(IdentityPermissions.userRestore);
  const { canMutateMembers, isGroupObserver, isBranchScopedOnly } = useIdentityHoldingAccess();
  /** IDORG-T14: permission AND holding mutate gate (observer/read-only cannot create) */
  const canCreateOp = canCreate && canMutateMembers;
  const canUpdateOp = canUpdate && canMutateMembers;
  const canDeleteOp = canDelete && canMutateMembers;
  const canRestoreOp = canRestore && canMutateMembers;
  const currentUserId = useAuthStore((s) => s.user?.user_id);

  const [membershipFilter, setMembershipFilter] = useState<MembershipListFilter>("active");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const { data, isLoading, isError, error, refetch, isFetching } = useTenantUsers(
    membershipFilter,
    companyFilter !== "all" ? { companyId: companyFilter } : undefined
  );
  const updateMutation = useUpdateTenantUser();
  const deleteMutation = useSoftDeleteTenantUser();
  const restoreMutation = useRestoreTenantUser();
  const createMutation = useCreateTenantUser();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [visible, setVisible] = useState<Record<ColumnId, boolean>>(() => {
    const base = Object.fromEntries(COLS.map((c) => [c.id, true])) as Record<ColumnId, boolean>;
    if (typeof window === "undefined") return base;
    try {
      const raw = localStorage.getItem(SKY);
      return raw ? { ...base, ...JSON.parse(raw) } : base;
    } catch {
      return base;
    }
  });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const cancelRef = useRef(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => { try { localStorage.setItem(SKY, JSON.stringify(visible)); } catch {} }, [visible]);
  useEffect(() => { setSelected(new Set()); setPage(1); }, [membershipFilter, companyFilter]);

  const rows = data ?? [];
  const isDeletedView = membershipFilter === "deleted";

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((row) => {
      if (!isDeletedView) {
        const st = Number(row.status);
        if (statusFilter === "active" && st !== 1) return false;
        if (statusFilter === "inactive" && st !== 0) return false;
      }
      if (!q) return true;
      const u = row.user;
      return [u?.first_name, u?.last_name, u?.email, u?.mobile].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
    return [...list].sort((a, b) => {
      const va = sv(a, sortKey);
      const vb = sv(b, sortKey);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, query, statusFilter, sortKey, sortDir, isDeletedView]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice((safePage - 1) * pageSize, safePage * pageSize);
  const isFiltered = query.trim().length > 0 || (!isDeletedView && statusFilter !== "all");
  const pageIds = pageRows.map((r) => r.tenant_user_id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));
  const selectedRowsOrdered = useMemo(() => filteredSorted.filter((r) => selected.has(r.tenant_user_id)), [filteredSorted, selected]);
  const exportTarget = selectedRowsOrdered.length > 0 ? selectedRowsOrdered : filteredSorted;
  const exportLabel = isDeletedView
    ? selected.size > 0 ? `خروجی حذف‌شده‌های انتخاب‌شده (${toFaDigits(selected.size)})` : `خروجی حذف‌شده‌ها (${toFaDigits(total)})`
    : selected.size > 0 ? `خروجی انتخاب‌شده‌ها (${toFaDigits(total)})` : `خروجی فهرست فعلی (${toFaDigits(total)})`;

  // NOTE: truncated temporary - will complete in next commit
  return <div>RESTORING...</div>;
}
