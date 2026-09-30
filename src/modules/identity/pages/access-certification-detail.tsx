/** جزئیات کمپین بازبینی — فقط شکاف‌ها + اصلاح + بررسی مجدد */

"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
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
  PENDING: "باز",
  APPROVED: "استثنا پذیرفته شد",
  REVOKE_REQUESTED: "در صف اصلاح",
  DEFERRED: "موکول",
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
  const [decisionFilter, setDecisionFilter] = useState<string>("open");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [reportBusy, setReportBusy] = useState(false);

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

  const openMut = useMutation({
    mutationFn: () => accessCertificationService.open(campaignId),
    onSuccess: () => {
      toast.success("اسکن انجام شد — فقط موارد دارای شکاف نقش فهرست شدند");
      void qc.invalidateQueries({
        queryKey: ["identity", "access-certifications", campaignId],
      });
      setDecisionFilter("open");
      void refetchItems();
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiClientError ? e.message : "شروع بررسی ناموفق بود"
      ),
  });

  const reEvalMut = useMutation({
    mutationFn: () => accessCertificationService.reEvaluate(campaignId),
    onSuccess: (res) => {
      const r = res.re_eval || {};
      toast.success(
        `بررسی مجدد: ${toFaDigits(r.resolved ?? 0)} رفع‌شده · ${toFaDigits(r.updated ?? 0)} به‌روز · ${toFaDigits(r.added ?? 0)} مورد جدید`
      );
      void qc.invalidateQueries({
        queryKey: ["identity", "access-certifications", campaignId],
      });
      void refetchItems();
      setDecisionFilter("open");
      setPage(1);
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiClientError ? e.message : "بررسی مجدد ناموفق بود"
      ),
  });

  const completeMut = useMutation({
    mutationFn: () => accessCertificationService.complete(campaignId),
    onSuccess: () => {
      toast.success("کمپین پایان یافت");
      void qc.invalidateQueries({
        queryKey: ["identity", "access-certifications", campaignId],
      });
      void refetchItems();
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiClientError ? e.message : "پایان کمپین ناموفق بود"
      ),
  });

  const certifyMut = useMutation({
    mutationFn: ({
      itemId,
      decision,
    }: {
      itemId: string;
      decision: "APPROVED" | "REVOKE_REQUESTED" | "DEFERRED";
    }) => accessCertificationService.certifyItem(itemId, { decision }),
    onSuccess: (_d, vars) => {
      void refetchItems();
      if (vars.decision === "APPROVED") {
        toast.success("استثنا ثبت شد — این مورد عمداً پذیرفته شد");
      } else if (vars.decision === "DEFERRED") {
        toast.success("موکول شد");
      } else {
        toast.success("در صف اصلاح — نقش را عوض کنید و بررسی مجدد بزنید");
      }
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiClientError ? e.message : "ثبت تصمیم ناموفق بود"
      ),
  });

  const summary = useMemo(() => {
    const isOpenDecision = (i: AccessCertItemDto) => {
      const d = String(i.decision ?? "PENDING").toUpperCase();
      return d === "PENDING" || d === "REVOKE_REQUESTED";
    };
    const openCount = items.filter(isOpenDecision).length;
    const exception = items.filter(
      (i) => String(i.decision || "").toUpperCase() === "APPROVED"
    ).length;
    const deferred = items.filter(
      (i) => String(i.decision || "").toUpperCase() === "DEFERRED"
    ).length;
    const block = items.filter((i) => i.sod_has_block).length;
    return {
      total: items.length,
      open: openCount,
      exception,
      deferred,
      block,
    };
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (decisionFilter === "open") {
      list = list.filter((i) => {
        const d = String(i.decision || "PENDING").toUpperCase();
        return d === "PENDING" || d === "REVOKE_REQUESTED";
      });
    } else if (decisionFilter !== "all") {
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

  function conflictHint(item: AccessCertItemDto): string {
    const c = item.sod_conflicts;
    if (!Array.isArray(c) || !c.length) {
      return item.sod_has_block ? "تضاد جدی نقش" : "هشدار نقش";
    }
    return c
      .slice(0, 2)
      .map((x) => x.name || x.code || "قانون")
      .join(" · ");
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
            ? "با «شروع بررسی» فقط اعضایی که تضاد نقش دارند فهرست می‌شوند."
            : isOpen
              ? summary.open > 0
                ? `${toFaDigits(summary.open)} شکاف باز — نقش را اصلاح کنید، سپس «بررسی مجدد».`
                : "شکاف بازی نمانده — می‌توانید کمپین را پایان دهید."
              : isCompleted
                ? "دوره تمام شده است."
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
              گزارش
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
                variant="secondary"
                disabled={reEvalMut.isPending}
                onClick={() => void reEvalMut.mutateAsync()}
              >
                {reEvalMut.isPending ? (
                  <Loader2 className="me-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="me-1.5 h-4 w-4" />
                )}
                بررسی مجدد
              </Button>
            ) : null}

            {canManage && isOpen ? (
              <Button
                type="button"
                size="sm"
                disabled={completeMut.isPending || summary.open > 0}
                onClick={() => {
                  if (summary.open > 0) {
                    setDecisionFilter("open");
                    toast.message(
                      `هنوز ${toFaDigits(summary.open)} مورد باز است.`
                    );
                    return;
                  }
                  void completeMut.mutateAsync();
                }}
              >
                پایان کمپین
              </Button>
            ) : null}
          </div>
        }
      />

      {isOpen ? (
        <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          فقط اعضایی با <strong className="text-foreground">تضاد نقش</strong>{" "}
          دیده می‌شوند. برای هر مورد: نقش را در صفحهٔ عضو اصلاح کنید →{" "}
          <strong className="text-foreground">بررسی مجدد</strong>؛ یا{" "}
          <strong className="text-foreground">پذیرش استثنا</strong> (عمدی) یا{" "}
          <strong className="text-foreground">موکول</strong> به دوره بعد.
        </div>
      ) : null}

      {!isDraft && items.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>
            شکاف‌ها:{" "}
            <strong className="text-foreground">
              {toFaDigits(summary.total)}
            </strong>
          </span>
          <span>
            باز:{" "}
            <strong
              className={
                summary.open > 0 ? "text-amber-700" : "text-foreground"
              }
            >
              {toFaDigits(summary.open)}
            </strong>
          </span>
          {summary.exception > 0 ? (
            <span>
              استثنا:{" "}
              <strong className="text-foreground">
                {toFaDigits(summary.exception)}
              </strong>
            </span>
          ) : null}
          {summary.block > 0 ? (
            <span>
              تضاد جدی:{" "}
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
            <SelectItem value="open">موارد باز</SelectItem>
            <SelectItem value="all">همه</SelectItem>
            <SelectItem value="APPROVED">استثناها</SelectItem>
            <SelectItem value="DEFERRED">موکول‌ها</SelectItem>
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
              <TableHead>نقش‌ها</TableHead>
              <TableHead className="w-[12rem]">شکاف</TableHead>
              <TableHead className="w-[8rem]">وضعیت</TableHead>
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
                      ? "برای اسکن شکاف‌ها، «شروع بررسی» را بزنید."
                      : isOpen
                        ? "شکافی یافت نشد — می‌توانید کمپین را پایان دهید."
                        : "آیتمی نیست"
                    : "با این فیلتر موردی نیست"}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r) => {
                const d = String(r.decision || "PENDING").toUpperCase();
                const href = memberHref(r);
                const isWork =
                  d === "PENDING" || d === "REVOKE_REQUESTED";
                return (
                  <TableRow key={r.item_id}>
                    <TableCell className="font-medium">
                      {userLabel.get(String(r.user_id ?? "")) ||
                        String(r.user_id || "—")}
                    </TableCell>
                    <TableCell className="max-w-[14rem] truncate text-sm text-muted-foreground">
                      {roleNames(r)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {r.sod_has_block ? (
                          <StatusChip tone="danger" label="تضاد جدی" />
                        ) : (
                          <StatusChip tone="warning" label="هشدار" />
                        )}
                        <span className="text-[11px] text-muted-foreground line-clamp-1">
                          {conflictHint(r)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {DECISION_LABEL[d] || d}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {href ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-7 text-xs"
                            onClick={() => router.push(href)}
                          >
                            <ExternalLink className="me-1 h-3 w-3" />
                            اصلاح نقش
                          </Button>
                        ) : null}

                        {canDecide && isWork ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={certifyMut.isPending}
                              onClick={() =>
                                void certifyMut.mutateAsync({
                                  itemId: r.item_id,
                                  decision: "APPROVED",
                                })
                              }
                            >
                              پذیرش استثنا
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
                              موکول
                            </Button>
                          </>
                        ) : null}

                        {canDecide && !isWork ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            disabled={certifyMut.isPending}
                            onClick={() =>
                              void certifyMut.mutateAsync({
                                itemId: r.item_id,
                                decision: "REVOKE_REQUESTED",
                              })
                            }
                          >
                            باز کردن مجدد
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
