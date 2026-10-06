"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Settings } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  adminSystemSettingService,
  type SystemSettingRow,
} from "../services/admin-api";

export function AdminSystemSettingsPage() {
  const [rows, setRows] = useState<SystemSettingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await adminSystemSettingService.list();
      setRows(list);
      const next: Record<string, string> = {};
      for (const r of list) {
        next[r.setting_key] = r.setting_value ?? "";
      }
      setDrafts(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "بارگذاری ناموفق");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(key: string) {
    setSavingKey(key);
    setError(null);
    setMsg(null);
    try {
      await adminSystemSettingService.upsert({
        setting_key: key,
        setting_value: drafts[key] ?? "",
      });
      setMsg(`ذخیره شد: ${key}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره ناموفق");
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="تنظیمات سیستم پلتفرم"
        description="کلیدهای سراسری (مثل retention.* و domain) — dual-approval در tenant_settings است"
        icon={<Settings className="h-4 w-4" />}
        breadcrumbs={[
          { label: "ادمین پلتفرم", href: "/admin" },
          { label: "System Settings" },
        ]}
      />

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? (
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="me-2 h-4 w-4" />
          )}
          بارگذاری مجدد
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
              <TableHead>کلید</TableHead>
              <TableHead>مقدار</TableHead>
              <TableHead>توضیح</TableHead>
              <TableHead className="w-[100px]">ذخیره</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && !loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  تنظیمی نیست. ابتدا PlatformSettingSeeder را اجرا کنید.
                </TableCell>
              </TableRow>
            ) : null}
            {rows.map((r) => (
              <TableRow key={r.system_setting_id}>
                <TableCell className="font-mono text-xs" dir="ltr">
                  {r.setting_key}
                </TableCell>
                <TableCell>
                  <Input
                    value={drafts[r.setting_key] ?? ""}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [r.setting_key]: e.target.value }))
                    }
                    dir="ltr"
                    className="font-mono text-sm"
                  />
                </TableCell>
                <TableCell className="max-w-[240px] text-xs text-muted-foreground">
                  {r.description}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    disabled={savingKey === r.setting_key}
                    onClick={() => void save(r.setting_key)}
                  >
                    {savingKey === r.setting_key ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "ذخیره"
                    )}
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
