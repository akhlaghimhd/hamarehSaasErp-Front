"use client";

import { useCallback, useEffect, useState } from "react";
import { Package, Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  adminFeatureService,
  type FeatureCatalogItem,
} from "../services/admin-api";

const DEMO_TENANT_HINT =
  process.env.NEXT_PUBLIC_DEMO_TENANT_ID ||
  "3ab77cac-1343-4b13-8e14-0d887aad132a";

export function AdminFeaturePacksPage() {
  const [tenantId, setTenantId] = useState(DEMO_TENANT_HINT);
  const [catalog, setCatalog] = useState<FeatureCatalogItem[]>([]);
  const [enabled, setEnabled] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const [cat, ents] = await Promise.all([
        adminFeatureService.catalog(),
        adminFeatureService.listEntitlements(tenantId.trim()),
      ]);
      setCatalog(Array.isArray(cat) ? cat : []);
      setEnabled((ents.enabled_codes ?? []).map(String));
    } catch (e) {
      setError(e instanceof Error ? e.message : "بارگذاری ناموفق");
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void load();
  }, []); // initial only — explicit refresh for tenant change

  async function toggle(code: string, next: boolean) {
    setBusyCode(code);
    setError(null);
    setMsg(null);
    try {
      await adminFeatureService.setEntitlement(tenantId.trim(), code, next);
      setEnabled((prev) =>
        next ? Array.from(new Set([...prev, code])) : prev.filter((c) => c !== code)
      );
      setMsg(next ? `فعال شد: ${code}` : `غیرفعال شد: ${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "عملیات ناموفق");
    } finally {
      setBusyCode(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="بسته‌های قابلیت مستأجر"
        description="grant / revoke پک‌ها برای هر tenant توسط ادمین پلتفرم"
        icon={<Package className="h-4 w-4" />}
        breadcrumbs={[
          { label: "ادمین پلتفرم", href: "/admin" },
          { label: "Feature Packs" },
        ]}
      />

      <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="tenantId">Tenant ID</Label>
          <Input
            id="tenantId"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            dir="ltr"
            className="font-mono text-sm"
          />
        </div>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="me-2 h-4 w-4" />
          )}
          بارگذاری
        </Button>
      </div>

      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      ) : null}
      {msg ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          {msg}
        </div>
      ) : null}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>کد</TableHead>
              <TableHead>نام</TableHead>
              <TableHead className="w-[100px]">وضعیت</TableHead>
              <TableHead className="w-[140px]">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {catalog.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  کاتالوگ خالی است یا بارگذاری نشده.
                </TableCell>
              </TableRow>
            ) : null}
            {catalog.map((item) => {
              const code = String(item.code);
              const on = enabled.includes(code);
              return (
                <TableRow key={code}>
                  <TableCell className="font-mono text-sm" dir="ltr">
                    {code}
                  </TableCell>
                  <TableCell>{item.name || code}</TableCell>
                  <TableCell>
                    {on ? (
                      <StatusChip tone="success" label="فعال" />
                    ) : (
                      <StatusChip tone="neutral" label="غیرفعال" />
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant={on ? "outline" : "default"}
                      disabled={busyCode === code}
                      onClick={() => void toggle(code, !on)}
                    >
                      {busyCode === code ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : on ? (
                        "لغو"
                      ) : (
                        "فعال‌سازی"
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
