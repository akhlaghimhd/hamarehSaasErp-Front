/**
 * FE-ORG — سلسله‌مراتب (temporary restore shell)
 * Full page restored in follow-up; this unblocks Next.js compile.
 */
"use client";

import { useEffect, useState } from "react";
import { Network, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { hierarchyService } from "../services/org-extended-service";
import { OrganizationPermissions } from "../types";

export function HierarchiesListPage() {
  const canView =
    usePermission(OrganizationPermissions.hierarchyView) ||
    usePermission(OrganizationPermissions.companyView);
  const canManage =
    usePermission(OrganizationPermissions.hierarchyManage) ||
    usePermission(OrganizationPermissions.companyUpdate);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<{ hierarchy_id: string; name: string; code: string; purpose: string; is_active?: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await hierarchyService.list({ membership: "active" });
      setRows(data);
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : "بارگذاری ناموفق");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canView) void load();
  }, [canView]);

  async function rebuild() {
    if (!canManage) return;
    setBusy(true);
    try {
      const data = await hierarchyService.rebuild();
      if (data?.skipped) toast.message("بازنشانی لازم نبود.");
      else toast.success("هم‌تراز شد");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  }

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="سلسله‌مراتب"
          description="نقشه سازمان"
          breadcrumbs={[
            { label: "سازمان", href: "/dashboard/organization" },
            { label: "سلسله‌مراتب" },
          ]}
          icon={<Network className="h-4 w-4" />}
        />
        <p className="text-sm text-muted-foreground">دسترسی ندارید.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="سلسله‌مراتب"
        description="پایه پلتفرم = شرکت و شعبه. بازنشانی = روز اول از روی باکس‌ها."
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "سلسله‌مراتب" },
        ]}
        icon={<Network className="h-4 w-4" />}
        actions={
          canManage ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={rebuild}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              بازنشانی از سازمان
            </Button>
          ) : null
        }
      />
      {loading ? (
        <p className="text-sm text-muted-foreground">در حال بارگذاری…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <h2 className="text-lg font-semibold">هنوز درختی نیست</h2>
          <p className="text-sm text-muted-foreground">بازنشانی از سازمان را بزنید تا از روی شرکت و شعبه ساخته شود.</p>
          {canManage ? (
            <Button size="sm" disabled={busy} onClick={rebuild}>
              بازنشانی از سازمان
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="space-y-2 rounded-xl border bg-card p-4">
          {rows.map((h) => (
            <li key={h.hierarchy_id} className="flex flex-wrap items-center gap-2 border-b py-2 last:border-0">
              <span className="font-medium">{h.name}</span>
              <span className="font-mono text-xs text-muted-foreground" dir="ltr">
                {h.code}
              </span>
              <span className="text-xs text-muted-foreground">{h.purpose}</span>
              {String(h.code).startsWith("SYS-") ? (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px]">سیستمی</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        نسخهٔ کامل جدول/گره به‌زودی جایگزین می‌شود؛ بک‌اند و سرویس‌ها آماده است.
      </p>
    </div>
  );
}
