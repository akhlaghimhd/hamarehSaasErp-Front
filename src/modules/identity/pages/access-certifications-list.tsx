/** Access Certification campaigns + item certify — ID-W2-01 FE */

"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  DataTable,
  type DataTableColumn,
} from "@/shared/components/data-display/data-table";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { ApiClientError } from "@/api";
import { usePermission } from "@/auth";
import { IdentityPermissions } from "../types";
import { useTenantUsers } from "../hooks/use-tenant-users";
import { useRoles } from "../hooks/use-roles";
import {
  accessCertificationService,
  type AccessCertCampaignDto,
  type AccessCertItemDto,
} from "../services/access-certification-service";

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  OPEN: "باز",
  COMPLETED: "تکمیل",
  CANCELLED: "لغو",
};

const DECISION_LABEL: Record<string, string> = {
  PENDING: "در انتظار",
  APPROVED: "تأیید",
  REVOKE_REQUESTED: "درخواست لغو",
  DEFERRED: "موکول",
};

function shortId(id?: string | null): string {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export function AccessCertificationsListPage() {
  const canView = usePermission(IdentityPermissions.accessCertView);
  const canManage = usePermission(IdentityPermissions.accessCertManage);
  const canCertify = usePermission(IdentityPermissions.accessCertCertify);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [itemsOpen, setItemsOpen] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<AccessCertCampaignDto | null>(null);

  const { data: members = [] } = useTenantUsers("active");
  const { data: roles = [] } = useRoles();

  const userLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of members) {
      const uid = String(m.user_id ?? "");
      if (!uid) continue;
      const label =
        m.user?.display_name ||
        [m.user?.first_name, m.user?.last_name].filter(Boolean).join(" ") ||
        m.user?.email ||
        m.user?.mobile ||
        shortId(uid);
      map.set(uid, label);
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

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["identity", "access-certifications"],
    queryFn: () => accessCertificationService.list(),
    enabled: canView,
  });

  const campaignId = activeCampaign?.campaign_id;

  const {
    data: items = [],
    isLoading: itemsLoading,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ["identity", "access-certifications", campaignId, "items"],
    queryFn: () =>
      campaignId
        ? accessCertificationService.listItems(campaignId)
        : Promise.resolve([] as AccessCertItemDto[]),
    enabled: Boolean(campaignId) && itemsOpen && canView,
  });

  const createMut = useMutation({
    mutationFn: () =>
      accessCertificationService.create({
        code: code.trim(),
        name: name.trim(),
        description: description.trim() || null,
        due_at: dueAt || null,
      }),
    onSuccess: () => {
      toast.success("کمپین ایجاد شد");
      setCreateOpen(false);
      setCode("");
      setName("");
      setDescription("");
      setDueAt("");
      void qc.invalidateQueries({ queryKey: ["identity", "access-certifications"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "ایجاد کمپین ناموفق بود"),
  });

  const openMut = useMutation({
    mutationFn: (id: string) => accessCertificationService.open(id),
    onSuccess: () => {
      toast.success("کمپین باز شد");
      void qc.invalidateQueries({ queryKey: ["identity", "access-certifications"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "باز کردن کمپین ناموفق بود"),
  });

  const completeMut = useMutation({
    mutationFn: (id: string) => accessCertificationService.complete(id),
    onSuccess: () => {
      toast.success("کمپین تکمیل شد");
      void qc.invalidateQueries({ queryKey: ["identity", "access-certifications"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "تکمیل کمپین ناموفق بود"),
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
      void qc.invalidateQueries({ queryKey: ["identity", "access-certifications"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "ثبت تصمیم ناموفق بود"),
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((r) =>
      [r.code, r.name, r.status].some((v) => String(v ?? "").toLowerCase().includes(term))
    );
  }, [data, q]);

  const openItems = (campaign: AccessCertCampaignDto) => {
    setActiveCampaign(campaign);
    setItemsOpen(true);
  };

  const columns: DataTableColumn<AccessCertCampaignDto>[] = [
    {
      id: "code",
      header: "کد",
      cell: (r) => <span className="font-mono text-xs">{r.code ?? "—"}</span>,
    },
    {
      id: "name",
      header: "نام",
      cell: (r) => r.name ?? "—",
    },
    {
      id: "status",
      header: "وضعیت",
      cell: (r) => (
        <StatusChip
          label={STATUS_LABEL[String(r.status ?? "")] ?? String(r.status ?? "—")}
          tone={r.status === "OPEN" ? "success" : r.status === "COMPLETED" ? "neutral" : "warning"}
        />
      ),
    },
    {
      id: "due",
      header: "مهلت",
      cell: (r) =>
        r.due_at ? (
          <span dir="ltr" className="text-xs tabular-nums">
            {String(r.due_at).slice(0, 10)}
          </span>
        ) : (
          "—"
        ),
    },
    {
      id: "actions",
      header: "عملیات",
      cell: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => openItems(r)}
          >
            آیتم‌ها
          </Button>
          {canManage && r.status === "DRAFT" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={openMut.isPending}
              onClick={() => void openMut.mutateAsync(r.campaign_id)}
            >
              باز کردن
            </Button>
          ) : null}
          {canManage && r.status === "OPEN" ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={completeMut.isPending}
              onClick={() => void completeMut.mutateAsync(r.campaign_id)}
            >
              تکمیل
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  const itemColumns: DataTableColumn<AccessCertItemDto>[] = [
    {
      id: "user",
      header: "کاربر",
      cell: (r) => {
        const id = String(r.user_id ?? "");
        return (
          <div className="min-w-0">
            <div className="text-sm font-medium">{userLabel.get(id) ?? shortId(id)}</div>
            <div dir="ltr" className="font-mono text-[10px] text-muted-foreground">
              {shortId(id)}
            </div>
          </div>
        );
      },
    },
    {
      id: "role",
      header: "نقش",
      cell: (r) => {
        const id = String(r.tenant_role_id ?? "");
        return (
          <div className="min-w-0">
            <div className="text-sm font-medium">{roleLabel.get(id) ?? shortId(id)}</div>
            <div dir="ltr" className="font-mono text-[10px] text-muted-foreground">
              {shortId(id)}
            </div>
          </div>
        );
      },
    },
    {
      id: "decision",
      header: "تصمیم",
      cell: (r) => {
        const d = String(r.decision ?? "PENDING");
        return (
          <StatusChip
            label={DECISION_LABEL[d] ?? d}
            tone={
              d === "APPROVED"
                ? "success"
                : d === "REVOKE_REQUESTED"
                  ? "warning"
                  : "neutral"
            }
          />
        );
      },
    },
    {
      id: "actions",
      header: "عملیات",
      cell: (r) => {
        const pending = !r.decision || r.decision === "PENDING";
        if (!canCertify || !pending || activeCampaign?.status !== "OPEN") {
          return "—";
        }
        return (
          <div className="flex flex-wrap gap-1">
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
              لغو نقش
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
          </div>
        );
      },
    },
  ];

  if (!canView) {
    return (
      <div className="space-y-4">
        <PageHeader title="بازبینی دسترسی" description="مجوز مشاهده ندارید." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="بازبینی دسترسی (Access Certification)"
        description="کمپین‌های بررسی دوره‌ای نقش‌ها و دسترسی‌ها"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "بازبینی دسترسی" },
        ]}
        icon={<ClipboardCheck className="h-5 w-5" />}
        actions={
          canManage ? (
            <Button
              type="button"
              size="sm"
              className="gap-1.5"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              کمپین جدید
            </Button>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1 max-w-sm">
          <Search className="absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجو…"
            className="ps-8 h-9"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
          بروزرسانی
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال بارگذاری…
        </div>
      ) : isError ? (
        <p className="text-sm text-destructive">
          {error instanceof ApiClientError ? error.message : "خطا در بارگذاری"}
        </p>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          getRowKey={(r) => r.campaign_id}
          isFiltered={q.trim().length > 0}
          emptyTitle="کمپینی ثبت نشده است."
          emptySearchTitle="نتیجه‌ای پیدا نشد."
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>کمپین بازبینی دسترسی</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ac-code">کد</Label>
              <Input
                id="ac-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="مثلاً Q1-2026"
                disabled={createMut.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-name">نام</Label>
              <Input
                id="ac-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="نام کمپین"
                disabled={createMut.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-desc">توضیح</Label>
              <Input
                id="ac-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="اختیاری"
                disabled={createMut.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-due">مهلت</Label>
              <Input
                id="ac-due"
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                disabled={createMut.isPending}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={createMut.isPending}
              onClick={() => setCreateOpen(false)}
            >
              انصراف
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={createMut.isPending || !code.trim() || !name.trim()}
              onClick={() => void createMut.mutateAsync()}
            >
              {createMut.isPending ? (
                <>
                  <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                  در حال ایجاد…
                </>
              ) : (
                "ایجاد"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={itemsOpen} onOpenChange={setItemsOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              آیتم‌های کمپین{activeCampaign?.name ? ` — ${activeCampaign.name}` : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            {itemsLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                در حال بارگذاری آیتم‌ها…
              </div>
            ) : (
              <DataTable
                columns={itemColumns}
                data={items}
                getRowKey={(r) => r.item_id}
                emptyTitle="آیتمی وجود ندارد (کمپین را باز کنید تا snapshot ساخته شود)."
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
