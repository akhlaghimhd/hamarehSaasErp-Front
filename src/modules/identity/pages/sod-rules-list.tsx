/** قوانین تفکیک وظایف — هم‌تراز الگوی فهرست کاربران */

"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Columns3,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Plus,
  Power,
  PowerOff,
  RotateCcw,
  Scale,
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { ApiClientError } from "@/api";
import { usePermission } from "@/auth";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { IdentityPermissions } from "../types";
import { useRoles } from "../hooks/use-roles";
import {
  sodService,
  type SodEvaluateResult,
  type SodRuleDto,
} from "../services/sod-service";

const SEVERITY_OPTIONS = [
  { value: "1", label: "کم" },
  { value: "2", label: "متوسط" },
  { value: "3", label: "زیاد" },
  { value: "4", label: "بحرانی" },
] as const;

const SEVERITY_LABEL: Record<number, string> = {
  1: "کم",
  2: "متوسط",
  3: "زیاد",
  4: "بحرانی",
};

type StatusFilter = "all" | "active" | "inactive" | "deleted";
type DeactivateMode = "permanent" | "1d" | "7d" | "30d";
type SortKey =
  | "name"
  | "pair"
  | "enforcement"
  | "severity"
  | "status"
  | "created_at"
  | "updated_at";
type SortDir = "asc" | "desc";

function roleName(
  rule: SodRuleDto,
  side: "a" | "b",
  fallbackMap: Map<string, string>
): string {
  const rel = side === "a" ? rule.role_a : rule.role_b;
  const id = String((side === "a" ? rule.role_a_id : rule.role_b_id) ?? "");
  return rel?.name || rel?.code || fallbackMap.get(id) || "—";
}

