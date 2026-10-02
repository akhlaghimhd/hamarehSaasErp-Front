/** فهرست کمپین‌های بازبینی دسترسی */

"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  ClipboardCheck,
  FileText,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { ApiClientError } from "@/api";
import { useAuthStore, usePermission } from "@/auth";
import { toFaDigits } from "@/shared/lib/utils";
import { IdentityPermissions } from "../types";
import {
  accessCertificationService,
  type AccessCertCampaignDto,
} from "../services/access-certification-service";
import { useTenantUsers } from "../hooks/use-tenant-users";
import { useRoles } from "../hooks/use-roles";
import { openAccessCertReport } from "../lib/access-cert-report";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  OPEN: "در حال بررسی",
  COMPLETED: "پایان‌یافته",
  CANCELLED: "لغو شده",
  ARCHIVED: "بایگانی",
};

function normalizeCampaignCodeForApi(raw: string): string {
  let s = raw.trim();
  const fa = "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩";
  const en = "01234567890123456789";
  s = s
    .split("")
    .map((ch) => {
      const i = fa.indexOf(ch);
      return i >= 0 ? en[i] : ch;
    })
    .join("");
  s = s.toLowerCase().replace(/\s+/g, "-");
  s = s.replace(/[^a-z0-9_-]/g, "");
  s = s.replace(/-+/g, "-").replace(/^[-_]+|[-_]+$/g, "");
  return s.slice(0, 80);
}

function autoCampaignCode(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const r = Math.random().toString(36).slice(2, 6);
  return `ac-${y}${m}${day}-${r}`;
}

function statusTone(
  status?: string
): "success" | "warning" | "danger" | "neutral" {
  switch (String(status || "").toUpperCase()) {
    case "OPEN":
      return "warning";
    case "COMPLETED":
      return "success";
    case "CANCELLED":
      return "danger";
    case "ARCHIVED":
      return "neutral";
    default:
      return "neutral";
  }
}

function formatJalali(value?: string | null): string {
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
    return "—";
  }
}

function statusChangedAt(r: AccessCertCampaignDto): string | null {
  const st = String(r.status || "").toUpperCase();
  if (st === "COMPLETED" && r.completed_at) return String(r.completed_at);
  if (st === "OPEN" && r.opened_at) return String(r.opened_at);
  if (r.updated_at) return String(r.updated_at);
  if (r.created_at) return String(r.created_at);
  return null;
}

