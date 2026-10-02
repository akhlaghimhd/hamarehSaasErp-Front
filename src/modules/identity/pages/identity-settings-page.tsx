/** Tenant identity system settings — dual role-assignment approval toggle */

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
import { identitySettingsService } from "../services/identity-settings-service";

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
    mutationFn: (on: boolean) =>
      identitySettingsService.update({ require_role_assignment_approval: on }),
    onSuccess: (d) => {
      toast.success(
        d.require_role_assignment_approval
          ? "تأیید دوگانه نقش فعال شد. اعطا و برداشتن نقش تا تأیید معلق می‌ماند."
          : "تأیید دوگانه نقش خاموش شد. تخصیص نقش مستقیم اعمال می‌شود."
      );
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

  const on = Boolean(data?.require_role_assignment_approval);

  return (
    <div className="space-y-6 p-4">
      <PageHeader
        title="تنظیمات هویت و دسترسی"
        description="سیاست‌های امنیتی در سطح مستأجر — توسط خود مشتری کنترل می‌شود"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "تنظیمات" },
        ]}
        icon={<Settings2 className="h-5 w-5" />}
      />

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
        <div className="max-w-xl rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dual-approval" className="text-base font-medium">
                تأیید دوگانه تخصیص نقش
              </Label>
              <p className="text-sm text-muted-foreground leading-relaxed">
                وقتی فعال باشد، اعطای نقش جدید و برداشتن نقش قبلی به‌صورت درخواست
                معلق ثبت می‌شود و تا تأیید نفر دوم اعمال نمی‌گردد. دسترسی‌های قبلی
                کاربر تا زمان تأیید، فعال می‌مانند. وقتی خاموش باشد، همان مسیر
                مستقیم فعلی اعمال می‌شود.
              </p>
            </div>
            <Switch
              id="dual-approval"
              checked={on}
              disabled={!canUpdate || mut.isPending}
              onCheckedChange={(v) => {
                if (!canUpdate) return;
                void mut.mutateAsync(Boolean(v));
              }}
            />
          </div>
          {mut.isPending ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              در حال ذخیره…
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              وضعیت فعلی:{" "}
              <span className="font-medium text-foreground">
                {on ? "فعال (مسیر دوگانه)" : "خاموش (مسیر مستقیم)"}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
