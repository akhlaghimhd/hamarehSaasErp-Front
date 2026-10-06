/**
 * Tenant identity / security settings (SoT for dual-approval).
 * Lives under Identity hub — NOT platform system_settings (those are SaaS Admin only).
 * DEBT-SAAS-002 closed: this page is the formal tenant settings surface.
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { ApiClientError } from "@/api";
import { usePermission } from "@/auth";
import { IdentityPermissions } from "../types";
import {
  identitySettingsService,
  type IdentitySettingsDto,
} from "../services/identity-settings-service";

export function IdentitySettingsPage() {
  const canView = usePermission(IdentityPermissions.userView);
  const canUpdate = usePermission(IdentityPermissions.userUpdate);
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["identity", "settings"],
    queryFn: () => identitySettingsService.get(),
    enabled: canView,
  });

  const mut = useMutation({
    mutationFn: (payload: Partial<IdentitySettingsDto>) =>
      identitySettingsService.update(payload),
    onSuccess: () => {
      toast.success("تنظیمات ذخیره شد");
      void qc.invalidateQueries({ queryKey: ["identity", "settings"] });
    },
    onError: (e) =>
      toast.error(
        e instanceof ApiClientError ? e.message : "ذخیره تنظیمات ناموفق بود"
      ),
  });

  if (!canView) {
    return (
      <div className="space-y-4 p-4">
        <PageHeader title="تنظیمات هویت" description="مجوز مشاهده ندارید." />
      </div>
    );
  }

  const roleOn = Boolean(data?.require_role_assignment_approval);
  const privOn = Boolean(data?.require_privileged_access_approval ?? true);

  return (
    <div className="space-y-6 p-4">
      <PageHeader
        title="تنظیمات هویت و دسترسی"
        description="سیاست‌های امنیتی سطح مستأجر (tenant_settings) — تأیید دوگانه نقش و دسترسی اضطراری"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "تنظیمات" },
        ]}
        icon={<Settings2 className="h-5 w-5" />}
      />

      <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        این صفحه منبع حقیقت تنظیمات امنیتی مستأجر است. تنظیمات سراسری پلتفرم
        (مثل retention) در پنل ادمین پلتفرم قرار دارد و با این صفحه ادغام نمی‌شود.
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال بارگذاری…
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <p>
            {error instanceof ApiClientError
              ? error.message
              : "بارگذاری تنظیمات ممکن نشد"}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => void refetch()}
          >
            تلاش مجدد
          </Button>
        </div>
      ) : (
        <div className="max-w-xl space-y-4">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dual-role" className="text-base font-medium">
                  تأیید دوگانه تخصیص نقش عادی
                </Label>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  اعطا/برداشتن نقش از صفحه کاربر تا تأیید نفر دوم اعمال نمی‌شود.
                  دسترسی‌های قبلی تا تأیید فعال می‌مانند. خاموش = مسیر مستقیم.
                </p>
              </div>
              <Switch
                id="dual-role"
                checked={roleOn}
                disabled={!canUpdate || mut.isPending}
                onCheckedChange={(v) => {
                  if (!canUpdate) return;
                  void mut.mutateAsync({
                    require_role_assignment_approval: Boolean(v),
                  });
                }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              وضعیت:{" "}
              <span className="font-medium text-foreground">
                {roleOn ? "فعال (مسیر دوگانه)" : "خاموش (مسیر مستقیم)"}
              </span>
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dual-priv" className="text-base font-medium">
                  تأیید دوگانه دسترسی اضطراری
                </Label>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  درخواست‌های break-glass در صف دسترسی اضطراری می‌مانند تا تأیید
                  شوند. خاموش = فعال‌سازی فوری بدون نفر دوم. این صف جدا از تخصیص
                  نقش عادی است.
                </p>
              </div>
              <Switch
                id="dual-priv"
                checked={privOn}
                disabled={!canUpdate || mut.isPending}
                onCheckedChange={(v) => {
                  if (!canUpdate) return;
                  void mut.mutateAsync({
                    require_privileged_access_approval: Boolean(v),
                  });
                }}
              />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              وضعیت:{" "}
              <span className="font-medium text-foreground">
                {privOn ? "فعال (نیاز به تأیید)" : "خاموش (فعال‌سازی فوری)"}
              </span>
            </p>
          </div>

          {mut.isPending ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              در حال ذخیره…
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
