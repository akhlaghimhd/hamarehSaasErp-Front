/** جزئیات کمپین بازبینی — سناریوی ساده */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  ClipboardCheck,
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
  REVOKE_REQUESTED: "نیاز به اصلاح",
  DEFERRED: "موکول شد",
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
    if (isOpen && pending === 0) {
      setDecisionFilter("all");
    } else if (isCompleted) {
      setDecisionFilter("all");
    } else if (isDraft) {
      setDecisionFilter("all");
    }
    setDefaultFilterSet(true);
  }, [items, itemsLoading, isOpen, isCompleted, isDraft, defaultFilterSet]);

  const openMut = useMutation({
    mutationFn: () => accessCertificationService.open(campaignId),
    onSuccess: () => {
      toast.success("بررسی شروع شد — برای هر عضو تصمیم بگیرید");
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
      toast.success("کمپین پایان یافت. می‌توانید گزارش بگیرید.");
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
    }: {
      itemId: string;
      decision: "APPROVED" | "REVOKE_REQUESTED" | "DEFERRED";
    }) => accessCertificationService.certifyItem(itemId, { decision }),
    onSuccess: () => {
      toast.success("ثبت شد");
      void refetchItems();
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
    const block = items.filter((i) => i.sod_has_block).length;
    return { total: items.length, pending, block };
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
                : "همه تصمیم‌ها ثبت شد — می‌توانید کمپین را پایان دهید."
              : isCompleted
                ? "این دوره تمام شده است. از گزارش می‌توانید استفاده کنید."
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
              onClick={() =>
                router.push("/dashboard/identity/access-certifications")
              }
            >
              <ArrowRight className="me-1.5 h-4 w-4" />
              بازگشت
            </Button>

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
                      `هنوز ${toFaDigits(summary.pending)} نفر باقی مانده‌اند.`
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

      {!isDraft && items.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            کل: <strong className="text-foreground">{toFaDigits(summary.total)}</strong>
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
          {summary.block > 0 ? (
            <span>
              تضاد نقش جدی:{" "}
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
          <SelectTrigger className="h-8 w-[10rem]">
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
              <TableHead className="w-[12rem]">عضو</TableHead>
              <TableHead>نقش‌ها</TableHead>
              <TableHead className="w-[7rem]">وضعیت نقش</TableHead>
              <TableHead className="w-[7rem]">تصمیم</TableHead>
              {canDecide ? (
                <TableHead className="w-[14rem] text-end">اقدام</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsLoading || campLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={canDecide ? 5 : 4}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canDecide ? 5 : 4}
                  className="h-24 text-center text-muted-foreground"
                >
                  {items.length === 0
                    ? isDraft
                      ? "برای شروع، «شروع بررسی» را بزنید."
                      : "آیتمی نیست"
                    : decisionFilter === "PENDING"
                      ? "مورد بازی باقی نمانده — فیلتر را روی «همه» بگذارید یا کمپین را پایان دهید."
                      : "با این فیلتر موردی نیست"}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r) => {
                const pending =
                  !r.decision ||
                  String(r.decision).toUpperCase() === "PENDING";
                const deferred =
                  String(r.decision || "").toUpperCase() === "DEFERRED";
                const showActions = canDecide && (pending || deferred);
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
                        <StatusChip tone="danger" label="تضاد جدی" />
                      ) : r.sod_has_warn ? (
                        <StatusChip tone="warning" label="هشدار" />
                      ) : (
                        <StatusChip tone="success" label="عادی" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {DECISION_LABEL[
                        String(r.decision || "PENDING").toUpperCase()
                      ] || "—"}
                    </TableCell>
                    {canDecide ? (
                      <TableCell className="text-end">
                        {showActions ? (
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={certifyMut.isPending}
                              onClick={() =>
                                void certifyMut.mutateAsync({
                                  itemId: r.item_id,
                                  decision: "APPROVED",
                                })
                              }
                            >
                              تأیید
                            </Button>
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
                                })
                              }
                            >
                              نیاز به اصلاح
                            </Button>
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
                                })
                              }
                            >
                              بعداً
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    ) : null}
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