function severityTone(
  s?: number
): "neutral" | "warning" | "danger" | "success" {
  if (s === 4) return "danger";
  if (s === 3) return "warning";
  if (s === 1) return "success";
  return "neutral";
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function formatJalaliDate(value?: string | null): string {
  if (!value) return "—";
  try {
    return toFaDigits(
      new Intl.DateTimeFormat("fa-IR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(value))
    );
  } catch {
    return toFaDigits(String(value));
  }
}

function formatJalaliDateTime(value?: string | null): string {
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
    return toFaDigits(String(value));
  }
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sortValue(
  r: SodRuleDto,
  key: SortKey,
  roleLabel: Map<string, string>
): string | number {
  switch (key) {
    case "name":
      return (r.name ?? "").toLowerCase();
    case "pair":
      return `${roleName(r, "a", roleLabel)} ${roleName(r, "b", roleLabel)}`.toLowerCase();
    case "enforcement":
      return r.enforcement === "WARN" ? 1 : 0;
    case "severity":
      return Number(r.severity ?? 0);
    case "status":
      if (r.deleted_at) return 2;
      if (!r.is_active) return 1;
      return 0;
    case "created_at":
      return r.created_at ? new Date(String(r.created_at)).getTime() : 0;
    case "updated_at":
      return r.updated_at ? new Date(String(r.updated_at)).getTime() : 0;
    default:
      return "";
  }
}

function exportSodExcel(rows: SodRuleDto[], roleLabel: Map<string, string>) {
  const aoa: (string | number)[][] = [
    ["نام قانون", "نقش اول", "نقش دوم", "نوع اجرا", "شدت حساسیت", "وضعیت", "تاریخ ایجاد", "آخرین ویرایش"],
  ];
  for (const r of rows) {
    const status = r.deleted_at ? "حذف‌شده" : r.is_active ? "فعال" : "غیرفعال";
    aoa.push([
      r.name ?? "",
      roleName(r, "a", roleLabel),
      roleName(r, "b", roleLabel),
      r.enforcement === "WARN" ? "هشدار" : "مسدودکننده",
      SEVERITY_LABEL[r.severity ?? 3] ?? "",
      status,
      formatJalaliDateTime(r.created_at ? String(r.created_at) : null),
      formatJalaliDateTime(r.updated_at ? String(r.updated_at) : null),
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "قوانین");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  const blob = new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sod-rules-${formatJalaliDate(new Date().toISOString()).replace(/\//g, "-")}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast.success("فایل اکسل آماده شد");
}

function exportSodPdf(rows: SodRuleDto[], roleLabel: Map<string, string>) {
  const body = rows
    .map((r) => {
      const status = r.deleted_at ? "حذف‌شده" : r.is_active ? "فعال" : "غیرفعال";
      const cells = [
        escapeHtml(r.name ?? "—"),
        escapeHtml(roleName(r, "a", roleLabel)),
        escapeHtml(roleName(r, "b", roleLabel)),
        escapeHtml(r.enforcement === "WARN" ? "هشدار" : "مسدودکننده"),
        escapeHtml(SEVERITY_LABEL[r.severity ?? 3] ?? "—"),
        escapeHtml(status),
        escapeHtml(formatJalaliDate(r.created_at ? String(r.created_at) : null)),
      ];
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    })
    .join("");
  const html = `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>قوانین تفکیک وظایف</title>
<style>body{font-family:Tahoma,Arial,sans-serif;font-size:12px;padding:16px;direction:rtl}h1{font-size:16px;margin:0 0 12px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 8px;text-align:right}th{background:#f3f4f6}</style></head><body>
<h1>قوانین تفکیک وظایف</h1>
<table><thead><tr><th>نام</th><th>نقش اول</th><th>نقش دوم</th><th>اجرا</th><th>شدت</th><th>وضعیت</th><th>ایجاد</th></tr></thead>
<tbody>${body}</tbody></table>
<script>window.onload=function(){window.print()}</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) {
    toast.error("مرورگر پنجره چاپ را مسدود کرد");
    return;
  }
  w.document.write(html);
  w.document.close();
}

function IconAction({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn("h-8 w-8", className)}
          disabled={disabled}
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
  );
}

export function SodRulesListPage() {
  const canView = usePermission(IdentityPermissions.sodView);
  const canManage = usePermission(IdentityPermissions.sodManage);
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    () =>
      new Set([
        "name",
        "pair",
        "enforcement",
        "severity",
        "status",
        "created_at",
        "updated_at",
        "actions",
      ])
  );
  const [sortKey, setSortKey] = useState<SortKey>("severity");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [createOpen, setCreateOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SodRuleDto | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<SodRuleDto | null>(null);
  const [deactivateMode, setDeactivateMode] = useState<DeactivateMode>("permanent");

  const [roleA, setRoleA] = useState("");
  const [roleB, setRoleB] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enforcement, setEnforcement] = useState<"BLOCK" | "WARN">("BLOCK");
  const [severity, setSeverity] = useState("3");
  const [roleSearch, setRoleSearch] = useState("");

  const [evalRoles, setEvalRoles] = useState<string[]>([]);
  const [evalRoleSearch, setEvalRoleSearch] = useState("");
  const [evalResult, setEvalResult] = useState<SodEvaluateResult | null>(null);

  const { data: roles = [] } = useRoles();

  const roleLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roles) {
      map.set(r.tenant_role_id, r.name || r.code || r.tenant_role_id);
    }
    return map;
  }, [roles]);

  const formDirty = Boolean(
    name.trim() ||
      description.trim() ||
      roleA ||
      roleB ||
      enforcement !== "BLOCK" ||
      severity !== "3"
  );

  const listParams = useMemo(() => {
    if (statusFilter === "deleted") return { only_trashed: true as const };
    if (statusFilter === "active") return { status: "active" as const };
    if (statusFilter === "inactive") return { status: "inactive" as const };
    return {};
  }, [statusFilter]);

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["identity", "sod-rules", listParams],
    queryFn: () => sodService.list(listParams),
    enabled: canView,
  });

  const createMut = useMutation({
    mutationFn: () =>
      sodService.create({
        role_a_id: roleA,
        role_b_id: roleB,
        name: name.trim(),
        description: description.trim() || null,
        enforcement,
        severity: Math.max(1, Math.min(4, Number(severity) || 3)),
        is_active: true,
      }),
    onSuccess: () => {
      toast.success("قانون تفکیک وظایف ثبت شد");
      setCreateOpen(false);
      resetCreateForm();
      void qc.invalidateQueries({ queryKey: ["identity", "sod-rules"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "ثبت قانون ناموفق بود"),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof sodService.update>[1];
    }) => sodService.update(id, payload),
    onSuccess: () => {
      toast.success("وضعیت قانون به‌روز شد");
      setDeactivateTarget(null);
      void qc.invalidateQueries({ queryKey: ["identity", "sod-rules"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "به‌روزرسانی ناموفق بود"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => sodService.softDelete(id),
    onSuccess: () => {
      toast.success("قانون حذف شد (قابل بازیابی)");
      setDeleteTarget(null);
      void qc.invalidateQueries({ queryKey: ["identity", "sod-rules"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "حذف ناموفق بود"),
  });

  const restoreMut = useMutation({
    mutationFn: (id: string) => sodService.restore(id),
    onSuccess: () => {
      toast.success("قانون بازگردانی شد");
      void qc.invalidateQueries({ queryKey: ["identity", "sod-rules"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "بازگردانی ناموفق بود"),
  });

  const evaluateMut = useMutation({
    mutationFn: () => sodService.evaluate(evalRoles),
    onSuccess: (result) => {
      setEvalResult(result);
      if (result.has_block) toast.error("تعارض مسدودکننده یافت شد");
      else if (result.has_warn) toast.message("هشدار تفکیک وظایف وجود دارد");
      else toast.success("تعارضی یافت نشد");
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "ارزیابی ناموفق بود"),
  });

  function resetCreateForm() {
    setRoleA("");
    setRoleB("");
    setName("");
    setDescription("");
    setEnforcement("BLOCK");
    setSeverity("3");
    setRoleSearch("");
  }

  function handleCreateOpenChange(next: boolean) {
    if (!next) resetCreateForm();
    setCreateOpen(next);
  }

  const filteredRoles = useMemo(() => {
    const term = roleSearch.trim().toLowerCase();
    if (!term) return roles;
    return roles.filter((r) =>
      [r.name, r.code].some((v) => String(v ?? "").toLowerCase().includes(term))
    );
  }, [roles, roleSearch]);

  const filteredEvalRoles = useMemo(() => {
    const term = evalRoleSearch.trim().toLowerCase();
    if (!term) return roles;
    return roles.filter((r) =>
      [r.name, r.code].some((v) => String(v ?? "").toLowerCase().includes(term))
    );
  }, [roles, evalRoleSearch]);

  const filteredSorted = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = data;
    if (term) {
      list = data.filter((r) => {
        const a = roleName(r, "a", roleLabel);
        const b = roleName(r, "b", roleLabel);
        return [r.name, r.code, a, b, SEVERITY_LABEL[r.severity ?? 0]].some((v) =>
          String(v ?? "").toLowerCase().includes(term)
        );
      });
    }
    return [...list].sort((a, b) => {
      const va = sortValue(a, sortKey, roleLabel);
      const vb = sortValue(b, sortKey, roleLabel);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, q, roleLabel, sortKey, sortDir]);

  const total = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredSorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "severity" || key === "created_at" ? "desc" : "asc");
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

  const toggleEvalRole = (id: string) => {
    setEvalRoles((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setEvalResult(null);
  };

  const COL_META: { id: string; label: string; locked?: boolean }[] = [
    { id: "name", label: "نام قانون", locked: true },
    { id: "pair", label: "جفت نقش" },
    { id: "enforcement", label: "نوع اجرا" },
    { id: "severity", label: "شدت" },
    { id: "status", label: "وضعیت" },
    { id: "created_at", label: "تاریخ ایجاد" },
    { id: "updated_at", label: "آخرین ویرایش" },
    { id: "actions", label: "عملیات", locked: true },
  ];

  const toggleCol = (id: string) => {
    setVisibleCols((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!canView) {
    return (
      <div className="flex min-h-0 flex-col gap-3">
        <EmptyState
          title="دسترسی ندارید"
          description="مجوز مشاهده قوانین تفکیک وظایف برای حساب شما فعال نیست."
        />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-0 flex-col gap-3">
        <PageHeader
          title="قوانین تفکیک وظایف"
          description="تعیین جفت‌نقش‌هایی که نباید همزمان به یک کاربر داده شوند"
          icon={<Scale className="h-5 w-5" />}
          breadcrumbs={[
            { label: "داشبورد", href: "/dashboard" },
            { label: "هویت و دسترسی", href: "/dashboard/identity" },
            { label: "تفکیک وظایف" },
          ]}
          actions={
            canManage ? (
              <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="me-1.5 h-4 w-4" />
                قانون جدید
              </Button>
            ) : null
          }
        />

        {isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">بارگذاری فهرست ممکن نشد</p>
            <p className="mt-1 text-xs">
              {error instanceof Error ? error.message : "بارگذاری قوانین ناموفق بود."}
            </p>
            <Button variant="outline" size="sm" className="mt-3 h-8" onClick={() => void refetch()}>
              تلاش مجدد
            </Button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 ps-8 text-sm"
              placeholder="جستجو…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as StatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[9.5rem]">
              <SelectValue placeholder="وضعیت" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه</SelectItem>
              <SelectItem value="active">فعال</SelectItem>
              <SelectItem value="inactive">غیرفعال</SelectItem>
              <SelectItem value="deleted">سطل بازیابی</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => {
              setEvalResult(null);
              setEvalOpen(true);
            }}
          >
            <Scale className="h-3.5 w-3.5" />
            ارزیابی نقش‌ها
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
                <Columns3 className="h-3.5 w-3.5" />
                ستون‌ها
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>نمایش ستون‌ها</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {COL_META.filter((c) => !c.locked).map((c) => (
                <DropdownMenuItem
                  key={c.id}
                  className="gap-2"
                  onSelect={(e) => {
                    e.preventDefault();
                    toggleCol(c.id);
                  }}
                >
                  <Checkbox checked={visibleCols.has(c.id)} className="pointer-events-none" />
                  <span>{c.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                disabled={filteredSorted.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
                خروجی
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                خروجی {toFaDigits(filteredSorted.length)} مورد
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => exportSodExcel(filteredSorted, roleLabel)}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                اکسل
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => exportSodPdf(filteredSorted, roleLabel)}
              >
                <FileText className="h-3.5 w-3.5" />
                PDF / چاپ
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b bg-card shadow-sm">
                <TableHead className="sticky top-0 z-20 w-10 bg-card px-2 text-center text-xs">
                  #
                </TableHead>
                {visibleCols.has("name") ? (
                  <TableHead className="sticky top-0 z-20 bg-card">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("name")}
                    >
                      نام قانون
                      <SortIcon k="name" />
                    </button>
                  </TableHead>
                ) : null}
                {visibleCols.has("pair") ? (
                  <TableHead className="sticky top-0 z-20 bg-card">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("pair")}
                    >
                      جفت نقش
                      <SortIcon k="pair" />
                    </button>
                  </TableHead>
                ) : null}
                {visibleCols.has("enforcement") ? (
                  <TableHead className="sticky top-0 z-20 bg-card">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("enforcement")}
                    >
                      نوع اجرا
                      <SortIcon k="enforcement" />
                    </button>
                  </TableHead>
                ) : null}
                {visibleCols.has("severity") ? (
                  <TableHead className="sticky top-0 z-20 bg-card">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("severity")}
                    >
                      شدت
                      <SortIcon k="severity" />
                    </button>
                  </TableHead>
                ) : null}
                {visibleCols.has("status") ? (
                  <TableHead className="sticky top-0 z-20 bg-card">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("status")}
                    >
                      وضعیت
                      <SortIcon k="status" />
                    </button>
                  </TableHead>
                ) : null}
                {visibleCols.has("created_at") ? (
                  <TableHead className="sticky top-0 z-20 bg-card">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("created_at")}
                    >
                      تاریخ ایجاد
                      <SortIcon k="created_at" />
                    </button>
                  </TableHead>
                ) : null}
                {visibleCols.has("updated_at") ? (
                  <TableHead className="sticky top-0 z-20 bg-card">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                      onClick={() => toggleSort("updated_at")}
                    >
                      آخرین ویرایش
                      <SortIcon k="updated_at" />
                    </button>
                  </TableHead>
                ) : null}
                <TableHead className="sticky top-0 z-20 w-[5.5rem] bg-card text-end">
                  عملیات
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={9} className="py-2">
                      <Skeleton className="h-7 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="p-0">
                    <EmptyState
                      title={
                        Boolean(q.trim()) || statusFilter !== "all"
                          ? "نتیجه‌ای پیدا نشد"
                          : "قانونی ثبت نشده"
                      }
                      description={
                        Boolean(q.trim()) || statusFilter !== "all"
                          ? "عبارت جستجو یا فیلتر وضعیت را تغییر دهید."
                          : "با «قانون جدید» اولین قانون تفکیک وظایف را بسازید."
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((r, idx) => (
                  <TableRow key={r.sod_rule_id}>
                    <TableCell className="px-2 py-1 text-center text-xs tabular-nums text-muted-foreground">
                      {toFaDigits((safePage - 1) * pageSize + idx + 1)}
                    </TableCell>
                    {visibleCols.has("name") ? (
                      <TableCell className="px-2 py-1">
                        <div className="min-w-0 max-w-[220px]">
                          <div className="truncate text-sm font-medium">{r.name ?? "—"}</div>
                          {r.description ? (
                            <div className="truncate text-[11px] text-muted-foreground">
                              {r.description}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                    ) : null}
                    {visibleCols.has("pair") ? (
                      <TableCell className="px-2 py-1 text-xs leading-5">
                        <span className="font-medium">{roleName(r, "a", roleLabel)}</span>
                        <span className="mx-1 text-muted-foreground">×</span>
                        <span className="font-medium">{roleName(r, "b", roleLabel)}</span>
                      </TableCell>
                    ) : null}
                    {visibleCols.has("enforcement") ? (
                      <TableCell className="px-2 py-1">
                        <StatusChip
                          label={r.enforcement === "WARN" ? "هشدار" : "مسدودکننده"}
                          tone={r.enforcement === "WARN" ? "warning" : "danger"}
                        />
                      </TableCell>
                    ) : null}
                    {visibleCols.has("severity") ? (
                      <TableCell className="px-2 py-1">
                        <StatusChip
                          label={SEVERITY_LABEL[r.severity ?? 3] ?? "متوسط"}
                          tone={severityTone(r.severity)}
                        />
                      </TableCell>
                    ) : null}
                    {visibleCols.has("status") ? (
                      <TableCell className="px-2 py-1">
                        {statusFilter === "deleted" || r.deleted_at ? (
                          <StatusChip label="حذف‌شده" tone="danger" />
                        ) : !r.is_active ? (
                          <StatusChip
                            label={
                              r.inactive_until
                                ? `غیرفعال تا ${formatJalaliDate(r.inactive_until)}`
                                : "غیرفعال"
                            }
                            tone="warning"
                          />
                        ) : (
                          <StatusChip label="فعال" tone="success" />
                        )}
                      </TableCell>
                    ) : null}
                    {visibleCols.has("created_at") ? (
                      <TableCell className="px-2 py-1 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                        {formatJalaliDateTime(r.created_at ? String(r.created_at) : null)}
                      </TableCell>
                    ) : null}
                    {visibleCols.has("updated_at") ? (
                      <TableCell className="px-2 py-1 whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                        {formatJalaliDateTime(r.updated_at ? String(r.updated_at) : null)}
                      </TableCell>
                    ) : null}
                    <TableCell className="px-2 py-1">
                      {!canManage ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : statusFilter === "deleted" ? (
                        <div className="flex justify-end">
                          <IconAction
                            label="بازگردانی"
                            disabled={restoreMut.isPending}
                            onClick={() => void restoreMut.mutateAsync(r.sod_rule_id)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </IconAction>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-0.5">
                          {r.is_active ? (
                            <IconAction
                              label="غیرفعال‌سازی"
                              className="text-amber-700"
                              onClick={() => {
                                setDeactivateMode("permanent");
                                setDeactivateTarget(r);
                              }}
                            >
                              <PowerOff className="h-3.5 w-3.5" />
                            </IconAction>
                          ) : (
                            <IconAction
                              label="فعال‌سازی"
                              className="text-emerald-700"
                              disabled={updateMut.isPending}
                              onClick={() =>
                                void updateMut.mutateAsync({
                                  id: r.sod_rule_id,
                                  payload: { is_active: true, inactive_until: null },
                                })
                              }
                            >
                              <Power className="h-3.5 w-3.5" />
                            </IconAction>
                          )}
                          <IconAction
                            label="حذف"
                            className="text-destructive"
                            onClick={() => setDeleteTarget(r)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconAction>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            {total === 0
              ? "موردی نیست"
              : `نمایش ${toFaDigits((safePage - 1) * pageSize + 1)}–${toFaDigits(Math.min(safePage * pageSize, total))} از ${toFaDigits(total)}`}
          </span>
          <div className="flex items-center gap-2">
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-7 w-[4.5rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {toFaDigits(n)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              قبلی
            </Button>
            <span className="tabular-nums">
              {toFaDigits(safePage)} / {toFaDigits(totalPages)}
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              بعدی
            </Button>
          </div>
        </div>

        <Sheet open={createOpen} onOpenChange={handleCreateOpenChange}>
          <SheetContent
            side="right"
            className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
            onInteractOutside={(e) => {
              if (formDirty) e.preventDefault();
            }}
            onPointerDownOutside={(e) => {
              if (formDirty) e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              if (formDirty) e.preventDefault();
            }}
          >
            <SheetHeader className="space-y-1 border-b px-6 py-4 text-start">
              <SheetTitle>قانون جدید تفکیک وظایف</SheetTitle>
              <SheetDescription>
                دو نقش را انتخاب کنید که نباید همزمان به یک کاربر اختصاص داده شوند.
              </SheetDescription>
            </SheetHeader>
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="sod-name">نام قانون</Label>
                <Input
                  id="sod-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: حسابدار × کارشناس خرید"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sod-desc">توضیح (اختیاری)</Label>
                <Input
                  id="sod-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="دلیل کسب‌وکاری این تعارض"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>نوع اجرا</Label>
                  <Select
                    value={enforcement}
                    onValueChange={(v) => setEnforcement(v as "BLOCK" | "WARN")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BLOCK">مسدودکننده</SelectItem>
                      <SelectItem value="WARN">هشدار</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>شدت حساسیت</Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SEVERITY_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>نقش اول</Label>
                  <div className="rounded-md border">
                    <div className="border-b p-1.5">
                      <Input
                        className="h-8"
                        placeholder="جستجوی نقش اول…"
                        value={roleSearch}
                        onChange={(e) => setRoleSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto p-1">
                      {filteredRoles.length === 0 ? (
                        <p className="px-2 py-2 text-xs text-muted-foreground">نقشی یافت نشد</p>
                      ) : (
                        filteredRoles.map((r) => (
                          <button
                            key={r.tenant_role_id}
                            type="button"
                            className={cn(
                              "flex w-full rounded px-2 py-1.5 text-start text-sm hover:bg-muted/60",
                              roleA === r.tenant_role_id && "bg-muted font-medium"
                            )}
                            onClick={() => setRoleA(r.tenant_role_id)}
                          >
                            {r.name || r.code}
                          </button>
                        ))
                      )}
                    </div>
                    {roleA ? (
                      <div className="border-t px-2 py-1.5 text-xs text-muted-foreground">
                        انتخاب‌شده: {roleLabel.get(roleA) ?? "—"}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>نقش دوم</Label>
                  <div className="rounded-md border">
                    <div className="border-b p-1.5">
                      <Input
                        className="h-8"
                        placeholder="جستجوی نقش دوم…"
                        value={roleSearch}
                        onChange={(e) => setRoleSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto p-1">
                      {filteredRoles.filter((r) => r.tenant_role_id !== roleA).length === 0 ? (
                        <p className="px-2 py-2 text-xs text-muted-foreground">نقشی یافت نشد</p>
                      ) : (
                        filteredRoles
                          .filter((r) => r.tenant_role_id !== roleA)
                          .map((r) => (
                            <button
                              key={r.tenant_role_id}
                              type="button"
                              className={cn(
                                "flex w-full rounded px-2 py-1.5 text-start text-sm hover:bg-muted/60",
                                roleB === r.tenant_role_id && "bg-muted font-medium"
                              )}
                              onClick={() => setRoleB(r.tenant_role_id)}
                            >
                              {r.name || r.code}
                            </button>
                          ))
                      )}
                    </div>
                    {roleB ? (
                      <div className="border-t px-2 py-1.5 text-xs text-muted-foreground">
                        انتخاب‌شده: {roleLabel.get(roleB) ?? "—"}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            <SheetFooter className="gap-2 border-t px-6 py-4 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetCreateForm();
                  setCreateOpen(false);
                }}
              >
                انصراف
              </Button>
              <Button
                type="button"
                disabled={
                  createMut.isPending || !name.trim() || !roleA || !roleB || roleA === roleB
                }
                onClick={() => void createMut.mutateAsync()}
              >
                {createMut.isPending ? (
                  <>
                    <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                    در حال ثبت…
                  </>
                ) : (
                  "ثبت قانون"
                )}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>حذف قانون تفکیک وظایف</DialogTitle>
              <DialogDescription>
                قانون «{deleteTarget?.name}» به‌صورت نرم حذف می‌شود. تا وقتی جفت نقش مشابهی
                فعال نباشد، می‌توانید از «سطل بازیابی» آن را برگردانید.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)}>
                انصراف
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={deleteMut.isPending || !deleteTarget}
                onClick={() =>
                  deleteTarget && void deleteMut.mutateAsync(deleteTarget.sod_rule_id)
                }
              >
                {deleteMut.isPending ? "در حال حذف…" : "بله، حذف شود"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={!!deactivateTarget}
          onOpenChange={(open) => !open && setDeactivateTarget(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>غیرفعال‌سازی قانون</DialogTitle>
              <DialogDescription>
                قانون «{deactivateTarget?.name}» موقتاً از ارزیابی و مسدودسازی خارج می‌شود.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-2">
              <Label>مدت غیرفعال بودن</Label>
              <Select
                value={deactivateMode}
                onValueChange={(v) => setDeactivateMode(v as DeactivateMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">تا فعال‌سازی دستی</SelectItem>
                  <SelectItem value="1d">۱ روز</SelectItem>
                  <SelectItem value="7d">۷ روز</SelectItem>
                  <SelectItem value="30d">۳۰ روز</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setDeactivateTarget(null)}>
                انصراف
              </Button>
              <Button
                type="button"
                disabled={updateMut.isPending || !deactivateTarget}
                onClick={() => {
                  if (!deactivateTarget) return;
                  const payload =
                    deactivateMode === "permanent"
                      ? { is_active: false, inactive_until: null as string | null }
                      : {
                          is_active: false,
                          inactive_until: addDays(
                            deactivateMode === "1d" ? 1 : deactivateMode === "7d" ? 7 : 30
                          ),
                        };
                  void updateMut.mutateAsync({
                    id: deactivateTarget.sod_rule_id,
                    payload,
                  });
                }}
              >
                {updateMut.isPending ? "در حال اعمال…" : "غیرفعال شود"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={evalOpen}
          onOpenChange={(open) => {
            setEvalOpen(open);
            if (!open) {
              setEvalResult(null);
              setEvalRoleSearch("");
            }
          }}
        >
          <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>ارزیابی مجموعه نقش‌ها</DialogTitle>
              <DialogDescription>
                نقش‌هایی را که می‌خواهید همزمان به یک کاربر بدهید انتخاب کنید تا تعارض‌ها پیش از
                تخصیص دیده شوند.
              </DialogDescription>
            </DialogHeader>
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 ps-8 text-sm"
                placeholder="جستجوی نقش…"
                value={evalRoleSearch}
                onChange={(e) => setEvalRoleSearch(e.target.value)}
              />
            </div>
            {evalRoles.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {evalRoles.map((id) => (
                  <button
                    key={id}
                    type="button"
                    className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-xs"
                    onClick={() => toggleEvalRole(id)}
                  >
                    {roleLabel.get(id) ?? id.slice(0, 8)}
                    <X className="h-3 w-3" />
                  </button>
                ))}
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline"
                  onClick={() => {
                    setEvalRoles([]);
                    setEvalResult(null);
                  }}
                >
                  پاک کردن همه
                </button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">حداقل دو نقش انتخاب کنید.</p>
            )}
            <div className="max-h-44 space-y-0.5 overflow-y-auto rounded-md border p-1.5">
              {filteredEvalRoles.length === 0 ? (
                <div className="p-3 text-center text-xs text-muted-foreground">
                  نقشی با این جستجو پیدا نشد.
                </div>
              ) : (
                filteredEvalRoles.map((r) => {
                  const checked = evalRoles.includes(r.tenant_role_id);
                  return (
                    <label
                      key={r.tenant_role_id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50",
                        checked && "bg-muted/60"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleEvalRole(r.tenant_role_id)}
                      />
                      <span className="truncate">{r.name || r.code}</span>
                    </label>
                  );
                })
              )}
            </div>
            {evalResult ? (
              <div
                className={cn(
                  "space-y-2 rounded-md border p-3 text-sm",
                  evalResult.has_block
                    ? "border-destructive/40 bg-destructive/5"
                    : evalResult.has_warn
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-emerald-500/40 bg-emerald-500/5"
                )}
              >
                <div className="flex items-center gap-2 font-medium">
                  {evalResult.has_block ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      تعارض مسدودکننده
                    </>
                  ) : evalResult.has_warn ? (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      فقط هشدار
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      بدون تعارض
                    </>
                  )}
                </div>
                {(evalResult.conflicts ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    این ترکیب نقش با قوانین فعال در تضاد نیست.
                  </p>
                ) : (
                  <ul className="max-h-28 space-y-1.5 overflow-y-auto text-xs">
                    {(evalResult.conflicts ?? []).map((c, i) => (
                      <li
                        key={c.sod_rule_id ?? i}
                        className="rounded border bg-background/80 px-2 py-1.5"
                      >
                        <div className="font-medium">{c.name ?? c.code ?? "قانون"}</div>
                        <div className="text-muted-foreground">
                          {c.enforcement === "WARN" ? "هشدار" : "مسدودکننده"}
                          {" · "}
                          شدت {SEVERITY_LABEL[c.severity ?? 3] ?? "—"}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" size="sm" onClick={() => setEvalOpen(false)}>
                بستن
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={evaluateMut.isPending || evalRoles.length < 2}
                onClick={() => void evaluateMut.mutateAsync()}
              >
                {evaluateMut.isPending ? (
                  <>
                    <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                    در حال ارزیابی…
                  </>
                ) : (
                  "اجرای ارزیابی"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
