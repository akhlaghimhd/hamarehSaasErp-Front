/** قوانین تفکیک وظایف — جدول و فرم هم‌تراز با فهرست اعضا */

"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Plus,
  RotateCcw,
  Scale,
  Search,
  Trash2,
  Power,
  PowerOff,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import {
  DataTable,
  type DataTableColumn,
} from "@/shared/components/data-display/data-table";
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

function roleName(
  rule: SodRuleDto,
  side: "a" | "b",
  fallbackMap: Map<string, string>
): string {
  const rel = side === "a" ? rule.role_a : rule.role_b;
  const id = String((side === "a" ? rule.role_a_id : rule.role_b_id) ?? "");
  return rel?.name || rel?.code || fallbackMap.get(id) || "—";
}

function severityTone(s?: number): "default" | "warning" | "danger" | "success" {
  if (s === 4) return "danger";
  if (s === 3) return "warning";
  if (s === 1) return "success";
  return "default";
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function SodRulesListPage() {
  const canView = usePermission(IdentityPermissions.sodView);
  const canManage = usePermission(IdentityPermissions.sodManage);
  const qc = useQueryClient();

  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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

  const listParams = useMemo(() => {
    if (statusFilter === "deleted") return { only_trashed: true as const };
    if (statusFilter === "active") return { status: "active" as const };
    if (statusFilter === "inactive") return { status: "inactive" as const };
    return {};
  }, [statusFilter]);

  const { data = [], isLoading, isError, error, refetch, isFetching } = useQuery({
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

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((r) => {
      const a = roleName(r, "a", roleLabel);
      const b = roleName(r, "b", roleLabel);
      return [r.name, r.code, a, b, SEVERITY_LABEL[r.severity ?? 0]].some((v) =>
        String(v ?? "").toLowerCase().includes(term)
      );
    });
  }, [data, q, roleLabel]);

  const toggleEvalRole = (id: string) => {
    setEvalRoles((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setEvalResult(null);
  };

  const columns: DataTableColumn<SodRuleDto>[] = [
    {
      id: "name",
      header: "نام قانون",
      cell: (r) => (
        <div className="min-w-0 max-w-[220px]">
          <div className="truncate text-sm font-medium">{r.name ?? "—"}</div>
          {r.description ? (
            <div className="truncate text-[11px] text-muted-foreground">
              {r.description}
            </div>
          ) : null}
        </div>
      ),
    },
    {
      id: "pair",
      header: "جفت نقش",
      cell: (r) => (
        <div className="text-xs leading-5">
          <span className="font-medium">{roleName(r, "a", roleLabel)}</span>
          <span className="mx-1 text-muted-foreground">×</span>
          <span className="font-medium">{roleName(r, "b", roleLabel)}</span>
        </div>
      ),
    },
    {
      id: "enforcement",
      header: "نوع اجرا",
      cell: (r) => (
        <StatusChip
          label={r.enforcement === "WARN" ? "هشدار" : "مسدودکننده"}
          tone={r.enforcement === "WARN" ? "warning" : "danger"}
        />
      ),
    },
    {
      id: "severity",
      header: "شدت حساسیت",
      cell: (r) => (
        <StatusChip
          label={SEVERITY_LABEL[r.severity ?? 3] ?? "متوسط"}
          tone={severityTone(r.severity)}
        />
      ),
    },
    {
      id: "status",
      header: "وضعیت",
      cell: (r) => {
        if (statusFilter === "deleted" || r.deleted_at) {
          return <StatusChip label="حذف‌شده" tone="danger" />;
        }
        if (!r.is_active) {
          const until = r.inactive_until
            ? toFaDigits(new Date(r.inactive_until).toLocaleDateString("fa-IR"))
            : null;
          return (
            <StatusChip
              label={until ? `غیرفعال تا ${until}` : "غیرفعال"}
              tone="warning"
            />
          );
        }
        return <StatusChip label="فعال" tone="success" />;
      },
    },
    {
      id: "actions",
      header: "عملیات",
      cell: (r) => {
        if (!canManage) return <span className="text-xs text-muted-foreground">—</span>;
        if (statusFilter === "deleted") {
          return (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              disabled={restoreMut.isPending}
              onClick={() => void restoreMut.mutateAsync(r.sod_rule_id)}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              بازگردانی
            </Button>
          );
        }
        return (
          <div className="flex flex-wrap items-center gap-1">
            {r.is_active ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-amber-700"
                onClick={() => {
                  setDeactivateMode("permanent");
                  setDeactivateTarget(r);
                }}
              >
                <PowerOff className="h-3.5 w-3.5" />
                غیرفعال
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1 text-emerald-700"
                disabled={updateMut.isPending}
                onClick={() =>
                  void updateMut.mutateAsync({
                    id: r.sod_rule_id,
                    payload: { is_active: true, inactive_until: null },
                  })
                }
              >
                <Power className="h-3.5 w-3.5" />
                فعال‌سازی
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 gap-1 text-destructive"
              onClick={() => setDeleteTarget(r)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </Button>
          </div>
        );
      },
    },
  ];

  if (!canView) {
    return (
      <div className="p-6">
        <EmptyState
          title="دسترسی ندارید"
          description="مجوز مشاهده قوانین تفکیک وظایف برای حساب شما فعال نیست."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 md:p-6">
      <PageHeader
        title="قوانین تفکیک وظایف"
        description="تعیین جفت‌نقش‌هایی که نباید همزمان به یک کاربر داده شوند"
        icon={Scale}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isFetching}
              onClick={() => void refetch()}
              title="بارگذاری مجدد فهرست از سرور"
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              <span className="ms-1.5">بارگذاری مجدد</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEvalResult(null);
                setEvalOpen(true);
              }}
            >
              <Scale className="me-1.5 h-4 w-4" />
              ارزیابی نقش‌ها
            </Button>
            {canManage ? (
              <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="me-1.5 h-4 w-4" />
                قانون جدید
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-9"
            placeholder="جستجو در نام، نقش‌ها یا شدت…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="وضعیت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه (غیرحذف‌شده)</SelectItem>
            <SelectItem value="active">فقط فعال</SelectItem>
            <SelectItem value="inactive">فقط غیرفعال</SelectItem>
            <SelectItem value="deleted">سطل بازیابی</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <EmptyState
          title="خطا در دریافت فهرست"
          description={
            error instanceof Error ? error.message : "بارگذاری قوانین ناموفق بود."
          }
          action={
            <Button type="button" variant="outline" onClick={() => void refetch()}>
              تلاش مجدد
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          emptyMessage="قانونی برای نمایش نیست. با «قانون جدید» شروع کنید یا فیلتر را تغییر دهید."
        />
      )}

      <Sheet
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateForm();
        }}
      >
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>قانون جدید تفکیک وظایف</SheetTitle>
            <SheetDescription>
              دو نقش را انتخاب کنید که نباید همزمان به یک کاربر اختصاص داده شوند.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto py-4">
            <div className="space-y-2">
              <Label>نام قانون</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: حسابدار × کارشناس خرید"
              />
            </div>
            <div className="space-y-2">
              <Label>توضیح (اختیاری)</Label>
              <Input
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
            <div className="space-y-2">
              <Label>جستجوی نقش</Label>
              <Input
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                placeholder="فیلتر فهرست نقش‌ها…"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>نقش اول</Label>
                <Select value={roleA} onValueChange={setRoleA}>
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب نقش" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {filteredRoles.map((r) => (
                      <SelectItem key={r.tenant_role_id} value={r.tenant_role_id}>
                        {r.name || r.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>نقش دوم</Label>
                <Select value={roleB} onValueChange={setRoleB}>
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب نقش" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {filteredRoles
                      .filter((r) => r.tenant_role_id !== roleA)
                      .map((r) => (
                        <SelectItem key={r.tenant_role_id} value={r.tenant_role_id}>
                          {r.name || r.code}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <SheetFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              انصراف
            </Button>
            <Button
              type="button"
              disabled={
                createMut.isPending ||
                !name.trim() ||
                !roleA ||
                !roleB ||
                roleA === roleB
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
              قانون «{deleteTarget?.name}» به‌صورت نرم حذف می‌شود. تا وقتی جفت نقش
              مشابهی فعال نباشد، می‌توانید از «سطل بازیابی» آن را برگردانید. پس از حذف،
              این تعارض دیگر هنگام تخصیص نقش اعمال نمی‌شود.
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
              قانون «{deactivateTarget?.name}» موقتاً از ارزیابی و مسدودسازی خارج
              می‌شود. پس از پایان بازه می‌تواند خودکار فعال شود.
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
                          deactivateMode === "1d"
                            ? 1
                            : deactivateMode === "7d"
                              ? 7
                              : 30
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
              نقش‌هایی را که می‌خواهید همزمان به یک کاربر بدهید انتخاب کنید تا تعارض‌ها
              پیش از تخصیص دیده شوند.
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
  );
}
