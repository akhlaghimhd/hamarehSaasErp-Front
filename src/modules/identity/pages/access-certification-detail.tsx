/** جزئیات کمپین بازبینی — سناریوی ساده و قابل‌پیگیری */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  ExternalLink,
  FileText,
  Loader2,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { ApiClientError } from "@/api";
import { usePermission } from "@/auth";
import { toFaDigits } from "@/shared/lib/utils";
import { IdentityPermissions } from "../types";
import { useTenantUsers } from "../hooks/use-tenant-users";
import { useRoles } from "../hooks/use-roles";
import {
  accessCertificationService,
  type AccessCertItemDto,
} from "../services/access-certification-service";
import { openAccessCertReport } from "../lib/access-cert-report";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  OPEN: "در حال بررسی",
  COMPLETED: "پایان‌یافته",
  CANCELLED: "لغو شده",
};

const DECISION_LABEL: Record<string, string> = {
  PENDING: "در انتظار",
  APPROVED: "تأیید شد",
  REVOKE_REQUESTED: "نیاز به اصلاح نقش",
  DEFERRED: "موکول به دوره بعد",
};

export function AccessCertificationDetailPage() {
  const params = useParams();
  const campaignId = String(params?.id ?? "");
  const router = useRouter();
  const qc = useQueryClient();

  const canView = usePermission(IdentityPermissions.accessCertView);
  const canManage = usePermission(IdentityPermissions.accessCertManage);
  const canCertify = usePermission(IdentityPermissions.accessCertCertify);

  const [q, setQ] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<string>("PENDING");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [reportBusy, setReportBusy] = useState(false);
  const [defaultFilterSet, setDefaultFilterSet] = useState(false);

  const { data: campaign, isLoading: campLoading } = useQuery({
    queryKey: ["identity", "access-certifications", campaignId],
    queryFn: () => accessCertificationService.show(campaignId),
    enabled: canView && !!campaignId,
  });

  const {
    data: items = [],
    isLoading: itemsLoading,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ["identity", "access-cert-items", campaignId],
    queryFn: () => accessCertificationService.listItems(campaignId),
    enabled: canView && !!campaignId,
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
    return map;
  }, [members]);

  const userToTenantUser = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      const uid = String(m.user_id ?? "");
      const tid = String(m.tenant_user_id ?? "");
      if (uid && tid) map.set(uid, tid);
    }
    return map;
  }, [members]);

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

  const status = String(campaign?.status || "").toUpperCase();
  const isOpen = status === "OPEN";
  const isDraft = status === "DRAFT";
  const isCompleted = status === "COMPLETED";

  useEffect(() => {
    if (defaultFilterSet || itemsLoading || !items.length) return;
    const pending = items.filter((i) => {
      const d = String(i.decision ?? "PENDING").toUpperCase().trim();
      return d === "" || d === "PENDING";
    }).length;
    if (isOpen && pending === 0) setDecisionFilter("all");
    else if (isCompleted || isDraft) setDecisionFilter("all");
    setDefaultFilterSet(true);
  }, [items, itemsLoading, isOpen, isCompleted, isDraft, defaultFilterSet]);

  const openMut = useMutation({
    mutationFn: () => accessCertificationService.open(campaignId),
    onSuccess: () => {
      toast.success("بررسی شروع شد");
      void qc.invalidateQueries({
        queryKey: ["identity", "access-certifications", campaignId],
      });
      setDecisionFilter("PENDING");
      void refetchItems();
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiClientError ? e.message : "شروع بررسی ناموفق بود"
      ),
  });

  const completeMut = useMutation({
    mutationFn: () => accessCertificationService.complete(campaignId),
    onSuccess: () => {
      toast.success("کمپین پایان یافت");
      void qc.invalidateQueries({
        queryKey: ["identity", "access-certifications", campaignId],
      });
      void qc.invalidateQueries({
        queryKey: ["identity", "access-cert-items", campaignId],
      });
      setDecisionFilter("all");
    },
    onError: (e) => {
      toast.error(
        e instanceof ApiClientError ? e.message : "پایان کمپین ناموفق بود"
      );
      setDecisionFilter("PENDING");
      setPage(1);
      void refetchItems();
    },
  });

  const certifyMut = useMutation({
    mutationFn: ({
      itemId,
      decision,
      userId,
    }: {
      itemId: string;
      decision: "APPROVED" | "REVOKE_REQUESTED" | "DEFERRED";
      userId?: string;
    }) => accessCertificationService.certifyItem(itemId, { decision }),
    onSuccess: (_data, vars) => {
      void refetchItems();
      if (vars.decision === "APPROVED") {
        toast.success("دسترسی تأیید شد");
      } else if (vars.decision === "DEFERRED") {
        toast.success(
          "موکول شد — در این دوره بررسی نمی‌شود؛ کمپین را می‌توانید پایان دهید."
        );
      } else if (vars.decision === "REVOKE_REQUESTED") {
        const tid = vars.userId
          ? userToTenantUser.get(String(vars.userId))
          : undefined;
        toast.success("علامت «نیاز به اصلاح نقش» ثبت شد", {
          description: tid
            ? "اکنون نقش‌های این عضو را در صفحهٔ عضو اصلاح کنید."
            : "سپس از فهرست اعضا نقش‌ها را اصلاح کنید.",
          action: tid
            ? {
                label: "اصلاح نقش‌ها",
                onClick: () =>
                  router.push(`/dashboard/identity/members/${tid}`),
              }
            : undefined,
          duration: 8000,
        });
        setDecisionFilter("REVOKE_REQUESTED");
      }
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiClientError ? e.message : "ثبت تصمیم ناموفق بود"
      ),
  });

  const summary = useMemo(() => {
    const pending = items.filter((i) => {
      const d = String(i.decision ?? "PENDING").toUpperCase().trim();
      return d === "" || d === "PENDING";
    }).length;
    const revoke = items.filter(
      (i) => String(i.decision || "").toUpperCase() === "REVOKE_REQUESTED"
    ).length;
    const deferred = items.filter(
      (i) => String(i.decision || "").toUpperCase() === "DEFERRED"
    ).length;
    const block = items.filter((i) => i.sod_has_block).length;
    return { total: items.length, pending, revoke, deferred, block };
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (decisionFilter !== "all") {
      list = list.filter(
        (i) =>
          String(i.decision || "PENDING").toUpperCase() === decisionFilter
      );
    }
    const term = q.trim().toLowerCase();
    if (term) {
      list = list.filter((i) => {
        const ul = userLabel.get(String(i.user_id ?? "")) || "";
        return ul.toLowerCase().includes(term);
      });
    }
    return [...list].sort((a, b) => {
      const sa = a.sod_has_block ? 2 : a.sod_has_warn ? 1 : 0;
      const sb = b.sod_has_block ? 2 : b.sod_has_warn ? 1 : 0;
      return sb - sa;
    });
  }, [items, decisionFilter, q, userLabel]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const roleNames = (item: AccessCertItemDto) => {
    const ids = item.role_ids_snapshot || [];
    if (!ids.length) return "بدون نقش";
    return ids.map((id) => roleLabel.get(String(id)) || "نقش").join("، ");
  };

  function memberHref(item: AccessCertItemDto): string | null {
    const fromItem = String(
      (item as { tenant_user_id?: string }).tenant_user_id || ""
    );
    if (fromItem) return `/dashboard/identity/members/${fromItem}`;
    const mapped = userToTenantUser.get(String(item.user_id ?? ""));
    return mapped ? `/dashboard/identity/members/${mapped}` : null;
  }

  async function handleReport() {
    if (!campaign) return;
    setReportBusy(true);
    try {
      await openAccessCertReport({
        campaign,
        items,
        userLabel,
        roleLabel,
      });
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : "تهیه گزارش ناموفق بود"
      );
    } finally {
      setReportBusy(false);
    }
  }

  if (!canView) {
    return (
      <EmptyState
        title="دسترسی ندارید"
        description="مجوز مشاهده بازبینی دسترسی را ندارید."
      />
    );
  }

  const canDecide = (canCertify || canManage) && isOpen;

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <PageHeader
        title={campaign?.name || "کمپین بازبینی"}
        description={
          isDraft
            ? "هنوز شروع نشده — با «شروع بررسی» نقش‌های اعضا ثبت می‌شود."
            : isOpen
              ? summary.pending > 0
                ? `${toFaDigits(summary.pending)} نفر هنوز تصمیم نگرفته‌اند.`
                : summary.revoke > 0
                  ? `تصمیم‌ها کامل است · ${toFaDigits(summary.revoke)} نفر نیاز به اصلاح نقش دارند.`
                  : "تصمیم‌ها کامل است — می‌توانید کمپین را پایان دهید."
              : isCompleted
                ? "این دوره تمام شده. از گزارش استفاده کنید."
                : STATUS_LABEL[status] || status
        }
        icon={<ClipboardCheck className="h-5 w-5" />}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          {
            label: "بازبینی دسترسی",
            href: "/dashboard/identity/access-certifications",
          },
          { label: campaign?.name || "جزئیات" },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={reportBusy || campLoading}
              onClick={() => void handleReport()}
            >
              {reportBusy ? (
                <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
              ) : (
                <FileText className="me-1.5 h-4 w-4" />
              )}
              گزارش PDF
            </Button>

            {canManage && isDraft ? (
              <Button
                type="button"
                size="sm"
                disabled={openMut.isPending}
                onClick={() => void openMut.mutateAsync()}
              >
                شروع بررسی
              </Button>
            ) : null}

            {canManage && isOpen ? (
              <Button
                type="button"
                size="sm"
                disabled={completeMut.isPending || summary.pending > 0}
                onClick={() => {
                  if (summary.pending > 0) {
                    setDecisionFilter("PENDING");
                    setPage(1);
                    toast.message(
                      `هنوز ${toFaDigits(summary.pending)} نفر بدون تصمیم‌اند.`
                    );
                    return;
                  }
                  void completeMut.mutateAsync();
                }}
              >
                پایان کمپین
                {summary.pending > 0
                  ? ` (${toFaDigits(summary.pending)})`
                  : ""}
              </Button>
            ) : null}
          </div>
        }
      />

      {isOpen ? (
        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">تأیید:</strong> نقش‌ها مناسب‌اند.{" "}
          <strong className="text-foreground">نیاز به اصلاح نقش:</strong> بعداً
          از صفحهٔ همان عضو نقش‌ها را عوض کنید (خودکار حذف نمی‌شود).{" "}
          <strong className="text-foreground">موکول:</strong> این دوره بررسی
          نمی‌شود؛ مانع پایان کمپین نیست. تا وقتی کمپین باز است می‌توانید تصمیم را
          عوض کنید.
        </div>
      ) : null}

      {!isDraft && items.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            کل:{" "}
            <strong className="text-foreground">
              {toFaDigits(summary.total)}
            </strong>
          </span>
          <span>
            در انتظار:{" "}
            <strong
              className={
                summary.pending > 0 ? "text-amber-700" : "text-foreground"
              }
            >
              {toFaDigits(summary.pending)}
            </strong>
          </span>
          {summary.revoke > 0 ? (
            <span>
              نیاز به اصلاح:{" "}
              <strong className="text-foreground">
                {toFaDigits(summary.revoke)}
              </strong>
            </span>
          ) : null}
          {summary.block > 0 ? (
            <span>
              تضاد نقش:{" "}
              <strong className="text-destructive">
                {toFaDigits(summary.block)}
              </strong>
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 ps-8 text-sm"
            placeholder="جستجوی عضو…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={decisionFilter}
          onValueChange={(v) => {
            setDecisionFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-8 w-[11rem]">
            <SelectValue placeholder="نمایش" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">نیاز به تصمیم</SelectItem>
            <SelectItem value="all">همه</SelectItem>
            <SelectItem value="APPROVED">تأیید شده</SelectItem>
            <SelectItem value="REVOKE_REQUESTED">نیاز به اصلاح</SelectItem>
            <SelectItem value="DEFERRED">موکول</SelectItem>
          </SelectContent>
        </Select>
        {itemsLoading || campLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b bg-card shadow-sm">
              <TableHead className="w-[11rem]">عضو</TableHead>
              <TableHead>نقش‌ها (عکس لحظهٔ باز شدن)</TableHead>
              <TableHead className="w-[6.5rem]">تضاد</TableHead>
              <TableHead className="w-[8rem]">تصمیم</TableHead>
              <TableHead className="w-[16rem] text-end">اقدام</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsLoading || campLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  {items.length === 0
                    ? isDraft
                      ? "برای شروع، «شروع بررسی» را بزنید."
                      : "آیتمی نیست"
                    : decisionFilter === "PENDING"
                      ? "مورد بازی نمانده — فیلتر را «همه» کنید یا کمپین را پایان دهید."
                      : "با این فیلتر موردی نیست"}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r) => {
                const d = String(r.decision || "PENDING").toUpperCase();
                const href = memberHref(r);
                return (
                  <TableRow key={r.item_id}>
                    <TableCell className="font-medium">
                      {userLabel.get(String(r.user_id ?? "")) ||
                        String(r.user_id || "—")}
                    </TableCell>
                    <TableCell className="max-w-[16rem] truncate text-sm text-muted-foreground">
                      {roleNames(r)}
                    </TableCell>
                    <TableCell>
                      {r.sod_has_block ? (
                        <StatusChip tone="danger" label="جدی" />
                      ) : r.sod_has_warn ? (
                        <StatusChip tone="warning" label="هشدار" />
                      ) : (
                        <StatusChip tone="success" label="عادی" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {DECISION_LABEL[d] || "—"}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {d === "REVOKE_REQUESTED" && href ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs"
                            onClick={() => router.push(href)}
                          >
                            <ExternalLink className="me-1 h-3 w-3" />
                            اصلاح نقش‌ها
                          </Button>
                        ) : null}

                        {canDecide ? (
                          <>
                            {d !== "APPROVED" ? (
                              <Button
                                type="button"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={certifyMut.isPending}
                                onClick={() =>
                                  void certifyMut.mutateAsync({
                                    itemId: r.item_id,
                                    decision: "APPROVED",
                                    userId: String(r.user_id || ""),
                                  })
                                }
                              >
                                تأیید
                              </Button>
                            ) : null}
                            {d !== "REVOKE_REQUESTED" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                disabled={certifyMut.isPending}
                                onClick={() =>
                                  void certifyMut.mutateAsync({
                                    itemId: r.item_id,
                                    decision: "REVOKE_REQUESTED",
                                    userId: String(r.user_id || ""),
                                  })
                                }
                              >
                                نیاز به اصلاح
                              </Button>
                            ) : null}
                            {d !== "DEFERRED" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs"
                                disabled={certifyMut.isPending}
                                onClick={() =>
                                  void certifyMut.mutateAsync({
                                    itemId: r.item_id,
                                    decision: "DEFERRED",
                                    userId: String(r.user_id || ""),
                                  })
                                }
                              >
                                موکول
                              </Button>
                            ) : null}
                          </>
                        ) : href && d !== "REVOKE_REQUESTED" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => router.push(href)}
                          >
                            عضو
                          </Button>
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

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <div>
          {total === 0
            ? ""
            : `نمایش ${toFaDigits((safePage - 1) * pageSize + 1)}–${toFaDigits(Math.min(safePage * pageSize, total))} از ${toFaDigits(total)}`}
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(pageSize)}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[5rem]">
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
            className="h-8"
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
            className="h-8"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            بعدی
          </Button>
        </div>
      </div>
    </div>
  );
}
