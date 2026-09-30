/** صفحهٔ آیتم‌های یک کمپین بازبینی دسترسی */

"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CircleHelp,
  ClipboardCheck,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
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

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  OPEN: "در حال بازبینی",
  COMPLETED: "تکمیل‌شده",
  CANCELLED: "لغو شده",
};

const DECISION_LABEL: Record<string, string> = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تأیید شد",
  REVOKE_REQUESTED: "درخواست کاهش دسترسی",
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
  const [decisionFilter, setDecisionFilter] = useState<string>("all");
  const [sodFilter, setSodFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

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
      const name =
        m.user?.display_name ||
        [m.user?.first_name, m.user?.last_name].filter(Boolean).join(" ") ||
        m.user?.mobile ||
        m.user?.email ||
        uid;
      map.set(uid, name);
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

  const openMut = useMutation({
    mutationFn: () => accessCertificationService.open(campaignId),
    onSuccess: () => {
      toast.success("کمپین باز شد");
      void qc.invalidateQueries({
        queryKey: ["identity", "access-certifications", campaignId],
      });
      void refetchItems();
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "باز کردن ناموفق بود"),
  });

  const completeMut = useMutation({
    mutationFn: () => accessCertificationService.complete(campaignId),
    onSuccess: () => {
      toast.success("کمپین تکمیل شد");
      void qc.invalidateQueries({
        queryKey: ["identity", "access-certifications", campaignId],
      });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "تکمیل ناموفق بود"),
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
      toast.success("تصمیم ثبت شد");
      void refetchItems();
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "ثبت تصمیم ناموفق بود"),
  });

  const filtered = useMemo(() => {
    let list = items;
    if (decisionFilter !== "all") {
      list = list.filter(
        (i) => String(i.decision || "PENDING").toUpperCase() === decisionFilter
      );
    }
    if (sodFilter === "block") {
      list = list.filter((i) => i.sod_has_block);
    } else if (sodFilter === "warn") {
      list = list.filter((i) => i.sod_has_warn && !i.sod_has_block);
    } else if (sodFilter === "clean") {
      list = list.filter((i) => !i.sod_has_block && !i.sod_has_warn);
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
  }, [items, decisionFilter, sodFilter, q, userLabel]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const summary = useMemo(() => {
    const pending = items.filter(
      (i) => !i.decision || i.decision === "PENDING"
    ).length;
    const block = items.filter((i) => i.sod_has_block).length;
    const warn = items.filter((i) => i.sod_has_warn && !i.sod_has_block).length;
    return { total: items.length, pending, block, warn };
  }, [items]);

  const roleNames = (item: AccessCertItemDto) => {
    const ids = item.role_ids_snapshot || [];
    if (!ids.length) return "بدون نقش";
    return ids.map((id) => roleLabel.get(String(id)) || "نقش").join("، ");
  };

  const status = String(campaign?.status || "").toUpperCase();
  const isOpen = status === "OPEN";
  const isDraft = status === "DRAFT";

  if (!canView) {
    return (
      <EmptyState
        title="دسترسی ندارید"
        description="مجوز مشاهده بازبینی دسترسی را ندارید."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <PageHeader
        title={campaign?.name || "جزئیات کمپین"}
        description={
          campaign
            ? `${STATUS_LABEL[status] || status} · کد ${campaign.code || "—"}`
            : "در حال بارگذاری…"
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
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" size="sm" variant="outline">
                  <CircleHelp className="me-1.5 h-4 w-4" />
                  راهنما
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md text-start">
                <DialogHeader>
                  <DialogTitle>راهنمای تصمیم‌گیری</DialogTitle>
                  <DialogDescription className="sr-only">
                    معنی دکمه‌های تأیید و کاهش دسترسی
                  </DialogDescription>
                </DialogHeader>
                <ul className="list-inside list-disc space-y-2 text-sm text-muted-foreground">
                  <li>
                    <strong className="text-foreground">تأیید:</strong> دسترسی فعلی مناسب است.
                  </li>
                  <li>
                    <strong className="text-foreground">کاهش دسترسی:</strong>{" "}
                    باید نقش‌ها اصلاح شوند (حذف خودکار نیست؛ فقط ثبت درخواست).
                  </li>
                  <li>
                    <strong className="text-foreground">موکول:</strong> بعداً دوباره بررسی می‌کنید.
                  </li>
                </ul>
                <p className="mt-3 text-sm text-muted-foreground">
                  برای «تکمیل کمپین» نباید هیچ ردیفی در وضعیت «در انتظار» بماند.
                </p>
              </DialogContent>
            </Dialog>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => router.push("/dashboard/identity/access-certifications")}
            >
              <ArrowRight className="me-1.5 h-4 w-4" />
              بازگشت
            </Button>
            {canManage && isDraft ? (
              <Button type="button" size="sm" disabled={openMut.isPending} onClick={() => void openMut.mutateAsync()}>
                باز کردن کمپین
              </Button>
            ) : null}
            {canManage && isOpen ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={completeMut.isPending || summary.pending > 0}
                title={summary.pending > 0 ? `هنوز ${summary.pending} نفر در انتظار تصمیم هستند` : undefined}
                onClick={() => void completeMut.mutateAsync()}
              >
                تکمیل کمپین
                {summary.pending > 0 ? ` (${toFaDigits(summary.pending)} در انتظار)` : ""}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { label: "کل افراد", value: summary.total },
          { label: "در انتظار", value: summary.pending },
          { label: "نقض مسدود", value: summary.block },
          { label: "هشدار", value: summary.warn },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border bg-card px-3 py-2 text-center">
            <div className="text-lg font-semibold tabular-nums">{toFaDigits(c.value)}</div>
            <div className="text-[11px] text-muted-foreground">{c.label}</div>
          </div>
        ))}
      </div>

      {isDraft ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          این کمپین هنوز باز نشده است. با «باز کردن کمپین» از همهٔ اعضای فعال عکس نقش‌ها گرفته می‌شود.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-8 ps-8 text-sm" placeholder="جستجوی نام عضو…" value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <Select value={decisionFilter} onValueChange={(v) => { setDecisionFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-[10rem]"><SelectValue placeholder="تصمیم" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه تصمیم‌ها</SelectItem>
            <SelectItem value="PENDING">در انتظار</SelectItem>
            <SelectItem value="APPROVED">تأیید</SelectItem>
            <SelectItem value="REVOKE_REQUESTED">کاهش دسترسی</SelectItem>
            <SelectItem value="DEFERRED">موکول</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sodFilter} onValueChange={(v) => { setSodFilter(v); setPage(1); }}>
          <SelectTrigger className="h-8 w-[10rem]"><SelectValue placeholder="تضاد نقش" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه تضادها</SelectItem>
            <SelectItem value="block">فقط مسدود</SelectItem>
            <SelectItem value="warn">فقط هشدار</SelectItem>
            <SelectItem value="clean">بدون تعارض</SelectItem>
          </SelectContent>
        </Select>
        {itemsLoading || campLoading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b bg-card shadow-sm">
              <TableHead className="sticky top-0 z-20 w-10 bg-card text-center text-xs">#</TableHead>
              <TableHead className="sticky top-0 z-20 bg-card">عضو</TableHead>
              <TableHead className="sticky top-0 z-20 bg-card">نقش‌های فعلی</TableHead>
              <TableHead className="sticky top-0 z-20 bg-card">وضعیت تضاد</TableHead>
              <TableHead className="sticky top-0 z-20 bg-card">تصمیم</TableHead>
              <TableHead className="sticky top-0 z-20 bg-card text-end">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itemsLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}><TableCell colSpan={6} className="py-2"><Skeleton className="h-7 w-full" /></TableCell></TableRow>
              ))
            ) : pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    title={isDraft ? "هنوز آیتمی نیست" : "موردی با این فیلتر پیدا نشد"}
                    description={isDraft ? "کمپین را باز کنید تا فهرست اعضا ساخته شود." : "فیلتر را تغییر دهید."}
                  />
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((r, idx) => {
                const pending = !r.decision || String(r.decision).toUpperCase() === "PENDING";
                const deferred = String(r.decision || "").toUpperCase() === "DEFERRED";
                const canAct = canCertify && isOpen && (pending || deferred);
                return (
                  <TableRow key={r.item_id}>
                    <TableCell className="px-2 py-1 text-center text-xs text-muted-foreground">{toFaDigits((safePage - 1) * pageSize + idx + 1)}</TableCell>
                    <TableCell className="px-2 py-1 text-sm font-medium">{userLabel.get(String(r.user_id ?? "")) || "—"}</TableCell>
                    <TableCell className="max-w-[220px] px-2 py-1 text-xs text-muted-foreground">{roleNames(r)}</TableCell>
                    <TableCell className="px-2 py-1">
                      {r.sod_has_block ? <StatusChip label="نقض مسدود" tone="danger" /> : r.sod_has_warn ? <StatusChip label="هشدار" tone="warning" /> : <StatusChip label="بدون تعارض" tone="success" />}
                    </TableCell>
                    <TableCell className="px-2 py-1 text-xs">{DECISION_LABEL[String(r.decision || "PENDING").toUpperCase()] || r.decision || "—"}</TableCell>
                    <TableCell className="px-2 py-1">
                      {canAct ? (
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={certifyMut.isPending}
                            onClick={() => void certifyMut.mutateAsync({ itemId: r.item_id, decision: "APPROVED" })}>تأیید</Button>
                          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={certifyMut.isPending}
                            onClick={() => void certifyMut.mutateAsync({ itemId: r.item_id, decision: "REVOKE_REQUESTED" })}>کاهش دسترسی</Button>
                          <Button type="button" size="sm" variant="ghost" className="h-7 text-xs" disabled={certifyMut.isPending}
                            onClick={() => void certifyMut.mutateAsync({ itemId: r.item_id, decision: "DEFERRED" })}>موکول</Button>
                        </div>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{total === 0 ? "موردی نیست" : `نمایش ${toFaDigits((safePage - 1) * pageSize + 1)}–${toFaDigits(Math.min(safePage * pageSize, total))} از ${toFaDigits(total)}`}</span>
        <div className="flex items-center gap-2">
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
            <SelectTrigger className="h-7 w-[4.5rem]"><SelectValue /></SelectTrigger>
            <SelectContent>{[10, 20, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{toFaDigits(n)}</SelectItem>)}</SelectContent>
          </Select>
          <Button type="button" size="sm" variant="outline" className="h-7" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>قبلی</Button>
          <span>{toFaDigits(safePage)} / {toFaDigits(totalPages)}</span>
          <Button type="button" size="sm" variant="outline" className="h-7" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>بعدی</Button>
        </div>
      </div>
    </div>
  );
}