export function AccessCertificationsListPage() {
  const canView = usePermission(IdentityPermissions.accessCertView);
  const canManage = usePermission(IdentityPermissions.accessCertManage);
  const authUser = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const router = useRouter();
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [reportBusy, setReportBusy] = useState<string | null>(null);

  const formDirty = Boolean(code.trim() || name.trim());
  const normalizedCode = normalizeCampaignCodeForApi(code);
  const codeOk = code.trim() === "" || normalizedCode.length >= 2;

  const listScope =
    statusFilter === "archived"
      ? "archived"
      : statusFilter === "all"
        ? "all"
        : "active";

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ["identity", "access-certifications", listScope],
    queryFn: () =>
      accessCertificationService.list(
        listScope as "active" | "archived" | "all"
      ),
    enabled: canView,
  });

  const { data: members = [] } = useTenantUsers("active");
  const { data: roles = [] } = useRoles();

  const userLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      const uid = String(m.user_id ?? "");
      if (!uid) continue;
      map.set(
        uid,
        m.user?.display_name ||
          [m.user?.first_name, m.user?.last_name].filter(Boolean).join(" ") ||
          m.user?.mobile ||
          m.user?.email ||
          uid
      );
    }
    if (authUser?.user_id) {
      const label =
        [authUser.first_name, authUser.last_name].filter(Boolean).join(" ") ||
        authUser.email ||
        authUser.user_id;
      if (!map.has(authUser.user_id)) map.set(authUser.user_id, label);
    }
    return map;
  }, [members, authUser]);

  const roleLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roles) {
      const id = String(
        (r as { tenant_role_id?: string; role_id?: string }).tenant_role_id ||
          (r as { role_id?: string }).role_id ||
          ""
      );
      if (!id) continue;
      map.set(
        id,
        String(
          (r as { name?: string; code?: string }).name ||
            (r as { code?: string }).code ||
            id
        )
      );
    }
    return map;
  }, [roles]);

  const createMut = useMutation({
    mutationFn: () =>
      accessCertificationService.create({
        code: normalizedCode || autoCampaignCode(),
        name: name.trim(),
      }),
    onSuccess: (c) => {
      toast.success("کمپین ساخته شد");
      resetCreate();
      setCreateOpen(false);
      void qc.invalidateQueries({ queryKey: ["identity", "access-certifications"] });
      if (c?.campaign_id) {
        router.push(`/dashboard/identity/access-certifications/${c.campaign_id}`);
      }
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "ایجاد کمپین ناموفق بود"),
  });

  const openMut = useMutation({
    mutationFn: (id: string) => accessCertificationService.open(id),
    onSuccess: (c) => {
      toast.success("بررسی شروع شد");
      void qc.invalidateQueries({ queryKey: ["identity", "access-certifications"] });
      if (c?.campaign_id) {
        router.push(`/dashboard/identity/access-certifications/${c.campaign_id}`);
      }
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "شروع بررسی ناموفق بود"),
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => accessCertificationService.archive(id),
    onSuccess: () => {
      toast.success("کمپین بایگانی شد");
      void qc.invalidateQueries({ queryKey: ["identity", "access-certifications"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "بایگانی ناموفق بود"),
  });

  const unarchiveMut = useMutation({
    mutationFn: (id: string) => accessCertificationService.unarchive(id),
    onSuccess: () => {
      toast.success("از بایگانی خارج شد");
      void qc.invalidateQueries({ queryKey: ["identity", "access-certifications"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "بازگردانی ناموفق بود"),
  });

  function resetCreate() {
    setCode("");
    setName("");
  }

  function openCreateForm() {
    setCode("");
    setName("");
    setCreateOpen(true);
  }

  function closeCreateForm() {
    resetCreate();
    setCreateOpen(false);
  }

  async function handleReport(campaign: AccessCertCampaignDto) {
    const id = campaign.campaign_id;
    setReportBusy(id);
    try {
      const items = await accessCertificationService.listItems(id);
      const reporterName =
        [authUser?.first_name, authUser?.last_name].filter(Boolean).join(" ") ||
        authUser?.email ||
        null;
      await openAccessCertReport({
        campaign,
        items,
        userLabel,
        roleLabel,
        tenantName: organization?.tenant_name,
        tenantCode: organization?.tenant_code,
        reporterName,
      });
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "تهیه گزارش ناموفق بود");
    } finally {
      setReportBusy(null);
    }
  }

  const filtered = useMemo(() => {
    let list = data;
    const sf = statusFilter.toUpperCase();
    if (sf === "DRAFT" || sf === "OPEN" || sf === "COMPLETED" || sf === "CANCELLED") {
      list = list.filter((r) => String(r.status || "").toUpperCase() === sf);
    }
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((r) =>
        [r.code, r.name].some((v) => String(v ?? "").toLowerCase().includes(term))
      );
    }
    return [...list].sort((a, b) =>
      String(b.created_at || "").localeCompare(String(a.created_at || ""))
    );
  }, [data, statusFilter, q]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  if (!canView) {
    return (
      <EmptyState title="دسترسی ندارید" description="برای مشاهده این بخش مجوز لازم است." />
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <PageHeader
        title="بازبینی دسترسی"
        description="شکاف‌های نقش اعضا را پیدا و رفع کنید."
        icon={<ClipboardCheck className="h-5 w-5" />}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "بازبینی دسترسی" },
        ]}
        actions={
          canManage ? (
            <Button type="button" size="sm" onClick={openCreateForm}>
              <Plus className="me-1.5 h-4 w-4" />
              کمپین جدید
            </Button>
          ) : null
        }
      />

      {isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error instanceof Error ? error.message : "بارگذاری ناموفق بود"}
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
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-[11rem]">
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">جاری</SelectItem>
            <SelectItem value="DRAFT">پیش‌نویس</SelectItem>
            <SelectItem value="OPEN">در حال بررسی</SelectItem>
            <SelectItem value="COMPLETED">پایان‌یافته</SelectItem>
            <SelectItem value="archived">بایگانی</SelectItem>
            <SelectItem value="all">همه</SelectItem>
          </SelectContent>
        </Select>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b bg-card shadow-sm">
              <TableHead className="sticky top-0 z-20 w-10 bg-card px-2 text-center text-xs">#</TableHead>
              <TableHead className="sticky top-0 z-20 bg-card">نام</TableHead>
              <TableHead className="sticky top-0 z-20 w-[8rem] bg-card">وضعیت</TableHead>
              <TableHead className="sticky top-0 z-20 w-[7rem] bg-card">ایجاد</TableHead>
              <TableHead className="sticky top-0 z-20 w-[8rem] bg-card">آخرین وضعیت</TableHead>
              <TableHead className="sticky top-0 z-20 w-[10rem] bg-card text-end">اقدام</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6} className="py-2">
                    <Skeleton className="h-7 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    title={statusFilter === "archived" ? "بایگانی خالی است" : "کمپینی نیست"}
                    description={
                      statusFilter === "archived"
                        ? "کمپین پایان‌یافته را از فهرست جاری بایگانی کنید."
                        : "با «کمپین جدید» شروع کنید."
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r, idx) => {
                const st = String(r.status || "").toUpperCase();
                const archived = Boolean(r.is_archived || r.deleted_at);
                return (
                  <TableRow key={r.campaign_id}>
                    <TableCell className="px-2 py-1.5 text-center text-xs text-muted-foreground">
                      {toFaDigits((safePage - 1) * pageSize + idx + 1)}
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="text-sm font-medium">{r.name || "—"}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{r.code || ""}</div>
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <StatusChip
                        label={archived ? STATUS_LABEL.ARCHIVED : STATUS_LABEL[st] || st}
                        tone={archived ? "neutral" : statusTone(st)}
                      />
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-xs text-muted-foreground">
                      {formatJalali(r.created_at ? String(r.created_at) : null)}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-xs text-muted-foreground">
                      {formatJalali(statusChangedAt(r))}
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {canManage && st === "DRAFT" && !archived ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs"
                            disabled={openMut.isPending}
                            onClick={() => void openMut.mutateAsync(r.campaign_id)}
                          >
                            شروع بررسی
                          </Button>
                        ) : null}
                        {st === "OPEN" && !archived ? (
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              router.push(
                                `/dashboard/identity/access-certifications/${r.campaign_id}`
                              )
                            }
                          >
                            ادامه
                          </Button>
                        ) : null}
                        {!archived && (st === "OPEN" || st === "COMPLETED" || st === "DRAFT") ? (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  disabled={reportBusy === r.campaign_id}
                                  onClick={() => void handleReport(r)}
                                >
                                  {reportBusy === r.campaign_id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <FileText className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>گزارش</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : null}
                        {canManage && st === "COMPLETED" && !archived ? (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  disabled={archiveMut.isPending}
                                  onClick={() => void archiveMut.mutateAsync(r.campaign_id)}
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>بایگانی</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : null}
                        {canManage && archived ? (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  disabled={unarchiveMut.isPending}
                                  onClick={() => void unarchiveMut.mutateAsync(r.campaign_id)}
                                >
                                  <ArchiveRestore className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>خروج از بایگانی</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
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
              {[10, 20, 50].map((n) => (
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

      <Sheet
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) closeCreateForm();
          else setCreateOpen(true);
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
          onPointerDownOutside={(e) => {
            if (formDirty) e.preventDefault();
          }}
          onInteractOutside={(e) => {
            if (formDirty) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (formDirty) e.preventDefault();
          }}
        >
          <SheetHeader className="shrink-0 border-b px-5 py-4 text-start">
            <SheetTitle>کمپین جدید</SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="ac-code">کد</Label>
              <Input
                id="ac-code"
                className="h-9"
                dir="ltr"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="اختیاری"
                autoComplete="off"
              />
              {code.trim() && !codeOk ? (
                <p className="text-[11px] text-destructive">حداقل دو کاراکتر</p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-name">نام</Label>
              <Input
                id="ac-name"
                className="h-9"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="بازبینی فصلی"
              />
            </div>
          </div>
          <SheetFooter className="shrink-0 border-t px-5 py-3">
            <Button type="button" variant="outline" onClick={closeCreateForm}>
              انصراف
            </Button>
            <Button
              type="button"
              disabled={createMut.isPending || !codeOk || !name.trim()}
              onClick={() => {
                if (!codeOk) {
                  toast.error("کد واردشده قابل استفاده نیست.");
                  return;
                }
                void createMut.mutateAsync();
              }}
            >
              {createMut.isPending ? (
                <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
              ) : null}
              ایجاد
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
