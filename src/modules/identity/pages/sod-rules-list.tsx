/** SoD rules — ID-W1-01 FE */

"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Scale, Search } from "lucide-react";
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
import { ApiClientError } from "@/api";
import { usePermission } from "@/auth";
import { IdentityPermissions } from "../types";
import { useRoles } from "../hooks/use-roles";
import {
  sodService,
  type SodEvaluateResult,
  type SodRuleDto,
} from "../services/sod-service";

const SEVERITY_LABEL: Record<number, string> = {
  1: "کم",
  2: "متوسط",
  3: "بالا",
  4: "بحرانی",
};

function shortId(id?: string | null): string {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function roleName(
  rule: SodRuleDto,
  side: "a" | "b",
  fallbackMap: Map<string, string>
): string {
  const rel = side === "a" ? rule.role_a : rule.role_b;
  const id = String((side === "a" ? rule.role_a_id : rule.role_b_id) ?? "");
  return (
    rel?.name ||
    rel?.code ||
    fallbackMap.get(id) ||
    shortId(id)
  );
}

export function SodRulesListPage() {
  const canView = usePermission(IdentityPermissions.sodView);
  const canManage = usePermission(IdentityPermissions.sodManage);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);
  const [roleA, setRoleA] = useState("");
  const [roleB, setRoleB] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [enforcement, setEnforcement] = useState<"BLOCK" | "WARN">("BLOCK");
  const [severity, setSeverity] = useState("3");
  const [evalRoles, setEvalRoles] = useState<string[]>([]);
  const [evalResult, setEvalResult] = useState<SodEvaluateResult | null>(null);

  const { data: roles = [] } = useRoles();

  const roleLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roles) {
      map.set(r.tenant_role_id, r.name || r.code || shortId(r.tenant_role_id));
    }
    return map;
  }, [roles]);

  const { data = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["identity", "sod-rules"],
    queryFn: () => sodService.list(),
    enabled: canView,
  });

  const createMut = useMutation({
    mutationFn: () =>
      sodService.create({
        role_a_id: roleA,
        role_b_id: roleB,
        name: name.trim(),
        code: code.trim() || null,
        description: description.trim() || null,
        enforcement,
        severity: Math.max(1, Math.min(4, Number(severity) || 3)),
        is_active: true,
      }),
    onSuccess: () => {
      toast.success("قانون SoD ثبت شد");
      setCreateOpen(false);
      setRoleA("");
      setRoleB("");
      setName("");
      setCode("");
      setDescription("");
      setEnforcement("BLOCK");
      setSeverity("3");
      void qc.invalidateQueries({ queryKey: ["identity", "sod-rules"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "ثبت قانون ناموفق بود"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => sodService.softDelete(id),
    onSuccess: () => {
      toast.success("قانون حذف شد");
      void qc.invalidateQueries({ queryKey: ["identity", "sod-rules"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "حذف ناموفق بود"),
  });

  const evaluateMut = useMutation({
    mutationFn: () => sodService.evaluate(evalRoles),
    onSuccess: (result) => {
      setEvalResult(result);
      if (result.has_block) {
        toast.error("تعارض مسدودکننده یافت شد");
      } else if (result.has_warn) {
        toast.message("هشدار SoD وجود دارد");
      } else {
        toast.success("تعارضی یافت نشد");
      }
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "ارزیابی ناموفق بود"),
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data;
    return data.filter((r) => {
      const a = roleName(r, "a", roleLabel);
      const b = roleName(r, "b", roleLabel);
      return [r.name, r.code, r.enforcement, a, b].some((v) =>
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
      header: "نام",
      cell: (r) => (
        <div className="min-w-0">
          <div className="text-sm font-medium">{r.name ?? "—"}</div>
          <div className="font-mono text-[10px] text-muted-foreground">
            {r.code ?? "—"}
          </div>
        </div>
      ),
    },
    {
      id: "pair",
      header: "جفت نقش",
      cell: (r) => (
        <div className="text-xs">
          <span className="font-medium">{roleName(r, "a", roleLabel)}</span>
          <span className="mx-1 text-muted-foreground">×</span>
          <span className="font-medium">{roleName(r, "b", roleLabel)}</span>
        </div>
      ),
    },
    {
      id: "enforcement",
      header: "اجرا",
      cell: (r) => (
        <StatusChip
          label={r.enforcement === "WARN" ? "هشدار" : "مسدود"}
          tone={r.enforcement === "WARN" ? "warning" : "destructive"}
        />
      ),
    },
    {
      id: "severity",
      header: "شدت",
      cell: (r) =>
        SEVERITY_LABEL[Number(r.severity)] ?? String(r.severity ?? "—"),
    },
    {
      id: "active",
      header: "وضعیت",
      cell: (r) =>
        r.is_active === false ? (
          <StatusChip label="غیرفعال" tone="neutral" />
        ) : (
          <StatusChip label="فعال" tone="success" />
        ),
    },
    {
      id: "actions",
      header: "عملیات",
      cell: (r) =>
        canManage ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            disabled={deleteMut.isPending}
            onClick={() => {
              if (window.confirm("این قانون SoD حذف شود؟")) {
                void deleteMut.mutateAsync(r.sod_rule_id);
              }
            }}
          >
            حذف
          </Button>
        ) : (
          "—"
        ),
    },
  ];

  if (!canView) {
    return (
      <div className="space-y-4">
        <PageHeader title="تفکیک وظایف (SoD)" description="مجوز مشاهده ندارید." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="تفکیک وظایف (SoD)"
        description="تعریف جفت نقش‌های متعارض و ارزیابی پیش از تخصیص"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "SoD" },
        ]}
        icon={<Scale className="h-5 w-5" />}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setEvalResult(null);
                setEvalOpen(true);
              }}
            >
              ارزیابی نقش‌ها
            </Button>
            {canManage ? (
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                قانون جدید
              </Button>
            ) : null}
          </div>
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
          getRowKey={(r) => r.sod_rule_id}
          isFiltered={q.trim().length > 0}
          emptyTitle="قانون SoD ثبت نشده است."
          emptySearchTitle="نتیجه‌ای پیدا نشد."
        />
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>قانون تفکیک وظایف</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="sod-name">نام</Label>
              <Input
                id="sod-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثلاً تعارض مالی و تأیید"
                disabled={createMut.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sod-code">کد (اختیاری)</Label>
              <Input
                id="sod-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={createMut.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sod-a">نقش اول</Label>
              <select
                id="sod-a"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={roleA}
                onChange={(e) => setRoleA(e.target.value)}
                disabled={createMut.isPending}
              >
                <option value="">انتخاب…</option>
                {roles.map((r) => (
                  <option key={r.tenant_role_id} value={r.tenant_role_id}>
                    {r.name || r.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sod-b">نقش دوم</Label>
              <select
                id="sod-b"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={roleB}
                onChange={(e) => setRoleB(e.target.value)}
                disabled={createMut.isPending}
              >
                <option value="">انتخاب…</option>
                {roles.map((r) => (
                  <option key={r.tenant_role_id} value={r.tenant_role_id}>
                    {r.name || r.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="sod-enf">اجرا</Label>
                <select
                  id="sod-enf"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={enforcement}
                  onChange={(e) =>
                    setEnforcement(e.target.value === "WARN" ? "WARN" : "BLOCK")
                  }
                  disabled={createMut.isPending}
                >
                  <option value="BLOCK">مسدود (BLOCK)</option>
                  <option value="WARN">هشدار (WARN)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sod-sev">شدت (۱–۴)</Label>
                <Input
                  id="sod-sev"
                  type="number"
                  min={1}
                  max={4}
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  disabled={createMut.isPending}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sod-desc">توضیح</Label>
              <Input
                id="sod-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                  <Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />
                  در حال ثبت…
                </>
              ) : (
                "ثبت"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={evalOpen} onOpenChange={setEvalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>ارزیابی مجموعه نقش‌ها</DialogTitle>
          </DialogHeader>
          <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border p-2">
            {roles.map((r) => {
              const checked = evalRoles.includes(r.tenant_role_id);
              return (
                <label
                  key={r.tenant_role_id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleEvalRole(r.tenant_role_id)}
                  />
                  <span>{r.name || r.code}</span>
                </label>
              );
            })}
          </div>
          {evalResult ? (
            <div className="rounded-md border bg-muted/30 p-3 text-xs space-y-1">
              <div>
                مسدود: {evalResult.has_block ? "بله" : "خیر"} · هشدار:{" "}
                {evalResult.has_warn ? "بله" : "خیر"}
              </div>
              {(evalResult.conflicts ?? []).length === 0 ? (
                <div className="text-muted-foreground">تعارضی نیست.</div>
              ) : (
                (evalResult.conflicts ?? []).map((c, i) => (
                  <div key={i}>
                    {c.name ?? c.code} — {c.enforcement}
                  </div>
                ))
              )}
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEvalOpen(false)}
            >
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
                "ارزیابی"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
