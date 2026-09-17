"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowDown, ArrowUp, ArrowUpDown, Columns3, Download, Eye, FileSpreadsheet, FileText,
  Loader2, Plus, RotateCcw, Search, Shield, Sparkles, Trash2, Upload, UserCheck, UserMinus, Users, X,
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
import { Can, useAuthStore, usePermission } from "@/auth";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { useCreateTenantUser, useRestoreTenantUser, useSoftDeleteTenantUser, useTenantUsers, useUpdateTenantUser } from "../hooks/use-tenant-users";
import { IdentityPermissions, type TenantUserDto } from "../types";
import { MSG_LOAD_ERROR, MSG_NO_ACCESS } from "../lib/ui-copy";
import { downloadMembersImportTemplate, exportMembersExcel, exportMembersPdf, readSpreadsheetTable } from "../lib/members-export";
import type { MembershipListFilter } from "../services/tenant-user-service";
import { MemberCreateDrawer } from "../components/member-create-drawer";

type StatusFilter = "all" | "active" | "inactive";
type SortKey = "name" | "email" | "mobile" | "status" | "joined" | "lastChange";
type SortDir = "asc" | "desc";
type ColumnId = "name" | "email" | "mobile" | "status" | "joined" | "lastChange" | "actions";
type BulkKind = "activate" | "deactivate" | "delete" | "restore";
type ConfirmState = null | { kind: BulkKind; count: number; targets: TenantUserDto[] };
type ActivityKind = "new" | "activated" | "deactivated" | "removed" | "restored" | null;

const COLS: { id: ColumnId; label: string; hideable?: boolean; sort?: SortKey }[] = [
  { id: "name", label: "نام", hideable: false, sort: "name" },
  { id: "email", label: "ایمیل", sort: "email" },
  { id: "mobile", label: "موبایل", sort: "mobile" },
  { id: "status", label: "وضعیت", sort: "status" },
  { id: "joined", label: "تاریخ عضویت", sort: "joined" },
  { id: "lastChange", label: "آخرین تغییر وضعیت", sort: "lastChange" },
  { id: "actions", label: "عملیات", hideable: false },
];

const SKY = "identity.members.columns.v3";
const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 7;

function dn(r: TenantUserDto) {
  const u = r.user;
  if (!u) return "—";
  const n = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return n || u.email || "—";
}

function fd(v?: string | null) {
  if (!v) return "—";
  try {
    return toFaDigits(new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(v)));
  } catch {
    return toFaDigits(v);
  }
}

function fdt(v?: string | null) {
  if (!v) return "—";
  try {
    return toFaDigits(new Intl.DateTimeFormat("fa-IR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(v)));
  } catch {
    return toFaDigits(v);
  }
}

function lastChangeAt(r: TenantUserDto): string | null {
  if (r.deleted_at) return r.deleted_at;
  return r.updated_at ?? r.created_at ?? null;
}

function isRecent(iso?: string | null, days = RECENT_DAYS): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * DAY_MS;
}

function activityOf(r: TenantUserDto, deletedView: boolean): ActivityKind {
  const createdMs = r.created_at ? new Date(r.created_at).getTime() : NaN;
  const updatedMs = r.updated_at ? new Date(r.updated_at).getTime() : NaN;
  const statusChanged = Number.isFinite(createdMs) && Number.isFinite(updatedMs) && updatedMs - createdMs > 90_000;
  if (deletedView && r.deleted_at && isRecent(r.deleted_at, 7)) return "removed";
  if (!deletedView && r.updated_at && isRecent(r.updated_at, 7) && statusChanged) {
    if (Number(r.status) === 1) return "activated";
    if (Number(r.status) === 0) return "deactivated";
  }
  if (!deletedView && r.created_at && isRecent(r.created_at, 3) && !statusChanged) return "new";
  return null;
}

export function MembersListPage() {
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <PageHeader
        title="کاربران سازمان"
        description="فهرست کامل در حال بازیابی — دکمه افزودن دراور را باز می‌کند"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "کاربران" },
        ]}
        actions={
          <Button type="button" size="sm" className="h-8 gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />افزودن کاربر
          </Button>
        }
      />
      <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
        <p>نسخهٔ کامل جدول در artifacts/members-list-impl.FIXED.tsx آماده است.</p>
        <p className="mt-2">دکمهٔ افزودن کاربر دراور را باز می‌کند (MemberCreateDrawer).</p>
      </div>
      <MemberCreateDrawer open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
