"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Loader2, RefreshCw, Search } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
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
  adminTenantService,
  type AdminTenantRow,
} from "../services/admin-api";

export function AdminTenantsPage() {
  const [rows, setRows] = useState<AdminTenantRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState({ total: 0, current_page: 1, last_page: 1 });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await adminTenantService.list({
        search: search.trim() || undefined,
        per_page: 50,
      });
      setRows(result.data);
      setMeta({
        total: result.meta.total,
        current_page: result.meta.current_page,
        last_page: result.meta.last_page,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "بارگذاری ناموفق");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="مستأجرها"
        description="لیست tenants پلتفرم — مشاهده entitlement از صفحه Feature Packs"
        icon={<Building2 className="h-4 w-4" />}
        breadcrumbs={[
          { label: "ادمین پلتفرم", href: "/admin" },
          { label: "مستأجرها" },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو نام / کد / slug…"
            className="ps-9"
            onKeyDown={(e) => {
              if (e.key === "Enter") void load();
            }}
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

      <p className="text-xs text-muted-foreground">
        مجموع: {meta.total} — صفحه {meta.current_page} از {meta.last_page}
      </p>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>کد</TableHead>
              <TableHead>نام</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead className="w-[90px]">وضعیت</TableHead>
              <TableHead className="w-[120px]">عملیات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  مستأجری یافت نشد.
                </TableCell>
              </TableRow>
            ) : null}
            {rows.map((t) => (
              <TableRow key={t.tenant_id}>
                <TableCell className="font-mono text-sm" dir="ltr">
                  {t.tenant_code}
                </TableCell>
                <TableCell>{t.tenant_name}</TableCell>
                <TableCell className="font-mono text-xs" dir="ltr">
                  {t.slug}
                </TableCell>
                <TableCell>
                  {t.status === 1 ? (
                    <StatusChip tone="success" label="فعال" />
                  ) : (
                    <StatusChip tone="neutral" label={String(t.status ?? "—")} />
                  )}
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline" asChild>
                    <Link
                      href={`/admin/feature-packs?tenantId=${encodeURIComponent(t.tenant_id)}`}
                    >
                      پک‌ها
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
